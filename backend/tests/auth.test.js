const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = require('../app');
const { sequelize } = require('../db/connection');
const { User, MembershipApplication } = require('../models');

describe('Authentication API', () => {
  let testUser;
  let hashedPassword;

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
    process.env.NODE_ENV = 'test';

    await sequelize.sync({ force: true });

    hashedPassword = await bcrypt.hash('testpassword123', 10);

    const membership = await MembershipApplication.create({
      name: 'Test User',
      psn: 'TEST001',
      email: 'test@example.com',
      phone: '08000000000',
      facility_name: 'Test Facility',
      next_of_kin_name: 'Test NOK',
      next_of_kin_phone: '08000000001',
      status: 'approved'
    });

    testUser = await User.create({
      membership_application_id: membership.id,
      psn: 'TEST001',
      name: 'Test User',
      email: 'test@example.com',
      password_hash: hashedPassword,
      role: 'member',
      status: 'active'
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('POST /auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          psn: 'TEST001',
          password: 'testpassword123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful');
      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('user');

      // Verify token
      const decoded = jwt.verify(response.body.access_token, process.env.JWT_SECRET);
      expect(decoded.psn).toBe('TEST001');
      expect(decoded.role).toBe('member');
    });

    it('should return 401 for invalid PSN', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          psn: 'INVALID001',
          password: 'testpassword123'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid PSN or password');
    });

    it('should return 401 for invalid password', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          psn: 'TEST001',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid PSN or password');
    });

    it('should return 400 for missing PSN', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          password: 'testpassword123'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('PSN and password are required');
    });

    it('should return 400 for missing password', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          psn: 'TEST001'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('PSN and password are required');
    });

    it('should return 401 for inactive user', async () => {
      const inactiveMembership = await MembershipApplication.create({
        name: 'Inactive User',
        psn: 'INACTIVE001',
        email: 'inactive@example.com',
        phone: '08000000002',
        facility_name: 'Test Facility',
        next_of_kin_name: 'Inactive NOK',
        next_of_kin_phone: '08000000003',
        status: 'approved'
      });

      await User.create({
        membership_application_id: inactiveMembership.id,
        psn: 'INACTIVE001',
        name: 'Inactive User',
        email: 'inactive@example.com',
        password_hash: hashedPassword,
        role: 'member',
        status: 'inactive'
      });

      // Wait a bit to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));

      const response = await request(app)
        .post('/auth/login')
        .send({
          psn: 'INACTIVE001',
          password: 'testpassword123'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Account is not active');
    });
  });

  describe('GET /auth/me', () => {
    let token;

    beforeAll(async () => {
      // Wait to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));

      // Get token for authenticated requests
      const response = await request(app)
        .post('/auth/login')
        .send({
          psn: 'TEST001',
          password: 'testpassword123'
        });
      token = response.body.access_token;
    });

    it('should return user profile for authenticated user', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.psn).toBe('TEST001');
      expect(response.body.user.username).toBe('TEST001');
      expect(response.body.user.name).toBe('Test User');
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.role).toBe('member');
      expect(response.body.user).toHaveProperty('created_at');
      expect(response.body.user).toHaveProperty('updated_at');
      expect(response.body.user).toHaveProperty('profile');
      expect(response.body.user.profile).toHaveProperty('membership_application_id');
      expect(response.body.user).not.toHaveProperty('password_hash');
    });

    it('should return 401 for missing token', async () => {
      const response = await request(app)
        .get('/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access token required');
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid token');
    });

    it('should return 404 when profile record is missing', async () => {
      const originalFindByPk = User.findByPk.bind(User);
      const spy = jest
        .spyOn(User, 'findByPk')
        .mockImplementationOnce((...args) => originalFindByPk(...args))
        .mockResolvedValueOnce({
          id: testUser.id,
          role: 'member',
          status: 'active',
          membershipApplication: null
        });

      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Profile not found');

      spy.mockRestore();
    });

    it('should return 500 when profile lookup fails unexpectedly', async () => {
      const originalFindByPk = User.findByPk.bind(User);
      const spy = jest
        .spyOn(User, 'findByPk')
        .mockImplementationOnce((...args) => originalFindByPk(...args))
        .mockImplementationOnce(() => Promise.reject(new Error('db down')));

      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to load profile');

      spy.mockRestore();
    });
  });
});
