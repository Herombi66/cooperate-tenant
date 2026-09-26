const fs = require('fs');
const backupService = require('../services/backupService');
const { ActivityLog } = require('../models');

/**
 * List backups with pagination
 */
exports.listBackups = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await backupService.listBackups({ page, limit });
    res.json({
      success: true,
      data: result.backups,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('List backups error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve backups list',
      error: error.message
    });
  }
};

/**
 * Get backup statistics
 */
exports.getStats = async (req, res) => {
  try {
    const stats = await backupService.getBackupStats();
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get backup stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve backup statistics',
      error: error.message
    });
  }
};

/**
 * Create a new system backup
 */
exports.createBackup = async (req, res) => {
  try {
    const { format = 'json', notes = '' } = req.body;

    if (!['json', 'sql'].includes(format.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid backup format. Supported formats are "json" and "sql".'
      });
    }

    const backup = await backupService.createFullBackup({
      format,
      notes,
      user: req.user
    });

    res.status(201).json({
      success: true,
      message: `System backup (${format.toUpperCase()}) created successfully`,
      backup
    });
  } catch (error) {
    console.error('Create backup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create backup',
      error: error.message
    });
  }
};

/**
 * Download a backup file
 */
exports.downloadBackup = async (req, res) => {
  try {
    const { id } = req.params;
    const backup = await backupService.getBackupById(id);

    if (!backup) {
      return res.status(404).json({
        success: false,
        message: 'Backup record not found'
      });
    }

    if (!fs.existsSync(backup.filepath)) {
      return res.status(404).json({
        success: false,
        message: 'Backup file does not exist on disk'
      });
    }

    // Log download activity
    try {
      await ActivityLog.create({
        user_id: req.user?.id || 1,
        action: 'admin_download_backup',
        resource_type: 'system_backup',
        resource_id: backup.id,
        description: `Admin downloaded backup file ${backup.filename}`,
        metadata: { filename: backup.filename, format: backup.format }
      });
    } catch (logErr) {
      console.error('Failed to log backup download activity:', logErr);
    }

    const contentType = backup.format === 'sql' ? 'application/sql' : 'application/json';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${backup.filename}"`);

    res.download(backup.filepath, backup.filename, (err) => {
      if (err && !res.headersSent) {
        console.error('File download error:', err);
        res.status(500).json({ success: false, message: 'Error streaming backup file' });
      }
    });
  } catch (error) {
    console.error('Download backup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download backup',
      error: error.message
    });
  }
};

/**
 * Delete a backup
 */
exports.deleteBackup = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await backupService.deleteBackup(id, req.user);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Backup record not found'
      });
    }

    res.json({
      success: true,
      message: 'Backup deleted successfully'
    });
  } catch (error) {
    console.error('Delete backup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete backup',
      error: error.message
    });
  }
};

/**
 * Export module data as CSV
 */
exports.exportCsv = async (req, res) => {
  try {
    const { module: moduleKey } = req.params;
    const result = await backupService.exportModuleCsv(moduleKey);

    // Log Activity
    try {
      await ActivityLog.create({
        user_id: req.user?.id || 1,
        action: 'admin_export_module_csv',
        resource_type: 'data_export',
        description: `Admin exported ${moduleKey} data to CSV (${result.count} records)`,
        metadata: { module: moduleKey, record_count: result.count }
      });
    } catch (logErr) {
      console.error('Failed to log export activity:', logErr);
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.csvContent);
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to export module data'
    });
  }
};
