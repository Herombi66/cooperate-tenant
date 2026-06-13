const { PlatformAdmin, Tenant } = require('../../../../models');
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
    const { id, name, domain, subdomain, cooperative_type, features, theme } = req.body;

    if (!id || !name || !cooperative_type) {
      return res.status(400).json({ success: false, message: 'id, name, and cooperative_type are required' });
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

    const tenant = await Tenant.create({
      id,
      name,
      domain: domain || null,
      subdomain: subdomain || null,
      cooperative_type,
      theme: theme || defaultTheme,
      features: features || undefined,
      status: 'active'
    });

    res.status(201).json({
      success: true,
      message: 'Tenant created successfully',
      tenant
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

    await tenant.update({
      name: name || tenant.name,
      domain: domain !== undefined ? domain : tenant.domain,
      subdomain: subdomain !== undefined ? subdomain : tenant.subdomain,
      status: status || tenant.status,
      cooperative_type: cooperative_type || tenant.cooperative_type,
      theme: theme ? { ...(tenant.theme || {}), ...theme } : tenant.theme,
      features: features ? { ...(tenant.features || {}), ...features } : tenant.features
    });

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
