const { Module, Role, RolePermission } = require('../models');

const STANDARD_MODULES = [
  { key: 'members', name: 'Members Directory', category: 'Operations', route_path: '/members', description: 'View, register, and manage cooperative member profiles' },
  { key: 'member_applications', name: 'Member Applications', category: 'Operations', route_path: '/member-applications', description: 'Review and approve new membership applications' },
  { key: 'contributions', name: 'Contributions', category: 'Financial', route_path: '/contributions', description: 'Monthly contributions, remittances, and savings ledgers' },
  { key: 'savings', name: 'Savings & Withdrawals', category: 'Financial', route_path: '/withdrawals', description: 'Manage member savings and process withdrawal requests' },
  { key: 'loans', name: 'Loans & Disbursals', category: 'Financial', route_path: '/loans', description: 'Active and disbursed cooperative loans management' },
  { key: 'loan_applications', name: 'Loan Applications', category: 'Financial', route_path: '/loan-applications', description: 'Loan requests, guarantor verification, and approval workflow' },
  { key: 'repayments', name: 'Loan Repayments', category: 'Financial', route_path: '/loan-repayments', description: 'Loan repayment schedules, uploads, and liquidations' },
  { key: 'investments', name: 'Commodity & Investments', category: 'Financial', route_path: '/admin-layyah', description: 'Commodity purchase, trading, and investment schemes' },
  { key: 'expenses', name: 'Expenses & Vouchers', category: 'Financial', route_path: '/expenses', description: 'Track cooperative operational expenses and vouchers' },
  { key: 'profit_distribution', name: 'Profit Distribution', category: 'Financial', route_path: '/profit-sharing', description: 'Calculate and distribute dividend and profit sharing' },
  { key: 'accounts', name: 'Accounts & Statements', category: 'Financial', route_path: '/reports', description: 'Cooperative account statements and ledger balance overview' },
  { key: 'transactions', name: 'Transactions & Reconciliation', category: 'Financial', route_path: '/reports', description: 'Real-time financial transactions and bank reconciliation' },
  { key: 'reports', name: 'Reports & Analytics', category: 'Compliance', route_path: '/reports', description: 'Comprehensive financial, regulatory, and audit reports' },
  { key: 'audit', name: 'Audit & System Logs', category: 'Compliance', route_path: '/security-center', description: 'Internal audit reviews, reconciliation exceptions, and system logs' },
  { key: 'notifications', name: 'Communications & Broadcast', category: 'Administration', route_path: '/communication', description: 'Broadcast messages, member notices, and direct communications' },
  { key: 'documents', name: 'Agreements & Bylaws', category: 'Administration', route_path: '/agreements', description: 'Cooperative bylaws, loan agreement contracts, and receipts' },
  { key: 'settings', name: 'System Settings', category: 'Administration', route_path: '/settings', description: 'Cooperative parameters, contribution rates, and system settings' },
  { key: 'user_management', name: 'User Management', category: 'Administration', route_path: '/user-management', description: 'Executive officer role assignment and member credentials' }
];

const STANDARD_ROLES = [
  { name: 'super_admin', description: 'Super Administrator with complete system access', is_system: true },
  { name: 'admin', description: 'System Administrator with complete system access', is_system: true },
  { name: 'chairman', description: 'Cooperative Chairman - Executive Leader', is_system: true },
  { name: 'treasurer', description: 'Cooperative Treasurer - Financial Custodian', is_system: true },
  { name: 'secretary', description: 'General Secretary - Administrative Officer', is_system: true },
  { name: 'assistant_secretary', description: 'Assistant Secretary - Secretarial Officer', is_system: true },
  { name: 'financial_secretary', description: 'Financial Secretary - Accounting Officer', is_system: true },
  { name: 'auditor', description: 'Internal Auditor - Oversight & Compliance', is_system: true },
  { name: 'state_auditor', description: 'State Auditor - External Government Oversight', is_system: true },
  { name: 'pro', description: 'Public Relations Officer - Member Communications', is_system: true },
  { name: 'member', description: 'General Cooperative Member', is_system: true }
];

