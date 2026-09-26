process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const {
  sequelize,
  User,
  MembershipApplication,
  LayyahApplication,
  Loan,
  LoanRepayment,
  Settings,
  Notification
} = require('../models');

describe('Layyah Disbursement Loan Top-Up & Balance Consolidation', () => {
  jest.setTimeout(30000);

  let adminToken;
  let adminUser;
  let memberUser;
  let memberToken;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    await Settings.create({ key: 'layyah_seasonal_program_enabled', value: true });

    const adminMembership = await MembershipApplication.create({
      name: 'Admin Master',
      psn: 'ADM999',
      email: 'admin_master@test.local',
      phone: '08011112222',
      facility_name: 'HQ',
      next_of_kin_name: 'Nok',
      next_of_kin_phone: '08011112223',
      status: 'approved'
    });
    adminUser = await User.create({
      membership_application_id: adminMembership.id,
      password_hash: 'password',
      role: 'admin',
      status: 'active'
    });
    adminToken = jwt.sign({ id: adminUser.id }, 'test_secret');

    const memberMembership = await MembershipApplication.create({
      name: 'Test Member',
      psn: 'MBR777',
      email: 'member777@test.local',
      phone: '08033334444',
      facility_name: 'HQ',
      next_of_kin_name: 'Nok',
      next_of_kin_phone: '08033334445',
      status: 'approved'
    });
    memberUser = await User.create({
      membership_application_id: memberMembership.id,
      password_hash: 'password',
      role: 'member',
      status: 'active'
    });
    memberToken = jwt.sign({ id: memberUser.id }, 'test_secret');
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('adds Layyah disbursement + 10% profit to an existing loan balance (50,000 + 110,000 = 160,000)', async () => {
    // 1. Create an existing loan with balance 50,000
    const existingLoan = await Loan.create({
      user_id: memberUser.id,
      loan_type: 'cash',
      amount_requested: 50000,
      amount_approved: 50000,
      repayment_period_months: 12,
      monthly_repayment: 4166.67,
      total_repayment: 50000,
      status: 'active',
      purpose: 'Emergency Personal Loan',
      notes: JSON.stringify({ notes: 'Initial personal loan' })
    });

    // 2. Create an approved Layyah application for 100,000
    const layyahApp = await LayyahApplication.create({
      user_id: memberUser.id,
      kind: 'individual',
      animal_category: 'ram',
      quantity: 1,
      price_min: 80000,
      price_max: 100000,
      applied_amount: 100000,
      status: 'approved',
      applicant_name: 'Test Member',
      user_psn: 'MBR777'
    });

    // 3. Disburse the Layyah application
    const res = await request(app)
      .put(`/layyah/applications/${layyahApp.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'disbursed', notes: 'Disbursement approved by admin' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.application.status).toBe('disbursed');
    expect(res.body.loan).toBeTruthy();
    expect(res.body.loan.id).toBe(existingLoan.id);

    // 4. Verify existing loan was updated: 50,000 + 110,000 (100,000 + 10% profit) = 160,000
    const updatedLoan = await Loan.findByPk(existingLoan.id);
    expect(parseFloat(updatedLoan.total_repayment)).toBe(160000);
    expect(parseFloat(updatedLoan.amount_approved)).toBe(150000); // 50,000 original + 100,000 principal
    expect(updatedLoan.purpose).toContain('Emergency Personal Loan');
    expect(updatedLoan.purpose).toContain(`Layyah disbursement for application #${layyahApp.id}`);

    const notesObj = JSON.parse(updatedLoan.notes);
    expect(notesObj.layyah_additions).toHaveLength(1);
    expect(notesObj.layyah_additions[0].principal).toBe(100000);
    expect(notesObj.layyah_additions[0].profit_margin_amount).toBe(10000);
    expect(notesObj.layyah_additions[0].layyah_with_profit).toBe(110000);
    expect(notesObj.layyah_additions[0].previous_balance).toBe(50000);
    expect(notesObj.layyah_additions[0].new_balance).toBe(160000);

    // 5. Verify member financial profile reflects the 160,000 balance
    const profileRes = await request(app)
      .get(`/members/${memberUser.id}/financial-profile`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(profileRes.status).toBe(200);
    expect(profileRes.body.profile.loan.remaining_balance).toBe(160000);
    expect(profileRes.body.profile.loan.total_repayment).toBe(160000);

    // 6. Verify notification was created
    const notif = await Notification.findOne({
      where: { user_id: memberUser.id, type: 'layyah_disbursed' },
      order: [['id', 'DESC']]
    });
    expect(notif).toBeTruthy();
    expect(notif.message).toContain('160,000');
    expect(notif.message).toContain('50,000');
    expect(notif.message).toContain('110,000');
  });

  it('correctly handles existing loan that had prior repayments before top-up', async () => {
    // Create new member
    const m2 = await MembershipApplication.create({
      name: 'Repaying Member',
      psn: 'MBR888',
      email: 'm888@test.local',
      phone: '08055556666',
      facility_name: 'HQ',
      next_of_kin_name: 'Nok',
      next_of_kin_phone: '08055556667',
      status: 'approved'
    });
    const u2 = await User.create({
      membership_application_id: m2.id,
      password_hash: 'password',
      role: 'member',
      status: 'active'
    });

    // Existing loan: 80,000 total repayment, 30,000 verified repayments -> 50,000 remaining
    const loan = await Loan.create({
      user_id: u2.id,
      loan_type: 'investment',
      amount_requested: 80000,
      amount_approved: 80000,
      repayment_period_months: 12,
      total_repayment: 80000,
      monthly_repayment: 6666.67,
      status: 'disbursed'
    });

    await LoanRepayment.create({
      loan_id: loan.id,
      user_id: u2.id,
      repayment_amount: 30000,
      repayment_date: '2026-01-15',
      payment_method: 'bank_transfer',
      status: 'verified',
      recorded_by: adminUser.id
    });

    // Layyah application for 100,000
    const layyahApp = await LayyahApplication.create({
      user_id: u2.id,
      kind: 'individual',
      animal_category: 'cow',
      quantity: 1,
      price_min: 90000,
      price_max: 100000,
      applied_amount: 100000,
      status: 'approved',
      applicant_name: 'Repaying Member',
      user_psn: 'MBR888'
    });

    const res = await request(app)
      .put(`/layyah/applications/${layyahApp.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'disbursed' });

    expect(res.status).toBe(200);

    // Prior remaining was 50,000. Layyah with 10% profit is 110,000.
    // New total repayment becomes 80,000 + 110,000 = 190,000.
    // Since 30,000 was already paid, new remaining balance is 190,000 - 30,000 = 160,000!
    const updatedLoan = await Loan.findByPk(loan.id);
    expect(parseFloat(updatedLoan.total_repayment)).toBe(190000);

    const profileRes = await request(app)
      .get(`/members/${u2.id}/financial-profile`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(profileRes.body.profile.loan.remaining_balance).toBe(160000);
  });

  it('creates a standalone loan if member has no existing loan', async () => {
    const m3 = await MembershipApplication.create({
      name: 'Fresh Member',
      psn: 'MBR999',
      email: 'm999@test.local',
      phone: '08077778888',
      facility_name: 'HQ',
      next_of_kin_name: 'Nok',
      next_of_kin_phone: '08077778889',
      status: 'approved'
    });
    const u3 = await User.create({
      membership_application_id: m3.id,
      password_hash: 'password',
      role: 'member',
      status: 'active'
    });

    const layyahApp = await LayyahApplication.create({
      user_id: u3.id,
      kind: 'individual',
      animal_category: 'goat',
      quantity: 1,
      price_min: 80000,
      price_max: 100000,
      applied_amount: 100000,
      status: 'approved',
      applicant_name: 'Fresh Member',
      user_psn: 'MBR999'
    });

    const res = await request(app)
      .put(`/layyah/applications/${layyahApp.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'disbursed' });

    expect(res.status).toBe(200);
    const newLoan = await Loan.findByPk(res.body.loan.id);
    expect(parseFloat(newLoan.amount_approved)).toBe(100000);
    expect(parseFloat(newLoan.total_repayment)).toBe(110000); // 100,000 + 10%
  });

  it('allows reversing a Layyah top-up if no repayments occurred after disbursement', async () => {
    // Member 1 had loan with Layyah top-up: total_repayment 160000, amount_approved 150000
    const appRow = await LayyahApplication.findOne({
      where: { user_psn: 'MBR777', status: 'disbursed' }
    });

    const revRes = await request(app)
      .post(`/layyah/admin/applications/${appRow.id}/reverse`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ to_status: 'approved', reason: 'Member changed mind before receiving animal' });

    expect(revRes.status).toBe(200);
    expect(revRes.body.success).toBe(true);

    // Verify the loan was NOT rejected, but rolled back: 160000 - 110000 = 50000
    const rolledBackLoan = await Loan.findOne({ where: { user_id: memberUser.id, status: { [require('sequelize').Op.ne]: 'rejected' } } });
    expect(rolledBackLoan).toBeTruthy();
    expect(parseFloat(rolledBackLoan.total_repayment)).toBe(50000);
    expect(parseFloat(rolledBackLoan.amount_approved)).toBe(50000);
    expect(rolledBackLoan.status).toBe('active');
  });
});
