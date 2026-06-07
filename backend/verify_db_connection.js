const { Sequelize } = require('sequelize');
require('dotenv').config();

if (process.env.ALLOW_INSECURE_TLS === 'true') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

async function verifyConnection() {
  console.log('--- Database Connection Verification ---');
  console.log('Loading configuration from .env...');

  const config = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: false
  };

  console.log(`Target Host: ${config.host}`);
  console.log(`Target Port: ${config.port}`);
  console.log(`Target Database: ${config.database}`);
  console.log(`Target User: ${config.username}`);

  if (!config.host) {
    console.error('❌ ERROR: DB_HOST is missing in .env');
    return;
  }

  const sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    config
  );

  try {
    console.log('Attempting to authenticate...');
    await sequelize.authenticate();
    console.log('✅ Connection has been established successfully.');
    
    // Optional: Check if we can query a table
    try {
        const [results] = await sequelize.query('SELECT NOW() as current_time');
        console.log('✅ Query test successful. Server time:', results[0].current_time);
    } catch (queryError) {
        console.warn('⚠️ Authentication successful, but query failed:', queryError.message);
    }

  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    console.error('Error Details:', error.original ? error.original : error);
  } finally {
    await sequelize.close();
  }
}

verifyConnection();
