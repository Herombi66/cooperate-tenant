require('dotenv').config();
const { User, MembershipApplication } = require('../models');
const bcrypt = require('bcryptjs');

async function resetPassword() {
  try {
    const psn = 'ADMIN001';
    const newPassword = 'password123';
    
    console.log(`🔄 Resetting password for PSN: ${psn}...`);

    const user = await User.findOne({
      include: [{
        model: MembershipApplication,
        as: 'membershipApplication',
        where: { psn }
      }]
    });

    if (!user) {
      console.log('❌ User not found.');
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password_hash = hashedPassword;
    await user.save();

    console.log('✅ Password reset successfully.');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

resetPassword();
