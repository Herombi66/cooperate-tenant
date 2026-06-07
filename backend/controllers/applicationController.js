const MembershipApplication = require('../models/MembershipApplication');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { sequelize } = require('../db/connection');
const { createMemberAccount } = require('./memberController');
const emailService = require('../services/emailService');

const { Op } = require('sequelize');

const MEMBERSHIP_DUPLICATE_WINDOW_HOURS = Number(
  process.env.MEMBERSHIP_APPLICATION_DUPLICATE_WINDOW_HOURS || 168
);
const MEMBERSHIP_DUPLICATE_ACTIVE_STATUSES = ['pending', 'under_review', 'approved'];

const hashStringToInt32 = (value) => {
  const str = String(value ?? '');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return hash;
};

const normalizeEmail = (email) => String(email ?? '').trim().toLowerCase();
const normalizePsn = (psn) => String(psn ?? '').trim();
const normalizeMembershipPsn = (psn) => normalizePsn(psn).toUpperCase();
const isValidMembershipPsn = (psn) => /^[A-Z0-9]{5,20}$/.test(normalizeMembershipPsn(psn));

const findMembershipDuplicate = async ({ psn, email }, { transaction } = {}) => {
  const since = new Date(Date.now() - MEMBERSHIP_DUPLICATE_WINDOW_HOURS * 60 * 60 * 1000);

  const existingApplication = await MembershipApplication.findOne({
    where: {
      status: { [Op.in]: MEMBERSHIP_DUPLICATE_ACTIVE_STATUSES },
      application_date: { [Op.gte]: since },
      [Op.or]: [{ psn }, { email }]
    },
    order: [['application_date', 'DESC'], ['id', 'DESC']],
    transaction
  });

  const existingUser = await User.findOne({
    include: [
      {
        model: MembershipApplication,
        as: 'membershipApplication',
        where: { [Op.or]: [{ psn }, { email }] },
        required: true
      }
    ],
    where: { deleted_at: null },
    transaction
  });

  return { existingApplication, existingUser };
};

const buildMembershipDuplicateResponse = ({ existingApplication, existingUser }) => {
  if (existingUser) {
    return {
      status: 409,
      body: {
        success: false,
        code: 'MEMBER_ALREADY_EXISTS',
        message: 'A member with this PSN or email already exists'
      }
    };
  }

  return {
    status: 409,
    body: {
      success: false,
      code: 'DUPLICATE_APPLICATION',
      message: 'Duplicate application detected. You already submitted a membership application recently.',
      duplicate: existingApplication
        ? {
            id: existingApplication.id,
            status: existingApplication.status,
            application_date: existingApplication.application_date
          }
        : undefined
    }
  };
};

