const request = require('supertest');
const app = require('../app');
const {
  User,
  MembershipApplication,
  Contribution,
  Loan,
  LoanRepayment,
  LoanLiquidation,
  sequelize
} = require('../models');
const jwt = require('jsonwebtoken');

describe('Member Account Closure & Loan Reconciliation', () => {
  let adminToken;
  let adminUser;
  let memberUser;
  let membershipApp;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    // Generate an admin user and token
    const adminApp = await MembershipApplication.create({
      name: 'System Admin',
      psn: 'ADMIN001',
      email: 'admin001@example.com',
      phone: '08000000001',
      facility_name: 'HQ',
      next_of_kin_name: 'NOK Admin',
      next_of_kin_phone: '08000000002',
      savings: 0,
      investment: 0,
      contribution_amount_commitment: 0,
      status: 'approved'
    });

    adminUser = await User.create({
      membership_application_id: adminApp.id,
      password_hash: 'hash',
      role: 'admin',
      status: 'active'
    });

    adminToken = jwt.sign(
      { id: adminUser.id, role: 'admin', psn: 'ADMIN001' },
      process.env.JWT_SECRET || 'test_secret',
      { expiresIn: '1h' }
    );
  });

  beforeEach(async () => {
    membershipApp = await MembershipApplication.create({
      name: 'Test Member Closure',
      psn: `PSN_CLOSE_${Date.now()}`,
      email: `member_close_${Date.now()}@example.com`,
      phone: '08012345679',
      facility_name: 'General Hospital',
      next_of_kin_name: 'NOK Closure',
      next_of_kin_phone: '08098765432',
      savings: 10000,
      investment: 0,
      contribution_amount_commitment: 10000,
      status: 'approved'
    });

    memberUser = await User.create({
      membership_application_id: membershipApp.id,
      password_hash: '$2a$10$abcdefghijklmnopqrstuv',
      role: 'member',
      status: 'active'
    });
  });

  it('should return accurate closure preview when member has contributions and outstanding loans', async () => {
    // Add ₦200,000 in approved contributions
    await Contribution.create({
      user_id: memberUser.id,
      total_amount: 200000,
      savings: 200000,
      status: 'approved',
      month: 9,
      year: 2026,
      contribution_date: new Date()
    });

    // Create a loan of ₦150,000 total repayment, with ₦50,000 already repaid
    const loan = await Loan.create({
      user_id: memberUser.id,
      loan_type: 'cash',
      amount_requested: 150000,
      amount_approved: 150000,
      total_repayment: 150000,
      repayment_period_months: 12,
      status: 'active'
    });

    await LoanRepayment.create({
      loan_id: loan.id,
      user_id: memberUser.id,
      repayment_amount: 50000,
      repayment_date: '2026-09-01',
      payment_method: 'cash',
      recorded_by: adminUser.id,
      status: 'verified'
    });

    const res = await request(app)
      .get(`/members/${memberUser.id}/close-preview`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.contribution_balance).toBe(200000);
    expect(res.body.total_loan_balance).toBe(100000); // 150k - 50k
    expect(res.body.can_liquidate).toBe(true);
    expect(res.body.max_liquidatable).toBe(100000);
    expect(res.body.projected_remaining_contribution).toBe(100000); // 200k - 100k
    expect(res.body.projected_refund_amount).toBe(100000);
    expect(res.body.final_contribution_balance_after_closure).toBe(0);
    expect(res.body.projected_remaining_loan).toBe(0);
    expect(res.body.outstanding_loans).toHaveLength(1);
    expect(res.body.outstanding_loans[0].remaining_balance).toBe(100000);
  });

  it('should close member account, liquidate outstanding loans, and refund remaining balance to ₦0', async () => {
    // Approved contribution: ₦300,000
    await Contribution.create({
      user_id: memberUser.id,
      total_amount: 300000,
      savings: 300000,
      status: 'approved',
      month: 9,
      year: 2026,
      contribution_date: new Date()
    });

    // Loan of ₦100,000
    const loan = await Loan.create({
      user_id: memberUser.id,
      loan_type: 'cash',
      amount_requested: 100000,
      amount_approved: 100000,
      total_repayment: 100000,
      repayment_period_months: 6,
      status: 'active'
    });

    const res = await request(app)
      .post(`/members/${memberUser.id}/close-account`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        liquidate_from_contribution: true,
        closure_reason: 'Retirement from service',
        settlement_notes: 'Paid remaining balance via cheque'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.closure_summary.status).toBe('closed');
    expect(res.body.closure_summary.total_liquidated).toBe(100000);
    expect(res.body.closure_summary.refunded_amount).toBe(200000);
    expect(res.body.closure_summary.remaining_contribution_balance).toBe(0);
    expect(res.body.closure_summary.remaining_loan_balance).toBe(0);

    // Verify database state
    const updatedMember = await User.findByPk(memberUser.id);
    expect(updatedMember.status).toBe('closed');
    expect(updatedMember.deleted_at).toBeNull(); // NOT deleted

    const updatedLoan = await Loan.findByPk(loan.id);
    expect(updatedLoan.status).toBe('completed'); // Fully paid off

    // Verify negative contribution deduction for loan was created
    const deduction = await Contribution.findOne({
      where: { user_id: memberUser.id, total_amount: -100000 }
    });
    expect(deduction).not.toBeNull();

    // Verify negative contribution deduction for refund was created
    const refund = await Contribution.findOne({
      where: { user_id: memberUser.id, total_amount: -200000 }
    });
    expect(refund).not.toBeNull();

    // Verify total approved contributions is now exactly 0
    const finalBalance = await Contribution.sum('total_amount', {
      where: { user_id: memberUser.id, status: 'approved' }
    });
    expect(parseFloat(finalBalance || 0)).toBe(0);

    // Verify loan liquidation row exists
    const liquidation = await LoanLiquidation.findOne({
      where: { loan_id: loan.id, member_user_id: memberUser.id }
    });
    expect(liquidation).not.toBeNull();
    expect(parseFloat(liquidation.amount)).toBe(100000);
  });

  it('should partially liquidate loan when contributions are less than loan balance', async () => {
    // Approved contribution: ₦40,000
    await Contribution.create({
      user_id: memberUser.id,
      total_amount: 40000,
      savings: 40000,
      status: 'approved',
      month: 9,
      year: 2026,
      contribution_date: new Date()
    });

    // Loan of ₦100,000
    const loan = await Loan.create({
      user_id: memberUser.id,
      loan_type: 'cash',
      amount_requested: 100000,
      amount_approved: 100000,
      total_repayment: 100000,
      repayment_period_months: 6,
      status: 'active'
    });

    const res = await request(app)
      .post(`/members/${memberUser.id}/close-account`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        liquidate_from_contribution: true,
        closure_reason: 'Transferred out of state'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.closure_summary.total_liquidated).toBe(40000);
    expect(res.body.closure_summary.refunded_amount).toBe(0);
    expect(res.body.closure_summary.remaining_contribution_balance).toBe(0);
    expect(res.body.closure_summary.remaining_loan_balance).toBe(60000);

    const updatedLoan = await Loan.findByPk(loan.id);
    expect(updatedLoan.status).toBe('active'); // Still has remaining balance

    const updatedMember = await User.findByPk(memberUser.id);
    expect(updatedMember.status).toBe('closed');
    expect(updatedMember.deleted_at).toBeNull();
  });

  it('should allow reopening a closed account via activateMember', async () => {
    await memberUser.update({ status: 'closed' });

    const res = await request(app)
      .put(`/members/${memberUser.id}/activate`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updatedMember = await User.findByPk(memberUser.id);
    expect(updatedMember.status).toBe('active');
  });

  it('should close account and refund all contributions to ₦0 when member has no loans or liquidation is skipped', async () => {
    // Approved contribution: ₦100,000
    await Contribution.create({
      user_id: memberUser.id,
      total_amount: 100000,
      savings: 100000,
      status: 'approved',
      month: 9,
      year: 2026,
      contribution_date: new Date()
    });

    const loan = await Loan.create({
      user_id: memberUser.id,
      loan_type: 'cash',
      amount_requested: 50000,
      amount_approved: 50000,
      total_repayment: 50000,
      repayment_period_months: 6,
      status: 'active'
    });

    const res = await request(app)
      .post(`/members/${memberUser.id}/close-account`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        liquidate_from_contribution: false,
        closure_reason: 'Administrative action'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.closure_summary.total_liquidated).toBe(0);
    expect(res.body.closure_summary.refunded_amount).toBe(100000);
    expect(res.body.closure_summary.remaining_contribution_balance).toBe(0);
    expect(res.body.closure_summary.remaining_loan_balance).toBe(50000);

    // Contribution balance in DB should now be 0
    const finalBalance = await Contribution.sum('total_amount', {
      where: { user_id: memberUser.id, status: 'approved' }
    });
    expect(parseFloat(finalBalance || 0)).toBe(0);

    const updatedLoan = await Loan.findByPk(loan.id);
    expect(updatedLoan.status).toBe('active'); // Untouched
  });

  it('should reject login for closed member with descriptive error message', async () => {
    await memberUser.update({ status: 'closed' });

    const res = await request(app)
      .post('/auth/login')
      .send({
        psn: membershipApp.psn,
        password: 'anyPassword'
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('This account has been closed. Please contact cooperative administration.');
  });

  afterAll(async () => {
    await sequelize.close();
  });
});
