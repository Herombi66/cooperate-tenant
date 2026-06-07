const { DirectMessage, User, MembershipApplication, ActivityLog, Notification } = require('../models');
const { Op } = require('sequelize');

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const rateLimitStore = new Map();

const canSend = (senderId) => {
  const now = Date.now();
  const entry = rateLimitStore.get(senderId) || { count: 0, windowStart: now };
  if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(senderId, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  entry.count += 1;
  rateLimitStore.set(senderId, entry);
  return true;
};

const findRecipientUser = async ({ userId, memberId, psn }) => {
  if (userId) {
    const user = await User.findByPk(userId, {
      include: [{ model: MembershipApplication, as: 'membershipApplication' }]
    });
    return user;
  }

  let membershipWhere = {};
  if (memberId) {
    membershipWhere.id = memberId;
  } else if (psn) {
    membershipWhere.psn = psn;
  }

  const membership = await MembershipApplication.findOne({
    where: membershipWhere,
    include: [{ model: User, as: 'user' }]
  });

  if (!membership || !membership.user) {
    return null;
  }

  return membership.user;
};

const sendDirectMessage = async (req, res) => {
  try {
    const senderId = req.user.id;
    if (!['admin', 'secretary', 'chairman', 'treasurer', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Only admins can send direct messages' });
    }

    if (!canSend(senderId)) {
      return res.status(429).json({ success: false, message: 'Rate limit exceeded for sending messages' });
    }

    const { subject, body, recipient_user_id, recipient_member_id, recipient_psn } = req.body;

    if (!subject || !body) {
      return res.status(400).json({ success: false, message: 'Subject and body are required' });
    }

    const recipient = await findRecipientUser({
      userId: recipient_user_id,
      memberId: recipient_member_id,
      psn: recipient_psn
    });

    if (!recipient) {
      return res.status(404).json({ success: false, message: 'Recipient not found' });
    }

    const attachment = req.file || null;
    const attachment_url = attachment ? `/uploads/${attachment.filename}` : null;

    const message = await DirectMessage.create({
      sender_id: senderId,
      recipient_id: recipient.id,
      subject,
      body,
      status: 'sent',
      attachment_url,
      attachment_name: attachment ? attachment.originalname : null,
      attachment_mime: attachment ? attachment.mimetype : null,
      attachment_size: attachment ? attachment.size : null
    });

    await Notification.create({
      user_id: recipient.id,
      type: 'direct_message',
      title: subject,
      message: body.slice(0, 200),
      data: { direct_message_id: message.id },
      is_read: false,
      created_at: new Date()
    });

    await ActivityLog.logActivity(
      req.user,
      'SEND_DIRECT_MESSAGE',
      'DirectMessage',
      message.id,
      `Sent direct message to user ${recipient.id}`,
      null,
      req
    );

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: message
    });
  } catch (error) {
    console.error('Send direct message error:', error);
    res.status(500).json({ success: false, message: 'Server error sending message' });
  }
};

const getMessageHistory = async (req, res) => {
  try {
    const { scope = 'sent', user_id, psn, limit = 20, offset = 0 } = req.query;
    const where = {};

    if (scope === 'sent') {
      where.sender_id = req.user.id;
    } else if (scope === 'received') {
      where.recipient_id = req.user.id;
    } else if (scope === 'admin_all') {
      if (!['admin', 'secretary', 'chairman', 'treasurer', 'super_admin'].includes(req.user.role)) {
        return res.status(403).json({ success: false, message: 'Not authorized to view all messages' });
      }
      if (user_id) {
        where[Op.or] = [{ sender_id: user_id }, { recipient_id: user_id }];
      }
    }

    if (psn) {
      const membership = await MembershipApplication.findOne({
        where: { psn },
        include: [{ model: User, as: 'user' }]
      });
      if (membership && membership.user) {
        const userId = membership.user.id;
        if (!where[Op.or]) {
          where[Op.or] = [];
        }
        where[Op.or].push({ sender_id: userId }, { recipient_id: userId });
      }
    }

    const messages = await DirectMessage.findAll({
      where,
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'role'],
          include: [{ model: MembershipApplication, as: 'membershipApplication', attributes: ['psn', 'name'] }]
        },
        {
          model: User,
          as: 'recipient',
          attributes: ['id', 'role'],
          include: [{ model: MembershipApplication, as: 'membershipApplication', attributes: ['psn', 'name'] }]
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({ success: true, messages });
  } catch (error) {
    console.error('Get message history error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching messages' });
  }
};

const markMessageRead = async (req, res) => {
  try {
    const messageId = req.params.id;
    const message = await DirectMessage.findByPk(messageId);

    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    if (message.recipient_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to mark this message as read' });
    }

    if (!message.read_at) {
      message.read_at = new Date();
      message.status = 'read';
      await message.save();
    }

    res.json({ success: true, message: 'Message marked as read', data: message });
  } catch (error) {
    console.error('Mark message read error:', error);
    res.status(500).json({ success: false, message: 'Server error updating message' });
  }
};

module.exports = {
  sendDirectMessage,
  getMessageHistory,
  markMessageRead
};
