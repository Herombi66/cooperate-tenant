process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret';

const fs = require('fs');
const path = require('path');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const XLSX = require('xlsx');
const app = require('../app');
const { sequelize, User, MembershipApplication, Loan, LoanRepayment, UploadBatchBackup } = require('../models');

describe('Loan Repayment Bulk Upload v2', () => {
  jest.setTimeout(30000);
  let adminToken;
  let loan;

  beforeAll(async () => {
    fs.mkdirSync(path.join(__dirname, '..', 'uploads'), { recursive: true });
    await sequelize.sync({ force: true });

    const adminMembership = await MembershipApplication.create({
      name: 'Admin Bulk',
      psn: 'ADMIN_BULK_001',
      email: 'admin_bulk@test.local',
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
      psn: 'MEM001',
      email: 'mem1@test.local',
      phone: '0800000000',
      facility_name: 'Facility A',
      next_of_kin_name: 'Nok A',
      next_of_kin_phone: '0800000001',
      status: 'approved'
    });

    const member = await User.create({
      membership_application_id: memberMembership.id,
      password_hash: 'password',
      role: 'member',
      can_liquidate_loans: false
    });

    loan = await Loan.create({
      user_id: member.id,
      loan_type: 'cash',
      amount_requested: 10000,
      amount_approved: 10000,
      repayment_period_months: 10,
      total_repayment: 10000,
      status: 'disbursed'
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('creates batch, persists failed rows, and supports rollback', async () => {
    const rows = [
      {
        Loan_ID: loan.id,
        PSN: 'MEM001',
        Repayment_Amount: 1000,
        Repayment_Date: '05/03/2026',
        Payment_Method: 'bank_transfer',
        Notes: 'Test row ok'
      },
      {
        Loan_ID: loan.id,
        PSN: 'MEM001',
        Repayment_Amount: 1000,
        Repayment_Date: '2026-03-05',
        Payment_Method: 'bank_transfer',
        Notes: 'Bad date'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const res = await request(app)
      .post('/loan-repayments/bulk-upload-v2')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', buffer, 'repayments.xlsx');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.batch_id).toBeDefined();
    expect(res.body.success_count).toBe(1);
    expect(res.body.failure_count).toBe(1);

    const batchId = res.body.batch_id;

    const errorsRes = await request(app)
      .get(`/bulk-uploads/${batchId}/errors`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(errorsRes.status).toBe(200);
    expect(errorsRes.body.success).toBe(true);
    expect(errorsRes.body.errors.length).toBe(1);
    expect(errorsRes.body.errors[0].error_code).toBe('INVALID_DATE');

    const created = await LoanRepayment.count({ where: { upload_batch_id: batchId } });
    expect(created).toBe(1);

    const rollbackRes = await request(app)
      .post(`/loan-repayments/bulk-upload-batches/${batchId}/rollback`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(rollbackRes.status).toBe(200);
    expect(rollbackRes.body.success).toBe(true);
    expect(rollbackRes.body.deleted_count).toBe(1);

    const remaining = await LoanRepayment.count({ where: { upload_batch_id: batchId } });
    expect(remaining).toBe(0);
  });

  it('backs up loan status on approve and blocks rollback for verified repayments', async () => {
    const loan2 = await Loan.create({
      user_id: loan.user_id,
      loan_type: 'cash',
      amount_requested: 1000,
      amount_approved: 1000,
      repayment_period_months: 1,
      total_repayment: 1000,
      status: 'disbursed'
    });

    const rows = [
      {
        Loan_ID: loan2.id,
        PSN: 'MEM001',
        Repayment_Amount: 1000,
        Repayment_Date: '06/03/2026',
        Payment_Method: 'bank_transfer',
        Notes: 'Will complete loan'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const uploadRes = await request(app)
      .post('/loan-repayments/bulk-upload-v2')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', buffer, 'repayments2.xlsx');

    expect(uploadRes.status).toBe(200);
    expect(uploadRes.body.success).toBe(true);
    expect(uploadRes.body.success_count).toBe(1);

    const batchId = uploadRes.body.batch_id;

    const approveRes = await request(app)
      .post(`/loan-repayments/bulk-upload-batches/${batchId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.success).toBe(true);

    const refreshedLoan = await Loan.findByPk(loan2.id);
    expect(refreshedLoan.status).toBe('completed');

    const backups = await UploadBatchBackup.findAll({
      where: { batch_id: batchId, resource_type: 'loan', resource_id: loan2.id }
    });
    expect(backups.length).toBe(1);

    const rollbackRes = await request(app)
      .post(`/loan-repayments/bulk-upload-batches/${batchId}/rollback`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(rollbackRes.status).toBe(400);
    expect(rollbackRes.body.success).toBe(false);
  });
});
