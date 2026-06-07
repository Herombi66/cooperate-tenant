process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const XLSX = require('xlsx');
const { sequelize, User, MembershipApplication, LayyahApplication, Loan, Settings, ActivityLog } = require('../models');

describe('Layyah Application Workflow (under_review + duplicate detection)', () => {
  jest.setTimeout(30000);

  let adminToken;
  let treasurerToken;
  let memberToken;
  let memberUser;
  let member2Token;
  let groupLeaderToken;
  let invitedMemberPsn;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    await Settings.create({ key: 'layyah_seasonal_program_enabled', value: true });

    const adminMembership = await MembershipApplication.create({
      name: 'Admin User',
      psn: 'ADM001',
      email: 'admin@test.local',
      phone: '0800000009',
      facility_name: 'Facility',
      next_of_kin_name: 'Nok',
      next_of_kin_phone: '0800000010',
      status: 'approved'
    });
    const adminUser = await User.create({
      membership_application_id: adminMembership.id,
      password_hash: 'password',
      role: 'admin',
      status: 'active'
    });
    adminToken = jwt.sign({ id: adminUser.id }, 'test_secret');

    const treasurerMembership = await MembershipApplication.create({
      name: 'Treasurer User',
      psn: 'TRE001',
      email: 'treasurer@test.local',
      phone: '0800000088',
      facility_name: 'Facility',
      next_of_kin_name: 'Nok',
      next_of_kin_phone: '0800000089',
      status: 'approved'
    });
    const treasurerUser = await User.create({
      membership_application_id: treasurerMembership.id,
      password_hash: 'password',
      role: 'treasurer',
      status: 'active'
    });
    treasurerToken = jwt.sign({ id: treasurerUser.id }, 'test_secret');

    const memberMembership = await MembershipApplication.create({
      name: 'Member User',
      psn: 'MBR100',
      email: 'member100@test.local',
      phone: '0800000011',
      facility_name: 'Facility',
      next_of_kin_name: 'Nok',
      next_of_kin_phone: '0800000012',
      status: 'approved'
    });
    memberUser = await User.create({
      membership_application_id: memberMembership.id,
      password_hash: 'password',
      role: 'member',
      status: 'active'
    });
    memberToken = jwt.sign({ id: memberUser.id }, 'test_secret');

    const member2Membership = await MembershipApplication.create({
      name: 'Member Two',
      psn: 'MBR200',
      email: 'member200@test.local',
      phone: '0800000099',
      facility_name: 'Facility',
      next_of_kin_name: 'Nok',
      next_of_kin_phone: '0800000100',
      status: 'approved'
    });
    const member2User = await User.create({
      membership_application_id: member2Membership.id,
      password_hash: 'password',
      role: 'member',
      status: 'active'
    });
    member2Token = jwt.sign({ id: member2User.id }, 'test_secret');

    invitedMemberPsn = memberMembership.psn;

    const groupLeaderMembership = await MembershipApplication.create({
      name: 'Group Leader',
      psn: 'GL001',
      email: 'leader@test.local',
      phone: '0800000200',
      facility_name: 'Facility',
      next_of_kin_name: 'Nok',
      next_of_kin_phone: '0800000201',
      status: 'approved'
    });
    const groupLeaderUser = await User.create({
      membership_application_id: groupLeaderMembership.id,
      password_hash: 'password',
      role: 'member',
      status: 'active'
    });
    groupLeaderToken = jwt.sign({ id: groupLeaderUser.id }, 'test_secret');
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('creates a layyah application in pending status', async () => {
    const res = await request(app)
      .post('/layyah/applications')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        kind: 'individual',
        animal_category: 'ram',
        quantity: 1,
        price_min: 100,
        price_max: 200,
        purpose: 'Test application'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.application.status).toBe('pending');
  });

  it('blocks duplicate submissions within the configured window', async () => {
    const res = await request(app)
      .post('/layyah/applications')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        kind: 'individual',
        animal_category: 'ram',
        quantity: 1,
        price_min: 100,
        price_max: 200,
        purpose: 'Duplicate attempt'
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Duplicate application detected/i);
    expect(res.body.details).toBeDefined();
  });

  it('blocks a second submission even with a different animal_category', async () => {
    const res = await request(app)
      .post('/layyah/applications')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        kind: 'individual',
        animal_category: 'goat',
        quantity: 1,
        price_min: 100,
        price_max: 200,
        purpose: 'Different animal (should still block)'
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('allows admin to move an application to under_review', async () => {
    const appRow = await LayyahApplication.findOne({
      where: { user_id: memberUser.id, kind: 'individual', animal_category: 'ram' },
      order: [['created_at', 'ASC']]
    });

    const res = await request(app)
      .put(`/layyah/applications/${appRow.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'under_review', notes: 'Review started' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.application.status).toBe('under_review');
  });

  it('persists admin amount edits and logs an audit event', async () => {
    const appRow = await LayyahApplication.findOne({
      where: { user_id: memberUser.id, kind: 'individual', animal_category: 'ram' }
    });
    expect(appRow).toBeTruthy();

    const res = await request(app)
      .patch(`/layyah/${memberUser.id}/amount`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('If-Match', 'W/"1"')
      .send({ application_id: appRow.id, applied_amount: 123.45 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Number(res.body.item.applied_amount)).toBeCloseTo(123.45, 2);

    const refreshed = await LayyahApplication.findByPk(appRow.id);
    expect(refreshed).toBeTruthy();
    expect(parseFloat(refreshed.applied_amount)).toBeCloseTo(123.45, 2);
    expect(Number(refreshed.amount_version)).toBe(2);

    const log = await ActivityLog.findOne({
      where: { action: 'layyah_amount_updated' },
      order: [['created_at', 'DESC']]
    });
    expect(log).toBeTruthy();
  });

  it('denies non-admin users from updating application status', async () => {
    const appRow = await LayyahApplication.findOne({
      where: { user_id: memberUser.id, kind: 'individual', animal_category: 'ram' }
    });

    const res = await request(app)
      .put(`/layyah/applications/${appRow.id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ status: 'under_review' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('approves an application without automatically disbursing it', async () => {
    const appRow = await LayyahApplication.findOne({
      where: { user_id: memberUser.id, kind: 'individual', animal_category: 'ram' }
    });

    const res = await request(app)
      .put(`/layyah/applications/${appRow.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'approved', notes: 'Approved after review' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.application.status).toBe('approved');
    expect(res.body.loan).toBeFalsy();
  });

  it('creates a second layyah application for another member and rejects it', async () => {
    const createRes = await request(app)
      .post('/layyah/applications')
      .set('Authorization', `Bearer ${member2Token}`)
      .send({
        kind: 'individual',
        animal_category: 'goat',
        quantity: 1,
        price_min: 300,
        price_max: 500,
        purpose: 'Member two application'
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    expect(createRes.body.application?.id).toBeTruthy();

    const appRow = await LayyahApplication.findByPk(createRes.body.application.id);
    expect(appRow).toBeTruthy();

    const rejectRes = await request(app)
      .put(`/layyah/applications/${appRow.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'rejected', rejection_reason: 'Not eligible' });

    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.application.status).toBe('rejected');
  });

  it('exports layyah applications in CSV and XLSX formats', async () => {
    const csvRes = await request(app)
      .get('/layyah/applications/export?format=csv')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(csvRes.status).toBe(200);
    expect(String(csvRes.headers['content-type'] || '')).toMatch(/text\/csv/);
    expect(String(csvRes.headers['content-disposition'] || '')).toMatch(/attachment/);
    expect(String(csvRes.headers['content-disposition'] || '')).toMatch(/layyah_applications_all_\d{8}\.csv/i);
    expect(csvRes.text).toMatch(/Full Name/i);

    const xlsxRes = await request(app)
      .get('/layyah/applications/export?format=xlsx')
      .set('Authorization', `Bearer ${adminToken}`)
      .buffer(true)
      .parse((res, cb) => {
        const data = [];
        res.on('data', (chunk) => data.push(chunk));
        res.on('end', () => cb(null, Buffer.concat(data)));
      });

    expect(xlsxRes.status).toBe(200);
    expect(String(xlsxRes.headers['content-type'] || '')).toMatch(/spreadsheetml\.sheet/);
    expect(Buffer.isBuffer(xlsxRes.body)).toBe(true);

    const workbook = XLSX.read(xlsxRes.body, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
    expect(rows.length).toBeGreaterThan(0);
    expect(Object.keys(rows[0])).toEqual(
      expect.arrayContaining([
        'Full Name',
        'PSN',
        'Animal Type',
        'Requested Amount Min',
        'Requested Amount Max',
        'Price Range',
        'Submission Date',
        'Status'
      ])
    );
  });

  it('exports layyah applications filtered by status', async () => {
    const approvedRes = await request(app)
      .get('/layyah/applications/export?format=csv&status=approved')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(approvedRes.status).toBe(200);
    expect(String(approvedRes.headers['content-disposition'] || '')).toMatch(/layyah_applications_approved_\d{8}\.csv/i);
    expect(approvedRes.text).toMatch(/Member User/i);
    expect(approvedRes.text).not.toMatch(/Member Two/i);

    const rejectedRes = await request(app)
      .get('/layyah/applications/export?format=csv&status=rejected')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(rejectedRes.status).toBe(200);
    expect(String(rejectedRes.headers['content-disposition'] || '')).toMatch(/layyah_applications_rejected_\d{8}\.csv/i);
    expect(rejectedRes.text).toMatch(/Member Two/i);
  });

  it('blocks admin from disbursing; only treasurer/super_admin can disburse', async () => {
    const appRow = await LayyahApplication.findOne({
      where: { user_id: memberUser.id, kind: 'individual', animal_category: 'ram' }
    });

    const res = await request(app)
      .put(`/layyah/applications/${appRow.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'disbursed' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('reverts invalid disbursed applications that have no disbursement loan record', async () => {
    const invalid = await LayyahApplication.create({
      user_id: memberUser.id,
      kind: 'individual',
      animal_category: 'cow',
      quantity: 1,
      price_min: 100,
      price_max: 200,
      applied_amount: 200,
      amount_version: 1,
      status: 'disbursed',
      applicant_name: 'Member User',
      user_psn: 'MBR100'
    });

    const res = await request(app)
      .post('/layyah/admin/repair-disbursed')
      .set('Authorization', `Bearer ${treasurerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.fixed_count).toBeGreaterThan(0);

    const refreshed = await LayyahApplication.findByPk(invalid.id);
    expect(refreshed.status).toBe('approved');

    const log = await ActivityLog.findOne({
      where: { action: 'layyah_disbursed_repaired', resource_id: invalid.id, resource_type: 'layyah_application' },
      order: [['created_at', 'DESC']]
    });
    expect(log).toBeTruthy();
  });

  it('reverts all disbursed applications to approved (mass correction)', async () => {
    const invalid = await LayyahApplication.create({
      user_id: memberUser.id,
      kind: 'individual',
      animal_category: 'buffalo',
      quantity: 1,
      price_min: 100,
      price_max: 200,
      applied_amount: 200,
      amount_version: 1,
      status: 'disbursed',
      applicant_name: 'Member User',
      user_psn: 'MBR100'
    });

    const res = await request(app)
      .post('/layyah/admin/revert-all-disbursed')
      .set('Authorization', `Bearer ${treasurerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.fixed_count).toBeGreaterThan(0);

    const refreshed = await LayyahApplication.findByPk(invalid.id);
    expect(refreshed.status).toBe('approved');

    const log = await ActivityLog.findOne({
      where: { action: 'layyah_disbursed_mass_reverted', resource_id: invalid.id, resource_type: 'layyah_application' },
      order: [['created_at', 'DESC']]
    });
    expect(log).toBeTruthy();
  });

  it('does not mark an application as disbursed if disbursement loan creation fails', async () => {
    const appRow = await LayyahApplication.findOne({
      where: { user_id: memberUser.id, kind: 'individual', animal_category: 'ram' }
    });

    const originalCreate = Loan.create;
    Loan.create = async () => {
      throw new Error('Simulated loan create failure');
    };

    const res = await request(app)
      .put(`/layyah/applications/${appRow.id}`)
      .set('Authorization', `Bearer ${treasurerToken}`)
      .send({ status: 'disbursed' });

    expect(res.status).toBe(500);

    Loan.create = originalCreate;

    const refreshed = await LayyahApplication.findByPk(appRow.id);
    expect(refreshed.status).toBe('approved');
  });

  it('allows treasurer to disburse an approved application into a loan', async () => {
    const appRow = await LayyahApplication.findOne({
      where: { user_id: memberUser.id, kind: 'individual', animal_category: 'ram' }
    });
    const principal = parseFloat(appRow.applied_amount);
    const total = Math.round((principal + principal * 0.1) * 100) / 100;
    const monthly = Math.round((total / 12) * 100) / 100;

    const res = await request(app)
      .put(`/layyah/applications/${appRow.id}`)
      .set('Authorization', `Bearer ${treasurerToken}`)
      .send({ status: 'disbursed', notes: 'Disbursed by treasurer' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.application.status).toBe('disbursed');
    expect(res.body.loan).toBeTruthy();

    const loan = await Loan.findByPk(res.body.loan.id);
    expect(loan).toBeTruthy();
    expect(loan.loan_type).toBe('investment');
    expect(parseFloat(loan.amount_approved)).toBeCloseTo(principal, 2);
    expect(parseFloat(loan.total_repayment)).toBeCloseTo(total, 2);
    expect(parseFloat(loan.monthly_repayment)).toBeCloseTo(monthly, 2);
    expect(loan.first_repayment_date).toBeTruthy();
  });

  it('blocks unauthorized users from reversing layyah application statuses', async () => {
    const appRow = await LayyahApplication.findOne({
      where: { user_id: memberUser.id, kind: 'individual', animal_category: 'ram' }
    });

    const res = await request(app)
      .post(`/layyah/admin/applications/${appRow.id}/reverse`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ to_status: 'approved', reason: 'Test' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('allows admin to revert an approved application back to pending with audit logging', async () => {
    const appRow = await LayyahApplication.create({
      user_id: memberUser.id,
      kind: 'individual',
      animal_category: 'goat',
      quantity: 1,
      price_min: 100,
      price_max: 200,
      applied_amount: 200,
      amount_version: 1,
      status: 'approved',
      applicant_name: 'Member User',
      user_psn: 'MBR100',
      approved_by: 'Admin User',
      approved_at: new Date()
    });

    const res = await request(app)
      .post(`/layyah/admin/applications/${appRow.id}/reverse`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ to_status: 'pending', reason: 'Needs re-check' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.application.status).toBe('pending');

    const refreshed = await LayyahApplication.findByPk(appRow.id);
    expect(refreshed.status).toBe('pending');
    expect(refreshed.approved_by).toBeNull();
    expect(refreshed.approved_at).toBeNull();

    const log = await ActivityLog.findOne({
      where: { action: 'layyah_application_status_reversed', resource_id: appRow.id, resource_type: 'layyah_application' },
      order: [['created_at', 'DESC']]
    });
    expect(log).toBeTruthy();
    expect(log.metadata).toEqual(expect.objectContaining({ from: 'approved', to: 'pending' }));
  });

  it('reverts a disbursed application back to approved and marks the generated loan as rejected when safe', async () => {
    const appRow = await LayyahApplication.findOne({
      where: { user_id: memberUser.id, kind: 'individual', animal_category: 'ram' }
    });
    const purpose = `Layyah disbursement for application #${appRow.id}`;
    const existingLoan = await Loan.findOne({ where: { purpose } });
    expect(existingLoan).toBeTruthy();

    const res = await request(app)
      .post(`/layyah/admin/applications/${appRow.id}/reverse`)
      .set('Authorization', `Bearer ${treasurerToken}`)
      .send({ to_status: 'approved', reason: 'Incorrect disbursement' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.application.status).toBe('approved');

    const refreshed = await LayyahApplication.findByPk(appRow.id);
    expect(refreshed.status).toBe('approved');

    const updatedLoan = await Loan.findByPk(existingLoan.id);
    expect(updatedLoan.status).toBe('rejected');
    expect(String(updatedLoan.purpose || '')).toMatch(/^REVERSED:/);
  });

  it('prevents invalid reversal transitions (e.g., pending to under_review via reversal)', async () => {
    const pendingApp = await LayyahApplication.create({
      user_id: memberUser.id,
      kind: 'individual',
      animal_category: 'cow',
      quantity: 1,
      price_min: 100,
      price_max: 200,
      applied_amount: 200,
      amount_version: 1,
      status: 'pending',
      applicant_name: 'Member User',
      user_psn: 'MBR100'
    });

    const res = await request(app)
      .post(`/layyah/admin/applications/${pendingApp.id}/reverse`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ to_status: 'under_review', reason: 'Should not allow' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('exports layyah applications in PDF format', async () => {
    const pdfRes = await request(app)
      .get('/layyah/applications/export?format=pdf')
      .set('Authorization', `Bearer ${adminToken}`)
      .buffer(true)
      .parse((res, cb) => {
        const data = [];
        res.on('data', (chunk) => data.push(chunk));
        res.on('end', () => cb(null, Buffer.concat(data)));
      });

    expect(pdfRes.status).toBe(200);
    expect(String(pdfRes.headers['content-type'] || '')).toMatch(/application\/pdf/);
    expect(Buffer.isBuffer(pdfRes.body)).toBe(true);
    expect(pdfRes.body.slice(0, 4).toString('utf8')).toBe('%PDF');
  });

  it('returns animal_type and price_range in admin applicants list', async () => {
    const res = await request(app)
      .get('/layyah/admin/applicants?page=1&limit=10')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.items[0]).toHaveProperty('animal_type');
    expect(res.body.items[0]).toHaveProperty('price_range');
  });

  it('shows pending applications even when the related user record is soft-deleted (fallback to user_psn/applicant_name)', async () => {
    const ghostMembership = await MembershipApplication.create({
      name: 'Ghost Member',
      psn: '30446',
      email: 'ghost30446@test.local',
      phone: '08000030446',
      facility_name: 'Facility',
      next_of_kin_name: 'Nok',
      next_of_kin_phone: '08000030447',
      status: 'approved'
    });

    const ghostUser = await User.create({
      membership_application_id: ghostMembership.id,
      password_hash: 'password',
      role: 'member',
      status: 'active'
    });

    await LayyahApplication.create({
      user_id: ghostUser.id,
      kind: 'individual',
      animal_category: 'cow',
      quantity: 1,
      price_min: 100,
      price_max: 200,
      applied_amount: 200,
      amount_version: 1,
      status: 'pending',
      applicant_name: 'Ghost Member',
      user_psn: '30446'
    });

    await ghostUser.destroy();

    const res = await request(app)
      .get('/layyah/admin/applicants?q=30446&page=1&limit=50')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.some((row) => String(row.psn) === '30446')).toBe(true);
  });

  it('fixes group invitations: leader can invite by PSN and invited member can accept', async () => {
    const groupCreate = await request(app)
      .post('/layyah/applications')
      .set('Authorization', `Bearer ${groupLeaderToken}`)
      .send({
        kind: 'group',
        animal_category: 'ram',
        quantity: 1,
        price_min: 100,
        price_max: 200,
        purpose: 'Group for invitations'
      });

    expect(groupCreate.status).toBe(201);
    const groupId = groupCreate.body.application.id;

    const approveGroup = await request(app)
      .put(`/layyah/applications/${groupId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'approved' });

    expect(approveGroup.status).toBe(200);
    expect(approveGroup.body.application.status).toBe('approved');

    const inviteRes = await request(app)
      .post(`/layyah/groups/${groupId}/add-member`)
      .set('Authorization', `Bearer ${groupLeaderToken}`)
      .send({ member_psn: invitedMemberPsn });

    expect(inviteRes.status).toBe(200);
    expect(inviteRes.body.success).toBe(true);

    const inviteRow = await LayyahApplication.findOne({
      where: { user_id: memberUser.id, group_id: groupId, kind: 'individual', status: 'pending' },
      order: [['created_at', 'DESC']]
    });
    expect(inviteRow).toBeTruthy();

    const acceptRes = await request(app)
      .put(`/layyah/group-members/${inviteRow.id}/respond`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ action: 'accept' });

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.success).toBe(true);

    const updatedInvite = await LayyahApplication.findByPk(inviteRow.id);
    expect(updatedInvite.status).toBe('approved');

    const updatedGroup = await LayyahApplication.findByPk(groupId);
    expect(Number(updatedGroup.group_member_count)).toBe(1);
  });

  (sequelize.getDialect() === 'postgres' ? it : it.skip)(
    'blocks concurrent duplicate submissions (one succeeds, one conflicts)',
    async () => {
    const payload = {
      kind: 'group',
      animal_category: 'cow',
      quantity: 1,
      price_min: 300,
      price_max: 500,
      purpose: 'Concurrent test'
    };

    const [a, b] = await Promise.allSettled([
      request(app).post('/layyah/applications').set('Authorization', `Bearer ${member2Token}`).send(payload),
      request(app).post('/layyah/applications').set('Authorization', `Bearer ${member2Token}`).send(payload)
    ]);

    const statuses = [a, b]
      .filter((r) => r.status === 'fulfilled')
      .map((r) => r.value.status)
      .sort();

    expect(statuses).toEqual([201, 409]);
    }
  );
});
