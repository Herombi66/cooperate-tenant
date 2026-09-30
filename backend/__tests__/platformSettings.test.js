process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-12345';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const app = require('../app');
const { sequelize } = require('../db/connection');
const { PlatformAdmin, Tenant, Settings } = require('../models');

describe('Super Admin Platform Cooperative Settings', () => {
  let superAdminToken;
  let superAdmin;

  beforeAll(async () => {
    try {
      await sequelize.sync();

      // Create Platform Admin
      const email = `superadmin_${Date.now()}@platform.com`;
      const password_hash = await bcrypt.hash('admin123', 10);
      superAdmin = await PlatformAdmin.create({
        name: 'Platform Super Admin',
        email,
        password_hash,
        role: 'super_admin',
        status: 'active'
      });

      superAdminToken = jwt.sign(
        { id: superAdmin.id, role: superAdmin.role, platformAdmin: true },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Create a test tenant
      await Tenant.upsert({
        id: 'coop_test_1',
        name: 'Cooperative Test 1',
        cooperative_type: 'islamic',
        status: 'active'
      });
    } catch (e) {
      console.error('Setup failed:', e);
    }
  });

  it('1. Super Admin can fetch cooperative settings for a specific tenant', async () => {
    const res = await request(app)
      .get('/platform/tenants/coop_test_1/settings')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.settings).toBeDefined();
    expect(res.body.settings.currency_code).toBeDefined();
    expect(res.body.settings.enabled_modules).toBeDefined();
    expect(res.body.settings.ai_settings).toBeDefined();
  });

  it('2. Super Admin can update all 15 settings for a specific tenant', async () => {
    const payload = {
      cooperative_name: 'Super Admin Configured Cooperative',
      address: 'Central Admin Complex, Abuja',
      contact_email: 'admin@configuredcoop.org',
      contact_phone: '+234-809-999-0000',
      currency_code: 'NGN',
      currency_symbol: '₦',
      currency_name: 'Nigerian Naira',
      minimum_savings: 3000,
      minimum_target_savings: 5000,
      target_savings_min_period: 6,
      allow_voluntary_savings: true,
      savings_withdrawal_lock_months: 3,
      max_savings_withdrawal_percent: 80,
      max_loan_amount: 5000000,
      max_cash_loan: 2000000,
      investment_loan_multiplier: 4,
      default_repayment_period: 24,
      min_membership_months_for_loan: 3,
      loan_interest_rate: 4.5,
      late_payment_fee: 3,
      max_active_loans_per_member: 3,
      require_guarantors: true,
      min_guarantors_count: 2,
      minimum_investment: 10000,
      investment_lock_period_months: 6,
      expected_roi_percent: 20,
      allow_early_liquidation: true,
      early_termination_penalty_percent: 5,
      profit_sharing_frequency: 'quarterly',
      reserve_fund_percentage: 10,
      education_fund_percentage: 5,
      committee_bonus_percentage: 5,
      bad_debt_reserve_percentage: 5,
      general_reserve_percentage: 5,
      member_dividend_percentage: 70,
      registration_fee: 3000,
      auto_deduct_registration_fee: true,
      monthly_admin_fee: 1000,
      auto_deduct_monthly_admin_fee: true,
      subscription_status: 'active',
      subscription_plan: 'Enterprise Multi-Branch License',
      subscription_expiry: '2029-12-31',
      enabled_modules: {
        loans: true,
        contributions: true,
        investments: true,
        layyah: true,
        expenses: true,
        profit_sharing: true,
        withdrawals: true,
        receipt_designer: true,
        document_designer: true,
        member_portal: true
      },
      ai_settings: {
        enabled: true,
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        api_key: 'AIzaSySuperAdminConfiguredKey',
        loan_risk_scoring: true,
        financial_advisor: true,
        document_ocr: true,
        auto_reporting: true
      }
    };

    const res = await request(app)
      .put('/platform/tenants/coop_test_1/settings')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send(payload);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify GET reflects the changes
    const verifyRes = await request(app)
      .get('/platform/tenants/coop_test_1/settings')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(verifyRes.statusCode).toBe(200);
    expect(verifyRes.body.settings.cooperative_name).toBe('Super Admin Configured Cooperative');
    expect(verifyRes.body.settings.subscription_plan).toBe('Enterprise Multi-Branch License');
    expect(verifyRes.body.settings.subscription_expiry).toBe('2029-12-31');
    expect(verifyRes.body.settings.enabled_modules.loans).toBe(true);
    expect(verifyRes.body.settings.ai_settings.api_key).toBe('AIzaSySuperAdminConfiguredKey');
  });

  it('3. Super Admin can get and update global default settings', async () => {
    const getRes = await request(app)
      .get('/platform/settings/defaults')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(getRes.statusCode).toBe(200);
    expect(getRes.body.settings).toBeDefined();

    const putRes = await request(app)
      .put('/platform/settings/defaults')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        subscription_plan: 'Standard Platform License',
        registration_fee: 2500
      });

    expect(putRes.statusCode).toBe(200);
    expect(putRes.body.settings.registration_fee).toBe(2500);
  });
});
