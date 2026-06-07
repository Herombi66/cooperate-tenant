require('dotenv').config();
const { User } = require('../models');

async function checkRoles() {
  try {
    const users = await User.findAll({ attributes: ['role'] });
    const roles = [...new Set(users.map(u => u.role))];
    console.log('Unique roles:', roles);
  } catch (error) {
    console.error('Error:', error);
  }
}

checkRoles();