// Helper: standard permissions matrix definition
const DEFAULT_PERMISSIONS = {
  super_admin: { all: { r: true, w: true, e: true, d: true } },
  admin: { all: { r: true, w: true, e: true, d: true } },
  chairman: {
    members: { r: true, w: false, e: true, d: false },
    member_applications: { r: true, w: false, e: true, d: false },
    contributions: { r: true, w: false, e: false, d: false },
    savings: { r: true, w: false, e: true, d: false },
    loans: { r: true, w: true, e: true, d: false },
    loan_applications: { r: true, w: false, e: true, d: false },
    repayments: { r: true, w: false, e: false, d: false },
    investments: { r: true, w: false, e: true, d: false },
    expenses: { r: true, w: false, e: true, d: false },
    profit_distribution: { r: true, w: false, e: true, d: false },
    accounts: { r: true, w: false, e: false, d: false },
    transactions: { r: true, w: false, e: false, d: false },
    reports: { r: true, w: false, e: false, d: false },
    audit: { r: true, w: false, e: false, d: false },
    notifications: { r: true, w: true, e: true, d: false },
    documents: { r: true, w: false, e: true, d: false },
    settings: { r: true, w: false, e: false, d: false },
    user_management: { r: true, w: false, e: false, d: false }
  },
  treasurer: {
    members: { r: true, w: false, e: false, d: false },
    member_applications: { r: false, w: false, e: false, d: false },
    contributions: { r: true, w: true, e: true, d: false },
    savings: { r: true, w: true, e: true, d: false },
    loans: { r: true, w: true, e: true, d: false },
    loan_applications: { r: true, w: false, e: false, d: false },
    repayments: { r: true, w: true, e: true, d: false },
    investments: { r: true, w: true, e: true, d: false },
    expenses: { r: true, w: true, e: true, d: false },
    profit_distribution: { r: true, w: true, e: true, d: false },
    accounts: { r: true, w: true, e: true, d: false },
    transactions: { r: true, w: true, e: true, d: false },
    reports: { r: true, w: false, e: false, d: false },
    audit: { r: true, w: false, e: false, d: false },
    notifications: { r: false, w: false, e: false, d: false },
    documents: { r: true, w: false, e: false, d: false },
    settings: { r: false, w: false, e: false, d: false },
    user_management: { r: false, w: false, e: false, d: false }
  },
  secretary: {
    members: { r: true, w: true, e: true, d: false },
    member_applications: { r: true, w: true, e: true, d: false },
    contributions: { r: false, w: false, e: false, d: false },
    savings: { r: false, w: false, e: false, d: false },
    loans: { r: true, w: false, e: false, d: false },
    loan_applications: { r: true, w: false, e: false, d: false },
    repayments: { r: false, w: false, e: false, d: false },
    investments: { r: false, w: false, e: false, d: false },
    expenses: { r: false, w: false, e: false, d: false },
    profit_distribution: { r: false, w: false, e: false, d: false },
    accounts: { r: false, w: false, e: false, d: false },
    transactions: { r: false, w: false, e: false, d: false },
    reports: { r: true, w: false, e: false, d: false },
    audit: { r: true, w: false, e: false, d: false },
    notifications: { r: true, w: true, e: true, d: false },
    documents: { r: true, w: true, e: true, d: false },
    settings: { r: false, w: false, e: false, d: false },
    user_management: { r: false, w: false, e: false, d: false }
  },
  assistant_secretary: {
    members: { r: true, w: true, e: true, d: false },
    member_applications: { r: true, w: true, e: true, d: false },
    contributions: { r: false, w: false, e: false, d: false },
    savings: { r: false, w: false, e: false, d: false },
    loans: { r: true, w: false, e: false, d: false },
    loan_applications: { r: true, w: false, e: false, d: false },
    repayments: { r: false, w: false, e: false, d: false },
    investments: { r: false, w: false, e: false, d: false },
    expenses: { r: false, w: false, e: false, d: false },
    profit_distribution: { r: false, w: false, e: false, d: false },
    accounts: { r: false, w: false, e: false, d: false },
    transactions: { r: false, w: false, e: false, d: false },
    reports: { r: true, w: false, e: false, d: false },
    audit: { r: true, w: false, e: false, d: false },
    notifications: { r: true, w: true, e: true, d: false },
    documents: { r: true, w: true, e: true, d: false },
    settings: { r: false, w: false, e: false, d: false },
    user_management: { r: false, w: false, e: false, d: false }
  },
  financial_secretary: {
    members: { r: true, w: false, e: false, d: false },
    member_applications: { r: false, w: false, e: false, d: false },
    contributions: { r: true, w: true, e: true, d: false },
    savings: { r: true, w: true, e: true, d: false },
    loans: { r: true, w: false, e: false, d: false },
    loan_applications: { r: true, w: false, e: false, d: false },
    repayments: { r: true, w: true, e: true, d: false },
    investments: { r: false, w: false, e: false, d: false },
    expenses: { r: true, w: true, e: true, d: false },
    profit_distribution: { r: true, w: true, e: true, d: false },
    accounts: { r: true, w: true, e: true, d: false },
    transactions: { r: true, w: true, e: true, d: false },
    reports: { r: true, w: false, e: false, d: false },
    audit: { r: true, w: false, e: false, d: false },
    notifications: { r: false, w: false, e: false, d: false },
    documents: { r: true, w: false, e: false, d: false },
    settings: { r: false, w: false, e: false, d: false },
    user_management: { r: false, w: false, e: false, d: false }
  },
  auditor: {
    members: { r: true, w: false, e: false, d: false },
    member_applications: { r: true, w: false, e: false, d: false },
    contributions: { r: true, w: false, e: false, d: false },
    savings: { r: true, w: false, e: false, d: false },
    loans: { r: true, w: false, e: false, d: false },
    loan_applications: { r: true, w: false, e: false, d: false },
    repayments: { r: true, w: false, e: false, d: false },
    investments: { r: true, w: false, e: false, d: false },
    expenses: { r: true, w: false, e: false, d: false },
    profit_distribution: { r: true, w: false, e: false, d: false },
    accounts: { r: true, w: false, e: false, d: false },
    transactions: { r: true, w: false, e: false, d: false },
    reports: { r: true, w: false, e: false, d: false },
    audit: { r: true, w: true, e: true, d: false },
    notifications: { r: false, w: false, e: false, d: false },
    documents: { r: true, w: false, e: false, d: false },
    settings: { r: true, w: false, e: false, d: false },
    user_management: { r: false, w: false, e: false, d: false }
  },
  state_auditor: {
    members: { r: true, w: false, e: false, d: false },
    member_applications: { r: true, w: false, e: false, d: false },
    contributions: { r: true, w: false, e: false, d: false },
    savings: { r: true, w: false, e: false, d: false },
    loans: { r: true, w: false, e: false, d: false },
    loan_applications: { r: true, w: false, e: false, d: false },
    repayments: { r: true, w: false, e: false, d: false },
    investments: { r: true, w: false, e: false, d: false },
    expenses: { r: true, w: false, e: false, d: false },
    profit_distribution: { r: true, w: false, e: false, d: false },
    accounts: { r: true, w: false, e: false, d: false },
    transactions: { r: true, w: false, e: false, d: false },
    reports: { r: true, w: false, e: false, d: false },
    audit: { r: true, w: false, e: false, d: false },
    notifications: { r: false, w: false, e: false, d: false },
    documents: { r: true, w: false, e: false, d: false },
    settings: { r: false, w: false, e: false, d: false },
    user_management: { r: false, w: false, e: false, d: false }
  },
  pro: {
    members: { r: true, w: false, e: false, d: false },
    member_applications: { r: true, w: false, e: false, d: false },
    contributions: { r: false, w: false, e: false, d: false },
    savings: { r: false, w: false, e: false, d: false },
    loans: { r: false, w: false, e: false, d: false },
    loan_applications: { r: false, w: false, e: false, d: false },
    repayments: { r: false, w: false, e: false, d: false },
    investments: { r: false, w: false, e: false, d: false },
    expenses: { r: false, w: false, e: false, d: false },
    profit_distribution: { r: false, w: false, e: false, d: false },
    accounts: { r: false, w: false, e: false, d: false },
    transactions: { r: false, w: false, e: false, d: false },
    reports: { r: true, w: false, e: false, d: false },
    audit: { r: false, w: false, e: false, d: false },
    notifications: { r: true, w: true, e: true, d: false },
    documents: { r: true, w: false, e: false, d: false },
    settings: { r: false, w: false, e: false, d: false },
    user_management: { r: false, w: false, e: false, d: false }
  },
  member: {
    // Members have self-service routes (my-contributions, my-loans, etc.)
  }
};

