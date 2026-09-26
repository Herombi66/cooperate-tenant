process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const {
  sequelize,
  User,
  MembershipApplication,
  Contribution,
  ContributionWithdrawal,
  Loan,
  LoanRepayment,
  ProfitShare,
  Settings
} = require('../models');

describe('Real-time Member Account Statement Engine', () => {
  jest.setTimeout(30000);

  let adminToken;
  let adminUser;
  let member1Token;
  let member1User;
  let member1Membership;
  let member2Token;
  let member2User;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    await Settings.create({ key: 'layyah_seasonal_program_enabled', value: true });

    // 1. Admin
    const adminApp = await MembershipApplication.create({
      name: 'Admin Boss',
      psn: 'ADM001',
      email: 'admin001@test.local',
      phone: '08012345678',
      facility_name: 'HQ',
      next_of_kin_name: 'Admin NOK',
      next_of_kin_phone: '08011112222',
      status: 'approved'
    });
    adminUser = await User.create({
      membership_application_id: adminApp.id,
      password_hash: 'password',
      role: 'admin',
      status: 'active'
    });
    adminToken = jwt.sign({ id: adminUser.id }, 'test_secret');

    // 2. Member 1
    member1Membership = await MembershipApplication.create({
      name: 'Ibrahim Musa',
      psn: 'MBR101',
      email: 'ibrahim@test.local',
      phone: '08022223333',
      facility_name: 'Main Hospital',
      next_of_kin_name: 'Amina Musa',
      next_of_kin_phone: '08033334444',
      status: 'approved'
    });
    member1User = await User.create({
      membership_application_id: member1Membership.id,
      password_hash: 'password',
      role: 'member',
      status: 'active'
    });
    member1Token = jwt.sign({ id: member1User.id }, 'test_secret');

    // 3. Member 2
    const member2App = await MembershipApplication.create({
      name: 'Amina Bello',
      psn: 'MBR102',
      email: 'amina@test.local',
      phone: '08044445555',
      facility_name: 'HQ',
      next_of_kin_name: 'Bello NOK',
      next_of_kin_phone: '08055556666',
      status: 'approved'
    });
    member2User = await User.create({
      membership_application_id: member2App.id,
      password_hash: 'password',
      role: 'member',
      status: 'active'
    });
    member2Token = jwt.sign({ id: member2User.id }, 'test_secret');
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('generates real-time statement capturing contributions, withdrawals, loans, Layyah top-ups, repayments, transfers, and verifies running balance', async () => {
    // 1. Month 1 Contribution: ₦50,000 (Savings: 30k, Investment: 10k, Target: 10k)
    await Contribution.create({
      user_id: member1User.id,
      month: 1,
      year: 2026,
      savings: 30000,
      investment: 10000,
      target_saving: 10000,
      total_amount: 50000,
      status: 'approved',
      contribution_date: new Date('2026-01-10T10:00:00Z'),
      payment_method: 'bank_transfer'
    });

    // 2. Month 2 Contribution: ₦50,000
    await Contribution.create({
      user_id: member1User.id,
      month: 2,
      year: 2026,
      savings: 30000,
      investment: 10000,
      target_saving: 10000,
      total_amount: 50000,
      status: 'approved',
      contribution_date: new Date('2026-02-10T10:00:00Z'),
      payment_method: 'salary_deduction'
    });

    // 3. Internal Transfer: Move ₦15,000 from Savings to Investment
    await Contribution.create({
      user_id: member1User.id,
      month: 2,
      year: 2026,
      savings: -15000,
      investment: 15000,
      target_saving: 0,
      total_amount: 0,
      status: 'approved',
      contribution_date: new Date('2026-02-15T12:00:00Z'),
      payment_method: 'internal_transfer',
      notes: 'Fund transfer from Savings to Investment by admin'
    });

    // 4. Target Savings Disbursement: ₦20,000 paid out to member's bank
    await ContributionWithdrawal.create({
      user_id: member1User.id,
      amount: 20000,
      withdrawal_type: 'target_savings',
      year: 2026,
      status: 'disbursed',
      bank_name: 'First Bank',
      account_number: '0123456789',
      notes: 'Target savings target completed payout',
      created_at: new Date('2026-02-20T14:00:00Z'),
      disbursed_at: new Date('2026-02-20T14:00:00Z')
    });

    // 5. Loan Disbursement: ₦80,000 Cash Loan
    const loan = await Loan.create({
      user_id: member1User.id,
      loan_type: 'cash',
      amount_requested: 80000,
      amount_approved: 80000,
      repayment_period_months: 12,
      monthly_repayment: 6666.67,
      total_repayment: 80000,
      status: 'disbursed',
      purpose: 'Medical emergency',
      disbursement_date: new Date('2026-02-25T15:00:00Z'),
      notes: JSON.stringify({
        source: 'standard_loan',
        layyah_additions: [
          {
            layyah_application_id: 42,
            disbursed_at: '2026-03-05T11:00:00Z',
            principal: 100000,
            profit_margin_amount: 10000,
            layyah_with_profit: 110000,
            previous_balance: 80000,
            new_balance: 190000
          }
        ]
      })
    });

    // 6. Loan Repayment: ₦20,000
    await LoanRepayment.create({
      loan_id: loan.id,
      user_id: member1User.id,
      repayment_amount: 20000,
      repayment_date: '2026-03-10',
      payment_method: 'bank_transfer',
      status: 'verified',
      recorded_by: adminUser.id,
      created_at: new Date('2026-03-10T16:00:00Z')
    });

    // 7. Profit Dividend: ₦5,000
    await ProfitShare.create({
      user_id: member1User.id,
      total_investment_pool: 1000000,
      total_profit: 50000,
      member_investment: 100000,
      share_percentage: 10,
      profit_amount: 5000,
      period: '2026-Q1',
      status: 'paid',
      paid_at: new Date('2026-03-15T09:00:00Z')
    });

    // Query statement via GET /reports/member-statement?psn=MBR101
    const res = await request(app)
      .get('/reports/member-statement')
      .query({ psn: 'MBR101' })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const report = res.body.report;
    expect(report.member.psn).toBe('MBR101');
    expect(report.member.name).toBe('Ibrahim Musa');
    expect(Array.isArray(report.statement)).toBe(true);

    // Verify all transactions exist in statement
    const statement = report.statement;
    expect(statement.length).toBeGreaterThanOrEqual(7);

    // Check categories present
    const categories = statement.map((s) => s.category);
    expect(categories).toContain('Contribution');
    expect(categories).toContain('Transfer');
    expect(categories).toContain('Disbursement');
    expect(categories).toContain('Loan');
    expect(categories).toContain('Layyah Facility');
    expect(categories).toContain('Repayment');
    expect(categories).toContain('Dividend');

    // Verify Layyah facility details
    const layyahEntry = statement.find((s) => s.category === 'Layyah Facility');
    expect(layyahEntry).toBeDefined();
    expect(layyahEntry.reference).toBe('LAYYAH-42');
    expect(layyahEntry.description).toContain('100,000');
    expect(layyahEntry.description).toContain('10,000');

    // Verify Transfer details
    const transferEntry = statement.find((s) => s.category === 'Transfer');
    expect(transferEntry).toBeDefined();
    expect(transferEntry.debit).toBe(0);
    expect(transferEntry.credit).toBe(0);

    // Verify sequential running balance arithmetic: balance = prev + credit - debit
    let prev = 0;
    statement.forEach((row) => {
      const expected = prev + row.credit - row.debit;
      expect(row.balance).toBeCloseTo(expected, 2);
      prev = row.balance;
    });

    // Verify closing balance matches last entry balance
    expect(report.balances.closing_ledger_balance).toBe(statement[statement.length - 1].balance);
  });

  it('allows member to access their own statement but blocks access to another member statement', async () => {
    // Member 1 accessing Member 1 statement -> 200 OK
    const ownRes = await request(app)
      .get('/reports/member-statement')
      .query({ psn: 'MBR101' })
      .set('Authorization', `Bearer ${member1Token}`);

    expect(ownRes.status).toBe(200);
    expect(ownRes.body.success).toBe(true);
    expect(ownRes.body.report.member.psn).toBe('MBR101');

    // Member 1 accessing Member 2 statement -> 403 Forbidden
    const forbiddenRes = await request(app)
      .get('/reports/member-statement')
      .query({ psn: 'MBR102' })
      .set('Authorization', `Bearer ${member1Token}`);

    expect(forbiddenRes.status).toBe(403);
    expect(forbiddenRes.body.success).toBe(false);

    // Member 1 accessing member route GET /members/:id/statement for self -> 200 OK
    const selfRouteRes = await request(app)
      .get(`/members/${member1User.id}/statement`)
      .set('Authorization', `Bearer ${member1Token}`);

    expect(selfRouteRes.status).toBe(200);
    expect(selfRouteRes.body.data.member.psn).toBe('MBR101');

    // Member 1 accessing member route GET /members/:id/statement for Member 2 -> 403 Forbidden
    const otherMemberRouteRes = await request(app)
      .get(`/members/${member2User.id}/statement`)
      .set('Authorization', `Bearer ${member1Token}`);

    expect(otherMemberRouteRes.status).toBe(403);
  });

  it('exports statement as CSV and PDF with full transaction data', async () => {
    // CSV export via reports
    const csvRes = await request(app)
      .get('/reports/member-statement')
      .query({ psn: 'MBR101', format: 'csv' })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(csvRes.status).toBe(200);
    expect(csvRes.text).toContain('MEMBER ACCOUNT STATEMENT');
    expect(csvRes.text).toContain('MBR101');
    expect(csvRes.text).toContain('Date,Reference,Category,Description,Debit (NGN),Credit (NGN),Balance (NGN)');

    // PDF export via reports
    const pdfRes = await request(app)
      .get('/reports/member-statement')
      .query({ psn: 'MBR101', format: 'pdf' })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(pdfRes.status).toBe(200);
    expect(pdfRes.headers['content-type']).toContain('application/pdf');

    // CSV export via members/:id/statement
    const memberCsvRes = await request(app)
      .get(`/members/${member1User.id}/statement?format=csv`)
      .set('Authorization', `Bearer ${member1Token}`);

    expect(memberCsvRes.status).toBe(200);
    expect(memberCsvRes.text).toContain('MEMBER ACCOUNT STATEMENT');

    // PDF export via members/:id/statement
    const memberPdfRes = await request(app)
      .get(`/members/${member1User.id}/statement?format=pdf`)
      .set('Authorization', `Bearer ${member1Token}`);

    expect(memberPdfRes.status).toBe(200);
    expect(memberPdfRes.headers['content-type']).toContain('application/pdf');
  });
});
