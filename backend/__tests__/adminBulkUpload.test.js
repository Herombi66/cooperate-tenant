const request = require('supertest');
const app = require('../app');
const { sequelize, User, MembershipApplication, Loan, LoanRepayment } = require('../models');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

describe('Admin Bulk Upload Functionality', () => {
  let adminToken;
  let adminUser;
  let memberUser;
  let loan;

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
    process.env.NODE_ENV = 'test';

    // Ensure clean state
    await sequelize.sync({ force: true });
    
    const suffix = Date.now();
    // Create Admin
    const adminApp = await MembershipApplication.create({
      name: `Admin Bulk Test ${suffix}`,
      psn: `ADM_BULK_${suffix}`,
      email: `adm_bulk_${suffix}@test.com`,
      phone: `0800${suffix.toString().slice(-7)}`,
      facility_name: 'Test Facility',
      next_of_kin_name: 'Admin NOK',
      next_of_kin_phone: '08000000000',
      status: 'approved'
    });
    
    adminUser = await User.create({
      membership_application_id: adminApp.id,
      role: 'admin',
      status: 'active',
      password_hash: 'hashed_password_123'
    });
    
    adminToken = jwt.sign({ id: adminUser.id, role: adminUser.role }, process.env.JWT_SECRET || 'test-secret');

    // Create Member
    const memberApp = await MembershipApplication.create({
      name: `Member Bulk Test ${suffix}`,
      psn: `MEM_BULK_${suffix}`,
      email: `mem_bulk_${suffix}@test.com`,
      phone: `0801${suffix.toString().slice(-7)}`,
      facility_name: 'Test Facility',
      next_of_kin_name: 'Member NOK',
      next_of_kin_phone: '08000000000',
      status: 'approved'
    });

    memberUser = await User.create({
      membership_application_id: memberApp.id,
      role: 'member',
      status: 'active',
      password_hash: 'hashed_password_123'
    });

    // Create Active Loan (Disbursed)
    loan = await Loan.create({
      user_id: memberUser.id,
      amount_requested: 50000,
      amount_approved: 50000,
      loan_type: 'cash',
      purpose: 'Test',
      status: 'disbursed',
      repayment_period_months: 6,
      monthly_repayment: 10000,
      total_repayment: 60000
    });
    
    // Store PSN for test use
    global.testPsn = `MEM_BULK_${suffix}`;
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('successfully uploads repayments via CSV using PSN', async () => {
    const csvContent = `PSN,Amount,Date,Method,Notes
${global.testPsn},5000,2024-01-01,transfer,Test Repayment`;
    
    const filePath = path.join(__dirname, 'test_repayment.csv');
    fs.writeFileSync(filePath, csvContent);

    const res = await request(app)
      .post('/loan-repayments/bulk-upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', filePath);

    // Clean up file
    fs.unlinkSync(filePath);

    // Debug output if failed or no successful uploads
    if (res.status !== 200 || !res.body.success || res.body.successful !== 1) {
      console.log('Upload Response:', JSON.stringify(res.body, null, 2));
    }

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.successful).toBe(1);
    expect(res.body.failed).toBe(0);

    // Verify DB
    const repayment = await LoanRepayment.findOne({
      where: { loan_id: loan.id, repayment_amount: 5000 }
    });
    expect(repayment).toBeTruthy();
    expect(repayment.status).toBe('pending');
  });

  test('handles invalid PSN gracefully', async () => {
    const csvContent = `PSN,Amount,Date
INVALID_PSN,5000,2024-01-01`;
    
    const filePath = path.join(__dirname, 'test_invalid.csv');
    fs.writeFileSync(filePath, csvContent);

    const res = await request(app)
      .post('/loan-repayments/bulk-upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', filePath);

    fs.unlinkSync(filePath);

    expect(res.status).toBe(200); // Should still be 200 OK but report failures
    expect(res.body.successful).toBe(0);
    expect(res.body.failed).toBe(1);
    expect(res.body.errors[0].error).toMatch(/No member found/i);
  });

  test('successfully parses DD/MM/YYYY date and mixed case method', async () => {
    const csvContent = `PSN,Amount,Date,Method,Notes
${global.testPsn},2000,31/12/2023,Transfer,Date Test`;
    
    const filePath = path.join(__dirname, 'test_date.csv');
    fs.writeFileSync(filePath, csvContent);

    const res = await request(app)
      .post('/loan-repayments/bulk-upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', filePath);

    fs.unlinkSync(filePath);

    if (res.status !== 200 || !res.body.success || res.body.successful !== 1) {
       console.log('Date Test Response:', JSON.stringify(res.body, null, 2));
    }

    expect(res.status).toBe(200);
    expect(res.body.successful).toBe(1);
    
    // Verify DB
    const repayment = await LoanRepayment.findOne({
      where: { loan_id: loan.id, repayment_amount: 2000 }
    });
    expect(repayment).toBeTruthy();
    expect(repayment.repayment_date).toBe('2023-12-31');
    expect(repayment.payment_method).toBe('bank_transfer');
  });
});
