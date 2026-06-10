require('dotenv').config();
const { sequelize } = require('./db/connection');
const PlatformAdmin = require('./models/PlatformAdmin');
const bcrypt = require('bcryptjs');

async function seedPlatformAdmin() {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');

    // Ensure the table exists
    await PlatformAdmin.sync();

    const email = 'superadmin@platform.com';
    const existing = await PlatformAdmin.findOne({ where: { email } });
    if (existing) {
      console.log('Platform admin already exists:', existing.email);
      process.exit(0);
    }

    const password_hash = await bcrypt.hash('admin123', 10);
    const admin = await PlatformAdmin.create({
      name: 'Super Admin',
      email,
      password_hash,
      role: 'super_admin',
      status: 'active'
    });

    console.log('Successfully created Platform Admin:', admin.email);
  } catch (error) {
    console.error('Error seeding platform admin:', error);
  } finally {
    process.exit(0);
  }
}

seedPlatformAdmin();
