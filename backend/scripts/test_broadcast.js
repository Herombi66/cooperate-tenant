require('dotenv').config();
const axios = require('axios');
const { Sequelize } = require('sequelize');
const { User } = require('../models');

// Configuration
const API_URL = 'http://127.0.0.1:3000';
const ADMIN_PSN = process.env.ADMIN_PSN || 'ADMIN001';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password123';

async function testBroadcast() {
  try {
    console.log('🔄 Authenticating as Admin...');
    
    // 1. Login
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      psn: ADMIN_PSN, 
      password: ADMIN_PASSWORD
    });
    
    const token = loginResponse.data.access_token;
    console.log('✅ Logged in successfully');

    // 2. Send Broadcast
    console.log('🔄 Sending Test Broadcast...');
    const broadcastData = {
      subject: 'Test Announcement',
      message: 'This is a test broadcast message sent via script.',
      target_group: 'all'
    };

    const sendResponse = await axios.post(`${API_URL}/communication/broadcast`, broadcastData, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Broadcast Sent:', sendResponse.data.message);
    console.log('   Recipient Count:', sendResponse.data.broadcast.recipient_count);

    // 3. Fetch History
    console.log('🔄 Fetching Broadcast History...');
    const historyResponse = await axios.get(`${API_URL}/communication/history`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const latestBroadcast = historyResponse.data.broadcasts[0];
    console.log('✅ History Fetched. Latest Subject:', latestBroadcast.subject);

    if (latestBroadcast.subject === broadcastData.subject) {
        console.log('🎉 SUCCESS: Broadcast system is working end-to-end!');
    } else {
        console.error('❌ FAILURE: Latest broadcast does not match sent data.');
    }

  } catch (error) {
    console.error('❌ Test Failed:', error.response ? error.response.data : error.message);
  }
}

testBroadcast();
