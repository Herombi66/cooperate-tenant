const { sequelize, User } = require('../models');

const TARGET_USER_ID = 98;

async function run() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database.');

    console.log(`\n🔍 Finding User ID ${TARGET_USER_ID} (including soft-deleted)...`);
    const user = await User.findByPk(TARGET_USER_ID, { paranoid: false });

    if (!user) {
      console.log('❌ User not found!');
      return;
    }

    if (user.deleted_at === null) {
      console.log('⚠️ User is already active (not deleted).');
    } else {
      console.log(`Found deleted user. Deleted at: ${user.deleted_at}`);
      console.log('♻️ Restoring user...');
      
      await user.restore();
      
      console.log('✅ User restored successfully!');
      
      // Verify
      const refreshedUser = await User.findByPk(TARGET_USER_ID);
      if (refreshedUser && refreshedUser.deleted_at === null) {
        console.log('✅ Verification passed: User is now active.');
      } else {
        console.log('❌ Verification failed: User still appears deleted.');
      }
    }

  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await sequelize.close();
  }
}

run();
