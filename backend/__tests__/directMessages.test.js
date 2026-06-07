const request = require('supertest');
const app = require('../app');
const { sequelize } = require('../db/connection');
const { User, MembershipApplication, DirectMessage } = require('../models');
const jwt = require('jsonwebtoken');

const createToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      psn: user.membershipApplication?.psn || 'ADMIN001',
      role: user.role
    },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '1h' }
  );
};

describe('Direct Messages API', () => {
  let adminUser;
  let memberUser;
  let adminToken;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    const adminMembership = await MembershipApplication.create({
      name: 'Admin User',
      psn: 'ADMIN001',
      email: 'admin@example.com',
      phone: '08000000000',
      facility_name: 'Admin Hospital',
      next_of_kin_name: 'Admin NOK',
      next_of_kin_phone: '08000000001',
      savings: 0,
      investment: 0
    });

    const memberMembership = await MembershipApplication.create({
      name: 'Member One',
      psn: 'MEM001',
      email: 'member1@example.com',
      phone: '08000000002',
      facility_name: 'Member Hospital',
      next_of_kin_name: 'Member NOK',
      next_of_kin_phone: '08000000003',
      savings: 0,
      investment: 0
    });

    adminUser = await User.create({
      membership_application_id: adminMembership.id,
      password_hash: 'hashed',
      role: 'admin',
      status: 'active'
    });

    memberUser = await User.create({
      membership_application_id: memberMembership.id,
      password_hash: 'hashed',
      role: 'member',
      status: 'active'
    });

    adminToken = createToken({ ...adminUser.toJSON(), membershipApplication: adminMembership });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('admin can send direct message to member', async () => {
    const res = await request(app)
      .post('/direct-messages')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        subject: 'Test Message',
        body: 'Hello member, this is a test message.',
        recipient_member_id: memberUser.membership_application_id
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.subject).toBe('Test Message');

    const messages = await DirectMessage.findAll();
    expect(messages.length).toBe(1);
    expect(messages[0].recipient_id).toBe(memberUser.id);
  });

  test('non-admin cannot send direct messages', async () => {
    const memberToken = createToken({ ...memberUser.toJSON(), membershipApplication: null });

    const res = await request(app)
      .post('/direct-messages')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        subject: 'Should Fail',
        body: 'This should not be allowed',
        recipient_member_id: memberUser.membership_application_id
      });

    expect(res.status).toBe(403);
  });

  test('rate limiting prevents abuse', async () => {
    const requests = [];
    for (let i = 0; i < 22; i++) {
      requests.push(
        request(app)
          .post('/direct-messages')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            subject: `Msg ${i}`,
            body: 'test',
            recipient_member_id: memberUser.membership_application_id
          })
      );
    }

    const responses = await Promise.all(requests);
    const limited = responses.find((r) => r.status === 429);
    expect(limited).toBeDefined();
  });

  test('admin can fetch sent message history', async () => {
    const res = await request(app)
      .get('/direct-messages?scope=sent')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.messages)).toBe(true);
  });

  test('member can fetch received messages', async () => {
    const memberToken = createToken({
      ...memberUser.toJSON(),
      membershipApplication: { psn: 'MEM001' }
    });

    const res = await request(app)
      .get('/direct-messages?scope=received')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.messages)).toBe(true);
    expect(res.body.messages.length).toBeGreaterThan(0);
  });

  test('member can mark message as read', async () => {
    const memberToken = createToken({
      ...memberUser.toJSON(),
      membershipApplication: { psn: 'MEM001' }
    });

    const messagesBefore = await DirectMessage.findAll({
      where: { recipient_id: memberUser.id }
    });
    const target = messagesBefore[0];
    expect(target).toBeDefined();

    const res = await request(app)
      .put(`/direct-messages/${target.id}/read`)
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('read');
    expect(res.body.data.read_at).toBeTruthy();
  });
});
