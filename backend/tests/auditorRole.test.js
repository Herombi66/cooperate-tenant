const request = require('supertest');
const app = require('../app');
const bcrypt = require('bcryptjs');
const {
  sequelize,
  User,
  MembershipApplication,
  Contribution,
  ContributionWithdrawal,
  Loan,
  LoanRepayment,
  ProfitShare,
  Settings,
  AuditNote,
  ActivityLog
} = require('../models');
const jwt = require('jsonwebtoken');

jest.mock('../services/emailService', () => ({
  initialize: jest.fn(),
  sendWelcomeEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  sendContributionReceiptEmail: jest.fn(),
  sendLoanApplicationEmail: jest.fn(),
  sendLoanApprovedEmail: jest.fn(),
  sendLoanRejectedEmail: jest.fn(),
  sendNotificationEmail: jest.fn(),
  sendGuarantorNotificationEmail: jest.fn()
}));

describe('RBAC & Oversight - Dedicated Auditor role', () => {
  let adminToken;
  let auditorToken;
  let auditorUser;
  let memberUser;
  let memberApp;
  let testLoan;
  let auditorPassword;

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
    process.env.NODE_ENV = 'test';

    await sequelize.sync({ force: true });

    await Settings.bulkCreate([
      { key: 'registration_fee', value: '1500' },
      { key: 'monthly_admin_fee', value: '1000' },
      { key: 'reserve_fund_percentage', value: '10' },
      { key: 'education_fund_percentage', value: '5' },
      { key: 'committee_bonus_percentage', value: '5' },
      { key: 'bad_debt_reserve_percentage', value: '3.5' },
      { key: 'general_reserve_percentage', value: '2.8' }
    ]);

    // 1. Admin
    const adminApp = await MembershipApplication.create({
      name: 'Super Admin',
      psn: 'ADMIN_001',
      email: 'admin@imanmcs.com',
      phone: '08000000001',
      facility_name: 'Main HQ',
      next_of_kin_name: 'Kin Admin',
      next_of_kin_phone: '08000000002',
      status: 'approved',
      savings: 5000,
      investment: 5000,
      target_saving: 2000
    });
    const adminUser = await User.create({
      membership_application_id: adminApp.id,
      password_hash: 'adminhash',
      role: 'admin',
      status: 'active'
    });
    adminToken = jwt.sign({ id: adminUser.id, role: adminUser.role, name: adminApp.name }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // 2. Auditor
    const auditorApp = await MembershipApplication.create({
      name: 'Lead Cooperative Auditor',
      psn: 'AUD_777',
      email: 'auditor@imanmcs.com',
      phone: '08000000777',
      facility_name: 'Audit Department',
      next_of_kin_name: 'Kin Auditor',
      next_of_kin_phone: '08000000778',
      status: 'approved',
      savings: 5000,
      investment: 5000,
      target_saving: 2000
    });
    auditorPassword = 'SecureAuditPassword123!';
    const auditorHash = await bcrypt.hash(auditorPassword, 10);
    auditorUser = await User.create({
      membership_application_id: auditorApp.id,
      password_hash: auditorHash,
      role: 'auditor',
      status: 'active'
    });
    auditorToken = jwt.sign({ id: auditorUser.id, role: auditorUser.role, name: auditorApp.name }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // 3. Regular Member
    memberApp = await MembershipApplication.create({
      name: 'Usman Danfodio',
      psn: 'MEM_5001',
      email: 'usman@imanmcs.com',
      phone: '08000005001',
      facility_name: 'Kaduna Central Facility',
      next_of_kin_name: 'Fatima Usman',
      next_of_kin_phone: '08000005002',
      status: 'approved',
      savings: 20000,
      investment: 30000,
      target_saving: 10000,
      contribution_amount_commitment: 50000
    });
    memberUser = await User.create({
      membership_application_id: memberApp.id,
      password_hash: 'memberhash',
      role: 'member',
      status: 'active'
    });

    // Seed member contribution
    await Contribution.create({
      user_id: memberUser.id,
      savings: 20000,
      investment: 30000,
      target_saving: 10000,
      total_amount: 60000,
      payment_method: 'bank_transfer',
      month: 1,
      year: 2026,
      status: 'approved',
      approved_by: adminUser.id,
      approval_date: new Date('2026-01-15')
    });

    // Seed member loan & repayment
    testLoan = await Loan.create({
      user_id: memberUser.id,
      loan_type: 'cash',
      amount_requested: 200000,
      amount_approved: 200000,
      repayment_period_months: 10,
      monthly_repayment: 20000,
      total_repayment: 200000,
      status: 'disbursed',
      application_date: new Date('2026-01-20'),
      approval_date: new Date('2026-01-22'),
      disbursement_date: new Date('2026-01-25'),
      approved_by: adminUser.id,
      disbursed_by: adminUser.id
    });

    await LoanRepayment.create({
      loan_id: testLoan.id,
      user_id: memberUser.id,
      repayment_amount: 20000,
      repayment_date: '2026-02-25',
      payment_method: 'salary_deduction',
      status: 'verified',
      recorded_by: adminUser.id
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('Test 1 & 2: Login as Auditor using PSN suffix _auditor', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ psn: 'AUD_777_auditor', password: auditorPassword });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.role).toBe('auditor');
  });

  test('Test 3: Confirm Auditor can view cooperative dashboard & summary', async () => {
    const res = await request(app)
      .get('/audit/dashboard')
      .set('Authorization', `Bearer ${auditorToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    const summary = res.body.data.cooperativeSummary;
    expect(summary.totalRegisteredMembers).toBeGreaterThanOrEqual(3);
    expect(summary.activeMembers).toBeGreaterThanOrEqual(3);
    expect(summary.totalContributions).toBe(60000);
    expect(summary.totalDisbursedLoans).toBe(200000);
    expect(summary.totalLoanRepayments).toBe(20000);
    expect(summary.totalOutstandingLoans).toBe(180000);
  });

  test('Test 4: Open member and verify complete financial history', async () => {
    const res = await request(app)
      .get(`/audit/members/${memberUser.id}`)
      .set('Authorization', `Bearer ${auditorToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.profile.psn).toBe('MEM_5001');
    expect(res.body.data.financialSummary.totalContributions).toBe(60000);
    expect(res.body.data.financialSummary.totalLoansReceived).toBe(200000);
    expect(res.body.data.financialSummary.totalLoanRepayments).toBe(20000);
    expect(res.body.data.financialSummary.currentOutstandingLoan).toBe(180000);
  });

  test('Test 5: Open member statement and verify running balance arithmetic', async () => {
    const res = await request(app)
      .get(`/audit/members/${memberUser.id}/statement`)
      .set('Authorization', `Bearer ${auditorToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.auditMetadata.generatedBy).toBeDefined();
    const statement = res.body.data.statement;
    expect(Array.isArray(statement)).toBe(true);
    expect(statement.length).toBeGreaterThanOrEqual(3);

    // Verify balance math for each step: previous balance + credit - debit = balance
    let prev = 0;
    statement.forEach((row) => {
      const expected = prev + row.credit - row.debit;
      expect(row.balance).toBeCloseTo(expected, 2);
      prev = row.balance;
    });
  });

  test('Test 6: Filter transactions by date/member/type', async () => {
    const res = await request(app)
      .get('/audit/transactions?transactionType=Contribution')
      .set('Authorization', `Bearer ${auditorToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.transactions.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.transactions[0].transaction_type).toBe('Contribution');
  });

  test('Test 7: Open loan and verify complete loan history', async () => {
    const res = await request(app)
      .get('/audit/loans')
      .set('Authorization', `Bearer ${auditorToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    const loans = res.body.data.loans;
    expect(loans.length).toBeGreaterThanOrEqual(1);
    const targetLoan = loans.find((l) => l.id === testLoan.id);
    expect(targetLoan).toBeDefined();
    expect(targetLoan.amount_approved).toBe(200000);
    expect(targetLoan.amount_repaid).toBe(20000);
    expect(targetLoan.outstanding_balance).toBe(180000);
    expect(targetLoan.repayments_history.length).toBe(1);
  });

  test('Test 8: Generate an audit report', async () => {
    const res = await request(app)
      .get('/audit/reports?type=financial_summary')
      .set('Authorization', `Bearer ${auditorToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.generatedBy).toBeDefined();
    expect(res.body.data.generatedOn).toBeDefined();
    expect(res.body.data.rows.length).toBeGreaterThanOrEqual(5);
  });

  test('Test 9: Export member statement to CSV & PDF with audit notice', async () => {
    const csvRes = await request(app)
      .get(`/audit/members/${memberUser.id}/statement?format=csv`)
      .set('Authorization', `Bearer ${auditorToken}`);

    expect(csvRes.statusCode).toBe(200);
    expect(csvRes.headers['content-type']).toContain('text/csv');
    expect(csvRes.text).toContain('AUDIT MEMBER STATEMENT');

    const pdfRes = await request(app)
      .get(`/audit/members/${memberUser.id}/statement?format=pdf`)
      .set('Authorization', `Bearer ${auditorToken}`);

    expect(pdfRes.statusCode).toBe(200);
    expect(pdfRes.headers['content-type']).toContain('application/pdf');
  });

  test('Test 10: Attempt to modify a member record as Auditor -> 403 Forbidden', async () => {
    const res = await request(app)
      .put(`/members/${memberUser.id}`)
      .set('Authorization', `Bearer ${auditorToken}`)
      .send({ name: 'Hacked Usman' });

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/strictly read-only/i);
  });

  test('Test 11: Attempt to approve a loan as Auditor -> 403 Forbidden', async () => {
    const res = await request(app)
      .post(`/loans/1/approve`)
      .set('Authorization', `Bearer ${auditorToken}`)
      .send({ amount_approved: 50000 });

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/strictly read-only/i);
  });

  test('Test 12: Attempt to change another user role as Auditor -> 403 Forbidden', async () => {
    const res = await request(app)
      .post(`/users/${memberApp.id}/role`)
      .set('Authorization', `Bearer ${auditorToken}`)
      .send({ role: 'admin' });

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/strictly read-only/i);
  });

  test('Test 13: Attempt to create a contribution or expense as Auditor -> 403 Forbidden', async () => {
    const contribRes = await request(app)
      .post('/contributions/by-psn')
      .set('Authorization', `Bearer ${auditorToken}`)
      .send({ psn: 'MEM_5001', savings: 10000, investment: 10000, total_amount: 20000 });

    expect(contribRes.statusCode).toBe(403);
    expect(contribRes.body.success).toBe(false);

    const expenseRes = await request(app)
      .post('/expenses')
      .set('Authorization', `Bearer ${auditorToken}`)
      .send({ description: 'Auditor unauthorized expense', amount: 5000 });

    expect(expenseRes.statusCode).toBe(403);
    expect(expenseRes.body.success).toBe(false);
  });

  test('Test 14: Add and update Audit Notes as Auditor -> 200/201 OK', async () => {
    const createRes = await request(app)
      .post('/audit/notes')
      .set('Authorization', `Bearer ${auditorToken}`)
      .send({
        entity_type: 'loan',
        entity_id: String(testLoan.id),
        note: 'Verified loan repayment schedule matches bank statement',
        status: 'open'
      });

    expect(createRes.statusCode).toBe(201);
    expect(createRes.body.success).toBe(true);
    const noteId = createRes.body.data.id;
    expect(noteId).toBeDefined();

    const updateRes = await request(app)
      .put(`/audit/notes/${noteId}`)
      .set('Authorization', `Bearer ${auditorToken}`)
      .send({ status: 'resolved', note: 'Verified and reconciled with bank statement' });

    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.status).toBe('resolved');
  });

  test('Test 15: View reconciliation equation and audit exceptions', async () => {
    const recRes = await request(app)
      .get('/audit/reconciliation')
      .set('Authorization', `Bearer ${auditorToken}`);

    expect(recRes.statusCode).toBe(200);
    expect(recRes.body.success).toBe(true);
    expect(recRes.body.data.reconciliation.expectedClosingBalance).toBeDefined();

    const excRes = await request(app)
      .get('/audit/exceptions')
      .set('Authorization', `Bearer ${auditorToken}`);

    expect(excRes.statusCode).toBe(200);
    expect(excRes.body.success).toBe(true);
    expect(Array.isArray(excRes.body.data.exceptions)).toBe(true);
  });
});
