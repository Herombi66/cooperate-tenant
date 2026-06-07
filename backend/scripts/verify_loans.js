const request = require('supertest');
const app = require('../app');
const { User, Loan } = require('../models');
const { sequelize } = require('../db/connection');
const jwt = require('jsonwebtoken');

/**
 * Script to verify Loan Application System Enhancements
 * Usage: node scripts/verify_loans.js
 * Prerequisites: 
 *  - Database connection must be accessible
 *  - .env file must be present in backend root
 */

const verify = async () => {
  try {
    console.log('Connecting to database...');
    try {
        await sequelize.authenticate();
        console.log('✅ Database connected.');
    } catch (err) {
        console.error('❌ Unable to connect to the database:', err.message);
        console.log('Please ensure you are running this script from an environment with access to the database.');
        process.exit(1);
    }

    // 1. Find a user to impersonate (Admin)
    console.log('Finding admin user...');
    let user = await User.findOne({ where: { role: 'admin' } });
    if (!user) {
        console.log('No admin user found, finding any user...');
        user = await User.findOne();
    }
    if (!user) {
        console.error('❌ No users found in DB. Cannot test.');
        process.exit(1);
    }

    console.log(`Testing as user: ${user.email} (${user.role})`);

    const token = jwt.sign(
      { id: user.id, psn: user.psn, role: user.role },
      process.env.JWT_SECRET || 'test_secret',
      { expiresIn: '1h' }
    );

    // 2. Test Stats
    console.log('\n--- Testing /loans/stats ---');
    const statsRes = await request(app)
      .get('/loans/stats')
      .set('Authorization', `Bearer ${token}`);
    
    if (statsRes.status === 200) {
        console.log('✅ Status 200 OK');
        console.log('Stats:', statsRes.body.stats);
        if (statsRes.body.stats.totalAmount !== undefined) {
            console.log('✅ totalAmount is present');
        } else {
            console.error('❌ totalAmount is MISSING');
        }
    } else {
        console.error('❌ Failed:', statsRes.status, statsRes.body);
    }

    // 3. Test Pagination
    console.log('\n--- Testing /loans (Pagination) ---');
    const page1 = await request(app)
      .get('/loans?page=1&limit=2')
      .set('Authorization', `Bearer ${token}`);
    
    console.log('Page 1 status:', page1.status);
    if (page1.status === 200) {
        console.log('Page 1 Data Length:', page1.body.loans.length);
        console.log('Pagination Meta:', page1.body.pagination);
        
        if (page1.body.loans.length <= 2) {
            console.log('✅ Limit respected');
        } else {
            console.error('❌ Limit ignored');
        }

        // Check structure of first loan
        if (page1.body.loans.length > 0) {
            const loan = page1.body.loans[0];
            // console.log('Sample Loan:', loan);
            if (loan.memberName && loan.memberPsn) {
                 console.log('✅ Flattened fields present (memberName, memberPsn)');
            } else {
                 console.error('❌ Flattened fields MISSING');
            }
            if (loan.amount !== undefined) {
                 console.log('✅ amount field present');
            }
        }
    } else {
        console.error('❌ Failed to get loans:', page1.status, page1.body);
    }

    // 4. Test Search (if any loans exist)
    if (page1.body && page1.body.loans && page1.body.loans.length > 0) {
        const loan = page1.body.loans[0];
        const searchTerm = loan.memberName.split(' ')[0] || loan.memberPsn; 
        if (searchTerm && searchTerm !== 'Unknown') {
            console.log(`\n--- Testing Search (term: "${searchTerm}") ---`);
            
            const searchRes = await request(app)
                .get(`/loans?search=${searchTerm}`)
                .set('Authorization', `Bearer ${token}`);
                
            console.log('Search Status:', searchRes.status);
            if (searchRes.status === 200) {
                console.log('Search Results Count:', searchRes.body.loans.length);
                const allMatch = searchRes.body.loans.every(l => {
                    const nameMatch = l.memberName && l.memberName.toLowerCase().includes(searchTerm.toLowerCase());
                    const psnMatch = l.memberPsn && l.memberPsn.toLowerCase().includes(searchTerm.toLowerCase());
                    const idMatch = l.id.toString().includes(searchTerm);
                    return nameMatch || psnMatch || idMatch;
                });
                
                if (allMatch) {
                    console.log('✅ Search results match query');
                } else {
                    console.error('❌ Search results contain non-matching items');
                }
            }
        }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
};

verify();
