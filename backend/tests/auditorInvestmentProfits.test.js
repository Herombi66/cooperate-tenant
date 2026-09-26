process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_investment_profits_secret_12345';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const {
  sequelize,
  User,
  MembershipApplication,
  Contribution,
  Loan,
  LoanRepayment,
  LoanAgreement,
  Settings
} = require('../models');

describe('Auditor Dashboard - Investment Profits & Revenue Sources Audit', () => {
  let auditorToken;
  let adminToken;
  let memberToken;
  let member1;
  let member2;
  let invLoan1;
  let invLoan2;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    await Settings.bulkCreate([
      { key: 'registration_fee', value: '1500' },
      { key: 'monthly_admin_fee', value: '1000' }
    ]);

    // 1. Auditor
    const auditorApp = await MembershipApplication.create({
      name: 'Auditor Farooq Bello',
      psn: 'AUD-991',
      email: 'auditor.farooq@imanmcs.local',
      phone: '08099881122',
      facility_name: 'HQ Audit Bureau',
      next_of_kin_name: 'Halima Bello',
      next_of_kin_phone: '08099881123',
      status: 'approved'
    });
    const auditorUser = await User.create({
      membership_application_id: auditorApp.id,
      password_hash: 'hashedpassword',
      role: 'auditor',
      status: 'active'
    });
    auditorToken = jwt.sign({ id: auditorUser.id, role: 'auditor' }, process.env.JWT_SECRET);

    // 2. Member 1
    const mem1App = await MembershipApplication.create({
      name: 'Malam Ibrahim Danjuma',
      psn: '38762',
      email: 'ibrahim.d@imanmcs.local',
      phone: '08065736114',
      facility_name: 'General Hospital Gombe',
      next_of_kin_name: 'Amina Danjuma',
      next_of_kin_phone: '08065736115',
      status: 'approved'
    });
    member1 = await User.create({
      membership_application_id: mem1App.id,
      password_hash: 'hashedpassword',
      role: 'user',
      status: 'active'
    });

    // 3. Member 2
    const mem2App = await MembershipApplication.create({
      name: 'Dr. Fatima Abubakar',
      psn: '45021',
      email: 'fatima.a@imanmcs.local',
      phone: '08033221144',
      facility_name: 'State Specialist Hospital',
      next_of_kin_name: 'Aliyu Abubakar',
      next_of_kin_phone: '08033221145',
      status: 'approved'
    });
    member2 = await User.create({
      membership_application_id: mem2App.id,
      password_hash: 'hashedpassword',
      role: 'user',
      status: 'active'
    });
    memberToken = jwt.sign({ id: member2.id, role: 'user' }, process.env.JWT_SECRET);

    // Contributions for admin monthly fees calculation
    await Contribution.create({
      user_id: member1.id,
      total_amount: 100000,
      savings: 50000,
      investment: 50000,
      month: 9,
      year: 2026,
      status: 'approved',
      contribution_date: '2026-09-01'
    });

    // Investment Loan 1:
    // Disbursed: ₦800,000, Profit: ₦80,000 (10%), Total Repayment: ₦880,000
    // Repaid: ₦440,000 (50%) -> Profit Collected: ₦40,000, Outstanding Profit: ₦40,000
    invLoan1 = await Loan.create({
      user_id: member1.id,
      loan_type: 'investment',
      amount_requested: 800000,
      amount_approved: 800000,
      total_repayment: 880000,
      monthly_repayment: 88000,
      repayment_period_months: 10,
      interest_rate: 10,
      status: 'disbursed',
      disbursement_date: '2026-09-05'
    });

    await LoanAgreement.create({
      loan_id: invLoan1.id,
      user_id: member1.id,
      type: 'murabaha_contract',
      status: 'accepted',
      signature_reference: 'AG-00152'
    });

    await LoanRepayment.create({
      loan_id: invLoan1.id,
      user_id: member1.id,
      repayment_amount: 440000,
      repayment_date: '2026-09-20',
      payment_method: 'bank_transfer',
      recorded_by: member1.id,
      status: 'verified'
    });

    // Investment Loan 2:
    // Disbursed: ₦1,200,000, Profit: ₦120,000 (10%), Total Repayment: ₦1,320,000
    // Repaid: ₦0 -> Profit Collected: ₦0, Outstanding Profit: ₦120,000
    invLoan2 = await Loan.create({
      user_id: member2.id,
      loan_type: 'investment',
      amount_requested: 1200000,
      amount_approved: 1200000,
      total_repayment: 1320000,
      monthly_repayment: 132000,
      repayment_period_months: 10,
      interest_rate: 10,
      status: 'active',
      disbursement_date: '2026-09-12'
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('retrieves investment profits and revenue sources on GET /audit/dashboard', async () => {
    const res = await request(app)
      .get('/audit/dashboard')
      .set('Authorization', `Bearer ${auditorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const summary = res.body.data.cooperativeSummary;
    expect(summary.investmentProfits).toBeDefined();

    // Total Profit Generated = 80,000 + 120,000 = 200,000
    expect(summary.investmentProfits.totalProfitGenerated).toBe(200000);
    expect(summary.investmentProfits.investmentLoansCount).toBe(2);

    // Profit Collected = 40,000 (from 440,000 repayment on 880,000 total)
    expect(summary.investmentProfits.profitCollected).toBe(40000);

    // Outstanding Profit = 200,000 - 40,000 = 160,000
    expect(summary.investmentProfits.outstandingProfit).toBe(160000);

    // Reconciliation
    expect(summary.reconciliation.totalProfitGenerated).toBe(200000);
    expect(summary.reconciliation.profitCollected).toBe(40000);
    expect(summary.reconciliation.outstandingProfit).toBe(160000);

    // Revenue Sources
    expect(summary.revenueSources).toBeDefined();
    expect(summary.revenueSources.investmentProfits).toBe(200000);
    expect(summary.revenueSources.adminMonthlyFees).toBe(5000); // 5% of 100,000
    expect(summary.revenueSources.totalRevenue).toBe(
      summary.revenueSources.registrationFees +
      summary.revenueSources.adminMonthlyFees +
      summary.revenueSources.investmentProfits +
      summary.revenueSources.otherRevenue
    );
  });

  it('updates incomeStreams on GET /audit/income-expenses to include Investment Profits', async () => {
    const res = await request(app)
      .get('/audit/income-expenses')
      .set('Authorization', `Bearer ${auditorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const streams = res.body.data.incomeStreams;
    const invStream = streams.find((s) => s.source === 'Investment Profits');
    expect(invStream).toBeDefined();
    expect(invStream.amount).toBe(200000);
    expect(invStream.collected).toBe(40000);
    expect(invStream.outstanding).toBe(160000);
  });

  it('returns full detailed report on GET /audit/investment-profits with all required fields', async () => {
    const res = await request(app)
      .get('/audit/investment-profits')
      .set('Authorization', `Bearer ${auditorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.loans.length).toBe(2);

    const loan1 = res.body.data.loans.find((l) => l.loan_id === invLoan1.id);
    expect(loan1).toBeDefined();
    expect(loan1.agreement_reference).toBe('AG-00152');
    expect(loan1.member).toBe('Malam Ibrahim Danjuma');
    expect(loan1.psn).toBe('38762');
    expect(loan1.disbursed_amount).toBe(800000);
    expect(loan1.profit_amount).toBe(80000);
    expect(loan1.total_repayment).toBe(880000);
    expect(loan1.amount_repaid).toBe(440000);
    expect(loan1.profit_collected).toBe(40000);
    expect(loan1.outstanding_profit).toBe(40000);
    expect(loan1.loan_status).toBe('disbursed');
  });

  it('exports CSV on GET /audit/investment-profits?export=csv', async () => {
    const res = await request(app)
      .get('/audit/investment-profits?export=csv')
      .set('Authorization', `Bearer ${auditorToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('investment_profits_audit_disbursement.csv');
    expect(res.text).toContain('Loan ID,Agreement Reference,Member Name,PSN');
    expect(res.text).toContain('AG-00152');
    expect(res.text).toContain('Malam Ibrahim Danjuma');
  });

  it('filters by collection/payment date properly', async () => {
    const res = await request(app)
      .get('/audit/investment-profits?dateFilterMode=collection&startDate=2026-09-01&endDate=2026-09-30')
      .set('Authorization', `Bearer ${auditorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.summary.dateFilterMode).toBe('collection');
    expect(res.body.data.summary.profitCollected).toBe(40000);
  });

  it('denies access to non-auditor roles', async () => {
    const res = await request(app)
      .get('/audit/investment-profits')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
