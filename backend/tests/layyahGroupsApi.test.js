process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const { sequelize, User, MembershipApplication, LayyahApplication, Settings } = require('../models');

describe('Layyah Groups API', () => {
  jest.setTimeout(30000);
  let leaderToken;
  let memberToken;
  let leaderUser;
  let memberUser;
  let group;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    await Settings.create({ key: 'layyah_seasonal_program_enabled', value: true });

    const leaderMembership = await MembershipApplication.create({
      name: 'Leader User',
      psn: 'LDR001',
      email: 'leader@test.local',
      phone: '0800000000',
      facility_name: 'Facility',
      next_of_kin_name: 'Nok',
      next_of_kin_phone: '0800000001',
      status: 'approved'
    });
    leaderUser = await User.create({
      membership_application_id: leaderMembership.id,
      password_hash: 'password',
      role: 'member',
      status: 'active'
    });
    leaderToken = jwt.sign({ id: leaderUser.id }, 'test_secret');

    const memberMembership = await MembershipApplication.create({
      name: 'Member User',
      psn: 'MBR001',
      email: 'member@test.local',
      phone: '0800000002',
      facility_name: 'Facility',
      next_of_kin_name: 'Nok',
      next_of_kin_phone: '0800000003',
      status: 'approved'
    });
    memberUser = await User.create({
      membership_application_id: memberMembership.id,
      password_hash: 'password',
      role: 'member',
      status: 'active'
    });
    memberToken = jwt.sign({ id: memberUser.id }, 'test_secret');

    group = await LayyahApplication.create({
      user_id: leaderUser.id,
      kind: 'group',
      animal_category: 'ram',
      quantity: 1,
      price_min: 100,
      price_max: 200,
      purpose: 'Test group',
      status: 'approved',
      group_member_count: 1,
      group_leader_id: leaderUser.id,
      applicant_name: 'Leader User',
      user_psn: 'LDR001'
    });

    await LayyahApplication.create({
      user_id: memberUser.id,
      kind: 'individual',
      group_id: group.id,
      group_leader_id: leaderUser.id,
      animal_category: 'ram',
      quantity: 1,
      price_min: 100,
      price_max: 200,
      purpose: 'Group membership',
      status: 'approved',
      applicant_name: 'Member User',
      user_psn: 'MBR001'
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('supports pagination and scope=all', async () => {
    const res = await request(app)
      .get('/layyah/groups?scope=all&page=1&limit=1')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.groups)).toBe(true);
    expect(res.body.groups.length).toBe(1);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.page).toBe(1);
  });

  it('returns user_role=owner for leader in scope=my', async () => {
    const res = await request(app)
      .get('/layyah/groups?scope=my')
      .set('Authorization', `Bearer ${leaderToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.groups[0].user_role).toBe('owner');
  });

  it('allows a member to leave a group and updates member count', async () => {
    const res = await request(app)
      .post(`/layyah/groups/${group.id}/leave`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const membership = await LayyahApplication.findOne({
      where: { user_id: memberUser.id, group_id: group.id, kind: 'individual' }
    });
    expect(membership).toBeNull();

    const refreshed = await LayyahApplication.findByPk(group.id);
    expect(refreshed.group_member_count).toBe(0);
  });
});
