const { User, MembershipApplication } = require('./models');
const bcrypt = require('bcryptjs');

async function seedPassword() {
  try {
    const users = await User.findAll({
      where: { tenant_id: 'WUROJULI', role: 'admin' },
      include: [{
        model: MembershipApplication,
        as: 'membershipApplication'
      }],
      skipTenant: true
    });
    
    const newPassword = 'Password123!';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    for (const u of users) {
      if (u.membershipApplication && u.membershipApplication.email === 'wurojuli@gmail.com') {
        console.log(`Resetting password for user ${u.id} (Email: ${u.membershipApplication.email})`);
        await u.update({ password_hash: hashedPassword }, { skipTenant: true });
        console.log(`Password reset to: ${newPassword}`);
      }
    }
  } catch (e) {
    console.error(e);
  }
  process.exit();
}

seedPassword();
