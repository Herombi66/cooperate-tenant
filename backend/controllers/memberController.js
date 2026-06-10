const { User, MembershipApplication, ActivityLog, Loan, UploadBatch, UploadRecordError } = require('../models');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const emailService = require('../services/emailService');
const { Op } = require('sequelize');
const { sequelize } = require('../db/connection');
const { Contribution, LoanRepayment } = require('../models');

const getMembers = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search, role } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const whereClause = {
      deleted_at: null // Only get non-deleted users
    };

    if (status) {
      whereClause.status = status;
    }

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
      model: require('../models/MembershipApplication'),
      as: 'membershipApplication',
      required: true, // Only get users that have membership applications
      where: search ? {
        [Op.or]: [
          { name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { psn: { [Op.like]: `%${search}%` } },
          { phone: { [Op.like]: `%${search}%` } },
          { facility_name: { [Op.like]: `%${search}%` } }
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

    // Transform the response to include membership application data and total contributions
    const members = await Promise.all(rows.map(async (user) => {
      const userData = user.toJSON();
      const application = userData.membershipApplication;

      // Calculate total contributions for this user
      const Contribution = require('../models/Contribution');
      const contributionsResult = await Contribution.findAll({
        attributes: [[Contribution.sequelize.fn('SUM', Contribution.sequelize.col('total_amount')), 'total_contributions']],
        where: { user_id: userData.id, status: 'approved' }
      });

      const totalContributions = parseFloat(contributionsResult[0]?.dataValues?.total_contributions || 0);

      // Calculate total withdrawals for this user
      let totalWithdrawals = 0;
      try {
        const ContributionWithdrawal = require('../models/ContributionWithdrawal');
        const withdrawalsResult = await ContributionWithdrawal.findAll({
          attributes: [[ContributionWithdrawal.sequelize.fn('SUM', ContributionWithdrawal.sequelize.col('amount')), 'total_withdrawals']],
          where: { user_id: userData.id, status: 'approved' }
        });
        totalWithdrawals = parseFloat(withdrawalsResult[0]?.dataValues?.total_withdrawals || 0);
      } catch (err) {
        console.warn('Could not fetch withdrawals for member', err);
      }

      // Count active loans for this user
      const Loan = require('../models/Loan');
      const activeLoansCount = await Loan.count({
        where: {
          user_id: userData.id,
          status: 'active'
        }
      });

      return {
        id: userData.id,
        membership_application_id: userData.membership_application_id,
        psn: application.psn,
        name: application.name,
        email: application.email,
        phone: application.phone,
        facility_name: application.facility_name,
        next_of_kin_name: application.next_of_kin_name,
        next_of_kin_phone: application.next_of_kin_phone,
        savings: application.savings,
        investment: application.investment,
        target_saving: application.target_saving,
        target_period: application.target_period,
        role: userData.role,
        status: userData.status,
        is_default_password: userData.is_default_password,
        totalContributions: totalContributions,
        totalWithdrawals: totalWithdrawals,
        totalTerminations: parseFloat(application.termination_amount || 0),
        activeLoans: activeLoansCount,
        created_at: userData.created_at,
        updated_at: userData.updated_at,
        // Include application data for reference
        membershipApplication: application
      };
    }));

    res.json({
      success: true,
      members: members,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const getMemberById = async (req, res) => {
  try {
    const { id } = req.params;

    const member = await User.findByPk(id, {
      attributes: { exclude: ['password_hash'] },
      include: [{
        model: require('../models/MembershipApplication'),
        as: 'membershipApplication',
        required: true
      }]
    });

    if (!member || member.deleted_at) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }
    
    if (member.role === 'super_admin' && req.user?.role !== 'super_admin') {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    // Transform response to include membership application data
    const memberData = member.toJSON();
    const application = memberData.membershipApplication;

    const transformedMember = {
      id: memberData.id,
      membership_application_id: memberData.membership_application_id,
      psn: application.psn,
      name: application.name,
      email: application.email,
      phone: application.phone,
      address: application.address,
      date_of_birth: application.date_of_birth,
      gender: application.gender,
      marital_status: application.marital_status,
      facility_name: application.facility_name,
      position: application.position,
      department: application.department,
      years_of_experience: application.years_of_experience,
      employee_id: application.employee_id,
      monthly_income: application.monthly_income,
      next_of_kin_name: application.next_of_kin_name,
      next_of_kin_phone: application.next_of_kin_phone,
      savings: application.savings,
      investment: application.investment,
      target_saving: application.target_saving,
      target_period: application.target_period,
      profile_image: application.profile_image,
      role: memberData.role,
      status: memberData.status,
      is_default_password: memberData.is_default_password,
      created_at: memberData.created_at,
      updated_at: memberData.updated_at,
      membershipApplication: application
    };

    res.json({
      success: true,
      member: transformedMember
    });

  } catch (error) {
    console.error('Get member by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Unified member creation function used by all creation methods
const createMemberAccount = async (applicationId, password = null, sendEmail = true) => {
  // Check if a 'member' account already exists for this application
  const existingMember = await User.findOne({
    where: {
      membership_application_id: applicationId,
      role: 'member'
    }
  });

  if (existingMember) {
    console.log(`ℹ️ [MEMBER CREATE] Member account already exists for application ${applicationId}`);
    return { user: existingMember, generatedPassword: null };
  }

  // Generate password if not provided
  let passwordToHash = password;
  if (!passwordToHash) {
    passwordToHash = crypto.randomBytes(8).toString('hex');
  }

  // Hash the password
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(passwordToHash, saltRounds);

  // Get the membership application data for email and metadata
  const MembershipApplication = require('../models/MembershipApplication');
  const application = await MembershipApplication.findByPk(applicationId);

  // Create user account linked to membership application
  const user = await User.create({
    membership_application_id: applicationId,
    password_hash: hashedPassword,
    is_default_password: !password, // If password was auto-generated
    status: 'active',
    metadata: application?.metadata || {}
  });

  // Send welcome email if requested
  if (sendEmail && application) {
    try {
      await emailService.sendWelcomeEmail({
        name: application.name,
        email: application.email,
        psn: application.psn
      }, passwordToHash);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail the creation if email fails
    }
  }

  return { user, generatedPassword: !password ? passwordToHash : null };
};

const createMember = async (req, res) => {
  try {
    const {
      psn, name, email, phone, facility_name, password,
      next_of_kin_name, next_of_kin_phone, savings, investment, target_saving, target_period
    } = req.body;

    // Validate required fields
    if (!psn || !name || !email) {
      return res.status(400).json({
        success: false,
        message: 'PSN, name, and email are required'
      });
    }

    // Check if PSN or email already exists in membership applications
    const MembershipApplication = require('../models/MembershipApplication');
    const existingApplication = await MembershipApplication.findOne({
      where: {
        [Op.or]: [
          { psn: psn },
          { email: email }
        ]
      }
    });

    if (existingApplication) {
      return res.status(409).json({
        success: false,
        message: 'A member with this PSN or email already exists'
      });
    }

    // Create membership application first
    const application = await MembershipApplication.create({
      psn: psn.trim(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : null,
      facility_name: facility_name ? facility_name.trim() : null,
      next_of_kin_name: next_of_kin_name ? next_of_kin_name.trim() : null,
      next_of_kin_phone: next_of_kin_phone ? next_of_kin_phone.trim() : null,
      savings: parseFloat(savings) || 0,
      investment: parseFloat(investment) || 0,
      target_saving: parseFloat(target_saving) || 0,
      target_period: parseInt(target_period) || 12,
      status: 'approved', // Auto-approved for admin creation
      application_date: new Date(),
      approved_by: req.user?.name || 'System Admin',
      approved_at: new Date(),
      reviewed_by: req.user?.id || 1,
      review_date: new Date()
    });

    // Create user account linked to the application
    const { user, generatedPassword } = await createMemberAccount(application.id, password);

    // Log activity
    await ActivityLog.create({
      user_id: req.user.id,
      user_name: req.user.name,
      user_role: req.user.role,
      action: 'CREATE_MEMBER',
      resource_type: 'MEMBER',
      resource_id: application.id,
      description: `Created new member: ${name} (PSN: ${psn})`,
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    // Return response with both application and user data
    res.status(201).json({
      success: true,
      message: 'Member created successfully',
      application: {
        id: application.id,
        psn: application.psn,
        name: application.name,
        email: application.email,
        status: application.status
      },
      user: {
        id: user.id,
        membership_application_id: user.membership_application_id,
        role: user.role,
        status: user.status,
        is_default_password: user.is_default_password
      },
      generatedPassword
    });

  } catch (error) {
    console.error('Create member error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const updateMember = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, email, phone, facility_name, role, status,
      next_of_kin_name, next_of_kin_phone, savings, investment, target_saving, target_period
    } = req.body;

    const member = await User.findByPk(id, {
      include: [{
        model: require('../models/MembershipApplication'),
        as: 'membershipApplication',
        required: true
      }]
    });

    if (!member || member.deleted_at) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }
    
    if (member.role === 'super_admin' && req.user?.role !== 'super_admin') {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    const application = member.membershipApplication;

    // Check if email is being changed and if it's already taken
    if (email && email !== application.email) {
      const MembershipApplication = require('../models/MembershipApplication');
      const existingApplication = await MembershipApplication.findOne({
        where: {
          email: email.trim().toLowerCase(),
          id: { [Op.ne]: application.id }
        }
      });

      if (existingApplication) {
        return res.status(409).json({
          success: false,
          message: 'Email is already taken by another member'
        });
      }
    }

    // Update membership application data
    await application.update({
      name: name ? name.trim() : application.name,
      email: email ? email.trim().toLowerCase() : application.email,
      phone: phone !== undefined ? (phone ? phone.trim() : null) : application.phone,
      facility_name: facility_name !== undefined ? (facility_name ? facility_name.trim() : null) : application.facility_name,
      next_of_kin_name: next_of_kin_name !== undefined ? (next_of_kin_name ? next_of_kin_name.trim() : null) : application.next_of_kin_name,
      next_of_kin_phone: next_of_kin_phone !== undefined ? (next_of_kin_phone ? next_of_kin_phone.trim() : null) : application.next_of_kin_phone,
      savings: savings !== undefined ? parseFloat(savings) : application.savings,
      investment: investment !== undefined ? parseFloat(investment) : application.investment,
      target_saving: target_saving !== undefined ? parseFloat(target_saving) : application.target_saving,
      target_period: target_period !== undefined ? parseInt(target_period) : application.target_period
    });

    // Update user role and status if provided
    const userUpdates = {};
    if (role) userUpdates.role = role;
    if (status) userUpdates.status = status;

    if (Object.keys(userUpdates).length > 0) {
      await member.update(userUpdates);
    }

    // Log activity
    await ActivityLog.create({
      user_id: req.user.id,
      user_name: req.user.name,
      user_role: req.user.role,
      action: 'UPDATE_MEMBER',
      resource_type: 'MEMBER',
      resource_id: application.id,
      description: `Updated member details for: ${application.name} (PSN: ${application.psn})`,
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    // Return updated member data
    const updatedMember = await User.findByPk(id, {
      include: [{
        model: require('../models/MembershipApplication'),
        as: 'membershipApplication',
        required: true
      }],
      attributes: { exclude: ['password_hash'] }
    });

    const memberData = updatedMember.toJSON();
    const updatedApplication = memberData.membershipApplication;

    const transformedMember = {
      id: memberData.id,
      membership_application_id: memberData.membership_application_id,
      psn: updatedApplication.psn,
      name: updatedApplication.name,
      email: updatedApplication.email,
      phone: updatedApplication.phone,
      facility_name: updatedApplication.facility_name,
      next_of_kin_name: updatedApplication.next_of_kin_name,
      next_of_kin_phone: updatedApplication.next_of_kin_phone,
      savings: updatedApplication.savings,
      investment: updatedApplication.investment,
      target_saving: updatedApplication.target_saving,
      target_period: updatedApplication.target_period,
      role: memberData.role,
      status: memberData.status,
      is_default_password: memberData.is_default_password,
      created_at: memberData.created_at,
      updated_at: memberData.updated_at
    };

    res.json({
      success: true,
      message: 'Member updated successfully',
      member: transformedMember
    });

  } catch (error) {
    console.error('Update member error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const suspendMember = async (req, res) => {
  try {
    const { id } = req.params;

    const member = await User.findByPk(id);

    if (!member || member.deleted_at) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }
    
    if (member.role === 'super_admin' && req.user?.role !== 'super_admin') {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    await member.update({ status: 'suspended' });

    // Log activity
    await ActivityLog.create({
      user_id: req.user.id,
      user_name: req.user.name,
      user_role: req.user.role,
      action: 'SUSPEND_MEMBER',
      resource_type: 'MEMBER',
      resource_id: member.id,
      description: `Suspended member: ${member.id}`,
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: 'Member suspended successfully'
    });

  } catch (error) {
    console.error('Suspend member error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const activateMember = async (req, res) => {
  try {
    const { id } = req.params;

    const member = await User.findByPk(id);

    if (!member || member.deleted_at) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }
    
    if (member.role === 'super_admin' && req.user?.role !== 'super_admin') {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    await member.update({ status: 'active' });

    // Log activity
    await ActivityLog.create({
      user_id: req.user.id,
      user_name: req.user.name,
      user_role: req.user.role,
      action: 'ACTIVATE_MEMBER',
      resource_type: 'MEMBER',
      resource_id: member.id,
      description: `Activated member: ${member.id}`,
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: 'Member activated successfully'
    });

  } catch (error) {
    console.error('Activate member error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const deleteMember = async (req, res) => {
  try {
    const { id } = req.params;

    const member = await User.findByPk(id);

    if (!member || member.deleted_at) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }
    
    if (member.role === 'super_admin' && req.user?.role !== 'super_admin') {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    // Soft delete the member
    await member.destroy(); // This will set deleted_at due to paranoid: true

    // Log activity
    await ActivityLog.create({
      user_id: req.user.id,
      user_name: req.user.name,
      user_role: req.user.role,
      action: 'DELETE_MEMBER',
      resource_type: 'MEMBER',
      resource_id: member.id,
      description: `Deleted member: ${member.id}`,
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: 'Member deleted successfully'
    });

  } catch (error) {
    console.error('Delete member error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const resetMemberPassword = async (req, res) => {
  try {
    const { id } = req.params;

    const member = await User.findByPk(id, {
      include: [{
        model: require('../models/MembershipApplication'),
        as: 'membershipApplication',
        required: true
      }]
    });

    if (!member || member.deleted_at) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }
    
    if (member.role === 'super_admin' && req.user?.role !== 'super_admin') {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    // Generate new password

    const newPassword = crypto.randomBytes(8).toString('hex');
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update member
    await member.update({
      password_hash: hashedPassword,
      is_default_password: true
    });

    // Send password reset email
    try {
      await emailService.sendPasswordResetEmail(member, newPassword);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      // Don't fail the password reset if email fails
    }

    // Log activity
    try {
      const logUser = {
        id: req.user.id,
        role: req.user.role,
        name: req.user.membershipApplication?.name || req.user.email || 'System'
      };

      if (ActivityLog.logActivity) {
        await ActivityLog.logActivity(
          logUser,
          'RESET_PASSWORD',
          'MEMBER',
          member.id,
          `Reset password for member: ${member.membershipApplication.name} (Email: ${member.membershipApplication.email})`,
          null,
          req
        );
      } else {
        // Fallback if logActivity helper is not available
        await ActivityLog.create({
          user_id: req.user.id,
          user_name: logUser.name,
          user_role: req.user.role,
          action: 'RESET_PASSWORD',
          resource_type: 'MEMBER',
          resource_id: member.id,
          description: `Reset password for member: ${member.membershipApplication.name} (Email: ${member.membershipApplication.email})`,
          ip_address: req.ip,
          user_agent: req.headers['user-agent']
        });
      }
    } catch (logError) {
      console.error('Failed to log activity:', logError);
      // Non-blocking error
    }

    res.json({
      success: true,
      message: 'Password reset successfully. New password sent to member email.',
      newPassword: newPassword
    });

  } catch (error) {
    console.error('Reset member password error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
};

const exportMembers = async (req, res) => {
  try {
    const { status } = req.query;

    const whereClause = {
      deleted_at: null
    };

    if (status) {
      whereClause.status = status;
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

    const members = await User.findAll({
      where: whereClause,
      include: [{
        model: require('../models/MembershipApplication'),
        as: 'membershipApplication',
        required: true
      }],
      order: [['created_at', 'DESC']]
    });

    // Convert to CSV format
    const csvHeader = 'PSN,Name,Email,Phone,Facility,Next of Kin Name,Next of Kin Phone,Savings,Investment,Target Saving,Target Period,Role,Status,Join Date\n';
    const csvRows = members.map(member => {
      const app = member.membershipApplication;
      return [
        app.psn,
        `"${app.name}"`,
        app.email,
        app.phone || '',
        `"${app.facility_name || ''}"`,
        `"${app.next_of_kin_name || ''}"`,
        app.next_of_kin_phone || '',
        app.savings || 0,
        app.investment || 0,
        app.target_saving || 0,
        app.target_period || 12,
        member.role,
        member.status,
        member.created_at.toISOString().split('T')[0]
      ].join(',');
    });

    const csvContent = csvHeader + csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=members_export_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);

  } catch (error) {
    console.error('Export members error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const importMembers = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (req.file.size > maxSize) {
      return res.status(413).json({
        success: false,
        message: 'File too large. Maximum size is 10MB.'
      });
    }

    const fileExtension = req.file.originalname.split('.').pop().toLowerCase();
    let membersData = [];

    if (fileExtension === 'csv') {
      // Parse CSV
      const csv = require('csv-parser');
      const fs = require('fs');
      const results = [];

      // Read file synchronously for simplicity
      const fileContent = fs.readFileSync(req.file.path, 'utf-8');
      const lines = fileContent.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'CSV file must have at least a header row and one data row'
        });
      }

      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
        const member = {};
        headers.forEach((header, index) => {
          member[header.toLowerCase().replace(/\s+/g, '_')] = values[index] || '';
        });
        results.push(member);
      }

      membersData = results;
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      // Parse Excel
      const XLSX = require('xlsx');
      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      membersData = XLSX.utils.sheet_to_json(worksheet);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Unsupported file format. Please upload CSV or Excel file.'
      });
    }

    const uploadBatch = await UploadBatch.create({
      type: 'members_import',
      status: 'PROCESSING',
      original_filename: req.file.originalname,
      stored_filename: req.file.filename || req.file.path,
      total_records: membersData.length,
      created_by: req.user?.id || null
    });

    // Validate and process members data
    const validMembers = [];
    const errors = [];
    const errorRows = [];
    const { Op } = require('sequelize');

    const pushRowError = (rowNumber, recordKey, errorCode, message, fields, rawRecord) => {
      errors.push(`Row ${rowNumber}: ${message}`);
      errorRows.push({
        batch_id: uploadBatch.id,
        row_number: rowNumber,
        record_key: recordKey || null,
        error_code: errorCode,
        message,
        fields: fields || null,
        raw_record: rawRecord || null,
        status: 'FAILED'
      });
    };

    for (let i = 0; i < membersData.length; i++) {
      const row = membersData[i];
      const rowNumber = i + 2; // +2 because Excel/CSV row numbering starts from 1, and we skip header

      try {
        // Map common column names - handle Excel headers with underscores and different cases
        const memberData = {
          psn: row.psn || row.PSN || row['Personal Subhead Number'] || row.Psn || '',
          name: row.name || row.Name || row['Full Name'] || row.NAME || '',
          email: row.email || row.Email || row['Email Address'] || row.EMAIL || '',
          phone: row.phone || row.Phone || row['Phone Number'] || row['Mobile'] || row.PHONE || '',
          facility_name: row.facility_name || row.facility || row.facilityName || row.Facility || row['Healthcare Facility'] || row['Facility Name'] || row.HEALTHCARE_FACILITY || row.facilityname || '',
          next_of_kin_name: row.next_of_kin_name || row.nextOfKinName || row['Next Of Kin Name'] || row['Next of Kin'] || row.NEXT_OF_KIN_NAME || '',
          next_of_kin_phone: row.next_of_kin_phone || row.nextOfKinPhone || row['Next Of Kin Phone'] || row['Next of Kin Phone'] || row.NEXT_OF_KIN_PHONE || '',
          savings: parseFloat(row.savings || row.Savings || row.SAVINGS || '0') || 0,
          investment: parseFloat(row.investment || row.Investment || row.INVESTMENT || '0') || 0,
          target_saving: parseFloat(row.target_saving || row.targetSaving || row['Target Saving'] || row.TARGET_SAVING || '0') || 0,
          target_period: parseInt(row.target_period || row.targetPeriod || row['Target Period'] || row.TARGET_PERIOD || '12') || 12,
          role: (row.role || row.Role || row.ROLE || 'member').toLowerCase(),
          status: (row.status || row.Status || row.STATUS || 'active').toLowerCase()
        };

        // Validate required fields
        if (!memberData.psn || !memberData.name || !memberData.email) {
          pushRowError(rowNumber, memberData.psn || memberData.email, 'MISSING_REQUIRED_FIELDS', 'Missing required fields (PSN, Name, Email)', ['psn', 'name', 'email'], memberData);
          continue;
        }

        if (!memberData.phone || !memberData.facility_name || !memberData.next_of_kin_name || !memberData.next_of_kin_phone) {
          pushRowError(
            rowNumber,
            memberData.psn,
            'MISSING_REQUIRED_FIELDS',
            'Missing required fields (Phone, Facility Name, Next of Kin Name, Next of Kin Phone)',
            ['phone', 'facility_name', 'next_of_kin_name', 'next_of_kin_phone'],
            memberData
          );
          continue;
        }

        // Validate combined savings and investment minimum
        const totalContribution = memberData.savings + memberData.investment;
        if (totalContribution < 5000) {
          pushRowError(rowNumber, memberData.psn, 'MIN_CONTRIBUTION_NOT_MET', `Combined savings and investment must be at least ₦5,000 (current: ₦${totalContribution})`, ['savings', 'investment'], memberData);
          continue;
        }

        // Check for duplicates in existing membership applications
        const MembershipApplication = require('../models/MembershipApplication');
        const existingApplication = await MembershipApplication.findOne({
          where: {
            [Op.or]: [
              { psn: memberData.psn },
              { email: memberData.email }
            ]
          }
        });

        if (existingApplication) {
          pushRowError(rowNumber, memberData.psn, 'DUPLICATE_EXISTING', 'Duplicate PSN or email already exists', ['psn', 'email'], memberData);
          continue;
        }

        // Check for duplicates in current import batch
        const duplicateInBatch = validMembers.find(m =>
          m.psn === memberData.psn || m.email === memberData.email
        );

        if (duplicateInBatch) {
          pushRowError(rowNumber, memberData.psn, 'DUPLICATE_IN_FILE', 'Duplicate PSN or email in import file', ['psn', 'email'], memberData);
          continue;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(memberData.email)) {
          pushRowError(rowNumber, memberData.psn, 'INVALID_EMAIL', 'Invalid email format', ['email'], memberData);
          continue;
        }

        // Validate role
        if (!['admin', 'member', 'treasurer', 'chairman'].includes(memberData.role)) {
          pushRowError(rowNumber, memberData.psn, 'INVALID_ROLE', 'Invalid role. Must be admin, member, treasurer, or chairman', ['role'], memberData);
          continue;
        }
        if (memberData.role === 'super_admin') {
          pushRowError(rowNumber, memberData.psn, 'INVALID_ROLE', 'Invalid role. Cannot import super_admin role', ['role'], memberData);
          continue;
        }

        // Validate status
        if (!['active', 'inactive', 'suspended'].includes(memberData.status)) {
          pushRowError(rowNumber, memberData.psn, 'INVALID_STATUS', 'Invalid status. Must be active, inactive, or suspended', ['status'], memberData);
          continue;
        }

        validMembers.push(memberData);

      } catch (error) {
        pushRowError(rowNumber, null, 'ROW_PROCESSING_ERROR', `Error processing row - ${error.message}`, null, row);
      }
    }

    if (validMembers.length === 0) {
      if (errorRows.length > 0) {
        await UploadRecordError.bulkCreate(errorRows);
      }
      await uploadBatch.update({
        status: 'COMPLETED',
        success_count: 0,
        failure_count: errorRows.length,
        completed_at: new Date()
      });
      return res.status(400).json({
        success: false,
        message: 'No valid members found in the uploaded file',
        errors,
        batch_id: uploadBatch.id
      });
    }

    // Create members in database
    const createdMembers = [];
    const bcrypt = require('bcryptjs');
    const crypto = require('crypto');

    for (const memberData of validMembers) {
      try {
        // Create membership application first
        const MembershipApplication = require('../models/MembershipApplication');
        const application = await MembershipApplication.create({
          psn: memberData.psn.trim(),
          name: memberData.name.trim(),
          email: memberData.email.trim().toLowerCase(),
          phone: memberData.phone ? memberData.phone.trim() : null,
          facility_name: memberData.facility_name ? memberData.facility_name.trim() : null,
          next_of_kin_name: memberData.next_of_kin_name ? memberData.next_of_kin_name.trim() : null,
          next_of_kin_phone: memberData.next_of_kin_phone ? memberData.next_of_kin_phone.trim() : null,
          savings: parseFloat(memberData.savings) || 0,
          investment: parseFloat(memberData.investment) || 0,
          target_saving: parseFloat(memberData.target_saving) || 0,
          target_period: parseInt(memberData.target_period) || 12,
          status: 'approved', // Auto-approved for bulk import
          application_date: new Date(),
          approved_by: 'Bulk Import System',
          approved_at: new Date(),
          reviewed_by: req.user?.id || 1,
          review_date: new Date()
        });

        // Create user account linked to the application
        const { user, generatedPassword } = await createMemberAccount(application.id, null, process.env.NODE_ENV !== 'test');

        createdMembers.push({
          id: user.id,
          membership_application_id: user.membership_application_id,
          psn: application.psn,
          name: application.name,
          email: application.email,
          status: user.status,
          generatedPassword,
          application_id: application.id
        });

      } catch (memberCreationError) {
        console.error(`Failed to create member ${memberData.email}:`, memberCreationError);
        pushRowError(null, memberData.psn || memberData.email, 'CREATE_FAILED', `Failed to create account for ${memberData.name} (${memberData.email})`, null, memberData);
        // Continue with next member
      }
    }

    if (errorRows.length > 0) {
      await UploadRecordError.bulkCreate(errorRows);
    }

    await uploadBatch.update({
      status: 'COMPLETED',
      success_count: createdMembers.length,
      failure_count: errorRows.length,
      completed_at: new Date()
    });

    await ActivityLog.logActivity(
      {
        id: req.user.id,
        role: req.user.role,
        name: req.user?.membershipApplication?.name || null
      },
      'bulk_import_members',
      'upload_batch',
      uploadBatch.id,
      `Bulk imported members: success=${createdMembers.length}, failed=${errorRows.length}`,
      { batch_id: uploadBatch.id, success: createdMembers.length, failed: errorRows.length },
      req
    );

    // Clean up uploaded file
    const fs = require('fs');
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.json({
      success: true,
      message: `Successfully imported ${createdMembers.length} members`,
      imported: createdMembers.length,
      batch_id: uploadBatch.id,
      errors: errors.length > 0 ? errors : undefined,
      members: createdMembers.map(member => ({
        id: member.id,
        membership_application_id: member.membership_application_id,
        psn: member.psn,
        name: member.name,
        email: member.email,
        status: member.status,
        generatedPassword: member.generatedPassword
      }))
    });

  } catch (error) {
    console.error('Import members error:', error);

    try {
      if (req.file) {
        await UploadBatch.create({
          type: 'members_import',
          status: 'FAILED',
          original_filename: req.file.originalname,
          stored_filename: req.file.filename || req.file.path,
          total_records: 0,
          success_count: 0,
          failure_count: 0,
          created_by: req.user?.id || null,
          metadata: { error: error.message || 'failed' },
          completed_at: new Date()
        });
      }
    } catch (e) {}

    // Clean up uploaded file on error
    if (req.file && req.file.path) {
      const fs = require('fs');
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error during import'
    });
  }
};

// Validate grantor PSN for loan applications
const validateGrantor = async (req, res) => {
  try {
    const psn = (req.query?.psn == null ? '' : String(req.query.psn)).trim();

    if (!psn) {
      await ActivityLog.logActivity(
        req.user ? { id: req.user.id, role: req.user.role, name: req.user?.membershipApplication?.name || null } : null,
        'guarantor_psn_validation_attempt',
        'loan',
        null,
        'Guarantor PSN validation failed: PSN is required.',
        { outcome: 'failed', code: 'PSN_REQUIRED', psn: null },
        req
      );
      return res.status(400).json({
        success: false,
        message: 'PSN parameter is required'
      });
    }

    // Format validation
    const psnRegex = /^[A-Za-z0-9_]{3,20}$/;
    if (!psnRegex.test(psn)) {
      await ActivityLog.logActivity(
        req.user ? { id: req.user.id, role: req.user.role, name: req.user?.membershipApplication?.name || null } : null,
        'guarantor_psn_validation_attempt',
        'loan',
        null,
        'Guarantor PSN failed format validation.',
        { outcome: 'failed', code: 'INVALID_FORMAT', psn },
        req
      );
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid PSN format. Must be 3-20 alphanumeric characters.', 
        code: 'INVALID_FORMAT' 
      });
    }

    if (req.user?.membershipApplication?.psn && psn.toLowerCase() === String(req.user.membershipApplication.psn).trim().toLowerCase()) {
      await ActivityLog.logActivity(
        req.user ? { id: req.user.id, role: req.user.role, name: req.user?.membershipApplication?.name || null } : null,
        'guarantor_psn_validation_attempt',
        'loan',
        null,
        'Guarantor PSN validation failed: applicant cannot guarantee self.',
        { outcome: 'failed', code: 'SELF_GUARANTOR', psn },
        req
      );
      return res.status(400).json({
        success: false,
        message: 'You cannot be your own guarantor',
        code: 'SELF_GRANTOR'
      });
    }

    // Find member by PSN through approved membership application (case-insensitive)
    const isPostgres = sequelize.options.dialect === 'postgres';
    const searchOp = isPostgres ? Op.iLike : Op.like;

    const application = await MembershipApplication.findOne({
      where: {
        psn: { [searchOp]: psn.trim() },
        status: 'approved'
      }
    });

    if (!application) {
      await ActivityLog.logActivity(
        req.user ? { id: req.user.id, role: req.user.role, name: req.user?.membershipApplication?.name || null } : null,
        'guarantor_psn_validation_attempt',
        'loan',
        null,
        'Guarantor PSN validation failed: PSN not found among active members.',
        { outcome: 'failed', code: 'GUARANTOR_PSN_NOT_FOUND', psn },
        req
      );
      return res.status(404).json({
        success: false,
        message: 'Guarantor PSN does not match any active registered member. Please enter a valid member PSN.',
        code: 'PSN_NOT_FOUND'
      });
    }

    const user = await User.findOne({
      where: { membership_application_id: application.id },
      attributes: ['id', 'membership_application_id']
    });

    await ActivityLog.logActivity(
      req.user ? { id: req.user.id, role: req.user.role, name: req.user?.membershipApplication?.name || null } : null,
      'guarantor_psn_validation_attempt',
      'loan',
      null,
      'Guarantor PSN validated successfully.',
      {
        outcome: 'success',
        code: 'OK',
        psn,
        guarantor_membership_application_id: application.id,
        guarantor_user_id: user?.id || null
      },
      req
    );

    res.json({
      success: true,
      member: {
        id: user?.id || application.id,
        name: application.name,
        psn: application.psn,
        email: application.email,
        phone: application.phone
      }
    });

  } catch (error) {
    console.error('Validate grantor error:', error);
    try {
        await ActivityLog.logActivity(
          req.user ? { id: req.user.id, role: req.user.role, name: req.user?.membershipApplication?.name || null } : null,
          'guarantor_psn_validation_attempt',
          'loan',
          null,
          'Guarantor PSN validation failed due to server error.',
          { outcome: 'failed', code: 'SERVER_ERROR', psn: (req.query?.psn == null ? null : String(req.query.psn).trim()), error: error.message },
          req
        );
    } catch (logError) {
        console.error('Failed to log validation error:', logError);
    }
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const updateMemberJoinDate = async (req, res) => {
  try {
    const { id } = req.params;
    const { joinDate } = req.body;

    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Admin privileges required.' });
    }

    // Validation
    if (!joinDate) {
      return res.status(400).json({ success: false, message: 'Join date is required' });
    }
    
    // Validate date format and future date
    const dateObj = new Date(joinDate);
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid date format' });
    }
    
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Allow today
    if (dateObj > today) {
      return res.status(400).json({ success: false, message: 'Join date cannot be in the future' });
    }

    const member = await User.findByPk(id, {
      include: [{
        model: require('../models/MembershipApplication'),
        as: 'membershipApplication',
        required: true
      }]
    });

    if (!member || member.deleted_at) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }
    
    if (member.role === 'super_admin' && req.user?.role !== 'super_admin') {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    const application = member.membershipApplication;
    const previousDate = application.review_date;

    // Update review_date
    await application.update({
      review_date: joinDate
    });

    // Log activity
    if (req.user) {
        await ActivityLog.logActivity(
            req.user,
            'update_member_join_date',
            'member',
            member.id,
            `Updated member since date for ${application.name} (PSN: ${application.psn}) from ${previousDate} to ${joinDate}`,
            { previousDate, newDate: joinDate },
            req
        );
    }

    res.json({ success: true, message: 'Member join date updated successfully', joinDate });

  } catch (error) {
    console.error('Update join date error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getMemberFinancialProfile = async (req, res) => {
  try {
    const allowedRoles = ['admin', 'super_admin', 'chairman', 'treasurer'];
    if (!allowedRoles.includes(String(req.user?.role || ''))) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid member id' });
    }

    const member = await User.findByPk(id, {
      include: [{
        model: MembershipApplication,
        as: 'membershipApplication',
        required: false
      }],
      attributes: { exclude: ['password_hash'] }
    });

    if (!member || member.deleted_at) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }
    
    if (member.role === 'super_admin' && req.user?.role !== 'super_admin') {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    const contributions = await Contribution.findAll({
      where: { user_id: id },
      order: [['contribution_date', 'DESC'], ['id', 'DESC']],
      attributes: ['id', 'total_amount', 'status', 'payment_method', 'contribution_date', 'month', 'year', 'notes']
    });

    const totalContributionsRaw = await Contribution.sum('total_amount', { where: { user_id: id, status: 'approved' } });
    const totalContributions = parseFloat(totalContributionsRaw || 0);

    const activeLoan = await Loan.findOne({
      where: { user_id: id, status: { [Op.in]: ['disbursed', 'active', 'defaulted'] } },
      order: [['updated_at', 'DESC'], ['id', 'DESC']]
    });

    let loan = null;
    let repayments = [];
    if (activeLoan) {
      const targetAmount = parseFloat(activeLoan.total_repayment || activeLoan.amount_approved || activeLoan.amount_requested || 0);
      const totalPaidVerifiedRaw = await LoanRepayment.sum('repayment_amount', {
        where: { loan_id: activeLoan.id, status: 'verified' }
      });
      const totalPaidVerified = parseFloat(totalPaidVerifiedRaw || 0);
      const remainingBalance = Math.max(0, Math.round((targetAmount - totalPaidVerified) * 100) / 100);

      const repaymentRows = await LoanRepayment.findAll({
        where: { loan_id: activeLoan.id },
        order: [['repayment_date', 'ASC'], ['id', 'ASC']],
        attributes: ['id', 'repayment_amount', 'repayment_date', 'payment_method', 'status', 'notes', 'created_at']
      });

      let runningPaid = 0;
      repayments = repaymentRows.map((r) => {
        const amt = parseFloat(r.repayment_amount || 0);
        const included = r.status === 'verified';
        if (included) runningPaid += amt;
        const balanceAfter = Math.max(0, Math.round((targetAmount - runningPaid) * 100) / 100);
        return {
          id: r.id,
          repayment_amount: amt,
          repayment_date: r.repayment_date,
          payment_method: r.payment_method,
          status: r.status,
          notes: r.notes,
          included_in_balance: included,
          remaining_balance_after: balanceAfter
        };
      });

      loan = {
        id: activeLoan.id,
        loan_type: activeLoan.loan_type,
        status: activeLoan.status,
        amount_borrowed: parseFloat(activeLoan.amount_approved || activeLoan.amount_requested || 0),
        interest_rate: parseFloat(activeLoan.interest_rate || 0),
        repayment_period_months: activeLoan.repayment_period_months,
        monthly_repayment: parseFloat(activeLoan.monthly_repayment || 0),
        total_repayment: targetAmount,
        application_date: activeLoan.application_date,
        approval_date: activeLoan.approval_date,
        disbursement_date: activeLoan.disbursement_date,
        first_repayment_date: activeLoan.first_repayment_date,
        purpose: activeLoan.purpose || null,
        total_paid_verified: totalPaidVerified,
        remaining_balance: remainingBalance
      };
    }

    await ActivityLog.logActivity(
      { id: req.user.id, role: req.user.role, name: req.user?.membershipApplication?.name || null },
      'view_member_financial_profile',
      'member',
      id,
      `Viewed member financial profile for user_id=${id}`,
      { member_user_id: id },
      req
    );

    res.json({
      success: true,
      profile: {
        member: {
          id: member.id,
          role: member.role,
          status: member.status,
          psn: member.membershipApplication?.psn || null,
          name: member.membershipApplication?.name || null,
          email: member.membershipApplication?.email || null,
          phone: member.membershipApplication?.phone || null,
          facility_name: member.membershipApplication?.facility_name || null
        },
        contributions: {
          total_approved: totalContributions,
          history: contributions.map((c) => ({
            id: c.id,
            date: c.contribution_date,
            amount: parseFloat(c.total_amount || 0),
            status: c.status,
            payment_method: c.payment_method,
            month: c.month,
            year: c.year,
            notes: c.notes || null
          }))
        },
        loan,
        repayments
      }
    });
  } catch (error) {
    console.error('Get member financial profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getMembers,
  getMemberById,
  createMember,
  createMemberAccount,
  updateMember,
  suspendMember,
  activateMember,
  deleteMember,
  resetMemberPassword,
  exportMembers,
  importMembers,
  validateGrantor,
  updateMemberJoinDate,
  getMemberFinancialProfile
};
