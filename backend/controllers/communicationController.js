const { BroadcastMessage, Notification, User, MembershipApplication } = require('../models');
const { Op } = require('sequelize');

const sendBroadcast = async (req, res) => {
  try {
    const { subject, message, target_group } = req.body;
    const senderId = req.user.id;

    if (!subject || !message || !target_group) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Determine recipients
    let whereClause = {};
    if (target_group === 'active') {
      whereClause.status = 'active';
      whereClause.role = 'member';
    } else if (target_group === 'admins') {
      whereClause.role = { [Op.in]: ['admin', 'super_admin', 'secretary', 'treasurer', 'chairman'] };
    } else if (target_group === 'all') {
      // No filter, all users
    } else {
      return res.status(400).json({ success: false, message: 'Invalid target group' });
    }

    const recipients = await User.findAll({ 
      where: whereClause,
      attributes: ['id'] 
    });

    if (recipients.length === 0) {
      return res.status(404).json({ success: false, message: 'No recipients found for this group' });
    }

    // Create Broadcast Record
    const broadcast = await BroadcastMessage.create({
      sender_id: senderId,
      subject,
      message,
      target_group,
      recipient_count: recipients.length
    });

    // Create Notifications (Bulk Create for performance)
    const notificationsData = recipients.map(user => ({
      user_id: user.id,
      type: 'broadcast',
      title: subject,
      message: message,
      broadcast_id: broadcast.id,
      created_at: new Date()
    }));

    // Split into chunks if too large (optional, but good practice for thousands of users)
    const chunkSize = 500;
    for (let i = 0; i < notificationsData.length; i += chunkSize) {
      await Notification.bulkCreate(notificationsData.slice(i, i + chunkSize));
    }

    res.status(201).json({
      success: true,
      message: `Broadcast sent to ${recipients.length} recipients`,
      broadcast
    });

  } catch (error) {
    console.error('Send broadcast error:', error);
    res.status(500).json({ success: false, message: 'Server error sending broadcast' });
  }
};

const getBroadcastHistory = async (req, res) => {
  try {
    const broadcasts = await BroadcastMessage.findAll({
      include: [
        { model: User, as: 'sender', attributes: ['id', 'role'] }
      ],
      order: [['created_at', 'DESC']]
    });

    // Get read stats for each broadcast
    // Optimized: In a real large app, this should be a separate query or aggregated view
    const broadcastsWithStats = await Promise.all(broadcasts.map(async (b) => {
      const readCount = await Notification.count({
        where: { broadcast_id: b.id, is_read: true }
      });
      const bJSON = b.toJSON();
      bJSON.read_count = readCount;
      bJSON.sender_name = b.sender?.role || 'Admin'; // Could fetch name if needed
      return bJSON;
    }));

    res.json({ success: true, broadcasts: broadcastsWithStats });
  } catch (error) {
    console.error('Get broadcast history error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching history' });
  }
};

module.exports = {
  sendBroadcast,
  getBroadcastHistory
};
