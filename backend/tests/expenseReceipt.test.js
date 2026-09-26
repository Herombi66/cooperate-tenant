process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_expense_receipt_secret_12345';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const {
  sequelize,
  User,
  MembershipApplication,
  Expense,
  ReceiptTemplate,
  ReceiptRecord
} = require('../models');

describe('Expense Management Official Receipt Generation API', () => {
  let adminUser;
  let adminToken;
  let regularUser;
  let regularToken;
  let createdExpense;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    // 1. Admin User
    const adminApp = await MembershipApplication.create({
      name: 'Treasurer Sani Abdullahi',
      psn: 'IMAN/TR/001',
      email: 'treasurer.exp@imanmcs.local',
      phone: '08099887766',
      facility_name: 'HQ Accounts',
      next_of_kin_name: 'Amina Sani',
      next_of_kin_phone: '08099887767',
      status: 'approved'
    });
    adminUser = await User.create({
      membership_application_id: adminApp.id,
      password_hash: 'hashedpassword',
      role: 'admin',
      status: 'active'
    });
    adminToken = jwt.sign({ id: adminUser.id, role: 'admin' }, process.env.JWT_SECRET);

    // 2. Regular Member
    const memberApp = await MembershipApplication.create({
      name: 'Bello Usman',
      psn: 'IMAN/MEM/002',
      email: 'bello.exp@imanmcs.local',
      phone: '08011223344',
      facility_name: 'Branch Office',
      next_of_kin_name: 'Zainab Bello',
      next_of_kin_phone: '08011223345',
      status: 'approved'
    });
    regularUser = await User.create({
      membership_application_id: memberApp.id,
      password_hash: 'hashedpassword',
      role: 'user',
      status: 'active'
    });
    regularToken = jwt.sign({ id: regularUser.id, role: 'user' }, process.env.JWT_SECRET);

    // 3. Create a test expense
    const res = await request(app)
      .post('/expenses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Office Solar Inverter Battery Replacement',
        category: 'Maintenance',
        amount: 85000.00,
        expense_date: '2026-09-20',
        recipient: 'GreenEnergy Tech Solutions Ltd',
        notes: 'Approved during Q3 facilities maintenance review',
        month: 9,
        year: 2026
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    createdExpense = res.body.expense;
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('automatically assigns an official receipt number on expense creation', () => {
    expect(createdExpense.receipt_number).toBeDefined();
    expect(createdExpense.receipt_number).toMatch(/^IMAN-EXP-2026-[A-F0-9]{6}$/);
  });

  it('generates an official expense receipt in JSON format with metadata and hash', async () => {
    const res = await request(app)
      .get(`/expenses/${createdExpense.id}/receipt?format=json`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.receipt).toBeDefined();
    expect(res.body.receipt.receipt_number).toBe(createdExpense.receipt_number);
    expect(res.body.receipt.amount).toBe(85000.00);
    expect(res.body.receipt.member.name).toBe('GreenEnergy Tech Solutions Ltd');
    expect(res.body.receipt.member.psn).toBe('Category: Maintenance');
    expect(res.body.receipt.verification_hash).toBeDefined();

    // Verify ReceiptRecord was created in DB
    const record = await ReceiptRecord.findOne({
      where: { receipt_number: createdExpense.receipt_number }
    });
    expect(record).not.toBeNull();
    expect(record.transaction_type).toBe('expense');
    expect(Number(record.amount)).toBe(85000);
  });

  it('generates and streams an A4 official PDF receipt', async () => {
    const res = await request(app)
      .get(`/expenses/${createdExpense.id}/receipt?paperSize=A4`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toContain(`expense_receipt_${createdExpense.receipt_number}.pdf`);
    expect(res.body).toBeInstanceOf(Buffer);
    expect(res.body.length).toBeGreaterThan(100);
  });

  it('generates and streams an A5 voucher PDF receipt', async () => {
    const res = await request(app)
      .get(`/expenses/${createdExpense.id}/receipt?paperSize=A5`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.body).toBeInstanceOf(Buffer);
    expect(res.body.length).toBeGreaterThan(100);
  });

  it('generates and streams a thermal 80mm POS slip PDF receipt', async () => {
    const res = await request(app)
      .get(`/expenses/${createdExpense.id}/receipt?paperSize=thermal_80`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.body).toBeInstanceOf(Buffer);
    expect(res.body.length).toBeGreaterThan(100);
  });

  it('handles existing expense without receipt_number by auto-generating one', async () => {
    // Create legacy expense without receipt_number directly
    const legacyExpense = await Expense.create({
      description: 'Audit Logistics Transport Voucher',
      category: 'Transport',
      amount: 15000.00,
      recipient: 'Malam Garba Driver',
      month: 9,
      year: 2026
    });

    expect(legacyExpense.receipt_number).toBeFalsy();

    const res = await request(app)
      .get(`/expenses/${legacyExpense.id}/receipt?format=json`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.receipt.receipt_number).toMatch(/^IMAN-EXP-2026-[A-F0-9]{6}$/);

    // Verify it was updated on the expense model
    await legacyExpense.reload();
    expect(legacyExpense.receipt_number).toBe(res.body.receipt.receipt_number);
  });

  it('returns 404 for a non-existent expense', async () => {
    const res = await request(app)
      .get('/expenses/999999/receipt')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
