const axios = require('axios');

const API_URL = 'http://127.0.0.1:3001';

async function test() {
  try {
    // 1. Login as Admin
    console.log('Logging in as Admin...');
    const adminLogin = await axios.post(`${API_URL}/auth/login`, {
      psn: 'ADMIN001',
      password: 'admin123'
    });
    console.log('Admin Login Response:', JSON.stringify(adminLogin.data, null, 2));
    const adminToken = adminLogin.data.access_token;
    console.log('Admin login successful. Token:', adminToken ? 'Received' : 'Missing');

    // 2. Fetch Loans (Admin)
    console.log('Fetching Loans (Admin)...');
    try {
      const loans = await axios.get(`${API_URL}/loans`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      console.log('Fetch Loans success:', loans.data.success);
      console.log('Loans count:', loans.data.loans ? loans.data.loans.length : 0);
    } catch (e) {
      console.error('Fetch Loans failed:', e.response ? e.response.data : e.message);
    }

    // 3. Fetch All Agreements (Admin)
    console.log('Fetching All Agreements (Admin)...');
    try {
        const agreements = await axios.get(`${API_URL}/loans/agreements`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log('Fetch Agreements success:', agreements.data.success);
        console.log('Agreements count:', agreements.data.agreements ? agreements.data.agreements.length : 0);
    } catch (e) {
        console.error('Fetch Agreements failed:', e.response ? e.response.data : e.message);
    }


    // 4. Login as Member
    console.log('\nLogging in as Member...');
    const memberLogin = await axios.post(`${API_URL}/auth/login`, {
      psn: 'MEMBER001',
      password: 'member123'
    });
    const memberToken = memberLogin.data.access_token;
    console.log('Member login successful.');

    // 5. Fetch My Loans (Member)
    console.log('Fetching My Loans...');
    try {
      const myLoans = await axios.get(`${API_URL}/loans/my-loans`, {
        headers: { Authorization: `Bearer ${memberToken}` }
      });
      console.log('Fetch My Loans success:', myLoans.data.success);
      console.log('My Loans count:', myLoans.data.loans ? myLoans.data.loans.length : 0);
    } catch (e) {
      console.error('Fetch My Loans failed:', e.response ? e.response.data : e.message);
    }

    // 6. Fetch My Guarantees
    console.log('Fetching My Guarantees...');
    try {
        const guarantees = await axios.get(`${API_URL}/loans/guarantee/requests`, {
            headers: { Authorization: `Bearer ${memberToken}` }
        });
        console.log('Fetch Guarantees success:', guarantees.data.success);
    } catch (e) {
        console.error('Fetch Guarantees failed:', e.response ? e.response.data : e.message);
    }

  } catch (error) {
    console.error('Global Error:', error.response ? error.response.data : error.message);
  }
}

test();
