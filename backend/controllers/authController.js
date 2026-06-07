const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
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
    name,
    email,
    role: user.role,
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
    const { psn, password } = req.body;

    // Validate input
    if (!psn || !password) {
      return res.status(400).json({
        success: false,
        message: 'PSN and password are required'
      });
    }

    // Parse PSN to handle role-specific logins (e.g., "12345_chairman")
    let basePsn = psn;
    let targetRole = null;
    const validRoles = ['admin', 'chairman', 'secretary', 'treasurer', 'state_auditor'];
    
    for (const role of validRoles) {
        if (psn.endsWith(`_${role}`)) {
            basePsn = psn.slice(0, -(role.length + 1)); // Remove _role suffix
            targetRole = role;
            break;
        }
    }

    console.log(`Login attempt: PSN=${psn}, BasePSN=${basePsn}, TargetRole=${targetRole || 'Any/Member'}`);

    // Find ALL users by PSN through membership application
    // We use findAll because there might be multiple user accounts (roles) for one PSN
    // and potentially duplicate MembershipApplication records (legacy data issues)
    const users = await User.findAll({
      include: [{
        model: MembershipApplication,
        as: 'membershipApplication',
        where: { psn: basePsn },
        required: true
      }],
      order: [['created_at', 'DESC']] // Check newest accounts first
    });

    if (!users || users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid PSN or password'
      });
    }

    // Filter candidates based on requested role
    let candidates = users;
    if (targetRole) {
        // If a specific role was requested via suffix (e.g. _chairman), ONLY check that role
        candidates = users.filter(u => u.role === targetRole);
    } else {
        // No suffix provided (e.g. "12525" or "admin001")
        // If the user has a 'member' account, default to that (standard member login)
        // This prevents members from accidentally logging into leadership accounts without the suffix
        const hasMemberAccount = users.some(u => u.role === 'member');
        if (hasMemberAccount) {
            candidates = users.filter(u => u.role === 'member');
        }
        // If no member account exists (e.g. pure admin "admin001"), keep all candidates
    }

    if (candidates.length === 0) {
        console.log(`No users found for role ${targetRole} with PSN ${basePsn}`);
        return res.status(401).json({
            success: false,
            message: 'Invalid PSN or password' // Role mismatch effectively
        });
    }

    // Verify password against candidates
    let validUser = null;
    let hasInactiveCandidate = false;
    
    for (const user of candidates) {
        // Check if user is active
        if (user.status !== 'active') {
            hasInactiveCandidate = true;
            continue;
        }

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (isPasswordValid) {
            validUser = user;
            break; // Found a match
        }
    }

    if (!validUser) {
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
        role: user.role
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
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    // Handle profile image upload
    let profileImagePath = application.profile_image;
    if (req.file) {
      // Generate unique filename
      const crypto = require('crypto');
      const fileExtension = req.file.originalname.split('.').pop();
      const uniqueFilename = `profile-${crypto.randomBytes(16).toString('hex')}.${fileExtension}`;
      profileImagePath = `/uploads/${uniqueFilename}`;

      // Move file to uploads directory
      const fs = require('fs');
      const path = require('path');
      const uploadPath = path.join(__dirname, '../uploads', uniqueFilename);

      // Ensure uploads directory exists
      const uploadsDir = path.join(__dirname, '../uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Write file
      fs.writeFileSync(uploadPath, req.file.buffer);

      console.log('📸 Profile image uploaded:', profileImagePath);
    }

    // Update membership application with new data
    await application.update({
      name: name || application.name,
      email: email || application.email,
      phone: phone || application.phone,
      address: address || application.address,
      date_of_birth: dateOfBirth || application.date_of_birth,
      gender: gender || application.gender,
      marital_status: maritalStatus || application.marital_status,
      next_of_kin_name: nextOfKin || application.next_of_kin_name,
      next_of_kin_phone: nextOfKinPhone || application.next_of_kin_phone,
      facility_name: facilityName || application.facility_name,
      position: position || application.position,
      department: department || application.department,
      years_of_experience: yearsOfExperience || application.years_of_experience,
      employee_id: employeeId || application.employee_id,
      monthly_income: monthlyIncome || application.monthly_income,
      profile_image: profileImagePath
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
