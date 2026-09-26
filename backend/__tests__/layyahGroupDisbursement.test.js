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
  Settings
} = require('../models');

describe('Layyah Group Disbursement & Member Loan Allocation', () => {
  jest.setTimeout(40000);

  let adminUser, adminToken;
  let leaderUser, leaderToken;
  let member2User, member3User, member4User;
  let groupApp;
  let member2App, member3App, member4App;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    await Settings.create({ key: 'layyah_seasonal_program_enabled', value: true });

    // 1. Admin
    const adminApp = await MembershipApplication.create({
      name: 'Admin Officer',
      psn: 'ADM001',
      email: 'admin@test.local',
      phone: '08011111111',
      facility_name: 'HQ',
      next_of_kin_name: 'Nok',
      next_of_kin_phone: '08011111112',
      status: 'approved'
    });
    adminUser = await User.create({
      membership_application_id: adminApp.id,
      password_hash: 'hash',
      role: 'super_admin',
      status: 'active'
    });
    adminToken = jwt.sign({ id: adminUser.id, role: 'super_admin' }, 'test_secret');

    // 2. Leader (Member 1)
    const leaderApp = await MembershipApplication.create({
      name: 'Group Leader User',
      psn: 'LDR001',
      email: 'leader@test.local',
      phone: '08022222222',
      facility_name: 'Facility A',
      next_of_kin_name: 'Nok',
      next_of_kin_phone: '08022222223',
      status: 'approved'
    });
    leaderUser = await User.create({
      membership_application_id: leaderApp.id,
      password_hash: 'hash',
      role: 'member',
      status: 'active'
    });
    leaderToken = jwt.sign({ id: leaderUser.id, role: 'member' }, 'test_secret');

    // 3. Member 2
    const m2App = await MembershipApplication.create({
      name: 'Member Two',
      psn: 'MBR002',
      email: 'm2@test.local',
      phone: '08033333333',
      facility_name: 'Facility B',
      next_of_kin_name: 'Nok',
      next_of_kin_phone: '08033333334',
      status: 'approved'
    });
    member2User = await User.create({
      membership_application_id: m2App.id,
      password_hash: 'hash',
      role: 'member',
      status: 'active'
    });

    // 4. Member 3
    const m3App = await MembershipApplication.create({
      name: 'Member Three',
      psn: 'MBR003',
      email: 'm3@test.local',
      phone: '08044444444',
      facility_name: 'Facility C',
      next_of_kin_name: 'Nok',
      next_of_kin_phone: '08044444445',
      status: 'approved'
    });
    member3User = await User.create({
      membership_application_id: m3App.id,
      password_hash: 'hash',
      role: 'member',
      status: 'active'
    });

    // 5. Member 4
    const m4App = await MembershipApplication.create({
      name: 'Member Four',
      psn: 'MBR004',
      email: 'm4@test.local',
      phone: '08055555555',
      facility_name: 'Facility D',
      next_of_kin_name: 'Nok',
      next_of_kin_phone: '08055555556',
      status: 'approved'
    });
    member4User = await User.create({
      membership_application_id: m4App.id,
      password_hash: 'hash',
      role: 'member',
      status: 'active'
    });

    // Leader has an existing loan with balance 50,000 (requested 100,000, total 100,000, repaid 50,000)
    const existingLoan = await Loan.create({
      user_id: leaderUser.id,
      loan_type: 'normal',
      amount_requested: 100000,
      amount_approved: 100000,
      repayment_period_months: 10,
      monthly_repayment: 10000,
      total_repayment: 100000,
      status: 'disbursed',
      purpose: 'Existing business loan'
    });
    await LoanRepayment.create({
      loan_id: existingLoan.id,
      user_id: leaderUser.id,
      recorded_by: adminUser.id,
      repayment_amount: 50000,
      payment_method: 'bank_transfer',
      status: 'verified',
      repayment_date: new Date()
    });

    // Create Group Application (kind: 'group', applied_amount: 400,000, status: 'approved')
    groupApp = await LayyahApplication.create({
      user_id: leaderUser.id,
      kind: 'group',
      animal_category: 'cow',
      quantity: 1,
      applied_amount: 400000,
      price_min: 350000,
      price_max: 400000,
      purpose: 'Community Cow Group',
      status: 'approved',
      group_member_count: 3,
      group_leader_id: leaderUser.id,
      applicant_name: 'Group Leader User',
      user_psn: 'LDR001'
    });

    // Create individual member applications joined to the group
    member2App = await LayyahApplication.create({
      user_id: member2User.id,
      kind: 'individual',
      group_id: groupApp.id,
      group_leader_id: leaderUser.id,
      animal_category: 'cow',
      quantity: 1,
      price_min: 350000,
      price_max: 400000,
      purpose: 'Cow Group Share',
      status: 'approved',
      applicant_name: 'Member Two',
      user_psn: 'MBR002'
    });

    member3App = await LayyahApplication.create({
      user_id: member3User.id,
      kind: 'individual',
      group_id: groupApp.id,
      group_leader_id: leaderUser.id,
      animal_category: 'cow',
      quantity: 1,
      price_min: 350000,
      price_max: 400000,
      purpose: 'Cow Group Share',
      status: 'approved',
      applicant_name: 'Member Three',
      user_psn: 'MBR003'
    });

    member4App = await LayyahApplication.create({
      user_id: member4User.id,
      kind: 'individual',
      group_id: groupApp.id,
      group_leader_id: leaderUser.id,
      animal_category: 'cow',
      quantity: 1,
      price_min: 350000,
      price_max: 400000,
      purpose: 'Cow Group Share',
      status: 'approved',
      applicant_name: 'Member Four',
      user_psn: 'MBR004'
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('disburses 400,000 group application with 10% profit (440,000 total) split across 4 members (110,000 each)', async () => {
    const res = await request(app)
      .put(`/layyah/applications/${groupApp.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'disbursed' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.application.status).toBe('disbursed');

    // 1. Verify Leader (User 1) with existing loan balance of 50,000:
    // New loan balance must be 50,000 + 110,000 = 160,000
    // Total repayment must be 100,000 + 110,000 = 210,000
    // Amount approved must be 100,000 + 100,000 = 200,000
    const leaderLoan = await Loan.findOne({
      where: { user_id: leaderUser.id, status: 'disbursed' }
    });
    expect(leaderLoan).toBeTruthy();
    expect(parseFloat(leaderLoan.total_repayment)).toBe(210000);
    expect(parseFloat(leaderLoan.amount_approved)).toBe(200000);

    const parsedLeaderNotes = JSON.parse(leaderLoan.notes);
    expect(Array.isArray(parsedLeaderNotes.layyah_additions)).toBe(true);
    const topup = parsedLeaderNotes.layyah_additions.find((a) => Number(a.group_id) === Number(groupApp.id));
    expect(topup).toBeTruthy();
    expect(topup.type).toBe('layyah_group_topup');
    expect(topup.principal).toBe(100000);
    expect(topup.profit_margin_amount).toBe(10000);
    expect(topup.layyah_with_profit).toBe(110000);
    expect(topup.previous_balance).toBe(50000);
    expect(topup.new_balance).toBe(160000);
    expect(topup.group_member_count).toBe(4);

    // 2. Verify Members 2, 3, 4: each has a new investment loan of 100,000 principal & 110,000 total repayment
    for (const member of [member2User, member3User, member4User]) {
      const memberLoan = await Loan.findOne({
        where: { user_id: member.id, status: 'disbursed' }
      });
      expect(memberLoan).toBeTruthy();
      expect(memberLoan.loan_type).toBe('investment');
      expect(parseFloat(memberLoan.amount_approved)).toBe(100000);
      expect(parseFloat(memberLoan.total_repayment)).toBe(110000);

      const parsedNotes = JSON.parse(memberLoan.notes);
      expect(parsedNotes.source).toBe('layyah_group');
      expect(Number(parsedNotes.group_id)).toBe(Number(groupApp.id));
      expect(parsedNotes.profit_margin_amount).toBe(10000);
    }

    // 3. Verify member individual applications updated to disbursed
    const updatedM2 = await LayyahApplication.findByPk(member2App.id);
    const updatedM3 = await LayyahApplication.findByPk(member3App.id);
    const updatedM4 = await LayyahApplication.findByPk(member4App.id);
    expect(updatedM2.status).toBe('disbursed');
    expect(updatedM3.status).toBe('disbursed');
    expect(updatedM4.status).toBe('disbursed');

    // 4. Verify Leader account statement includes Layyah Group Allocation
    const stmtRes = await request(app)
      .get(`/members/${leaderUser.id}/statement`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(stmtRes.status).toBe(200);
    expect(stmtRes.body.success).toBe(true);
    const statementEntries = stmtRes.body.data?.statement || stmtRes.body.statement || [];
    const groupTopupEntry = statementEntries.find((e) => e.category === 'Layyah Facility' && e.description.includes(`Group #${groupApp.id}`));
    expect(groupTopupEntry).toBeTruthy();
    expect(groupTopupEntry.debit).toBe(100000);
  });

  it('reverses the group disbursement safely when no repayments have occurred', async () => {
    const revRes = await request(app)
      .post(`/layyah/admin/applications/${groupApp.id}/reverse`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ to_status: 'approved', reason: 'Disbursement test reversal' });

    expect(revRes.status).toBe(200);
    expect(revRes.body.success).toBe(true);
    expect(revRes.body.application.status).toBe('approved');

    // Verify Leader loan reverted: total_repayment back to 100,000, amount_approved back to 100,000
    const leaderLoan = await Loan.findOne({
      where: { user_id: leaderUser.id, status: 'disbursed' }
    });
    expect(parseFloat(leaderLoan.total_repayment)).toBe(100000);
    expect(parseFloat(leaderLoan.amount_approved)).toBe(100000);

    const parsedLeaderNotes = JSON.parse(leaderLoan.notes);
    expect(parsedLeaderNotes.layyah_additions.some((a) => Number(a.group_id) === Number(groupApp.id))).toBe(false);

    // Verify Member loans marked rejected
    for (const member of [member2User, member3User, member4User]) {
      const memberLoan = await Loan.findOne({
        where: { user_id: member.id, status: 'rejected' }
      });
      expect(memberLoan).toBeTruthy();
    }

    // Verify individual member applications reverted back to approved
    const updatedM2 = await LayyahApplication.findByPk(member2App.id);
    const updatedM3 = await LayyahApplication.findByPk(member3App.id);
    const updatedM4 = await LayyahApplication.findByPk(member4App.id);
    expect(updatedM2.status).toBe('approved');
    expect(updatedM3.status).toBe('approved');
    expect(updatedM4.status).toBe('approved');
  });

  it('blocks reversing when repayments have been made against an allocated group loan', async () => {
    // Re-disburse the group
    const redisburseRes = await request(app)
      .put(`/layyah/applications/${groupApp.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'disbursed' });

    expect(redisburseRes.status).toBe(200);

    // Make a repayment on Member 2's new investment loan
    const m2Loan = await Loan.findOne({
      where: { user_id: member2User.id, status: 'disbursed' }
    });
    expect(m2Loan).toBeTruthy();

    await LoanRepayment.create({
      loan_id: m2Loan.id,
      user_id: member2User.id,
      recorded_by: adminUser.id,
      repayment_amount: 20000,
      payment_method: 'bank_transfer',
      status: 'verified',
      repayment_date: new Date()
    });

    // Attempt reversal - should be blocked!
    const revRes = await request(app)
      .post(`/layyah/admin/applications/${groupApp.id}/reverse`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ to_status: 'approved', reason: 'Attempt reversal with repayment' });

    expect(revRes.status).toBe(400);
    expect(revRes.body.success).toBe(false);
    expect(revRes.body.message).toContain('repayment activity recorded');
  });
});
