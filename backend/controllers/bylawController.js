const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { Settings, ActivityLog } = require('../models');

// Ensure upload directory exists
const UPLOADS_BYLAWS_DIR = path.join(__dirname, '../uploads/bylaws');
if (!fs.existsSync(UPLOADS_BYLAWS_DIR)) {
  fs.mkdirSync(UPLOADS_BYLAWS_DIR, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(UPLOADS_BYLAWS_DIR)) {
      fs.mkdirSync(UPLOADS_BYLAWS_DIR, { recursive: true });
    }
    cb(null, UPLOADS_BYLAWS_DIR);
  },
  filename: (req, file, cb) => {
    const tenantId = (req.tenantId || req.user?.tenant_id || req.headers['x-tenant-id'] || 'default')
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    const timestamp = Date.now();
    const safeExt = path.extname(file.originalname).toLowerCase() || '.pdf';
    cb(null, `bylaw_${tenantId}_${timestamp}${safeExt}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25 MB
  },
  fileFilter: (req, file, cb) => {
    const isPdfMime = file.mimetype === 'application/pdf';
    const isPdfExt = path.extname(file.originalname).toLowerCase() === '.pdf';
    if (isPdfMime || isPdfExt) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF documents (.pdf) are allowed as bylaws'), false);
    }
  }
});

const allowedAdminRoles = ['admin', 'super_admin', 'chairman', 'president', 'treasurer', 'secretary', 'assistant_secretary'];

/**
 * Upload or replace cooperative bylaw PDF
 */
const uploadBylaw = async (req, res) => {
  try {
    const userRole = req.user?.role;
    if (!allowedAdminRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to upload cooperative bylaws'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No PDF file uploaded'
      });
    }

    const tenantId = req.tenantId || req.user?.tenant_id || req.headers['x-tenant-id'] || 'default';

    // Check if an existing bylaw is registered and safely remove old file
    try {
      const existingSetting = await Settings.findOne({
        where: { key: 'cooperative_bylaw', tenant_id: tenantId }
      });
      if (existingSetting && existingSetting.value && existingSetting.value.url) {
        const oldFilename = path.basename(existingSetting.value.url);
        const oldFilePath = path.join(UPLOADS_BYLAWS_DIR, oldFilename);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
    } catch (cleanErr) {
      console.warn('Notice removing old bylaw file:', cleanErr.message);
    }

    const bylawData = {
      url: `/uploads/bylaws/${req.file.filename}`,
      filename: req.file.originalname,
      size: req.file.size,
      mime_type: 'application/pdf',
      uploaded_at: new Date().toISOString(),
      uploaded_by: req.user.id,
      uploaded_by_name: req.user.name || req.user.role
    };

    // Upsert bylaw in settings
    let [setting] = await Settings.findOrCreate({
      where: { key: 'cooperative_bylaw', tenant_id: tenantId },
      defaults: {
        category: 'general',
        description: 'Official Cooperative Bylaw Document (PDF)',
        value: bylawData
      }
    });

    await setting.update({
      value: bylawData,
      category: 'general',
      description: 'Official Cooperative Bylaw Document (PDF)'
    });

    // Log Activity
    try {
      await ActivityLog.create({
        user_id: req.user.id,
        user_name: req.user.name,
        user_role: req.user.role,
        action: 'UPLOAD_BYLAW',
        resource_type: 'BYLAW',
        resource_id: setting.id,
        description: `Uploaded cooperative bylaw: ${req.file.originalname} (${Math.round(req.file.size / 1024)} KB)`,
        ip_address: req.ip,
        tenant_id: tenantId
      });
    } catch (logErr) {
      console.warn('Notice logging bylaw activity:', logErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Cooperative bylaw uploaded successfully',
      bylaw: bylawData
    });

  } catch (error) {
    console.error('Error uploading cooperative bylaw:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload cooperative bylaw'
    });
  }
};

/**
 * Get current cooperative bylaw details
 */
const getBylaw = async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenant_id || req.headers['x-tenant-id'] || 'default';

    const setting = await Settings.findOne({
      where: { key: 'cooperative_bylaw', tenant_id: tenantId }
    });

    if (!setting || !setting.value || !setting.value.url) {
      return res.json({
        success: true,
        bylaw: null,
        message: 'No bylaw uploaded yet'
      });
    }

    res.json({
      success: true,
      bylaw: setting.value
    });
  } catch (error) {
    console.error('Error retrieving cooperative bylaw:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve cooperative bylaw'
    });
  }
};

/**
 * Download cooperative bylaw PDF directly
 */
const downloadBylaw = async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenant_id || req.headers['x-tenant-id'] || 'default';

    const setting = await Settings.findOne({
      where: { key: 'cooperative_bylaw', tenant_id: tenantId }
    });

    if (!setting || !setting.value || !setting.value.url) {
      return res.status(404).json({
        success: false,
        message: 'No cooperative bylaw has been uploaded yet'
      });
    }

    const bylaw = setting.value;
    const filename = path.basename(bylaw.url);
    const filePath = path.join(UPLOADS_BYLAWS_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Bylaw file not found on server'
      });
    }

    const downloadName = bylaw.filename || 'Cooperative_Bylaws.pdf';
    res.setHeader('Content-Type', 'application/pdf');
    res.download(filePath, downloadName);

  } catch (error) {
    console.error('Error downloading bylaw:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download cooperative bylaw'
    });
  }
};

/**
 * Delete cooperative bylaw
 */
const deleteBylaw = async (req, res) => {
  try {
    const userRole = req.user?.role;
    if (!allowedAdminRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete cooperative bylaws'
      });
    }

    const tenantId = req.tenantId || req.user?.tenant_id || req.headers['x-tenant-id'] || 'default';

    const setting = await Settings.findOne({
      where: { key: 'cooperative_bylaw', tenant_id: tenantId }
    });

    if (setting && setting.value && setting.value.url) {
      const filename = path.basename(setting.value.url);
      const filePath = path.join(UPLOADS_BYLAWS_DIR, filename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {}
      }

      await setting.update({ value: null });
    }

    res.json({
      success: true,
      message: 'Cooperative bylaw removed successfully'
    });

  } catch (error) {
    console.error('Error deleting cooperative bylaw:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete cooperative bylaw'
    });
  }
};

module.exports = {
  upload,
  uploadBylaw,
  getBylaw,
  downloadBylaw,
  deleteBylaw
};
