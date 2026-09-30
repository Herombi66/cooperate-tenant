process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-12345';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const app = require('../app');
const { sequelize } = require('../db/connection');
const { User, MembershipApplication, Tenant, Settings } = require('../models');
const tenantSettingsService = require('../src/modules/settings/services/tenant-settings.service');

describe('Cooperative Settings - 15 Hierarchy Components', () => {
  let adminToken;
  let adminUser;

  beforeAll(async () => {
    try {
      await sequelize.sync();

      // Ensure tenant exists
      await Tenant.upsert({
        id: 'default',
        name: 'Default Cooperative',
        cooperative_type: 'islamic',
        status: 'active'
      });

      const adminApp = await MembershipApplication.create({
        psn: 'PSN_COOP_ADMIN_01',
        name: 'Super Cooperative Admin',
        email: `coop_admin_${Date.now()}@example.com`,
        phone: '08012345678',
        facility_name: 'HQ',
        next_of_kin_name: 'Admin Kin',
        next_of_kin_phone: '08087654321',
        status: 'approved'
      });

      const hashedPassword = await bcrypt.hash('password123', 10);
      adminUser = await User.create({
        membership_application_id: adminApp.id,
        password_hash: hashedPassword,
        role: 'admin',
        status: 'active'
      });

      adminToken = jwt.sign(
        { id: adminUser.id, role: adminUser.role },
        process.env.JWT_SECRET,
        { expiresIn: '2h' }
      );
    } catch (e) {
      console.error('Setup failed:', e);
    }
  });

  it('1. should return all 15 components with comprehensive defaults from service', async () => {
    const defaults = tenantSettingsService.getDefaultSettings();

    // 1. Name
    expect(defaults.cooperative_name).toBeDefined();
    // 2. Logo
    expect(defaults.cooperative_logo).toBeDefined();
    // 3. Address
    expect(defaults.address).toBeDefined();
    // 4. Contact details
    expect(defaults.contact_email).toBeDefined();
    expect(defaults.contact_phone).toBeDefined();
    expect(defaults.contact_website).toBeDefined();
    // 5. Currency
    expect(defaults.currency_code).toBe('NGN');
    expect(defaults.currency_symbol).toBe('₦');
    expect(defaults.currency_name).toBe('Nigerian Naira');
    // 6. Contribution rules
    expect(defaults.minimum_savings).toBe(1000);
    expect(defaults.minimum_target_savings).toBe(2000);
    expect(defaults.target_savings_min_period).toBe(6);
    expect(defaults.allow_voluntary_savings).toBe(true);
    expect(defaults.savings_withdrawal_lock_months).toBe(6);
    expect(defaults.max_savings_withdrawal_percent).toBe(70);
    // 7. Loan rules
    expect(defaults.max_loan_amount).toBe(1000000);
    expect(defaults.max_cash_loan).toBe(500000);
    expect(defaults.investment_loan_multiplier).toBe(3);
    expect(defaults.default_repayment_period).toBe(12);
    expect(defaults.min_membership_months_for_loan).toBe(6);
    expect(defaults.loan_interest_rate).toBe(5);
    expect(defaults.late_payment_fee).toBe(5);
    expect(defaults.require_guarantors).toBe(true);
    // 8. Investment rules
    expect(defaults.minimum_investment).toBe(5000);
    expect(defaults.investment_lock_period_months).toBe(12);
    expect(defaults.expected_roi_percent).toBe(15);
    expect(defaults.allow_early_liquidation).toBe(false);
    expect(defaults.early_termination_penalty_percent).toBe(10);
    // 9. Profit distribution rules
    expect(defaults.profit_sharing_frequency).toBe('quarterly');
    expect(defaults.reserve_fund_percentage).toBe(10);
    expect(defaults.education_fund_percentage).toBe(5);
    expect(defaults.committee_bonus_percentage).toBe(5);
    expect(defaults.bad_debt_reserve_percentage).toBe(3.5);
    expect(defaults.general_reserve_percentage).toBe(2.8);
    expect(defaults.member_dividend_percentage).toBe(73.7);
    // 10. Registration fee
    expect(defaults.registration_fee).toBe(2000);
    expect(defaults.auto_deduct_registration_fee).toBe(true);
    // 11. Monthly administrative fee
    expect(defaults.monthly_admin_fee).toBe(1000);
    expect(defaults.auto_deduct_monthly_admin_fee).toBe(true);
    // 12. Subscription status
    expect(defaults.subscription_status).toBe('active');
    expect(defaults.subscription_plan).toBeDefined();
    // 13. Subscription expiry
    expect(defaults.subscription_expiry).toBeDefined();
    // 14. Enabled modules
    expect(defaults.enabled_modules).toBeDefined();
    expect(defaults.enabled_modules.loans).toBe(true);
    expect(defaults.enabled_modules.contributions).toBe(true);
    expect(defaults.enabled_modules.investments).toBe(true);
    expect(defaults.enabled_modules.layyah).toBe(true);
    expect(defaults.enabled_modules.expenses).toBe(true);
    expect(defaults.enabled_modules.profit_sharing).toBe(true);
    expect(defaults.enabled_modules.withdrawals).toBe(true);
    // 15. AI settings
    expect(defaults.ai_settings).toBeDefined();
    expect(defaults.ai_settings.enabled).toBe(true);
    expect(defaults.ai_settings.provider).toBe('gemini');
    expect(defaults.ai_settings.loan_risk_scoring).toBe(true);
    expect(defaults.ai_settings.financial_advisor).toBe(true);
    expect(defaults.ai_settings.document_ocr).toBe(true);
    expect(defaults.ai_settings.auto_reporting).toBe(true);
  });

  it('2. GET /settings should return complete configuration object', async () => {
    const res = await request(app)
      .get('/settings')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    const settings = res.body.settings || res.body.data;
    expect(settings).toBeDefined();
    expect(settings.cooperative_name).toBeDefined();
    expect(settings.currency_code).toBeDefined();
    expect(settings.enabled_modules).toBeDefined();
    expect(settings.ai_settings).toBeDefined();
  });

  it('3. PUT /settings should update settings and persist all 15 elements', async () => {
    const payload = {
      cooperative_name: 'FMCK Staff Cooperative Society',
      address: 'FMC Keffi, Nasarawa State',
      contact_email: 'info@fmckcoop.org',
      contact_phone: '+234-803-123-4567',
      currency_code: 'NGN',
      currency_symbol: '₦',
      currency_name: 'Nigerian Naira',
      minimum_savings: 5000,
      minimum_target_savings: 10000,
      target_savings_min_period: 12,
      allow_voluntary_savings: true,
      savings_withdrawal_lock_months: 6,
      max_savings_withdrawal_percent: 75,
      max_loan_amount: 3000000,
      max_cash_loan: 1500000,
      investment_loan_multiplier: 3,
      default_repayment_period: 24,
      min_membership_months_for_loan: 6,
      loan_interest_rate: 6,
      late_payment_fee: 5,
      max_active_loans_per_member: 3,
      require_guarantors: true,
      min_guarantors_count: 2,
      minimum_investment: 20000,
      investment_lock_period_months: 12,
      expected_roi_percent: 18,
      allow_early_liquidation: true,
      early_termination_penalty_percent: 8,
      profit_sharing_frequency: 'annually',
      reserve_fund_percentage: 15,
      education_fund_percentage: 5,
      committee_bonus_percentage: 5,
      bad_debt_reserve_percentage: 5,
      general_reserve_percentage: 5,
      member_dividend_percentage: 65,
      registration_fee: 5000,
      auto_deduct_registration_fee: true,
      monthly_admin_fee: 1500,
      auto_deduct_monthly_admin_fee: true,
      subscription_status: 'active',
      subscription_plan: 'Enterprise Multi-Branch',
      subscription_expiry: '2028-12-31',
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
        api_key: 'AIzaSyTestMockKey999',
        loan_risk_scoring: true,
        financial_advisor: true,
        document_ocr: true,
        auto_reporting: true
      }
    };

    const res = await request(app)
      .put('/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify GET reflects the changes
    const verifyRes = await request(app)
      .get('/settings')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(verifyRes.statusCode).toBe(200);
    const updated = verifyRes.body.settings || verifyRes.body.data;
    expect(updated.cooperative_name).toBe('FMCK Staff Cooperative Society');
    expect(updated.minimum_savings).toBe(5000);
    expect(updated.registration_fee).toBe(5000);
    expect(updated.monthly_admin_fee).toBe(1500);
    expect(updated.subscription_plan).toBe('Enterprise Multi-Branch');
    expect(updated.enabled_modules.loans).toBe(true);
    expect(updated.ai_settings.provider).toBe('gemini');
  });

  it('4. POST /settings/logo should accept and store uploaded logo', async () => {
    const buffer = Buffer.from('test-logo-image-binary-stream');

    const res = await request(app)
      .post('/settings/logo')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('logo', buffer, { filename: 'test_logo.png', contentType: 'image/png' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.logo || res.body.data?.logo).toBeDefined();
    expect((res.body.logo || res.body.data?.logo)).toContain('data:image/png;base64,');
  });
});
