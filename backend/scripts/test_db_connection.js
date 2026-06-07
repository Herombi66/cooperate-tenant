require('dotenv').config();
const { Sequelize } = require('sequelize');

console.log('🔍 Testing connection to Digital Ocean...');
console.log(`URL: ${process.env.DATABASE_URL?.substring(0, 20)}...`);
console.log(`Host: ${process.env.DB_HOST}`);

const sslConfig = {
  require: true,
  rejectUnauthorized: false
};

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: sslConfig
  },
  logging: console.log
});

async function test() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connection has been established successfully.');
    await sequelize.close();
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error.message);
    if (error.original && error.original.code === 'ETIMEDOUT') {
        console.error('🔥 TIMEOUT DETECTED: Check your Digital Ocean Trusted Sources (IP Whitelist).');
    }
  }
}

test();
