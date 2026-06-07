process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const { sequelize, User, MembershipApplication, Contribution } = require('../models');
const XLSX = require('xlsx');

describe('Contributions Bulk Upload Reporting', () => {
  jest.setTimeout(30000);
  let adminToken;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    const adminMembership = await MembershipApplication.create({
      name: 'Admin Upload',
      psn: 'ADMIN_UPLOAD_001',
      email: 'admin_upload@test.local',
      phone: '3333333333',
      facility_name: 'Admin Facility',
      next_of_kin_name: 'Admin NOK',
      next_of_kin_phone: '3333300000',
      status: 'approved'
    });

    const admin = await User.create({
      membership_application_id: adminMembership.id,
      password_hash: 'password',
      role: 'admin',
      can_liquidate_loans: true
    });

    adminToken = jwt.sign({ id: admin.id }, 'test_secret');

    const memberMembership = await MembershipApplication.create({
      name: 'Member One',
      psn: 'MEM_UPLOAD_001',
      email: 'mem_upload_1@test.local',
      phone: '0800000000',
      facility_name: 'Facility A',
      next_of_kin_name: 'Nok A',
      next_of_kin_phone: '0800000001',
      status: 'approved',
      savings: 3000,
      investment: 3000,
      target_saving: 0
    });

    await User.create({
      membership_application_id: memberMembership.id,
      password_hash: 'password',
      role: 'member',
      can_liquidate_loans: false
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('creates a batch, processes rows, and exposes report downloads', async () => {
    const csv = [
      'PSN,Period,Savings,Investment,Target_Saving,Payment_Method',
      'MEM_UPLOAD_001,2026-03,5000,2500,0,bank transfer',
      'UNKNOWN_PSN,2026-03,5000,2500,0,bank transfer'
    ].join('\n');

    const res = await request(app)
      .post('/contributions/bulk-upload?sync=true')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(csv), 'contributions.csv');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.batch_id).toBeDefined();
    expect(res.body.total_records).toBe(2);
    expect(res.body.success_count).toBe(1);
    expect(res.body.failure_count).toBe(1);

    const batchId = res.body.batch_id;

    const reportRes = await request(app)
      .get(`/bulk-uploads/${batchId}/report`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(reportRes.status).toBe(200);
    expect(reportRes.body.success).toBe(true);
    expect(reportRes.body.report.batch.id).toBe(batchId);
    expect(Array.isArray(reportRes.body.report.failed_records)).toBe(true);
    expect(reportRes.body.report.failed_records.length).toBeGreaterThan(0);

    const pdfRes = await request(app)
      .get(`/bulk-uploads/${batchId}/report.pdf`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(pdfRes.status).toBe(200);
    expect(pdfRes.headers['content-type']).toMatch(/application\/pdf/);

    const csvRes = await request(app)
      .get(`/bulk-uploads/${batchId}/report.csv`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(csvRes.status).toBe(200);
    expect(csvRes.headers['content-type']).toMatch(/text\/csv/);

    const contributionCount = await Contribution.count({ where: { status: 'approved' } });
    expect(contributionCount).toBeGreaterThan(0);
  });

  it('supports XLSX import and allows correcting failed rows without reupload', async () => {
    const rows = [
      { PSN: 'MEM_UPLOAD_001', Period: '2026-04', Savings: 5000, Investment: 0, Target_Saving: 0, Payment_Method: 'banktransfer' },
      { PSN: 'UNKNOWN_PSN', Period: '2026-04', Savings: 5000, Investment: 0, Target_Saving: 0, Payment_Method: 'banktransfer' }
    ];
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Contributions');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const uploadRes = await request(app)
      .post('/contributions/bulk-upload?sync=true')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', buffer, 'contributions.xlsx');

    expect(uploadRes.status).toBe(200);
    expect(uploadRes.body.success).toBe(true);
    expect(uploadRes.body.batch_id).toBeDefined();
    expect(uploadRes.body.total_records).toBe(2);
    expect(uploadRes.body.success_count).toBe(1);
    expect(uploadRes.body.failure_count).toBe(1);

    const batchId = uploadRes.body.batch_id;

    const errorsRes = await request(app)
      .get(`/bulk-uploads/${batchId}/errors?status=FAILED&page=1&limit=50`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(errorsRes.status).toBe(200);
    expect(errorsRes.body.success).toBe(true);
    expect(Array.isArray(errorsRes.body.errors)).toBe(true);
    expect(errorsRes.body.errors.length).toBeGreaterThan(0);

    const errRow = errorsRes.body.errors[0];
    expect(errRow.raw_record).toBeDefined();

    const corrected = { ...(errRow.raw_record || {}), psn: 'MEM_UPLOAD_001' };
    const correctionRes = await request(app)
      .put(`/bulk-uploads/${batchId}/errors/${errRow.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ corrected_record: corrected });

    expect(correctionRes.status).toBe(200);
    expect(correctionRes.body.success).toBe(true);

    const reprocessRes = await request(app)
      .post(`/bulk-uploads/${batchId}/reprocess-failed`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(reprocessRes.status).toBe(200);
    expect(reprocessRes.body.success).toBe(true);
    expect(reprocessRes.body.resolved).toBeGreaterThan(0);
    expect(reprocessRes.body.still_failed).toBe(0);

    const batchRes = await request(app)
      .get(`/bulk-uploads/${batchId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(batchRes.status).toBe(200);
    expect(batchRes.body.success).toBe(true);
    expect(batchRes.body.batch.status).toBe('COMPLETED');

    const remainingErrors = await request(app)
      .get(`/bulk-uploads/${batchId}/errors?status=FAILED&page=1&limit=50`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(remainingErrors.status).toBe(200);
    expect(remainingErrors.body.success).toBe(true);
    expect(remainingErrors.body.errors.length).toBe(0);

    const contributionCount = await Contribution.count({ where: { status: 'approved' } });
    expect(contributionCount).toBeGreaterThan(0);
  });

  it('normalizes payment methods and reports invalid values with actionable errors', async () => {
    const csv = [
      'PSN,Period,Savings,Investment,Target_Saving,Payment_Method',
      'MEM_UPLOAD_001,2026-05,5000,0,0,banktransfer',
      'MEM_UPLOAD_001,2026-06,5000,0,0, Salary Deduction ',
      'MEM_UPLOAD_001,2026-07,5000,0,0,cash'
    ].join('\n');

    const res = await request(app)
      .post('/contributions/bulk-upload?sync=true')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(csv), 'contributions.csv');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.batch_id).toBeDefined();
    expect(res.body.total_records).toBe(3);
    expect(res.body.success_count).toBe(2);
    expect(res.body.failure_count).toBe(1);

    const batchId = res.body.batch_id;
    const errorsRes = await request(app)
      .get(`/bulk-uploads/${batchId}/errors?status=FAILED&page=1&limit=50`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(errorsRes.status).toBe(200);
    expect(errorsRes.body.success).toBe(true);
    expect(errorsRes.body.errors.length).toBe(1);
    expect(errorsRes.body.errors[0].error_code).toBe('INVALID_PAYMENT_METHOD');
    expect(errorsRes.body.errors[0].message).toMatch(/Allowed:\s*bank transfer,\s*salary deduction/i);
    expect(errorsRes.body.errors[0].raw_record.payment_method).toBe('cash');
  });

  it('accepts salary deduction variants from XLSX imports', async () => {
    const rows = [
      { PSN: 'MEM_UPLOAD_001', Period: '2026-08', Savings: 5000, Investment: 0, Target_Saving: 0, Payment_Method: 'SalaryDeduction\r\n' }
    ];
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Contributions');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const res = await request(app)
      .post('/contributions/bulk-upload?sync=true')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', buffer, 'contributions.xlsx');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.total_records).toBe(1);
    expect(res.body.success_count).toBe(1);
    expect(res.body.failure_count).toBe(0);
  });

  it('detects duplicates within the same file (PSN + amount + payment date)', async () => {
    const csv = [
      'PSN,Period,Savings,Investment,Target_Saving,Payment_Method,Payment_Date',
      'MEM_UPLOAD_001,2026-09,5000,0,0,bank transfer,2026-09-15',
      'MEM_UPLOAD_001,2026-09,5000,0,0,bank transfer,2026-09-15'
    ].join('\n');

    const res = await request(app)
      .post('/contributions/bulk-upload?sync=true')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(csv), 'contributions.csv');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.total_records).toBe(2);
    expect(res.body.success_count).toBe(1);
    expect(res.body.failure_count).toBe(1);

    const batchId = res.body.batch_id;
    const errorsRes = await request(app)
      .get(`/bulk-uploads/${batchId}/errors?status=FAILED&page=1&limit=50`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(errorsRes.status).toBe(200);
    expect(errorsRes.body.success).toBe(true);
    expect(errorsRes.body.errors.length).toBe(1);
    expect(errorsRes.body.errors[0].error_code).toBe('DUPLICATE_IN_FILE');
    expect(errorsRes.body.errors[0].message).toMatch(/Duplicate contribution in file/i);
  });

  it('detects duplicates already in the system (PSN + amount + payment date)', async () => {
    const memberUser = await User.findOne({
      where: { role: 'member' },
      include: [{ model: MembershipApplication, as: 'membershipApplication', where: { psn: 'MEM_UPLOAD_001' } }]
    });
    expect(memberUser).toBeTruthy();

    await Contribution.create({
      user_id: memberUser.id,
      savings: 5000,
      investment: 0,
      target_saving: 0,
      total_amount: 5000,
      month: 10,
      year: 2026,
      contribution_date: new Date(Date.UTC(2026, 9, 20)),
      payment_method: 'bank_transfer',
      status: 'approved',
      approved_by: null,
      approval_date: new Date()
    });

    const csv = [
      'PSN,Period,Savings,Investment,Target_Saving,Payment_Method,Payment_Date',
      'MEM_UPLOAD_001,2026-10,5000,0,0,bank transfer,2026-10-20'
    ].join('\n');

    const res = await request(app)
      .post('/contributions/bulk-upload?sync=true')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(csv), 'contributions.csv');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.total_records).toBe(1);
    expect(res.body.success_count).toBe(0);
    expect(res.body.failure_count).toBe(1);

    const batchId = res.body.batch_id;
    const errorsRes = await request(app)
      .get(`/bulk-uploads/${batchId}/errors?status=FAILED&page=1&limit=50`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(errorsRes.status).toBe(200);
    expect(errorsRes.body.success).toBe(true);
    expect(errorsRes.body.errors.length).toBe(1);
    expect(errorsRes.body.errors[0].error_code).toBe('DUPLICATE_IN_SYSTEM');
    expect(errorsRes.body.errors[0].message).toMatch(/already exists/i);
  });
});
