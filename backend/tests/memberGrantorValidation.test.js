const request = require('supertest');
const app = require('../app');
const { sequelize } = require('../db/connection');
const { User, MembershipApplication, Loan, ActivityLog } = require('../models');
const jwt = require('jsonwebtoken');

describe('Member Grantor Validation API (GET)', () => {
  let applicantToken;
  let applicantUser;
  let validGrantorUser;
  let inactiveGrantorUser;
  let defaultedGrantorUser;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.NODE_ENV = 'test';

    // Reset DB
    await sequelize.sync({ force: true });

    // 1. Create Applicant
    const applicantApp = await MembershipApplication.create({
      name: 'Applicant User',
      psn: 'APPLICANT01',
      email: 'applicant@example.com',
      phone: '08000000001',
      facility_name: 'HQ',
      next_of_kin_name: 'NOK1',
      next_of_kin_phone: '08000000002',
      status: 'approved'
    });
    applicantUser = await User.create({
      membership_application_id: applicantApp.id,
      password_hash: 'hash',
      role: 'member',
      status: 'active'
    });
    applicantToken = jwt.sign({ id: applicantUser.id, role: 'member' }, process.env.JWT_SECRET);

    // 2. Create Valid Grantor
    const grantorApp = await MembershipApplication.create({
      name: 'Valid Grantor',
      psn: 'GRANTOR01',
      email: 'grantor@example.com',
      phone: '08000000003',
      facility_name: 'HQ',
      next_of_kin_name: 'NOK2',
      next_of_kin_phone: '08000000004',
      status: 'approved'
    });
    validGrantorUser = await User.create({
      membership_application_id: grantorApp.id,
      password_hash: 'hash',
      role: 'member',
      status: 'active'
    });

    // 3. Create Inactive Grantor
    const inactiveApp = await MembershipApplication.create({
      name: 'Inactive Grantor',
      psn: 'INACTIVE01',
      email: 'inactive@example.com',
      phone: '08000000005',
      facility_name: 'HQ',
      next_of_kin_name: 'NOK3',
      next_of_kin_phone: '08000000006',
      status: 'approved'
    });
    inactiveGrantorUser = await User.create({
      membership_application_id: inactiveApp.id,
      password_hash: 'hash',
      role: 'member',
      status: 'suspended' // Not active
    });

    // 4. Create Restricted Grantor (Defaulted Loan)
    const defaultedApp = await MembershipApplication.create({
      name: 'Defaulted Grantor',
      psn: 'DEFAULTED01',
      email: 'defaulted@example.com',
      phone: '08000000007',
      facility_name: 'HQ',
      next_of_kin_name: 'NOK4',
      next_of_kin_phone: '08000000008',
      status: 'approved'
    });
    defaultedGrantorUser = await User.create({
      membership_application_id: defaultedApp.id,
      password_hash: 'hash',
      role: 'member',
      status: 'active'
    });
    // Create defaulted loan
    await Loan.create({
      user_id: defaultedGrantorUser.id,
      loan_type: 'cash',
      amount_requested: 1000,
      repayment_period_months: 6,
      status: 'defaulted',
      application_date: new Date(),
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('should validate a valid grantor successfully', async () => {
    const res = await request(app)
      .get('/members/validate-grantor?psn=GRANTOR01')
      .set('Authorization', `Bearer ${applicantToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.member.psn).toBe('GRANTOR01');
    expect(res.body.member.name).toBe('Valid Grantor');
  });

  it('should fail if PSN is missing', async () => {
    const res = await request(app)
      .get('/members/validate-grantor')
      .set('Authorization', `Bearer ${applicantToken}`);
    
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('required');
  });

  it('should fail with invalid PSN format', async () => {
    const res = await request(app)
      .get('/members/validate-grantor?psn=AB') // Too short
      .set('Authorization', `Bearer ${applicantToken}`);
    
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_FORMAT');
  });

  it('should return 404 for non-existent grantor', async () => {
    const res = await request(app)
      .get('/members/validate-grantor?psn=UNKNOWN99')
      .set('Authorization', `Bearer ${applicantToken}`);
    
    expect(res.status).toBe(404);
  });

  it('should prevent self-guaranteeing', async () => {
    const res = await request(app)
      .get('/members/validate-grantor?psn=APPLICANT01')
      .set('Authorization', `Bearer ${applicantToken}`);
    
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('SELF_GRANTOR');
  });

  it('should allow an inactive user account to act as guarantor if membership is approved', async () => {
    const res = await request(app)
      .get('/members/validate-grantor?psn=INACTIVE01')
      .set('Authorization', `Bearer ${applicantToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.member.psn).toBe('INACTIVE01');
    expect(res.body.member.name).toBe('Inactive Grantor');
  });

  it('should allow a member with defaulted loans to act as guarantor (no eligibility restriction)', async () => {
    const res = await request(app)
      .get('/members/validate-grantor?psn=DEFAULTED01')
      .set('Authorization', `Bearer ${applicantToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.member.psn).toBe('DEFAULTED01');
    expect(res.body.member.name).toBe('Defaulted Grantor');
  });
});