// Unified application submission - handles both public and admin submissions
const submitApplication = async (req, res) => {
  try {
    const {
      name,
      psn,
      email,
      phone,
      facility_name,
      next_of_kin_name,
      next_of_kin_phone,
      savings,
      investment,
      target_saving,
      target_period,
      auto_approve = false // For admin direct creation
    } = req.body;

    // Validate required fields
    if (!name || !psn || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name, PSN, and email are required'
      });
    }

    // Validate minimum contribution for non-admin submissions
    if (!auto_approve) {
      const totalContribution = (parseFloat(savings) || 0) + (parseFloat(investment) || 0);
      if (totalContribution < 5000) {
        return res.status(400).json({
          success: false,
          message: 'Combined savings and investment must be at least ₦5,000'
        });
      }
    }

    const normalizedPsn = normalizeMembershipPsn(psn);
    const normalizedEmail = normalizeEmail(email);

    if (!isValidMembershipPsn(normalizedPsn)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid PSN format. PSN must be 5-20 characters and contain only letters and numbers.'
      });
    }

    const created = await sequelize.transaction(async (transaction) => {
      if (sequelize.getDialect() === 'postgres') {
        await sequelize.query(
          'SELECT pg_advisory_xact_lock(:k1, :k2);',
          {
            replacements: {
              k1: hashStringToInt32(normalizedPsn),
              k2: hashStringToInt32(normalizedEmail)
            },
            transaction
          }
        );
      }

      const { existingApplication, existingUser } = await findMembershipDuplicate(
        { psn: normalizedPsn, email: normalizedEmail },
        { transaction }
      );

      if (existingUser || existingApplication) {
        await ActivityLog.logActivity(
          null,
          'membership_application_duplicate_blocked',
          'membership_application',
          existingApplication?.id || null,
          'Duplicate membership application blocked',
          {
            psn: normalizedPsn,
            email: normalizedEmail,
            existing_application_id: existingApplication?.id || null,
            existing_application_status: existingApplication?.status || null,
            existing_user_id: existingUser?.id || null
          },
          req
        );

        const conflict = buildMembershipDuplicateResponse({ existingApplication, existingUser });
        return { conflict };
      }

      const applicationData = {
        name: name.trim(),
        psn: normalizedPsn,
        email: normalizedEmail,
        phone: phone ? phone.trim() : null,
        facility_name: facility_name ? facility_name.trim() : null,
        next_of_kin_name: next_of_kin_name ? next_of_kin_name.trim() : null,
        next_of_kin_phone: next_of_kin_phone ? next_of_kin_phone.trim() : null,
        savings: parseFloat(savings) || 0,
        investment: parseFloat(investment) || 0,
        target_saving: parseFloat(target_saving) || 0,
        target_period: parseInt(target_period) || 12,
        status: auto_approve ? 'approved' : 'pending',
        application_date: new Date()
      };

      if (auto_approve && req.user) {
        const reviewerName =
          req.user?.membershipApplication?.name || req.user?.name || null;

        applicationData.approved_by = reviewerName;
        applicationData.approved_at = new Date();
        applicationData.reviewed_by = req.user.id;
        applicationData.review_date = new Date();
      }

      const application = await MembershipApplication.create(applicationData, { transaction });
      await ActivityLog.logActivity(
        null,
        'membership_application_submitted',
        'membership_application',
        application.id,
        'Membership application submitted',
        { status: application.status, auto_approve: !!auto_approve },
        req
      );

      return { application };
    });

    if (created?.conflict) {
      return res.status(created.conflict.status).json(created.conflict.body);
    }

    const application = created.application;

    // Send acknowledgement email
    try {
        await emailService.sendUnderReviewEmail(application);
    } catch (emailError) {
        console.error('Failed to send application acknowledgement email:', emailError);
    }

    // If auto-approve, create user account immediately
    let userAccount = null;
    let generatedPassword = null;

    if (auto_approve) {
      console.log('🔧 [ADMIN CREATE MEMBER] Processing auto-approved application - calling createMemberAccount');
      try {
        console.log('🔧 [ADMIN CREATE MEMBER] About to call createMemberAccount with true sendEmail');
        const result = await createMemberAccount(application.id, null, true);
        console.log('🔧 [ADMIN CREATE MEMBER] createMemberAccount returned:', result ? 'success' : 'null');

        userAccount = result.user;
        generatedPassword = result.generatedPassword;
        console.log('🔧 [ADMIN CREATE MEMBER] User account created:', userAccount ? userAccount.id : 'null');

      } catch (userCreationError) {
        console.error('Failed to create user account for auto-approved application:', userCreationError);
        // Update application status to indicate failure
        await application.update({ status: 'pending' });
        return res.status(500).json({
          success: false,
          message: 'Application submitted but failed to create user account'
        });
      }
    }

    const response = {
      success: true,
      message: auto_approve
        ? 'Member created successfully'
        : 'Membership application submitted successfully',
      application: {
        id: application.id,
        name: application.name,
        psn: application.psn,
        email: application.email,
        status: application.status,
        application_date: application.application_date
      }
    };

    // Include user account info for auto-approved applications
    if (auto_approve && userAccount) {
      response.user = {
        id: userAccount.id,
        psn: userAccount.psn,
        name: userAccount.name,
        email: userAccount.email,
        role: userAccount.role,
        status: userAccount.status
      };
      response.generatedPassword = generatedPassword;
    }

    res.status(auto_approve ? 201 : 200).json(response);

  } catch (error) {
    console.error('Submit application error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const checkDuplicateApplication = async (req, res) => {
  try {
    const psn = normalizeMembershipPsn(req.body?.psn);
    const email = normalizeEmail(req.body?.email);

    if (!psn || !email) {
      return res.status(400).json({
        success: false,
        message: 'PSN and email are required'
      });
    }

    if (!isValidMembershipPsn(psn)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid PSN format. PSN must be 5-20 characters and contain only letters and numbers.'
      });
    }

    const { existingApplication, existingUser } = await findMembershipDuplicate({ psn, email });
    if (existingApplication || existingUser) {
      const conflict = buildMembershipDuplicateResponse({ existingApplication, existingUser });
      return res.status(conflict.status).json(conflict.body);
    }

    return res.json({ success: true, duplicate: false });
  } catch (error) {
    console.error('Check duplicate application error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const getApplications = async (req, res) => {
  try {
    // Role check
    const allowedRoles = ['admin', 'super_admin', 'treasurer', 'chairman', 'secretary'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient privileges.'
      });
    }

    const { status, page = 1, limit = 10, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const whereClause = {};
    if (status) {
      whereClause.status = status;
    }

    // Add search functionality
    if (search) {
      const { Op } = require('sequelize');
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { psn: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows } = await MembershipApplication.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: offset,
      order: [['application_date', 'DESC'], ['id', 'DESC']]
    });

    res.json({
      success: true,
      applications: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const getApplicationById = async (req, res) => {
  try {
    const { id } = req.params;

    const application = await MembershipApplication.findByPk(id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    res.json({
      success: true,
      application
    });

  } catch (error) {
    console.error('Get application by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Bulk import applications (auto-approved for existing members)
const bulkImportApplications = async (req, res) => {
  console.log('🚀 [BULK IMPORT START] Processing bulk import request');
  console.log('Request Headers:', JSON.stringify(req.headers, null, 2));
  
  try {
    // Log file details (if any)
    if (req.file) {
      console.log('File details:', {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
      });
    } else {
      console.warn('❌ [BULK IMPORT ERROR] No file found in request (req.file is undefined)');
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please ensure you are sending a file with the key "file".'
      });
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (req.file.size > maxSize) {
      console.warn(`❌ [BULK IMPORT ERROR] File size ${req.file.size} exceeds limit ${maxSize}`);
      return res.status(413).json({
        success: false,
        message: 'File too large. Maximum size is 10MB.'
      });
    }

    const fileExtension = req.file.originalname.split('.').pop().toLowerCase();
    console.log(`Processing file with extension: .${fileExtension}`);
    
    let membersData = [];

    if (fileExtension === 'csv' || fileExtension === 'xlsx' || fileExtension === 'xls') {
      try {
        const XLSX = require('xlsx');
        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        membersData = XLSX.utils.sheet_to_json(worksheet);
        console.log(`Parsed ${membersData.length} rows from ${fileExtension.toUpperCase()}`);
      } catch (parseError) {
        console.error(`❌ [BULK IMPORT ERROR] ${fileExtension.toUpperCase()} Parsing failed:`, parseError);
        return res.status(400).json({
          success: false,
          message: `Failed to parse ${fileExtension.toUpperCase()} file`,
          error: parseError.message
        });
      }
    } else {
      console.warn(`❌ [BULK IMPORT ERROR] Unsupported file extension: ${fileExtension}`);
      return res.status(400).json({
        success: false,
        message: 'Unsupported file format. Please upload CSV or Excel file.'
      });
    }

    // Validate and process members data
    const validApplications = [];
    const errors = [];
    const { Op } = require('sequelize');

    console.log('Starting validation of parsed data...');

    // Log the first row to help debug header issues
    if (membersData.length > 0) {
      console.log('First row raw keys:', Object.keys(membersData[0]));
    }

    for (let i = 0; i < membersData.length; i++) {
      const row = membersData[i];
      const rowNumber = i + 2; // +2 because Excel/CSV row numbering starts from 1, and we skip header

      try {
        // Normalize row keys to handle case sensitivity, spaces, and underscores
        // e.g., "Personal Subhead Number" -> "personal_subhead_number"
        // e.g., "Email " -> "email"
        const normalizedRow = {};
        Object.keys(row).forEach(key => {
          const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, '_');
          normalizedRow[normalizedKey] = row[key];
        });

        // Helper to find value from multiple possible normalized keys
        const getValue = (keys) => {
          for (const key of keys) {
            if (normalizedRow[key] !== undefined && normalizedRow[key] !== null) return normalizedRow[key];
          }
          return undefined;
        };

        const rawPsn = getValue(['psn', 'personal_service_number']);
        const rawName = getValue(['name', 'full_name']);
        const rawEmail = getValue(['email', 'email_address']);
        const rawPhone = getValue(['phone', 'phone_number', 'mobile']);
        const rawFacility = getValue(['facility_name', 'facility', 'healthcare_facility']);
        const rawNokName = getValue(['next_of_kin_name', 'next_of_kin']);
        const rawNokPhone = getValue(['next_of_kin_phone']);
        const rawSavings = getValue(['savings']);
        const rawInvestment = getValue(['investment']);
        const rawTargetSaving = getValue(['target_saving']);
        const rawTargetPeriod = getValue(['target_period']);

        // Helper to parse currency strings (e.g. "5,000", "₦5,000")
        const parseCurrency = (val) => {
          if (!val) return undefined;
          // Remove commas, currency symbols, and whitespace
          const cleanVal = String(val).replace(/[,₦$ ]/g, '');
          const num = Number(cleanVal);
          return isNaN(num) ? NaN : num;
        };

        // Validate numeric fields if present
        if (rawSavings && isNaN(parseCurrency(rawSavings))) {
          errors.push(`Row ${rowNumber}: Invalid savings amount "${rawSavings}"`);
          continue;
        }
        if (rawInvestment && isNaN(parseCurrency(rawInvestment))) {
          errors.push(`Row ${rowNumber}: Invalid investment amount "${rawInvestment}"`);
          continue;
        }
        if (rawTargetSaving && isNaN(parseCurrency(rawTargetSaving))) {
          errors.push(`Row ${rowNumber}: Invalid target saving amount "${rawTargetSaving}"`);
          continue;
        }
        if (rawTargetPeriod && isNaN(Number(rawTargetPeriod))) {
          errors.push(`Row ${rowNumber}: Invalid target period "${rawTargetPeriod}"`);
          continue;
        }

        const applicationData = {
          psn: rawPsn ? String(rawPsn).trim() : '',
          name: rawName ? String(rawName).trim() : '',
          email: rawEmail ? String(rawEmail).trim().toLowerCase() : '',
          phone: rawPhone ? String(rawPhone).trim() : '',
          facility_name: rawFacility ? String(rawFacility).trim() : '',
          next_of_kin_name: rawNokName ? String(rawNokName).trim() : '',
          next_of_kin_phone: rawNokPhone ? String(rawNokPhone).trim() : '',
          savings: parseCurrency(rawSavings) || 0,
          investment: parseCurrency(rawInvestment) || 0,
          target_saving: parseCurrency(rawTargetSaving) || 0,
          target_period: parseInt(rawTargetPeriod || '12') || 12
        };

        // Validate required fields
        if (!applicationData.psn || !applicationData.name || !applicationData.email) {
          errors.push(`Row ${rowNumber}: Missing required fields (PSN, Name, Email)`);
          continue;
        }

        // Check for duplicates in existing applications or users
        const existingApplication = await MembershipApplication.findOne({
          where: {
            [Op.or]: [
              { psn: applicationData.psn },
              { email: applicationData.email }
            ]
          }
        });

        const existingUser = await User.findOne({
          include: [{
            model: MembershipApplication,
            as: 'membershipApplication',
            where: {
              [Op.or]: [
                { psn: applicationData.psn },
                { email: applicationData.email }
              ]
            },
            required: true
          }],
          where: {
            deleted_at: null
          }
        });

        if (existingApplication || existingUser) {
          // Skip duplicates instead of failing the entire import
          console.log(`Skipping duplicate member: PSN "${applicationData.psn}" or email "${applicationData.email}" already exists`);
          continue;
        }

        // Check for duplicates in current import batch
        const duplicateInBatch = validApplications.find(a =>
          a.psn === applicationData.psn || a.email === applicationData.email
        );

        if (duplicateInBatch) {
          errors.push(`Row ${rowNumber}: Duplicate PSN or email in import file`);
          continue;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(applicationData.email)) {
          errors.push(`Row ${rowNumber}: Invalid email format`);
          continue;
        }

        validApplications.push(applicationData);

      } catch (error) {
        errors.push(`Row ${rowNumber}: Error processing row - ${error.message}`);
      }
    }

    if (validApplications.length === 0) {
      console.warn('❌ [BULK IMPORT ERROR] Validation failed with errors:', errors);
      return res.status(400).json({
        success: false,
        message: 'No valid applications found in the uploaded file',
        errors
      });
    }

    // Create applications and user accounts
    const createdApplications = [];
    const createdUsers = [];

    for (const applicationData of validApplications) {
      try {
        // Create auto-approved application
        const application = await MembershipApplication.create({
          ...applicationData,
          status: 'approved',
          application_date: new Date(),
          approved_by: req.user.name,
          approved_at: new Date(),
          reviewed_by: req.user.id,
          review_date: new Date()
        });

        // Create user account
        const { user, generatedPassword } = await createMemberAccount(application.id, null, true);

        createdApplications.push(application);
        createdUsers.push({
          ...user.toJSON(),
          generatedPassword,
          password_hash: undefined // Remove from response
        });

      } catch (creationError) {
        console.error(`Failed to create application and user for ${applicationData.email}:`, creationError);
        errors.push(`Failed to create account for ${applicationData.name} (${applicationData.email})`);
        // Continue with next member
      }
    }

    // Clean up uploaded file
    const fs = require('fs');
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.json({
      success: true,
      message: `Successfully imported ${createdUsers.length} members`,
      imported: createdUsers.length,
      errors: errors.length > 0 ? errors : undefined,
      applications: createdApplications,
      users: createdUsers
    });

  } catch (error) {
    console.error('❌ [BULK IMPORT ERROR] Unhandled exception:', error);
    console.error('Stack trace:', error.stack);

    // Clean up uploaded file on error
    if (req.file && req.file.path) {
      const fs = require('fs');
      if (fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
          console.log('🧹 Cleaned up file after error:', req.file.path);
        } catch (cleanupError) {
          console.error('Failed to clean up file:', cleanupError);
        }
      }
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error during import',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

const updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, review_notes, rejection_reason } = req.body;

    const application = await MembershipApplication.findByPk(id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    const allowedStatuses = ['pending', 'under_review', 'approved', 'rejected'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const fromStatus = application.status;
    if ((fromStatus === 'approved' || fromStatus === 'rejected') && status !== fromStatus) {
      return res.status(400).json({
        success: false,
        message: 'Finalized applications cannot be changed'
      });
    }

    if (status === 'under_review' && fromStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending applications can be moved to under review'
      });
    }

    // Update application
    const updateData = {
      status,
      review_notes,
      reviewed_by: req.user.id,
      review_date: new Date()
    };

    if (status === 'approved') {
      updateData.approved_by = req.user.name;
      updateData.approved_at = new Date();

      // Create user account using the unified member creation function
      try {
        const { user, generatedPassword } = await createMemberAccount(application.id);

        console.log('✅ User account created successfully for approved application');
        console.log('🔐 Generated password for user:', generatedPassword);

      } catch (userCreationError) {
        console.error('❌ Failed to create user account:', userCreationError);
        return res.status(500).json({
          success: false,
          message: 'Failed to create user account for approved application'
        });
      }

    } else if (status === 'rejected') {
      updateData.rejection_reason = rejection_reason;

      // Send rejection email
      try {
        await emailService.sendRejectionEmail(application, rejection_reason);
        console.log('📧 Rejection email sent successfully');
      } catch (emailError) {
        console.error('❌ Failed to send rejection email:', emailError);
        // Don't fail the rejection if email fails
      }

    } else if (status === 'under_review') {
      // Send under review email
      try {
        await emailService.sendUnderReviewEmail(application);
        console.log('📧 Under review email sent successfully');
      } catch (emailError) {
        console.error('❌ Failed to send under review email:', emailError);
        // Don't fail the status update if email fails
      }
    }

    await application.update(updateData);

    await ActivityLog.logActivity(
      {
        id: req.user?.id,
        role: req.user?.role,
        name: req.user?.membershipApplication?.name || req.user?.name || null
      },
      'membership_application_status_changed',
      'membership_application',
      application.id,
      `Membership application status changed from ${fromStatus} to ${status}`,
      {
        from_status: fromStatus,
        to_status: status,
        review_notes: review_notes || null,
        rejection_reason: rejection_reason || null
      },
      req
    );

    res.json({
      success: true,
      message: 'Application status updated successfully',
      application
    });

  } catch (error) {
    console.error('Update application status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const deleteApplication = async (req, res) => {
  try {
    const { id } = req.params;

    const application = await MembershipApplication.findByPk(id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Check if there's an associated user account
    const User = require('../models/User');
    const associatedUser = await User.findOne({
      where: { membership_application_id: id }
    });

    if (associatedUser) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete application with associated user account. Deactivate the user account first.'
      });
    }

    // Delete the application
    await application.destroy();

    res.json({
      success: true,
      message: 'Application deleted successfully'
    });

  } catch (error) {
    console.error('Delete application error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  submitApplication,
  checkDuplicateApplication,
  getApplications,
  getApplicationById,
  bulkImportApplications,
  updateApplicationStatus,
  deleteApplication
};
