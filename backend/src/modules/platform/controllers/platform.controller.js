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
    const { id, name, domain, subdomain, cooperative_type, features } = req.body;

    if (!id || !name || !cooperative_type) {
      return res.status(400).json({ success: false, message: 'id, name, and cooperative_type are required' });
    }

    // Check if ID or Domain/Subdomain exists
    const existing = await Tenant.findOne({ where: { id } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Tenant ID already exists' });
    }

    const tenant = await Tenant.create({
      id,
      name,
      domain: domain || null,
      subdomain: subdomain || null,
      cooperative_type,
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
      theme: theme || tenant.theme,
      features: features || tenant.features
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