async function seedModulesAndRBAC(targetRoleName = null) {
  try {
    console.log('🌱 [RBAC Seeder] Initializing modules and executive roles...');

    // 1. Ensure Standard Modules exist
    const moduleMap = {};
    for (const mod of STANDARD_MODULES) {
      const [record] = await Module.findOrCreate({
        where: { key: mod.key },
        defaults: {
          ...mod,
          is_system: true,
          tenant_id: 'default'
        }
      });
      moduleMap[mod.key] = record;
    }

    // Also load any custom modules created by admin
    const allModules = await Module.findAll();
    allModules.forEach(m => {
      moduleMap[m.key] = m;
    });

    // 2. Ensure Standard Roles exist
    const roleMap = {};
    for (const r of STANDARD_ROLES) {
      const [record] = await Role.findOrCreate({
        where: { name: r.name },
        defaults: {
          ...r,
          tenant_id: 'default'
        }
      });
      roleMap[r.name] = record;
    }

    const allRoles = await Role.findAll();
    allRoles.forEach(r => {
      roleMap[r.name] = r;
    });

    // 3. Populate permissions for roles
    const rolesToSeed = targetRoleName 
      ? allRoles.filter(r => r.name.toLowerCase() === targetRoleName.toLowerCase())
      : allRoles;

    for (const role of rolesToSeed) {
      const roleDef = DEFAULT_PERMISSIONS[role.name.toLowerCase()];

      for (const module of allModules) {
        let p = { r: false, w: false, e: false, d: false };

        if (role.name === 'admin' || role.name === 'super_admin') {
          p = { r: true, w: true, e: true, d: true };
        } else if (roleDef) {
          if (roleDef.all) {
            p = roleDef.all;
          } else if (roleDef[module.key]) {
            p = roleDef[module.key];
          }
        }

        // Find or create role_permissions record
        const existing = await RolePermission.findOne({
          where: {
            role_id: role.id,
            module_id: module.id
          }
        });

        if (!existing) {
          await RolePermission.create({
            role_id: role.id,
            module_id: module.id,
            module_key: module.key,
            tenant_id: role.tenant_id || 'default',
            can_read: !!p.r,
            can_write: !!p.w,
            can_edit: !!p.e,
            can_delete: !!p.d
          });
        } else if (targetRoleName) {
          // If explicitly resetting a specific role, update it to defaults
          await existing.update({
            module_key: module.key,
            can_read: !!p.r,
            can_write: !!p.w,
            can_edit: !!p.e,
            can_delete: !!p.d
          });
        }
      }
    }

    console.log(`✅ [RBAC Seeder] Modules and executive permissions verified (${allModules.length} modules, ${allRoles.length} roles).`);
    return { success: true, modulesCount: allModules.length, rolesCount: allRoles.length };
  } catch (error) {
    console.error('❌ [RBAC Seeder] Failed:', error);
    throw error;
  }
}

module.exports = {
  seedModulesAndRBAC,
  STANDARD_MODULES,
  STANDARD_ROLES,
  DEFAULT_PERMISSIONS
};
