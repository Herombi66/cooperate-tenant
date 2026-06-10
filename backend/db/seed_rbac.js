const { sequelize } = require('./connection');
const { 
  User, 
  Role, 
  PermissionCategory, 
  Permission, 
  RolePermission, 
  UserRole 
} = require('../models');

const seedRBAC = async () => {
  try {
    // Sync RBAC tables
    await sequelize.sync({ alter: true });
    console.log('✅ RBAC tables synced successfully.');

    // 1. Create Categories
    const categoriesData = [
      { name: 'Users', description: 'Manage members and admins' },
      { name: 'Loans', description: 'Manage loan applications, approvals, and disbursements' },
      { name: 'Contributions', description: 'Manage savings and investments' },
      { name: 'Expenses', description: 'Manage cooperative expenses' },
      { name: 'System', description: 'Manage system settings and roles' }
    ];

    const categories = await PermissionCategory.bulkCreate(categoriesData, { updateOnDuplicate: ['description'] });
    
    const catMap = {};
    categories.forEach(c => catMap[c.name] = c.id);

    // 2. Create Permissions
    const permissionsData = [
      // Users
      { name: 'create_user', category_id: catMap['Users'], description: 'Create new users' },
      { name: 'view_users', category_id: catMap['Users'], description: 'View user profiles' },
      { name: 'edit_user', category_id: catMap['Users'], description: 'Edit user profiles' },
      { name: 'delete_user', category_id: catMap['Users'], description: 'Delete users' },
      
      // Loans
      { name: 'apply_loan', category_id: catMap['Loans'], description: 'Apply for a loan' },
      { name: 'view_loans', category_id: catMap['Loans'], description: 'View loan applications' },
      { name: 'approve_loan', category_id: catMap['Loans'], description: 'Approve or reject loans' },
      { name: 'disburse_loan', category_id: catMap['Loans'], description: 'Disburse approved loans' },
      { name: 'liquidate_loan', category_id: catMap['Loans'], description: 'Liquidate/Write off loans' },
      
      // Contributions
      { name: 'view_contributions', category_id: catMap['Contributions'], description: 'View member contributions' },
      { name: 'record_contribution', category_id: catMap['Contributions'], description: 'Record a new contribution' },
      { name: 'approve_withdrawal', category_id: catMap['Contributions'], description: 'Approve contribution withdrawals' },
      
      // Expenses
      { name: 'view_expenses', category_id: catMap['Expenses'], description: 'View expenses' },
      { name: 'record_expense', category_id: catMap['Expenses'], description: 'Record a new expense' },
      { name: 'approve_expense', category_id: catMap['Expenses'], description: 'Approve expenses' },
      
      // System
      { name: 'manage_settings', category_id: catMap['System'], description: 'Manage cooperative settings' },
      { name: 'manage_roles', category_id: catMap['System'], description: 'Manage roles and permissions' }
    ];

    const permissions = await Permission.bulkCreate(permissionsData, { updateOnDuplicate: ['description', 'category_id'] });

    // 3. Create Roles
    const rolesData = [
      { name: 'admin', description: 'System Administrator', is_system: true },
      { name: 'chairman', description: 'Cooperative Chairman', is_system: true },
      { name: 'treasurer', description: 'Cooperative Treasurer', is_system: true },
      { name: 'member', description: 'Standard Member', is_system: true }
    ];

    const roles = await Role.bulkCreate(rolesData, { updateOnDuplicate: ['description'] });
    const roleMap = {};
    roles.forEach(r => roleMap[r.name] = r.id);

    // 4. Assign Permissions to Roles
    // Map of role to array of permission names
    const rolePermissionsMap = {
      'admin': permissionsData.map(p => p.name), // Admin gets everything
      'chairman': [
        'view_users', 'view_loans', 'approve_loan', 
        'view_contributions', 'approve_withdrawal',
        'view_expenses', 'approve_expense'
      ],
      'treasurer': [
        'view_users', 'view_loans', 'disburse_loan',
        'view_contributions', 'record_contribution',
        'view_expenses', 'record_expense'
      ],
      'member': [
        'apply_loan'
      ] // Members have basic self-service handled mostly by controllers, but here are explicit ones
    };

    const rolePermInserts = [];
    for (const [roleName, permNames] of Object.entries(rolePermissionsMap)) {
      const roleId = roleMap[roleName];
      for (const permName of permNames) {
        const perm = permissions.find(p => p.name === permName);
        if (perm) {
          rolePermInserts.push({ role_id: roleId, permission_id: perm.id });
        }
      }
    }

    await RolePermission.bulkCreate(rolePermInserts, { ignoreDuplicates: true });

    // 5. Migrate existing users to UserRoles
    const users = await User.findAll();
    const userRoleInserts = [];

    for (const user of users) {
      if (user.role && roleMap[user.role]) {
        userRoleInserts.push({
          user_id: user.id,
          role_id: roleMap[user.role]
        });
      }
      if (user.additional_role && roleMap[user.additional_role]) {
        userRoleInserts.push({
          user_id: user.id,
          role_id: roleMap[user.additional_role]
        });
      }
    }

    await UserRole.bulkCreate(userRoleInserts, { ignoreDuplicates: true });

    console.log('✅ RBAC Seeding completed successfully.');

  } catch (error) {
    console.error('❌ Error seeding RBAC:', error);
  } finally {
    process.exit(0);
  }
};

seedRBAC();
