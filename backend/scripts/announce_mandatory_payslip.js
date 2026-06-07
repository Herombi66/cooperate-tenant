
require('dotenv').config();
const { sequelize } = require('../db/connection');
const { User, BroadcastMessage, Notification } = require('../models');
const { Op } = require('sequelize');

async function sendAnnouncement() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connected.');

    // 1. Find an admin sender (e.g., ID 1 or first admin found)
    const admin = await User.findOne({
      where: {
        role: { [Op.in]: ['admin', 'super_admin'] }
      }
    });

    if (!admin) {
      console.error('No admin user found to send the broadcast.');
      process.exit(1);
    }

    console.log(`Sending broadcast as: ${admin.name} (ID: ${admin.id})`);

    const subject = 'Important: New Payslip Requirement for Loans';
    const message = 'Effective immediately, all loan applications require a valid payslip upload. Applications without a payslip will be rejected. This applies to all loan types (Cash, Investment, Educational). Please ensure you have a clear copy of your recent payslip ready before applying.';
    const target_group = 'all';

    // 2. Determine recipients (All users)
    const recipients = await User.findAll({
      attributes: ['id']
    });

    console.log(`Found ${recipients.length} recipients.`);

    if (recipients.length === 0) {
      console.log('No recipients found. Exiting.');
      process.exit(0);
    }

    // 3. Create Broadcast Record
    const broadcast = await BroadcastMessage.create({
      sender_id: admin.id,
      subject,
      message,
      target_group,
      recipient_count: recipients.length
    });

    console.log(`Broadcast message created with ID: ${broadcast.id}`);

    // 4. Create Notifications (Bulk Create)
    const notificationsData = recipients.map(user => ({
      user_id: user.id,
      type: 'broadcast', // Make sure this type is supported by frontend
      title: subject,
      message: message,
      broadcast_id: broadcast.id, // Ensure this field exists in Notification model
      is_read: false,
      created_at: new Date(),
      updated_at: new Date()
    }));

    // Split into chunks if too large
    const chunkSize = 500;
    for (let i = 0; i < notificationsData.length; i += chunkSize) {
      await Notification.bulkCreate(notificationsData.slice(i, i + chunkSize));
      console.log(`Created notifications chunk ${i / chunkSize + 1}`);
    }

    console.log('Announcement sent successfully!');
    process.exit(0);

  } catch (error) {
    console.error('Error sending announcement:', error);
    process.exit(1);
  }
}

sendAnnouncement();
