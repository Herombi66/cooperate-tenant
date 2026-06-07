const { sequelize, EmailLog } = require('../models');

async function run() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database');
    await EmailLog.sync();
    console.log('EmailLog table synced');
  } catch (err) {
    console.error('Error syncing EmailLog table:', err);
  } finally {
    await sequelize.close();
  }
}

run();

