process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret';

jest.mock('../services/emailService', () => ({
  sendEmail: jest.fn(async () => ({ success: true }))
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const { sequelize, User, MembershipApplication, ContributionIncreaseRequest, Settings } = require('../models');

describe('Contribution Increase Request Workflow', () => {
  let adminToken;
  let memberToken;
  let otherMemberToken;
  let memberUser;
  let memberApp;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    const adminMembership = await MembershipApplication.create({
      name: 'Admin User',
      psn: 'ADMIN_CIR_001',
      email: 'admin_cir@test.local',
      phone: '1111111111',
      facility_name: 'Admin Facility',
      next_of_kin_name: 'Admin NOK',
      next_of_kin_phone: '1111100000',
      status: 'approved'
    });

    const admin = await User.create({
      membership_application_id: adminMembership.id,
      password_hash: 'password',
      role: 'admin',
      can_liquidate_loans: true
    });
    adminToken = jwt.sign({ id: admin.id }, 'test_secret');

    memberApp = await MembershipApplication.create({
      name: 'Member User',
      psn: 'MEM_CIR_001',
      email: 'member_cir@test.local',
      phone: '2222222222',
      facility_name: 'Member Facility',
      next_of_kin_name: 'Member NOK',
      next_of_kin_phone: '2222200000',
      status: 'approved',
      contribution_amount_commitment: 5000
    });

    memberUser = await User.create({
      membership_application_id: memberApp.id,
      password_hash: 'password',
      role: 'member'
    });
    memberToken = jwt.sign({ id: memberUser.id }, 'test_secret');

    const otherMemberApp = await MembershipApplication.create({
      name: 'Other Member',
      psn: 'MEM_CIR_002',
      email: 'member2_cir@test.local',
      phone: '3333333333',
      facility_name: 'Member Facility 2',
      next_of_kin_name: 'Member NOK 2',
      next_of_kin_phone: '3333300000',
      status: 'approved',
      contribution_amount_commitment: 7000
    });

    const otherMemberUser = await User.create({
      membership_application_id: otherMemberApp.id,
      password_hash: 'password',
      role: 'member'
    });
    otherMemberToken = jwt.sign({ id: otherMemberUser.id }, 'test_secret');

    await Settings.create({ key: 'min_contribution_increase_percent', value: 10 });
    await Settings.create({ key: 'max_contribution_increase_percent', value: 200 });
    await Settings.create({ key: 'min_contribution_commitment', value: 0 });
    await Settings.create({ key: 'max_contribution_commitment', value: 1000000 });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('requires a justification (member_note) on submission', async () => {
    const submitRes = await request(app)
      .post('/contributions/increase-requests')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ requested_amount: 8000, member_note: '' });

    expect(submitRes.status).toBe(400);
    expect(submitRes.body.success).toBe(false);
  });

  it('member can submit a request and admin can approve it (comment required)', async () => {
    const submitRes = await request(app)
      .post('/contributions/increase-requests')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ requested_amount: 8000, member_note: 'Need to increase' });

    expect(submitRes.status).toBe(201);
    expect(submitRes.body.success).toBe(true);
    expect(submitRes.body.request.status).toBe('PENDING');

    const requestId = submitRes.body.request.id;

    const approveRes = await request(app)
      .post(`/contributions/increase-requests/${requestId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ comment: 'Approved after review' });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.success).toBe(true);
    expect(approveRes.body.request.status).toBe('APPROVED');
    expect(approveRes.body.request.review_comment).toBe('Approved after review');

    const refreshed = await MembershipApplication.findByPk(memberApp.id);
    expect(parseFloat(refreshed.contribution_amount_commitment)).toBe(8000);

    const persisted = await ContributionIncreaseRequest.findByPk(requestId);
    expect(persisted.reviewed_by).toBeDefined();
  });

  it('reject requires a mandatory comment', async () => {
    const submitRes = await request(app)
      .post('/contributions/increase-requests')
      .set('Authorization', `Bearer ${otherMemberToken}`)
      .send({ requested_amount: 9000, member_note: 'Increase request' });

    expect(submitRes.status).toBe(201);
    const requestId = submitRes.body.request.id;

    const rejectRes = await request(app)
      .post(`/contributions/increase-requests/${requestId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ comment: '' });

    expect(rejectRes.status).toBe(400);
    expect(rejectRes.body.success).toBe(false);

    const rejectRes2 = await request(app)
      .post(`/contributions/increase-requests/${requestId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ comment: 'Rejected for test cleanup' });

    expect(rejectRes2.status).toBe(200);
    expect(rejectRes2.body.request.status).toBe('REJECTED');
  });

  it('enforces minimum increase percentage', async () => {
    const memberXApp = await MembershipApplication.create({
      name: 'Member X',
      psn: 'MEM_CIR_004',
      email: 'member4_cir@test.local',
      phone: '5555555555',
      facility_name: 'Member Facility 4',
      next_of_kin_name: 'Member NOK 4',
      next_of_kin_phone: '5555500000',
      status: 'approved',
      contribution_amount_commitment: 7000
    });
    const memberXUser = await User.create({
      membership_application_id: memberXApp.id,
      password_hash: 'password',
      role: 'member'
    });
    const memberXToken = jwt.sign({ id: memberXUser.id }, 'test_secret');

    const submitRes = await request(app)
      .post('/contributions/increase-requests')
      .set('Authorization', `Bearer ${memberXToken}`)
      .send({ requested_amount: 7050, member_note: 'Too small' });

    expect(submitRes.status).toBe(400);
    expect(submitRes.body.success).toBe(false);
  });

  it('enforces maximum increase percentage when configured', async () => {
    const memberZApp = await MembershipApplication.create({
      name: 'Member Z',
      psn: 'MEM_CIR_006',
      email: 'member6_cir@test.local',
      phone: '7777777777',
      facility_name: 'Member Facility 6',
      next_of_kin_name: 'Member NOK 6',
      next_of_kin_phone: '7777700000',
      status: 'approved',
      contribution_amount_commitment: 5000
    });
    const memberZUser = await User.create({
      membership_application_id: memberZApp.id,
      password_hash: 'password',
      role: 'member'
    });
    const memberZToken = jwt.sign({ id: memberZUser.id }, 'test_secret');

    const submitRes = await request(app)
      .post('/contributions/increase-requests')
      .set('Authorization', `Bearer ${memberZToken}`)
      .send({ requested_amount: 20000, member_note: 'Too big' });

    expect(submitRes.status).toBe(400);
    expect(submitRes.body.success).toBe(false);
  });

  it('prevents approval when requested amount becomes invalid compared to current commitment', async () => {
    const memberWApp = await MembershipApplication.create({
      name: 'Member W',
      psn: 'MEM_CIR_007',
      email: 'member7_cir@test.local',
      phone: '8888888888',
      facility_name: 'Member Facility 7',
      next_of_kin_name: 'Member NOK 7',
      next_of_kin_phone: '8888800000',
      status: 'approved',
      contribution_amount_commitment: 5000
    });
    const memberWUser = await User.create({
      membership_application_id: memberWApp.id,
      password_hash: 'password',
      role: 'member'
    });
    const memberWToken = jwt.sign({ id: memberWUser.id }, 'test_secret');

    const submitRes = await request(app)
      .post('/contributions/increase-requests')
      .set('Authorization', `Bearer ${memberWToken}`)
      .send({ requested_amount: 8000, member_note: 'Will become invalid' });
    expect(submitRes.status).toBe(201);

    await memberWApp.update({ contribution_amount_commitment: 9000 });

    const approveRes = await request(app)
      .post(`/contributions/increase-requests/${submitRes.body.request.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ comment: 'Attempt approve after change' });
    expect(approveRes.status).toBe(400);
  });

  it('prevents multiple pending requests per member', async () => {
    const memberYApp = await MembershipApplication.create({
      name: 'Member Y',
      psn: 'MEM_CIR_005',
      email: 'member5_cir@test.local',
      phone: '6666666666',
      facility_name: 'Member Facility 5',
      next_of_kin_name: 'Member NOK 5',
      next_of_kin_phone: '6666600000',
      status: 'approved',
      contribution_amount_commitment: 6000
    });
    const memberYUser = await User.create({
      membership_application_id: memberYApp.id,
      password_hash: 'password',
      role: 'member'
    });
    const memberYToken = jwt.sign({ id: memberYUser.id }, 'test_secret');

    const first = await request(app)
      .post('/contributions/increase-requests')
      .set('Authorization', `Bearer ${memberYToken}`)
      .send({ requested_amount: 8000, member_note: 'First' });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post('/contributions/increase-requests')
      .set('Authorization', `Bearer ${memberYToken}`)
      .send({ requested_amount: 8500, member_note: 'Second' });
    expect(second.status).toBe(400);
  });

  it('supports optional supporting document upload', async () => {
    const member3App = await MembershipApplication.create({
      name: 'Member Three',
      psn: 'MEM_CIR_003',
      email: 'member3_cir@test.local',
      phone: '4444444444',
      facility_name: 'Member Facility 3',
      next_of_kin_name: 'Member NOK 3',
      next_of_kin_phone: '4444400000',
      status: 'approved',
      contribution_amount_commitment: 5000
    });
    const member3User = await User.create({
      membership_application_id: member3App.id,
      password_hash: 'password',
      role: 'member'
    });
    const member3Token = jwt.sign({ id: member3User.id }, 'test_secret');

    const submitRes = await request(app)
      .post('/contributions/increase-requests')
      .set('Authorization', `Bearer ${member3Token}`)
      .field('requested_amount', '7000')
      .field('member_note', 'With document')
      .attach('supporting_document', Buffer.from('hello'), { filename: 'note.txt', contentType: 'text/plain' });

    expect(submitRes.status).toBe(201);
    expect(submitRes.body.request.supporting_document_url).toBeTruthy();
  });

  it('enforces a DB-level single-pending constraint per member (race safety)', async () => {
    const memberCApp = await MembershipApplication.create({
      name: 'Member Concurrency',
      psn: 'MEM_CIR_008',
      email: 'member8_cir@test.local',
      phone: '9999999999',
      facility_name: 'Member Facility 8',
      next_of_kin_name: 'Member NOK 8',
      next_of_kin_phone: '9999900000',
      status: 'approved',
      contribution_amount_commitment: 5000
    });
    const memberCUser = await User.create({
      membership_application_id: memberCApp.id,
      password_hash: 'password',
      role: 'member'
    });

    await ContributionIncreaseRequest.create({
      user_id: memberCUser.id,
      membership_application_id: memberCApp.id,
      current_amount: 5000,
      requested_amount: 8000,
      status: 'PENDING',
      member_note: 'First pending',
      requested_at: new Date()
    });

    await expect(
      ContributionIncreaseRequest.create({
        user_id: memberCUser.id,
        membership_application_id: memberCApp.id,
        current_amount: 5000,
        requested_amount: 8500,
        status: 'PENDING',
        member_note: 'Second pending',
        requested_at: new Date()
      })
    ).rejects.toBeTruthy();
  });

  it('blocks non-admin from listing requests', async () => {
    const listRes = await request(app)
      .get('/contributions/increase-requests?status=PENDING')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(listRes.status).toBe(403);
  });

  it('blocks non-admin from approving', async () => {
    const submitRes = await request(app)
      .post('/contributions/increase-requests')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ requested_amount: 9000, member_note: 'Need to increase again' });

    expect(submitRes.status).toBe(201);
    const requestId = submitRes.body.request.id;

    const approveRes = await request(app)
      .post(`/contributions/increase-requests/${requestId}/approve`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ comment: 'Not allowed' });

    expect(approveRes.status).toBe(403);
  });

  it('allows treasurer to list requests', async () => {
    const treasurerMembership = await MembershipApplication.create({
      name: 'Treasurer User',
      psn: 'TREAS_CIR_001',
      email: 'treasurer_cir@test.local',
      phone: '1010101010',
      facility_name: 'Treasurer Facility',
      next_of_kin_name: 'Treasurer NOK',
      next_of_kin_phone: '1010100000',
      status: 'approved'
    });
    const treasurer = await User.create({
      membership_application_id: treasurerMembership.id,
      password_hash: 'password',
      role: 'treasurer'
    });
    const treasurerToken = jwt.sign({ id: treasurer.id }, 'test_secret');

    const listRes = await request(app)
      .get('/contributions/increase-requests?status=PENDING')
      .set('Authorization', `Bearer ${treasurerToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.success).toBe(true);
  });

  it('allows admin to export displayed requests as PDF', async () => {
    const memberPApp = await MembershipApplication.create({
      name: 'Member PDF',
      psn: 'MEM_CIR_PDF_001',
      email: 'member_pdf@test.local',
      phone: '1212121212',
      facility_name: 'Member Facility PDF',
      next_of_kin_name: 'Member NOK PDF',
      next_of_kin_phone: '1212100000',
      status: 'approved',
      contribution_amount_commitment: 5000
    });
    const memberPUser = await User.create({
      membership_application_id: memberPApp.id,
      password_hash: 'password',
      role: 'member'
    });
    const memberPToken = jwt.sign({ id: memberPUser.id }, 'test_secret');

    const submitRes = await request(app)
      .post('/contributions/increase-requests')
      .set('Authorization', `Bearer ${memberPToken}`)
      .send({ requested_amount: 8000, member_note: 'PDF export test' });
    expect(submitRes.status).toBe(201);

    const exportRes = await request(app)
      .post('/contributions/increase-requests/export/pdf')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ids: [submitRes.body.request.id] });

    expect(exportRes.status).toBe(200);
    expect(exportRes.headers['content-type']).toMatch(/application\/pdf/);
  });

  it('restricts commitment and my-requests endpoints to member role', async () => {
    const res1 = await request(app)
      .get('/contributions/commitment')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res1.status).toBe(403);

    const res2 = await request(app)
      .get('/contributions/increase-requests/my')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res2.status).toBe(403);
  });
});
