process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret';

jest.mock('../services/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true })
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const { sequelize, User, MembershipApplication, AnimalAcquisitionRequest } = require('../models');

describe('Animal Acquisition Requests API', () => {
  jest.setTimeout(30000);

  let adminToken;
  let adminNoPermToken;
  let memberUser;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    const adminMembership = await MembershipApplication.create({
      name: 'Admin User',
      psn: 'ADM001',
      email: 'admin@test.local',
      phone: '0800000000',
      facility_name: 'HQ',
      next_of_kin_name: 'Nok',
      next_of_kin_phone: '0800000001',
      status: 'approved'
    });

    const adminUser = await User.create({
      membership_application_id: adminMembership.id,
      password_hash: 'password',
      role: 'admin',
      status: 'active',
      can_create_animal_requests: true
    });
    adminToken = jwt.sign({ id: adminUser.id }, 'test_secret');

    const adminNoPermMembership = await MembershipApplication.create({
      name: 'Admin No Perm',
      psn: 'ADM002',
      email: 'admin2@test.local',
      phone: '0800000002',
      facility_name: 'HQ',
      next_of_kin_name: 'Nok',
      next_of_kin_phone: '0800000003',
      status: 'approved'
    });

    const adminNoPermUser = await User.create({
      membership_application_id: adminNoPermMembership.id,
      password_hash: 'password',
      role: 'admin',
      status: 'active',
      can_create_animal_requests: false
    });
    adminNoPermToken = jwt.sign({ id: adminNoPermUser.id }, 'test_secret');

    const memberMembership = await MembershipApplication.create({
      name: 'Member User',
      psn: 'MBR001',
      email: 'member@test.local',
      phone: '0800000004',
      facility_name: 'Clinic',
      next_of_kin_name: 'Nok',
      next_of_kin_phone: '0800000005',
      status: 'approved'
    });

    memberUser = await User.create({
      membership_application_id: memberMembership.id,
      password_hash: 'password',
      role: 'member',
      status: 'active'
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('rejects access without animal-request-create permission', async () => {
    const res = await request(app)
      .get('/layyah/purchase-requests')
      .set('Authorization', `Bearer ${adminNoPermToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('creates and updates a draft request, then submits it', async () => {
    const createRes = await request(app)
      .post('/layyah/purchase-requests')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ member_user_id: memberUser.id });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    expect(createRes.body.item.status).toBe('draft');

    const id = createRes.body.item.id;

    const updateRes = await request(app)
      .put(`/layyah/purchase-requests/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        animal_category: 'goat',
        quantity: 2,
        delivery_start_date: '2030-01-01',
        delivery_end_date: '2030-01-10',
        reason_html: '<p>Need livestock for scheduled distribution</p>'
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.item.animal_category).toBe('goat');
    expect(updateRes.body.item.quantity).toBe(2);
    expect(updateRes.body.item.delivery_start_date).toBe('2030-01-01');
    expect(updateRes.body.item.status).toBe('draft');

    const submitRes = await request(app)
      .post(`/layyah/purchase-requests/${id}/submit`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.item.status).toBe('pending');
    expect(submitRes.body.item.submitted_at).toBeTruthy();
  });

  it('approves a pending request', async () => {
    const row = await AnimalAcquisitionRequest.create({
      member_user_id: memberUser.id,
      created_by: 1,
      animal_category: 'cow',
      quantity: 1,
      delivery_start_date: '2030-02-01',
      delivery_end_date: '2030-02-05',
      reason_html: '<p>Approved test</p>',
      reason_text: 'Approved test',
      status: 'pending',
      submitted_at: new Date()
    });

    const res = await request(app)
      .post(`/layyah/purchase-requests/${row.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.item.status).toBe('approved');
    expect(res.body.item.approved_at).toBeTruthy();
  });

  it('rejects a pending request with a reason', async () => {
    const row = await AnimalAcquisitionRequest.create({
      member_user_id: memberUser.id,
      created_by: 1,
      animal_category: 'sheep',
      quantity: 1,
      delivery_start_date: '2030-03-01',
      delivery_end_date: '2030-03-03',
      reason_html: '<p>Reject test</p>',
      reason_text: 'Reject test',
      status: 'pending',
      submitted_at: new Date()
    });

    const res = await request(app)
      .post(`/layyah/purchase-requests/${row.id}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ rejection_reason: 'Insufficient procurement window' });

    expect(res.status).toBe(200);
    expect(res.body.item.status).toBe('rejected');
    expect(res.body.item.rejection_reason).toBe('Insufficient procurement window');
  });

  it('lists requests with pagination', async () => {
    const res = await request(app)
      .get('/layyah/purchase-requests?page=1&limit=10&status=all')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.pagination).toBeDefined();
  });
});

