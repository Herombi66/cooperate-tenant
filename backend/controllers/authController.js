const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { User, MembershipApplication, ActivityLog } = require('../models');

const buildProfilePayload = (user, application) => {
  const profile = application
    ? {
        membership_application_id: application.id,
        psn: application.psn,
        name: application.name,
        email: application.email,
        phone: application.phone,
        facility_name: application.facility_name,
        next_of_kin_name: application.next_of_kin_name,
        next_of_kin_phone: application.next_of_kin_phone,
        address: application.address,
        date_of_birth: application.date_of_birth,
        gender: application.gender,
        marital_status: application.marital_status,
        position: application.position,
        department: application.department,
        years_of_experience: application.years_of_experience,
        employee_id: application.employee_id,
        monthly_income: application.monthly_income,
        savings: application.savings,
        investment: application.investment,
        target_saving: application.target_saving,
        target_period: application.target_period,
        contribution_amount_commitment: application.contribution_amount_commitment,
        status: application.status,
        application_date: application.application_date,
        review_date: application.review_date,
        reviewed_by: application.reviewed_by,
        review_notes: application.review_notes,
        profile_image: application.profile_image,
        created_at: application.created_at,
        updated_at: application.updated_at
      }
    : null;

  const psn = application?.psn || user?.membershipApplication?.psn || null;
  const name = application?.name || user?.membershipApplication?.name || null;
  const email = application?.email || user?.membershipApplication?.email || null;
  const profileImage = application?.profile_image || user?.membershipApplication?.profile_image || null;

  return {
    id: user.id,
    username: psn,
    psn,
    ippis: psn,
    ippis_number: psn,
    name,
    email,
    role: user.role,
    additional_role: user.additional_role || null,
    tenant_id: user.tenant_id,
    tenantId: user.tenant_id,
    can_liquidate_loans: user.can_liquidate_loans,
    can_create_animal_requests: user.can_create_animal_requests,
    is_default_password: user.is_default_password,
    status: user.status,
    profile_image: profileImage,
    created_at: user.created_at,
    updated_at: user.updated_at,
    profile
  };
};

