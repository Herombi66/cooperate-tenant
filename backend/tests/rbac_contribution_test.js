process.env.NODE_ENV = 'test';
const { sequelize, User, MembershipApplication } = require('../models');
const contributionController = require('../controllers/contributionController');

// Mock Response Object
const mockRes = () => {
  const res = {};
  res.statusCode = 200;
  res.body = {};
  res.status = (code) => { 
    res.statusCode = code; 
    return res; 
  };
  res.json = (data) => { 
    res.body = data; 
    return res; 
  };
  return res;
};

// Mock Request Object
const mockReq = (body, user) => {
    return {
        body,
        user,
        ip: '127.0.0.1',
        headers: { 'user-agent': 'Test' }
    };
};

async function runTest() {
  try {
    console.log('🧪 Starting RBAC Contribution Test...');
    await sequelize.sync({ force: true });

    // Create Users
    // 1. Chairman
    const app1 = await MembershipApplication.create({ 
        psn: 'CHAIRMAN', 
        name: 'Mr Chairman', 
        email: 'c@c.com', 
        phone: '1', 
        facility_name: 'F', 
        next_of_kin_name: 'N', 
        next_of_kin_phone: '2',
        savings: 1000, investment: 1000, target_saving: 0
    });
    const chairman = await User.create({ 
        membership_application_id: app1.id, 
        role: 'chairman', 
        password_hash: 'hash' 
    });

    // 2. Member
    const app2 = await MembershipApplication.create({ 
        psn: 'MEMBER', 
        name: 'Mr Member', 
        email: 'm@m.com', 
        phone: '1', 
        facility_name: 'F', 
        next_of_kin_name: 'N', 
        next_of_kin_phone: '2',
        savings: 1000, investment: 1000, target_saving: 0
    });
    const member = await User.create({ 
        membership_application_id: app2.id, 
        role: 'member', 
        password_hash: 'hash' 
    });

    // Test 1: Create Contribution for Chairman (Should Fail)
    console.log('\n📝 Test 1: Chairman Contribution (Expect 403)');
    const req1 = mockReq(
        { user_id: chairman.id, total_amount: 5000, month: 1, year: 2026, savings: 5000 },
        { id: 999, role: 'admin' }
    );
    const res1 = mockRes();
    
    await contributionController.createContribution(req1, res1);
    
    if (res1.statusCode === 403) {
        if (res1.body.message.includes('not allowed')) {
             console.log('✅ PASSED: Chairman was blocked with correct message.');
        } else {
             console.log('⚠️ PASSED (Status Only): Chairman blocked, but message differed:', res1.body.message);
        }
    } else {
        console.error('❌ FAILED: Chairman NOT blocked. Status:', res1.statusCode);
    }

    // Test 2: Create Contribution for Member (Should Pass)
    console.log('\n📝 Test 2: Member Contribution (Expect 201)');
    const req2 = mockReq(
        { user_id: member.id, total_amount: 5000, month: 1, year: 2026, savings: 5000 },
        { id: 999, role: 'admin' }
    );
    const res2 = mockRes();
    
    await contributionController.createContribution(req2, res2);

    if (res2.statusCode === 201) {
         console.log('✅ PASSED: Member contribution created successfully.');
    } else {
         console.error('❌ FAILED: Member contribution failed. Status:', res2.statusCode, res2.body);
    }

  } catch (error) {
    console.error('❌ Test Execution Error:', error);
  } finally {
      await sequelize.close();
  }
}

runTest();
