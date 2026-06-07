const { User, MembershipApplication, Sequelize, Notification, ActivityLog } = require('../models');
const { Op } = require('sequelize');

// Search members by Name, Email or PSN
const searchMembers = async (req, res) => {
  try {
    const { q } = req.query; // Search query

    if (!q || q.length < 2) {
      return res.json({
        success: true,
        members: []
      });
    }

    // Find membership applications that match the search
    const applications = await MembershipApplication.findAll({
      where: {
        [Op.or]: [
            { psn: { [Op.like]: `%${q}%` } },
            { name: { [Op.like]: `%${q}%` } },
            { email: { [Op.like]: `%${q}%` } }
        ],
        status: 'approved'
      },
      include: [{
        model: User,
        as: 'user',
        required: false, // Left join to include users who already have accounts
        attributes: ['id', 'role', 'additional_role', 'status']
      }],
      limit: 50,
      order: [['psn', 'ASC'], ['id', 'ASC']]
    });

    console.log('🔍 [MEMBER SEARCH] Found applications:', applications.length);

    // For each application, check if there are multiple user accounts (additional roles)
    const membersWithRoles = (await Promise.all(applications.map(async (app) => {
      // Find all user accounts for this membership application
      const allUserAccounts = await User.findAll({
        where: { 
          membership_application_id: app.id,
          ...(req.user?.role !== 'super_admin' ? { role: { [Op.ne]: 'super_admin' } } : {})
        },
        attributes: ['id', 'role', 'status']
      });

      // If no accounts left after filtering, skip this application
      if (allUserAccounts.length === 0 && req.user?.role !== 'super_admin') {
        return null;
      }

      // Determine the primary account (member role) and additional roles
      const memberAccount = allUserAccounts.find(u => u.role === 'member');
      const additionalRoles = allUserAccounts
        .filter(u => u.role !== 'member')
        .map(u => u.role);

      // Get the first additional role (if any)
      const additionalRole = additionalRoles.length > 0 ? additionalRoles[0] : null;

      return {
        id: memberAccount?.id || app.id, // Use member account ID if exists, otherwise membership application ID
        membershipApplicationId: app.id, // Keep membership application ID for reference
        psn: app.psn,
        name: app.name,
        email: app.email,
        hasUserAccount: !!memberAccount,
        currentRole: memberAccount?.role || null,
        additionalRole: additionalRole, // Now properly detects additional roles from separate accounts
        membershipStatus: app.status, // Core membership status from application
        status: memberAccount?.status || 'inactive',
        allAccounts: allUserAccounts // Include all accounts for reference
      };
    }))).filter(member => member !== null);

    res.json({
      success: true,
      members: membersWithRoles
    });

  } catch (error) {
    console.error('Search members error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Assign role to existing member
const assignMemberRole = async (req, res) => {
  try {
    const { membershipApplicationId } = req.params;
    const { role } = req.body;

    // Validate role
    const validRoles = ['admin', 'member', 'treasurer', 'chairman', 'secretary', 'state_auditor'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be admin, member, treasurer, chairman, secretary, or state_auditor'
      });
    }
    if (role === 'super_admin') {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Cannot assign super_admin role'
      });
    }

    // Find the membership application
    const application = await MembershipApplication.findByPk(membershipApplicationId);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Membership application not found'
      });
    }

    if (application.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Cannot assign role to unapproved member'
      });
    }

    // Find or create user account with the SPECIFIC role
    // We include 'role' in the where clause to prevent overwriting an account with a different role
    // (e.g., prevent overwriting an 'admin' account when trying to create a 'member' account)
    let user = await User.findOne({
      where: { 
        membership_application_id: membershipApplicationId,
        role: role
      }
    });

    if (user) {
      // Update existing user role
      await user.update({ role });
    } else {
      // Create new user account with role
      const crypto = require('crypto');
      const bcrypt = require('bcryptjs');

      const passwordToHash = crypto.randomBytes(8).toString('hex');
      const hashedPassword = await bcrypt.hash(passwordToHash, 10);

      user = await User.create({
        membership_application_id: membershipApplicationId,
        password_hash: hashedPassword,
        role: role,
        is_default_password: true,
        status: 'active'
      });

      // Send welcome email
      try {
        const emailService = require('../services/emailService');
        await emailService.sendWelcomeEmail({
          name: application.name,
          email: application.email,
          psn: application.psn
        }, passwordToHash);
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
      }
    }

    res.json({
      success: true,
      message: `Role ${role} assigned successfully`,
      member: {
        id: user.id,
        membership_application_id: user.membership_application_id,
        psn: application.psn,
        name: application.name,
        email: application.email,
        role: user.role,
        status: user.status,
        is_default_password: user.is_default_password
      },
      generatedPassword: user.is_default_password ? 'Password sent to member email' : null
    });

  } catch (error) {
    console.error('Assign role error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Assign additional role to member (creates separate account for leadership roles)
const assignAdditionalRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { additionalRole } = req.body;

    // Validate additional role
    const validRoles = ['admin', 'treasurer', 'chairman', 'state_auditor'];
    if (additionalRole && !validRoles.includes(additionalRole)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid additional role. Must be admin, treasurer, chairman, or state_auditor'
      });
    }
    if (additionalRole === 'super_admin') {
      return res.status(400).json({
        success: false,
        message: 'Invalid additional role. Cannot assign super_admin role'
      });
    }

    const includeMembership = [{
      model: MembershipApplication,
      as: 'membershipApplication'
    }];

    // Find the existing user (member account)
    let existingUser = await User.findByPk(userId, {
      include: [{
        model: MembershipApplication,
        as: 'membershipApplication'
      }]
    });

    if (!existingUser) {
      const membershipId = Number(userId);
      if (Number.isFinite(membershipId)) {
        existingUser = await User.findOne({
          where: { membership_application_id: membershipId, role: 'member' },
          include: includeMembership
        });
      }
    }

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is a member first
    if (existingUser.role !== 'member') {
      return res.status(400).json({
        success: false,
        message: 'Only members can be assigned additional leadership roles'
      });
    }

    let newUser = null;
    let password = null;

    if (additionalRole) {
      // Check if user already has this role account (with same membership application)
      const existingRoleAccount = await User.findOne({
        where: {
          membership_application_id: existingUser.membership_application_id,
          role: additionalRole
        }
      });

      if (existingRoleAccount) {
        return res.status(409).json({
          success: false,
          message: `User already has a ${additionalRole} account`
        });
      }

      console.log('🔄 [ROLE ASSIGNMENT] Creating new account for role:', additionalRole);

      // Generate a new password for the leadership role account
      const crypto = require('crypto');
      const bcrypt = require('bcryptjs');

      password = crypto.randomBytes(8).toString('hex');
      const hashedPassword = await bcrypt.hash(password, 10);

      console.log('🔐 [ROLE ASSIGNMENT] Generated password for new account:', password);

      // Create new user account for the leadership role (SAME membership application, different role and password)
      newUser = await User.create({
        membership_application_id: existingUser.membership_application_id, // SAME membership application
        password_hash: hashedPassword, // DIFFERENT password
        role: additionalRole, // DIFFERENT role
        is_default_password: true,
        status: 'active'
      });

      console.log('✅ [ROLE ASSIGNMENT] New account created with ID:', newUser.id, 'for role:', additionalRole);

      // Create in-system notification for the member
      try {
        const models = require('../models');
        await models.Notification.create({
          user_id: existingUser.id, // Notify the member's main account
          type: 'role_assigned',
          title: `New ${additionalRole.charAt(0).toUpperCase() + additionalRole.slice(1)} Account Created`,
          message: `A new account has been created for you with ${additionalRole} privileges. Check your email for login credentials.`,
          data: {
            new_role: additionalRole,
            account_created: true,
            new_user_id: newUser.id
          }
        });
      } catch (notificationError) {
        console.log('Member notification creation failed, but continuing:', notificationError);
      }

      // Send email notification with credentials
      console.log('🚀 [ROLE ASSIGNMENT] Sending email notification...');

      try {
        const emailService = require('../services/emailService');
        const emailResult = await emailService.sendRoleAssignmentEmail(
          {
            name: existingUser.membershipApplication.name,
            email: existingUser.membershipApplication.email,
            psn: existingUser.membershipApplication.psn
          },
          {
            role: additionalRole,
            password: password,
            username: `${existingUser.membershipApplication.psn}_${additionalRole}`
          }
        );
        
        if (emailResult) {
            console.log('✅ Email sent successfully for role assignment');
        } else {
            console.warn('⚠️ Email sending returned false status');
            // Log failure to activity log so admins are aware
             try {
                const ActivityLog = require('../models/ActivityLog');
                await ActivityLog.create({
                    user_id: existingUser.id,
                    action: 'EMAIL_DELIVERY_FAILED',
                    resource_type: 'user',
                    resource_id: newUser.id,
                    description: `Failed to send role assignment email to ${existingUser.membershipApplication.email}`,
                    metadata: { reason: 'Email service returned false' }
                });
            } catch (logError) {
                console.error('Failed to log email failure:', logError);
            }
        }
      } catch (emailError) {
        console.error('❌ Failed to send role assignment email:', emailError);
        
        // Log failure to activity log
        try {
            const ActivityLog = require('../models/ActivityLog');
            await ActivityLog.create({
                user_id: existingUser.id,
                action: 'EMAIL_DELIVERY_FAILED',
                resource_type: 'user',
                resource_id: newUser.id,
                description: `Failed to send role assignment email to ${existingUser.membershipApplication.email}`,
                metadata: { error: emailError.message }
            });
        } catch (logError) {
            console.error('Failed to log email failure:', logError);
        }
        // Don't fail the request if email fails, as the account is already created
      }

    } else {
      // If additionalRole is null, remove any additional leadership roles
      console.log('🔄 [ROLE ASSIGNMENT] Removing additional roles for member:', existingUser.membershipApplication.name);

      // Find all accounts for this membership application that are NOT 'member' role
      const accountsToRemove = await User.findAll({
        where: {
          membership_application_id: existingUser.membership_application_id,
          role: {
            [require('sequelize').Op.ne]: 'member'
          }
        }
      });

      if (accountsToRemove.length > 0) {
        console.log(`🗑️ Found ${accountsToRemove.length} additional role accounts to remove`);
        
        // Delete each account
        for (const account of accountsToRemove) {
          await account.destroy();
          console.log(`✅ Removed ${account.role} account (ID: ${account.id})`);
        }
      } else {
        console.log('ℹ️ No additional role accounts found to remove');
      }
    }

    res.json({
      success: true,
      message: additionalRole ?
        `${additionalRole.charAt(0).toUpperCase() + additionalRole.slice(1)} account created successfully for ${existingUser.membershipApplication.name}` :
        `Role assignment processed for ${existingUser.membershipApplication.name}`,
      member: {
        id: existingUser.id,
        membership_application_id: existingUser.membership_application_id,
        psn: existingUser.membershipApplication.psn,
        name: existingUser.membershipApplication.name,
        email: existingUser.membershipApplication.email,
        role: existingUser.role,
        status: existingUser.status
      },
      newAccount: newUser ? {
        id: newUser.id,
        role: newUser.role,
        psn: existingUser.membershipApplication.psn, // SAME PSN as the original account
        status: newUser.status
      } : null,
      generatedPassword: password,
      credentials: newUser ? {
        psn: existingUser.membershipApplication.psn, // SAME PSN - different password determines role
        password: password,
        role: newUser.role
      } : null
    });

  } catch (error) {
    console.error('Assign additional role error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get all users with roles
const getUsersWithRoles = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const whereClause = {};

    if (role) {
      whereClause.role = role;
    }
    
    if (req.user?.role !== 'super_admin') {
      whereClause.role = whereClause.role || { [Op.ne]: 'super_admin' };
      if (whereClause.role && typeof whereClause.role !== 'object') {
        if (whereClause.role !== 'super_admin') {
          whereClause.role = whereClause.role;
        } else {
          whereClause.role = { [Op.ne]: 'super_admin' };
        }
      }
    }

    // Build include for membership application data
    const includeClause = [{
      model: MembershipApplication,
      as: 'membershipApplication',
      required: true,
      where: search ? {
        [Op.or]: [
          { name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { psn: { [Op.like]: `%${search}%` } }
        ]
      } : undefined
    }];

    const { count, rows } = await User.findAndCountAll({
      where: whereClause,
      include: includeClause,
      limit: parseInt(limit),
      offset: offset,
      order: [['created_at', 'DESC']],
      attributes: { exclude: ['password_hash'] }
    });

    // Transform the response
    const users = rows.map(user => {
      const userData = user.toJSON();
      const application = userData.membershipApplication;

      return {
        id: userData.id,
        membership_application_id: userData.membership_application_id,
        psn: application.psn,
        name: application.name,
        email: application.email,
        role: userData.role,
        status: userData.status,
        is_default_password: userData.is_default_password,
        created_at: userData.created_at,
        updated_at: userData.updated_at
      };
    });

    res.json({
      success: true,
      users: users,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get users with roles error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const removeUserRole = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find the user
    const user = await User.findByPk(userId, {
      include: [{
        model: MembershipApplication,
        as: 'membershipApplication'
      }]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    if (user.role === 'super_admin' && req.user?.role !== 'super_admin') {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Don't allow removing the primary member role if leadership roles exist
    if (user.role === 'member') {
      const otherAccounts = await User.count({
        where: {
          membership_application_id: user.membership_application_id,
          id: { [require('sequelize').Op.ne]: userId }
        }
      });

      if (otherAccounts > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot remove the primary member account while leadership roles exist. Please remove leadership roles first.'
        });
      }
    }

    // Delete the user account
    await user.destroy();

    res.json({
      success: true,
      message: `${user.role.charAt(0).toUpperCase() + user.role.slice(1)} account removed successfully for ${user.membershipApplication.name}`
    });

  } catch (error) {
    console.error('Remove role error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Admin reset password for a user
const adminResetPassword = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find the user with membership info
    const user = await User.findByPk(userId, {
      include: [{
        model: MembershipApplication,
        as: 'membershipApplication'
      }]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    if (user.role === 'super_admin' && req.user?.role !== 'super_admin') {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate new password
    const crypto = require('crypto');
    const bcrypt = require('bcryptjs');
    const newPassword = crypto.randomBytes(8).toString('hex');
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user
    await user.update({
      password_hash: hashedPassword,
      is_default_password: true
    });

    // Send email
    try {
        const emailService = require('../services/emailService');
        // Ensure we pass the structure expected by sendPasswordResetEmail
        // It expects 'member' object which has 'membershipApplication' property
        await emailService.sendPasswordResetEmail(user, newPassword);
    } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
        // We continue even if email fails, as we return the password to admin
    }

    console.log(`🔐 Admin reset password for user ${user.id} (${user.membershipApplication.email})`);

    // Log the activity
    try {
      if (ActivityLog) {
        await ActivityLog.create({
          user_id: req.user.id,
          user_name: req.user.name || 'Admin',
          user_role: req.user.role,
          action: 'RESET_PASSWORD',
          resource_type: 'USER',
          resource_id: user.id,
          description: `Password reset for user ${user.membershipApplication?.name || user.id} (Email: ${user.membershipApplication?.email})`,
          ip_address: req.ip,
          user_agent: req.headers['user-agent']
        });
      }
    } catch (logError) {
      console.error('Failed to log activity:', logError);
    }

    res.json({
      success: true,
      message: 'Password reset successfully',
      newPassword: newPassword, // Return to admin
      user: {
        id: user.id,
        email: user.membershipApplication.email,
        name: user.membershipApplication.name
      }
    });

  } catch (error) {
    console.error('Admin reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  searchMembers,
  assignMemberRole,
  assignAdditionalRole,
  removeUserRole,
  getUsersWithRoles,
  adminResetPassword
};