const login = async (req, res) => {
  try {
    console.log('Login Body:', req.body);
    const rawId = req.body.psn || req.body.ippis || req.body.ippisNumber || req.body.ippis_number || req.body.username;
    const psn = rawId ? String(rawId).trim() : '';
    const { password } = req.body;

    // Validate input
    if (!psn || !password) {
      return res.status(400).json({
        success: false,
        message: 'PSN/IPPIS Number and password are required'
      });
    }

    // Parse PSN to handle role-specific logins (e.g., "12345_chairman")
    let basePsn = psn;
    let targetRole = null;
    const validRoles = [
      'assistant_secretary',
      'financial_secretary',
      'state_auditor',
      'secretary',
      'treasurer',
      'chairman',
      'auditor',
      'admin',
      'pro'
    ];
    
    for (const role of validRoles) {
        if (psn.endsWith(`_${role}`)) {
            basePsn = psn.slice(0, -(role.length + 1)); // Remove _role suffix
            targetRole = role;
            break;
        }
    }

    console.log(`Login attempt: PSN=${psn}, BasePSN=${basePsn}, TargetRole=${targetRole || 'Any/Member'}`);

    const searchConditions = [
      { psn: basePsn },
      { email: basePsn }
    ];
    try {
      if (User.sequelize.getDialect() === 'postgres') {
        searchConditions.push(
          { psn: { [Op.iLike]: basePsn } },
          { email: { [Op.iLike]: basePsn } }
        );
      }
    } catch (e) {}

    // Find ALL users by PSN through membership application
    let users = await User.findAll({
      include: [{
        model: MembershipApplication,
        as: 'membershipApplication',
        where: {
          [Op.or]: searchConditions
        },
        required: true
      }],
      order: [['created_at', 'DESC']] // Check newest accounts first
    });

    // If no user found under current tenant context, fallback to cross-tenant search
    if (!users || users.length === 0) {
      users = await User.findAll({
        skipTenant: true,
        include: [{
          model: MembershipApplication,
          as: 'membershipApplication',
          skipTenant: true,
          where: {
            [Op.or]: searchConditions
          },
          required: true
        }],
        order: [['created_at', 'DESC']]
      });
    }

    console.log(`[Auth Login] Search for "${basePsn}": found ${users?.length || 0} user record(s).`);

    if (!users || users.length === 0) {
      console.log(`[Auth Login] No user record found in database for "${basePsn}".`);
      return res.status(401).json({
        success: false,
        message: 'Invalid PSN or password'
      });
    }

    // Filter candidates based on requested role
    let candidates = users;
    if (targetRole) {
      // If a specific role was requested via suffix (e.g. 630828_assistant_secretary), ONLY check that role
      candidates = users.filter(u => u.role === targetRole);
    } else {
      // No suffix provided: standard member login
      // If user has a 'member' account, check that first so the member logs into their personal member account
      const memberAccounts = users.filter(u => u.role === 'member');
      const otherAccounts = users.filter(u => u.role !== 'member');
      candidates = [...memberAccounts, ...otherAccounts];
    }

    console.log(`[Auth Login] Candidates after role filter: ${candidates.length} (roles: ${candidates.map(u => u.role).join(', ')})`);

    if (candidates.length === 0) {
        console.log(`[Auth Login] No candidates matched role ${targetRole} for PSN ${basePsn}`);
        return res.status(401).json({
            success: false,
            message: 'Invalid PSN or password'
        });
    }

    // Verify password against candidates
    let validUser = null;
    let hasInactiveCandidate = false;
    let hasClosedCandidate = false;
    
    for (const user of candidates) {
        if (user.status === 'closed') {
            hasClosedCandidate = true;
            continue;
        }
        if (user.status !== 'active') {
            hasInactiveCandidate = true;
            continue;
        }

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        console.log(`[Auth Login] Checking candidate ID=${user.id} (${user.role}, tenant=${user.tenant_id}): match=${isPasswordValid}`);
        if (isPasswordValid) {
            validUser = user;
            break; // Found a match
        }
    }

    if (!validUser) {
      if (hasClosedCandidate) {
        return res.status(401).json({
          success: false,
          message: 'This account has been closed. Please contact cooperative administration.'
        });
      }
      if (hasInactiveCandidate) {
        return res.status(401).json({
          success: false,
          message: 'Account is not active'
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid PSN or password'
      });
    }

    // User found and verified
    const user = validUser;
    const application = user.membershipApplication;

    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET is not defined in environment variables');
      return res.status(500).json({
        success: false,
        message: 'Internal server configuration error'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        psn: application.psn,
        role: user.role,
        tenant_id: user.tenant_id
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return success response
    res.json({
      success: true,
      message: 'Login successful',
      access_token: token,
      user: buildProfilePayload(user, application)
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const getProfile = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const user = await User.findByPk(req.user.id, {
      include: [{
        model: MembershipApplication,
        as: 'membershipApplication',
        required: false
      }]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const application = user.membershipApplication;

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    res.json({
      success: true,
      user: buildProfilePayload(user, application)
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load profile'
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      address,
      dateOfBirth,
      gender,
      maritalStatus,
      nextOfKin,
      nextOfKinPhone,
      facilityName,
      position,
      department,
      yearsOfExperience,
      employeeId,
      monthlyIncome
    } = req.body;

    console.log('👤 Update profile request for user:', req.user.id);

    // Get user and membership application
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const user = await User.findByPk(req.user.id, {
      include: [{
        model: MembershipApplication,
        as: 'membershipApplication',
        required: false
      }]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const application = user.membershipApplication;

    // Handle profile image upload
    let profileImagePath = application?.profile_image || user.metadata?.profile_image || null;
    if (req.file) {
      const crypto = require('crypto');
      const ext = (req.file.originalname?.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
      const uniqueFilename = `profile-${crypto.randomBytes(16).toString('hex')}.${ext || 'jpg'}`;
      profileImagePath = `/uploads/${uniqueFilename}`;

      const fs = require('fs');
      const path = require('path');
      const uploadsDir = path.join(__dirname, '../uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const uploadPath = path.join(uploadsDir, uniqueFilename);
      fs.writeFileSync(uploadPath, req.file.buffer);
      console.log('📸 Profile image uploaded:', profileImagePath);
    }

    // Sanitize fields to prevent PostgreSQL syntax errors with empty strings
    const sanitizedUpdate = {};
    if (name !== undefined) sanitizedUpdate.name = String(name || '').trim();
    if (email !== undefined) sanitizedUpdate.email = String(email || '').trim();
    if (phone !== undefined) sanitizedUpdate.phone = String(phone || '').trim();
    if (address !== undefined) sanitizedUpdate.address = address ? String(address).trim() : null;

    if (dateOfBirth !== undefined) {
      const cleanDate = String(dateOfBirth || '').trim();
      sanitizedUpdate.date_of_birth = cleanDate ? cleanDate : null;
    }

    if (gender !== undefined) {
      const cleanGender = String(gender || '').trim();
      sanitizedUpdate.gender = ['Male', 'Female'].includes(cleanGender) ? cleanGender : null;
    }

    if (maritalStatus !== undefined) {
      const cleanStatus = String(maritalStatus || '').trim();
      sanitizedUpdate.marital_status = ['Single', 'Married', 'Divorced', 'Widowed'].includes(cleanStatus) ? cleanStatus : null;
    }

    if (nextOfKin !== undefined) sanitizedUpdate.next_of_kin_name = nextOfKin ? String(nextOfKin).trim() : null;
    if (nextOfKinPhone !== undefined) sanitizedUpdate.next_of_kin_phone = nextOfKinPhone ? String(nextOfKinPhone).trim() : null;
    if (facilityName !== undefined) sanitizedUpdate.facility_name = facilityName ? String(facilityName).trim() : null;
    if (position !== undefined) sanitizedUpdate.position = position ? String(position).trim() : null;
    if (department !== undefined) sanitizedUpdate.department = department ? String(department).trim() : null;

    if (yearsOfExperience !== undefined) {
      const parsedYears = parseInt(String(yearsOfExperience || '').replace(/[^0-9]/g, ''), 10);
      sanitizedUpdate.years_of_experience = isNaN(parsedYears) ? null : parsedYears;
    }

    if (employeeId !== undefined) sanitizedUpdate.employee_id = employeeId ? String(employeeId).trim() : null;

    if (monthlyIncome !== undefined) {
      const parsedIncome = parseFloat(String(monthlyIncome || '').replace(/[^0-9.]/g, ''));
      sanitizedUpdate.monthly_income = isNaN(parsedIncome) ? null : parsedIncome;
    }

    if (profileImagePath) {
      sanitizedUpdate.profile_image = profileImagePath;
    }

    if (application) {
      await application.update(sanitizedUpdate);
    }

    // Always sync metadata on User model
    const currentMeta = user.metadata || {};
    await user.update({
      metadata: {
        ...currentMeta,
        name: sanitizedUpdate.name || currentMeta.name || application?.name,
        email: sanitizedUpdate.email || currentMeta.email || application?.email,
        phone: sanitizedUpdate.phone || currentMeta.phone || application?.phone,
        profile_image: profileImagePath || currentMeta.profile_image || application?.profile_image
      }
    });

    console.log('✅ Profile updated successfully for user:', user.id);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: buildProfilePayload(user, application)
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const { current_password, new_password, confirm_password } = req.body;

    console.log('🔐 Change password request:', {
      userId: req.user.id,
      userIsDefaultPassword: req.user.is_default_password,
      hasCurrentPassword: !!current_password,
      newPasswordLength: new_password?.length,
      confirmPasswordLength: confirm_password?.length
    });

    // Validate input
    if (!new_password || !confirm_password) {
      console.log('❌ Missing new password or confirmation');
      return res.status(400).json({
        success: false,
        message: 'New password and confirmation are required'
      });
    }

    if (new_password !== confirm_password) {
      console.log('❌ Passwords do not match');
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    // Password strength validation
    if (new_password.length < 8) {
      console.log('❌ Password too short');
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    // Get user from request (set by auth middleware)
    const user = req.user;

    console.log('👤 User details:', {
      id: user.id,
      is_default_password: user.is_default_password,
      role: user.role
    });

    // If user has default password, allow password change without current password
    // Otherwise, verify current password
    if (!user.is_default_password) {
      console.log('🔒 User does not have default password, checking current password');
      if (!current_password) {
        console.log('❌ Current password required but not provided');
        return res.status(400).json({
          success: false,
          message: 'Current password is required'
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(current_password, user.password_hash);
      if (!isCurrentPasswordValid) {
        console.log('❌ Current password is incorrect');
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }
      console.log('✅ Current password verified');
    } else {
      console.log('🔓 User has default password, skipping current password check');
    }

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(new_password, saltRounds);

    // Update user password and mark as custom password
    await user.update({
      password_hash: hashedPassword,
      is_default_password: false
    });

    console.log('✅ Password updated successfully for user:', user.id);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const logout = async (req, res) => {
  try {
    console.log('User logged out:', req.user ? req.user.id : 'unknown');
    
    // Clear the auth cookie
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
};

const getCsrfToken = async (req, res) => {
  try {
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');

    res.cookie('csrf_token', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.json({
      success: true,
      csrfToken: token
    });
  } catch (error) {
    console.error('Get CSRF token error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate CSRF token'
    });
  }
};

const logSessionEvent = async (req, res) => {
  try {
    const event = String(req.body?.event || '').trim();
    const metadata = req.body?.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : {};

    if (!['idle_warning', 'idle_logout'].includes(event)) {
      return res.status(400).json({ success: false, message: 'Invalid event' });
    }

    const action = event === 'idle_warning' ? 'auth_idle_warning' : 'auth_idle_logout';
    await ActivityLog.logActivity(
      req.user,
      action,
      'auth_session',
      null,
      event === 'idle_warning' ? 'Idle timeout warning shown' : 'Session ended due to inactivity',
      {
        ...metadata,
        event,
        ts: new Date().toISOString()
      },
      req
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Log session event error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = {
  login,
  getProfile,
  updateProfile,
  changePassword,
  logout,
  getCsrfToken,
  logSessionEvent
};
