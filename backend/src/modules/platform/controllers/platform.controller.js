const { PlatformAdmin, Tenant, MembershipApplication, User, sequelize } = require('../../../../models');
const emailService = require('../../../../services/emailService');
const landingPageGenerator = require('../../../services/landingPageGenerator.service');
const tenantSettingsService = require('../../settings/services/tenant-settings.service');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
// Platform Admin Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const admin = await PlatformAdmin.findOne({ where: { email } });
    if (!admin || admin.status !== 'active') {
      return res.status(401).json({ success: false, message: 'Invalid credentials or inactive account' });
    }

    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin.id, role: admin.role, platformAdmin: true },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      admin
    });
  } catch (error) {
    console.error('Platform login error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get all tenants
exports.getTenants = async (req, res) => {
  try {
    const tenants = await Tenant.findAll({
      order: [['created_at', 'DESC']]
    });
    
    res.json({
      success: true,
      tenants
    });
  } catch (error) {
    console.error('Get tenants error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Create a new tenant
exports.createTenant = async (req, res) => {
  try {
    const { id, name, domain, subdomain, cooperative_type, features, theme, admin } = req.body;

    if (!id || !name || !cooperative_type) {
      return res.status(400).json({ success: false, message: 'id, name, and cooperative_type are required' });
    }

    if (!admin || !admin.name || !admin.email || !admin.phone || !admin.password) {
      return res.status(400).json({ success: false, message: 'Administrator details (name, email, phone, password) are required' });
    }

    // Check if ID or Domain/Subdomain exists
    const existing = await Tenant.findOne({ where: { id } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Tenant ID already exists' });
    }

    // Create a default theme with landing page config if none provided
    const defaultTheme = {
      primaryColor: '#0ea5e9',
      secondaryColor: '#38bdf8',
      landingPage: {
        heroTopChip: 'Trusted, transparent, member-first',
        heroTitle: `Welcome to ${name}`,
        heroSubtitle: `Join ${name}. Save, invest, and access loans with competitive rates in a secure environment.`,
        heroFeatures: [
          { title: 'Principled', subtitle: 'Justice, fairness, and financial integrity' },
          { title: 'Member Benefits', subtitle: 'High yield investments and tailored loans' },
          { title: 'Clear Approvals', subtitle: 'Transparent review and instant notifications' }
        ],
        servicesTitle: 'Services built for clarity and speed',
        servicesDescription: 'A modern cooperative experience: simple onboarding, clear approvals, and a dashboard that keeps members informed at a glance.',
        services: [
          { title: 'Savings & investment', description: 'Contribute monthly and track balances over time.' },
          { title: 'Loans & guarantees', description: 'Apply, review, and manage loans with clear statuses.' },
          { title: 'Transparent governance', description: 'Admin workflows include validation, audit trails, and consistent feedback.' }
        ],
        howTitle: 'How it works',
        howDescription: 'A seamless guided flow from onboarding to contributions, loans, and support.',
        howSteps: [
          { title: 'Apply & get verified', body: 'Submit your membership application with accurate details.' },
          { title: 'Contribute monthly', body: 'Save and invest on a consistent schedule.' },
          { title: 'Access support & loans', body: 'Apply for eligible loans, manage guarantees, and receive communications.' }
        ],
        aboutText: `We are ${name}. Our mission is to foster financial independence, mutual support, and wealth creation for our members.`,
        aboutBullets: [
          'Empowering members through dedicated financial services',
          'Fostering a Culture of Savings & Investment',
          'Providing Accessible Financial Support'
        ],
        coreValues: [
          { title: 'Integrity', body: 'Operating with complete transparency and honesty.' },
          { title: 'Mutual Support', body: 'A community lifting each other up.' },
          { title: 'Excellence', body: 'Delivering professional-grade financial services.' },
          { title: 'Growth', body: 'Creating sustainable wealth through strategic investments.' }
        ],
        faqTitle: 'Frequently asked questions',
        faqDescription: 'Quick answers to the most common questions about our cooperative.',
        faqs: [
          { q: 'What loans are available?', a: 'We offer various loan types to active members.' },
          { q: 'How do guarantees work?', a: 'Members can receive and respond to guarantee requests from their dashboard.' },
          { q: 'How do withdrawals work?', a: 'Eligible members can request withdrawals subject to approval.' }
        ],
        ctaTitle: `Ready to join ${name}?`,
        ctaDescription: 'Apply in minutes. Track approvals, contributions, and loans from one secure dashboard.',
        footerDescription: `A modern cooperative platform. Built for transparency, accessibility, and responsible growth.`,
        contactEmail: `contact@${domain || subdomain || 'example.com'}`,
        contactPhone: '+234 000 000 0000'
      }
    };

    const cleanDomain = domain && domain.trim()
      ? domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
      : null;
    const cleanSubdomain = subdomain && subdomain.trim()
      ? subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, '')
      : null;

    const result = await sequelize.transaction(async (t) => {
      const tenant = await Tenant.create({
        id,
        name,
        domain: cleanDomain,
        subdomain: cleanSubdomain,
        cooperative_type,
        theme: theme || defaultTheme,
        features: features || undefined,
        status: 'active'
      }, { transaction: t });

      // Create Admin Membership Application
      const adminPsn = `${id.toUpperCase()}-ADM-001`;
      
      const membershipApp = await MembershipApplication.create({
        psn: adminPsn,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        facility_name: 'Tenant Admin',
        next_of_kin_name: 'N/A',
        next_of_kin_phone: 'N/A',
        status: 'approved'
      }, { transaction: t, skipTenant: true });

      // Use the manually provided password
      const tempPassword = admin.password;
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(tempPassword, salt);

      const user = await User.create({
        membership_application_id: membershipApp.id,
        tenant_id: id,
        password_hash: hashedPassword,
        role: 'admin',
        status: 'active',
        is_default_password: true
      }, { transaction: t, skipTenant: true });

      return { tenant, membershipApp, user, tempPassword };
    });

    // Send Welcome Email
    try {
      await emailService.sendWelcomeEmail(result.membershipApp, result.tempPassword);
    } catch (emailError) {
      console.error('Failed to send welcome email to tenant admin:', emailError);
    }

    // Auto-generate custom landing page code file for this tenant
    try {
      landingPageGenerator.writeLandingPageFile(result.tenant);
    } catch (genError) {
      console.error('Failed to generate landing page file for tenant:', genError);
    }

    // Initialize cooperative settings for tenant if provided
    try {
      const initialSettings = req.body.settings || {};
      if (name) initialSettings.cooperative_name = name;
      if (features) initialSettings.enabled_modules = { ...(initialSettings.enabled_modules || {}), ...features };
      await tenantSettingsService.update(id, initialSettings);
    } catch (setErr) {
      console.warn('Failed to initialize tenant settings:', setErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Tenant created successfully',
      tenant: result.tenant
    });
  } catch (error) {
    console.error('Create tenant error:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

// Update a tenant
exports.updateTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, domain, subdomain, status, cooperative_type, theme, features } = req.body;

    const tenant = await Tenant.findByPk(id);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    const cleanDomain = domain !== undefined
      ? (domain && domain.trim() ? domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '') : null)
      : tenant.domain;
    const cleanSubdomain = subdomain !== undefined
      ? (subdomain && subdomain.trim() ? subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, '') : null)
      : tenant.subdomain;

    await tenant.update({
      name: name || tenant.name,
      domain: cleanDomain,
      subdomain: cleanSubdomain,
      status: status || tenant.status,
      cooperative_type: cooperative_type || tenant.cooperative_type,
      theme: theme ? { ...(tenant.theme || {}), ...theme } : tenant.theme,
      features: features ? { ...(tenant.features || {}), ...features } : tenant.features
    });

    if (req.body.settings && typeof req.body.settings === 'object') {
      try {
        await tenantSettingsService.update(id, req.body.settings);
      } catch (setErr) {
        console.warn('Failed to update tenant settings in updateTenant:', setErr.message);
      }
    }

    res.json({
      success: true,
      message: 'Tenant updated successfully',
      tenant
    });
  } catch (error) {
    console.error('Update tenant error:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

// Delete a tenant
exports.deleteTenant = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prevent deleting the default or master tenant if necessary
    if (id === 'default') {
      return res.status(403).json({ success: false, message: 'Cannot delete the default tenant' });
    }

    const tenant = await Tenant.findByPk(id);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    await tenant.destroy();

    res.json({
      success: true,
      message: 'Tenant deleted successfully'
    });
  } catch (error) {
    console.error('Delete tenant error:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

// Get tenant landing page code
exports.getTenantLandingPageCode = async (req, res) => {
  try {
    const { id } = req.params;
    const tenant = await Tenant.findByPk(id);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    let code = landingPageGenerator.readLandingPageFile(id);
    if (!code) {
      code = landingPageGenerator.generateLandingPageCode(tenant);
      landingPageGenerator.writeLandingPageFile(tenant);
    }

    res.json({
      success: true,
      tenantId: id,
      code
    });
  } catch (error) {
    console.error('Error fetching landing page code:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

// Update tenant landing page code
exports.updateTenantLandingPageCode = async (req, res) => {
  try {
    const { id } = req.params;
    const { code } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ success: false, message: 'Code content is required' });
    }

    const tenant = await Tenant.findByPk(id);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    landingPageGenerator.saveLandingPageFile(id, code);

    res.json({
      success: true,
      message: 'Landing page code updated successfully'
    });
  } catch (error) {
    console.error('Error updating landing page code:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

// Regenerate tenant landing page code from template
exports.regenerateTenantLandingPage = async (req, res) => {
  try {
    const { id } = req.params;
    const tenant = await Tenant.findByPk(id);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    const filePath = landingPageGenerator.writeLandingPageFile(tenant);
    const code = landingPageGenerator.readLandingPageFile(id);

    res.json({
      success: true,
      message: 'Landing page regenerated successfully',
      code,
      filePath
    });
  } catch (error) {
    console.error('Error regenerating landing page:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

// Get settings for a specific tenant (Super Admin)
exports.getTenantSettings = async (req, res) => {
  try {
    const { id } = req.params;
    const settings = await tenantSettingsService.get(id);
    const tenant = await Tenant.findByPk(id);
    let admin = null;

    if (tenant) {
      settings.domain = tenant.domain || '';
      settings.subdomain = tenant.subdomain || '';
      if (!settings.cooperative_name) {
        settings.cooperative_name = tenant.name;
      }

      // Fetch primary admin for this tenant
      const adminUser = await User.findOne({
        where: {
          tenant_id: id,
          role: ['admin', 'super_admin']
        },
        include: [{
          model: MembershipApplication,
          as: 'membershipApplication',
          required: false
        }],
        order: [['id', 'ASC']],
        skipTenant: true
      });

      if (adminUser) {
        admin = {
          id: adminUser.id,
          role: adminUser.role,
          status: adminUser.status,
          is_default_password: adminUser.is_default_password,
          name: adminUser.membershipApplication ? adminUser.membershipApplication.name : 'Tenant Admin',
          email: adminUser.membershipApplication ? adminUser.membershipApplication.email : '',
          psn: adminUser.membershipApplication ? adminUser.membershipApplication.psn : '',
          phone: adminUser.membershipApplication ? adminUser.membershipApplication.phone : ''
        };
      }
    }

    res.json({
      success: true,
      settings,
      data: settings,
      admin,
      tenant: tenant ? {
        id: tenant.id,
        name: tenant.name,
        domain: tenant.domain,
        subdomain: tenant.subdomain,
        status: tenant.status
      } : null
    });
  } catch (error) {
    console.error('Error getting tenant settings for super admin:', error);
    res.status(500).json({ success: false, message: 'Failed to get tenant settings' });
  }
};

// Update settings for a specific tenant (Super Admin)
exports.updateTenantSettings = async (req, res) => {
  try {
    const { id } = req.params;
    const newSettings = req.body;
    const updatedSettings = await tenantSettingsService.update(id, newSettings);

    if (id !== 'default') {
      const tenant = await Tenant.findByPk(id);
      if (tenant) {
        const updateFields = {};
        if (newSettings.domain !== undefined) {
          updateFields.domain = newSettings.domain && newSettings.domain.trim()
            ? newSettings.domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
            : null;
        }
        if (newSettings.subdomain !== undefined) {
          updateFields.subdomain = newSettings.subdomain && newSettings.subdomain.trim()
            ? newSettings.subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, '')
            : null;
        }
        if (newSettings.cooperative_name && newSettings.cooperative_name !== tenant.name) {
          updateFields.name = newSettings.cooperative_name;
        }
        if (Object.keys(updateFields).length > 0) {
          await tenant.update(updateFields);
        }
        updatedSettings.domain = tenant.domain || '';
        updatedSettings.subdomain = tenant.subdomain || '';
      }
    }

    res.json({
      success: true,
      message: 'Cooperative settings updated successfully by Super Admin',
      settings: updatedSettings,
      data: updatedSettings
    });
  } catch (error) {
    console.error('Error updating tenant settings for super admin:', error);
    res.status(500).json({ success: false, message: 'Failed to update tenant settings' });
  }
};

// Get global platform default settings (Super Admin)
exports.getDefaultSettings = async (req, res) => {
  try {
    const defaults = await tenantSettingsService.get('default');
    res.json({
      success: true,
      settings: defaults,
      data: defaults
    });
  } catch (error) {
    console.error('Error getting default settings:', error);
    res.status(500).json({ success: false, message: 'Failed to get default settings' });
  }
};

// Update global platform default settings (Super Admin)
exports.updateDefaultSettings = async (req, res) => {
  try {
    const updated = await tenantSettingsService.update('default', req.body);
    res.json({
      success: true,
      message: 'Global cooperative default settings updated successfully',
      settings: updated,
      data: updated
    });
  } catch (error) {
    console.error('Error updating default settings:', error);
    res.status(500).json({ success: false, message: 'Failed to update default settings' });
  }
};

// Reset tenant admin password (Super Admin)
exports.resetTenantAdminPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password, userId } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, message: 'Tenant ID is required' });
    }

    const tenant = await Tenant.findByPk(id);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    let targetPassword = '';
    let isCustom = false;

    if (password && typeof password === 'string' && password.trim().length > 0) {
      if (password.trim().length < 6) {
        return res.status(400).json({ success: false, message: 'Custom password must be at least 6 characters long' });
      }
      targetPassword = password.trim();
      isCustom = true;
    } else {
      // Generate a secure default password: Admin@<6 random digits>
      const randomDigits = Math.floor(100000 + Math.random() * 900000);
      targetPassword = `Admin@${randomDigits}`;
      isCustom = false;
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(targetPassword, salt);

    let adminUser = null;

    if (userId) {
      adminUser = await User.findOne({
        where: { id: userId, tenant_id: id },
        include: [{
          model: MembershipApplication,
          as: 'membershipApplication',
          required: false
        }],
        skipTenant: true
      });
    }

    if (!adminUser) {
      // Find admin by tenant_id and role
      adminUser = await User.findOne({
        where: {
          tenant_id: id,
          role: ['admin', 'super_admin']
        },
        include: [{
          model: MembershipApplication,
          as: 'membershipApplication',
          required: false
        }],
        order: [['id', 'ASC']],
        skipTenant: true
      });
    }

    // Fallback: If still not found, check if there's any user with admin PSN for this tenant
    if (!adminUser) {
      const adminPsn = `${id.toUpperCase()}-ADM-001`;
      const memApp = await MembershipApplication.findOne({
        where: { psn: adminPsn },
        skipTenant: true
      });
      if (memApp) {
        adminUser = await User.findOne({
          where: { membership_application_id: memApp.id },
          include: [{
            model: MembershipApplication,
            as: 'membershipApplication',
            required: false
          }],
          skipTenant: true
        });
      }
    }

    // If still no admin user exists, auto-provision one for this tenant
    if (!adminUser) {
      const adminPsn = `${id.toUpperCase()}-ADM-001`;
      let memApp = await MembershipApplication.findOne({
        where: { psn: adminPsn },
        skipTenant: true
      });

      if (!memApp) {
        memApp = await MembershipApplication.create({
          psn: adminPsn,
          name: `${tenant.name} Administrator`,
          email: `admin@${id.toLowerCase()}.coop`,
          phone: '08000000000',
          facility_name: 'Tenant Admin',
          next_of_kin_name: 'N/A',
          next_of_kin_phone: 'N/A',
          status: 'approved'
        }, { skipTenant: true });
      }

      adminUser = await User.create({
        membership_application_id: memApp.id,
        tenant_id: id,
        password_hash: hashedPassword,
        role: 'admin',
        status: 'active',
        is_default_password: true
      }, { skipTenant: true });

      adminUser.membershipApplication = memApp;
    } else {
      // Update existing admin user
      await adminUser.update({
        password_hash: hashedPassword,
        is_default_password: true,
        status: 'active',
        deleted_at: null
      }, { skipTenant: true });
    }

    const adminName = adminUser.membershipApplication ? adminUser.membershipApplication.name : `${tenant.name} Administrator`;
    const adminEmail = adminUser.membershipApplication ? adminUser.membershipApplication.email : '';
    const adminPsn = adminUser.membershipApplication ? adminUser.membershipApplication.psn : '';

    return res.json({
      success: true,
      message: isCustom
        ? `Administrator password successfully updated to the custom password for ${tenant.name}.`
        : `Administrator password successfully reset with a new secure password for ${tenant.name}.`,
      data: {
        userId: adminUser.id,
        tenantId: id,
        name: adminName,
        email: adminEmail,
        psn: adminPsn,
        newPassword: targetPassword,
        isCustom
      }
    });
  } catch (error) {
    console.error('Error resetting tenant admin password:', error);
    res.status(500).json({ success: false, message: 'Failed to reset administrator password: ' + (error.message || 'Server error') });
  }
};

