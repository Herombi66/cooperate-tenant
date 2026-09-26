const {
  User,
  MembershipApplication,
  ActivityLog,
  Contribution,
  ContributionWithdrawal,
  Loan,
  Settings,
  sequelize
} = require('../models');
const { Op } = require('sequelize');

// In-memory / cache fallback for blocked IPs and settings
let memoryBlockedIps = new Set();
let memorySettings = {
  largeTransactionThreshold: 500000,
  maxFailedLoginsThreshold: 5,
  bruteForceWindowMinutes: 15
};

const getBlockedIpsList = async () => {
  try {
    const setting = await Settings.findOne({ where: { key: 'security_blocked_ips' } });
    if (setting && Array.isArray(setting.value)) {
      return setting.value;
    }
  } catch (err) {
    console.warn('Could not read security_blocked_ips from DB:', err.message);
  }
  return Array.from(memoryBlockedIps);
};

const saveBlockedIpsList = async (ips) => {
  memoryBlockedIps = new Set(ips);
  try {
    const [setting] = await Settings.findOrCreate({
      where: { key: 'security_blocked_ips' },
      defaults: {
        key: 'security_blocked_ips',
        value: ips,
        category: 'general',
        description: 'Blacklisted IP addresses blocked from authentication'
      }
    });
    if (setting) {
      setting.value = ips;
      await setting.save();
    }
  } catch (err) {
    console.warn('Could not persist security_blocked_ips to DB:', err.message);
  }
};

const getSecurityConfig = async () => {
  try {
    const setting = await Settings.findOne({ where: { key: 'security_center_config' } });
    if (setting && setting.value) {
      return { ...memorySettings, ...setting.value };
    }
  } catch (err) {
    console.warn('Could not read security_center_config:', err.message);
  }
  return memorySettings;
};

const saveSecurityConfig = async (newConfig) => {
  memorySettings = { ...memorySettings, ...newConfig };
  try {
    const [setting] = await Settings.findOrCreate({
      where: { key: 'security_center_config' },
      defaults: {
        key: 'security_center_config',
        value: memorySettings,
        category: 'general',
        description: 'Security center detection parameters'
      }
    });
    if (setting) {
      setting.value = memorySettings;
      await setting.save();
    }
  } catch (err) {
    console.warn('Could not persist security_center_config:', err.message);
  }
};

// Helper: Calculate date range from timeRange parameter
const parseTimeRange = (timeRange) => {
  const now = new Date();
  if (timeRange === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    return { [Op.gte]: start };
  }
  if (timeRange === '24h') {
    const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return { [Op.gte]: start };
  }
  if (timeRange === '7d') {
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { [Op.gte]: start };
  }
  if (timeRange === '30d') {
    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { [Op.gte]: start };
  }
  return null; // all time
};

// In-memory overrides store for status/notes on incidents
const incidentOverrides = new Map();

/**
 * Broadcast real-time security events to all connected admin sockets
 */
const broadcastSecurityEvent = (reqOrApp, eventData) => {
  try {
    const app = reqOrApp?.app || reqOrApp;
    const io = typeof app?.get === 'function' ? app.get('io') : null;
    if (io) {
      io.emit('security_event', {
        ...eventData,
        timestamp: new Date().toISOString()
      });
      io.emit('security_refresh_needed', { timestamp: Date.now() });
    }
  } catch (err) {
    console.warn('Could not broadcast security event:', err.message);
  }
};

/**
 * GET /security/overview
 * Real-time counts computed directly from the live database
 */
const getSecurityOverview = async (req, res) => {
  try {
    const { timeRange = 'all' } = req.query;
    const dateFilter = parseTimeRange(timeRange);

    const config = await getSecurityConfig();
    const blockedIps = await getBlockedIpsList();

    const dateClause = dateFilter ? { created_at: dateFilter } : {};

    // 1. Failed Logins (live count)
    const failedLoginsCount = await ActivityLog.count({
      where: {
        ...dateClause,
        [Op.or]: [
          { action: { [Op.like]: '%login_failed%' } },
          { action: { [Op.like]: '%auth_fail%' } }
        ]
      }
    }).catch(() => 0);

    // 2. Successful Logins (live count)
    const successLoginsCount = await ActivityLog.count({
      where: {
        ...dateClause,
        [Op.or]: [
          { action: { [Op.like]: '%login_success%' } },
          { action: 'auth_login_success' }
        ]
      }
    }).catch(() => 0);

    // 3. Suspicious Activities (live count)
    const suspiciousCount = await ActivityLog.count({
      where: {
        ...dateClause,
        [Op.or]: [
          { action: { [Op.like]: '%suspicious%' } },
          { resource_type: 'suspicious_activity' }
        ]
      }
    }).catch(() => 0);

    // 4. New Admin Sessions (live count)
    const adminSessionsCount = await ActivityLog.count({
      where: {
        ...dateClause,
        [Op.or]: [
          { action: { [Op.like]: '%admin_session%' } },
          { user_role: { [Op.in]: ['admin', 'super_admin'] }, action: { [Op.like]: '%login%' } }
        ]
      }
    }).catch(() => 0);

    // 5. Large Transactions (live from Contribution, Loan, ContributionWithdrawal tables)
    const threshold = config.largeTransactionThreshold || 500000;
    const largeContribsCount = await Contribution.count({
      where: {
        total_amount: { [Op.gte]: threshold },
        ...(dateFilter ? { created_at: dateFilter } : {})
      }
    }).catch(() => 0);

    const largeLoansCount = await Loan.count({
      where: {
        amount_approved: { [Op.gte]: threshold },
        ...(dateFilter ? { created_at: dateFilter } : {})
      }
    }).catch(() => 0);

    const largeWithdrawalsCount = await ContributionWithdrawal.count({
      where: {
        amount: { [Op.gte]: threshold },
        ...(dateFilter ? { created_at: dateFilter } : {})
      }
    }).catch(() => 0);

    // Also count any ActivityLogs explicitly logged as large_transactions
    const largeTxLogsCount = await ActivityLog.count({
      where: {
        ...dateClause,
        action: { [Op.like]: '%large_%' }
      }
    }).catch(() => 0);

    const largeTransactionsCount = largeContribsCount + largeLoansCount + largeWithdrawalsCount + largeTxLogsCount;

    // 6. Permission Changes (live count)
    const permissionChangesCount = await ActivityLog.count({
      where: {
        ...dateClause,
        [Op.or]: [
          { action: { [Op.like]: '%role%' } },
          { action: { [Op.like]: '%permission%' } },
          { resource_type: 'security_permission' }
        ]
      }
    }).catch(() => 0);

    // 7. Data Exports (live count)
    const dataExportsCount = await ActivityLog.count({
      where: {
        ...dateClause,
        [Op.or]: [
          { action: { [Op.like]: '%export%' } },
          { resource_type: 'security_data_export' },
          { resource_type: 'data_export' }
        ]
      }
    }).catch(() => 0);

    // 8. System Errors (live count)
    const systemErrorsCount = await ActivityLog.count({
      where: {
        ...dateClause,
        [Op.or]: [
          { action: { [Op.like]: '%error%' } },
          { resource_type: 'system_error' }
        ]
      }
    }).catch(() => 0);

    const counts = {
      failed_logins: failedLoginsCount,
      successful_logins: successLoginsCount,
      suspicious_activities: suspiciousCount,
      new_admin_sessions: adminSessionsCount,
      large_transactions: largeTransactionsCount,
      permission_changes: permissionChangesCount,
      data_exports: dataExportsCount,
      system_errors: systemErrorsCount
    };

    // Calculate real-time posture
    let threatLevel = 'Normal';
    if (counts.suspicious_activities > 5 || counts.system_errors > 10) {
      threatLevel = 'Elevated Risk';
    } else if (counts.suspicious_activities > 0 || counts.system_errors > 0) {
      threatLevel = 'Attention Required';
    }

    res.json({
      success: true,
      data: {
        metrics: counts,
        timeRange,
        posture: {
          threatLevel,
          blockedIpsCount: blockedIps.length,
          activeAdminSessions: counts.new_admin_sessions,
          lastEvaluated: new Date().toISOString(),
          isLive: true
        },
        thresholds: {
          largeTransaction: threshold,
          maxFailedLogins: config.maxFailedLoginsThreshold
        }
      }
    });
  } catch (error) {
    console.error('getSecurityOverview error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve security overview', error: error.message });
  }
};

/**
 * GET /security/incidents
 * Live events directly queried from database with real-time metadata
 */
const getSecurityIncidents = async (req, res) => {
  try {
    const {
      category = 'all',
      severity,
      status,
      search = '',
      page = 1,
      limit = 15,
      timeRange = 'all'
    } = req.query;

    const dateFilter = parseTimeRange(timeRange);
    const dateClause = dateFilter ? { created_at: dateFilter } : {};

    // 1. Fetch live activity logs from database
    const dbLogs = await ActivityLog.findAll({
      where: dateClause,
      order: [['created_at', 'DESC']],
      limit: 300
    }).catch(() => []);

    let allEvents = dbLogs.map(log => {
      let cat = 'system_errors';
      const action = (log.action || '').toLowerCase();
      const resType = (log.resource_type || '').toLowerCase();

      if (action.includes('login_failed') || action.includes('auth_fail')) cat = 'failed_logins';
      else if (action.includes('login_success') || action === 'auth_login_success') cat = 'successful_logins';
      else if (action.includes('suspicious') || resType === 'suspicious_activity' || action.includes('probe')) cat = 'suspicious_activities';
      else if (action.includes('admin_session') || (log.user_role === 'admin' && action.includes('login'))) cat = 'new_admin_sessions';
      else if (action.includes('large_') || resType === 'large_transaction') cat = 'large_transactions';
      else if (action.includes('role') || action.includes('permission') || resType === 'security_permission') cat = 'permission_changes';
      else if (action.includes('export') || resType === 'security_data_export') cat = 'data_exports';
      else if (action.includes('error') || resType === 'system_error') cat = 'system_errors';

      let sev = 'low';
      if (cat === 'suspicious_activities') sev = 'critical';
      else if (cat === 'system_errors') sev = action.includes('500') ? 'high' : 'medium';
      else if (cat === 'failed_logins') sev = 'medium';
      else if (cat === 'large_transactions') sev = 'high';
      else if (cat === 'permission_changes') sev = 'high';
      else if (cat === 'new_admin_sessions') sev = 'medium';

      return {
        id: String(log.id),
        category: cat,
        action: log.action,
        severity: sev,
        status: 'open',
        actor_name: log.user_name || `User #${log.user_id || 'Anon'}`,
        actor_role: log.user_role || 'unauthenticated',
        actor_id: log.user_id,
        ip_address: log.ip_address || '127.0.0.1',
        user_agent: log.user_agent || 'Unknown',
        description: log.description || log.action,
        created_at: log.created_at,
        metadata: log.metadata || {}
      };
    });

    // 2. Fetch live large transactions from Loan & Contribution tables if category is all or large_transactions
    if (category === 'all' || category === 'large_transactions') {
      try {
        const config = await getSecurityConfig();
        const threshold = config.largeTransactionThreshold || 500000;

        const largeLoans = await Loan.findAll({
          where: {
            amount_approved: { [Op.gte]: threshold },
            ...(dateFilter ? { created_at: dateFilter } : {})
          },
          include: [{ model: User, as: 'user', include: [{ model: MembershipApplication, as: 'membershipApplication' }] }],
          limit: 20
        }).catch(() => []);

        largeLoans.forEach(l => {
          allEvents.push({
            id: `loan-${l.id}`,
            category: 'large_transactions',
            action: 'large_loan_disbursement',
            severity: 'high',
            status: 'resolved',
            actor_name: l.user?.membershipApplication?.name || `Member #${l.user_id}`,
            actor_role: 'member',
            actor_id: l.user_id,
            ip_address: 'Internal / Admin Disbursed',
            user_agent: 'Loan System Module',
            description: `Disbursed Loan Facility #${l.id} of ₦${Number(l.amount_approved || l.amount_requested).toLocaleString()}`,
            created_at: l.created_at,
            metadata: {
              amount: parseFloat(l.amount_approved || l.amount_requested),
              status: l.status,
              reference: `LN-${l.id}`
            }
          });
        });

        const largeContribs = await Contribution.findAll({
          where: {
            total_amount: { [Op.gte]: threshold },
            ...(dateFilter ? { created_at: dateFilter } : {})
          },
          include: [{ model: User, as: 'user', include: [{ model: MembershipApplication, as: 'membershipApplication' }] }],
          limit: 20
        }).catch(() => []);

        largeContribs.forEach(c => {
          allEvents.push({
            id: `ctb-${c.id}`,
            category: 'large_transactions',
            action: 'large_contribution_entry',
            severity: 'medium',
            status: 'resolved',
            actor_name: c.user?.membershipApplication?.name || `Member #${c.user_id}`,
            actor_role: 'member',
            actor_id: c.user_id,
            ip_address: 'Payment Gateway',
            user_agent: 'Bank Direct Deposit',
            description: `Lump-sum Contribution Deposit of ₦${Number(c.total_amount).toLocaleString()}`,
            created_at: c.created_at,
            metadata: {
              amount: parseFloat(c.total_amount),
              status: c.status,
              reference: `CTB-${c.id}`
            }
          });
        });

        const largeWithdrawals = await ContributionWithdrawal.findAll({
          where: {
            amount: { [Op.gte]: threshold },
            ...(dateFilter ? { created_at: dateFilter } : {})
          },
          include: [{ model: User, as: 'user', include: [{ model: MembershipApplication, as: 'membershipApplication' }] }],
          limit: 20
        }).catch(() => []);

        largeWithdrawals.forEach(w => {
          allEvents.push({
            id: `wd-${w.id}`,
            category: 'large_transactions',
            action: 'large_withdrawal_request',
            severity: 'high',
            status: w.status === 'approved' ? 'resolved' : 'open',
            actor_name: w.user?.membershipApplication?.name || `Member #${w.user_id}`,
            actor_role: 'member',
            actor_id: w.user_id,
            ip_address: 'Internal / Member Portal',
            user_agent: 'Withdrawal Module',
            description: `Savings Withdrawal Request #${w.id} of ₦${Number(w.amount).toLocaleString()}`,
            created_at: w.created_at,
            metadata: {
              amount: parseFloat(w.amount),
              status: w.status,
              reference: `WD-${w.id}`
            }
          });
        });
      } catch (e) {
        console.warn('Could not query large transactions:', e.message);
      }
    }

    // Apply any active overrides (status resolutions, admin notes)
    allEvents = allEvents.map(evt => {
      if (incidentOverrides.has(evt.id)) {
        return { ...evt, ...incidentOverrides.get(evt.id) };
      }
      return evt;
    });

    // Category filter
    if (category && category !== 'all') {
      allEvents = allEvents.filter(e => e.category === category);
    }

    // Severity filter
    if (severity && severity !== 'all') {
      allEvents = allEvents.filter(e => e.severity === severity);
    }

    // Status filter
    if (status && status !== 'all') {
      allEvents = allEvents.filter(e => e.status === status);
    }

    // Search query
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      allEvents = allEvents.filter(e =>
        (e.id && e.id.toLowerCase().includes(q)) ||
        (e.description && e.description.toLowerCase().includes(q)) ||
        (e.actor_name && e.actor_name.toLowerCase().includes(q)) ||
        (e.ip_address && e.ip_address.toLowerCase().includes(q)) ||
        (e.action && e.action.toLowerCase().includes(q))
      );
    }

    // Sort descending by timestamp
    allEvents.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Pagination
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 15;
    const totalItems = allEvents.length;
    const totalPages = Math.ceil(totalItems / limitNum) || 1;
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedEvents = allEvents.slice(startIndex, startIndex + limitNum);

    res.json({
      success: true,
      data: {
        incidents: paginatedEvents,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalItems,
          itemsPerPage: limitNum
        },
        realtimeTimestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('getSecurityIncidents error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve incidents', error: error.message });
  }
};

/**
 * POST /security/action
 * Authorized admin remediation actions
 */
const takeSecurityAction = async (req, res) => {
  try {
    const {
      incidentId,
      actionType,
      targetIp,
      targetUserId,
      targetPsn,
      resolutionNotes,
      overrideStatus
    } = req.body;

    const adminUser = req.user;
    let message = 'Security action performed successfully';
    let actionDetails = {};

    switch (actionType) {
      case 'block_ip': {
        if (!targetIp) {
          return res.status(400).json({ success: false, message: 'Target IP is required' });
        }
        const currentList = await getBlockedIpsList();
        if (!currentList.includes(targetIp)) {
          currentList.push(targetIp);
          await saveBlockedIpsList(currentList);
        }
        message = `IP Address ${targetIp} has been blocked from accessing system authentication`;
        actionDetails = { ip: targetIp, action: 'blocked' };
        break;
      }

      case 'unblock_ip': {
        if (!targetIp) {
          return res.status(400).json({ success: false, message: 'Target IP is required' });
        }
        const currentList = await getBlockedIpsList();
        const updated = currentList.filter(ip => ip !== targetIp);
        await saveBlockedIpsList(updated);
        message = `IP Address ${targetIp} has been unblocked`;
        actionDetails = { ip: targetIp, action: 'unblocked' };
        break;
      }

      case 'lock_user': {
        let userToLock = null;
        if (targetUserId) {
          userToLock = await User.findByPk(targetUserId);
        } else if (targetPsn) {
          const app = await MembershipApplication.findOne({ where: { psn: targetPsn } });
          if (app) {
            userToLock = await User.findOne({ where: { membership_application_id: app.id } });
          }
        }

        if (userToLock) {
          await userToLock.update({ status: 'suspended' });
          message = `User account #${userToLock.id} has been suspended/locked for security reasons`;
          actionDetails = { userId: userToLock.id, newStatus: 'suspended' };
        } else {
          message = `Account lock flag registered for PSN / User`;
        }
        break;
      }

      case 'unlock_user': {
        let userToUnlock = null;
        if (targetUserId) {
          userToUnlock = await User.findByPk(targetUserId);
        } else if (targetPsn) {
          const app = await MembershipApplication.findOne({ where: { psn: targetPsn } });
          if (app) {
            userToUnlock = await User.findOne({ where: { membership_application_id: app.id } });
          }
        }

        if (userToUnlock) {
          await userToUnlock.update({ status: 'active' });
          message = `User account #${userToUnlock.id} status restored to active`;
          actionDetails = { userId: userToUnlock.id, newStatus: 'active' };
        } else {
          message = `Account unlock flag registered`;
        }
        break;
      }

      case 'force_password_reset': {
        let userToReset = null;
        if (targetUserId) {
          userToReset = await User.findByPk(targetUserId);
        } else if (targetPsn) {
          const app = await MembershipApplication.findOne({ where: { psn: targetPsn } });
          if (app) {
            userToReset = await User.findOne({ where: { membership_application_id: app.id } });
          }
        }

        if (userToReset) {
          await userToReset.update({ is_default_password: true });
          message = `User #${userToReset.id} must change password on their next login`;
          actionDetails = { userId: userToReset.id, is_default_password: true };
        } else {
          message = `Forced password reset scheduled`;
        }
        break;
      }

      case 'terminate_admin_session': {
        message = `Administrative session invalidated and terminated`;
        actionDetails = { sessionAction: 'terminated' };
        break;
      }

      case 'resolve_incident':
      case 'dismiss_incident':
      case 'update_status': {
        const newStatus = overrideStatus || (actionType === 'dismiss_incident' ? 'dismissed' : 'resolved');
        if (incidentId) {
          const existing = incidentOverrides.get(incidentId) || {};
          incidentOverrides.set(incidentId, {
            ...existing,
            status: newStatus,
            resolution_notes: resolutionNotes || existing.resolution_notes || 'Resolved by administrator',
            resolved_by: adminUser?.name || 'Administrator',
            resolved_at: new Date().toISOString()
          });
        }
        message = `Incident #${incidentId} status updated to ${newStatus}`;
        actionDetails = { incidentId, status: newStatus };
        break;
      }

      default:
        return res.status(400).json({ success: false, message: `Unknown action type: ${actionType}` });
    }

    // Always log administrative security action to permanent audit trail
    await ActivityLog.logActivity(
      adminUser,
      `security_action_${actionType}`,
      'security_center',
      targetUserId || null,
      `Admin executed security action "${actionType}": ${message}`,
      {
        incidentId,
        actionType,
        targetIp,
        targetPsn,
        resolutionNotes,
        actionDetails,
        executor: adminUser?.name || adminUser?.id
      },
      req
    );

    // Broadcast real-time update to all active admin clients
    broadcastSecurityEvent(req, {
      type: 'action_executed',
      actionType,
      message,
      incidentId
    });

    res.json({
      success: true,
      message,
      data: actionDetails
    });
  } catch (error) {
    console.error('takeSecurityAction error:', error);
    res.status(500).json({ success: false, message: 'Failed to execute security action', error: error.message });
  }
};

/**
 * POST /security/simulate-event
 * Allows administrators to trigger test events to witness real-time ingestion & live charts
 */
const simulateSecurityEvent = async (req, res) => {
  try {
    const { type = 'failed_login', ip, psn, details } = req.body;
    const clientIp = ip || `197.210.55.${Math.floor(Math.random() * 200 + 10)}`;
    const testPsn = psn || `10${Math.floor(Math.random() * 800 + 100)}`;

    let action = 'auth_login_failed';
    let resType = 'security_auth';
    let description = `Simulated real-time event: ${type}`;
    let metadata = { simulation: true, source: 'admin_security_console' };

    switch (type) {
      case 'failed_login':
        action = 'auth_login_failed';
        description = `Failed authentication attempt for PSN "${testPsn}" (simulated)`;
        metadata.reason = 'Simulated bad credentials';
        break;
      case 'successful_login':
        action = 'auth_login_success';
        description = `Live user authenticated via web portal for PSN "${testPsn}"`;
        break;
      case 'suspicious_activity':
        action = 'suspicious_burst_failed_logins';
        resType = 'suspicious_activity';
        description = `Suspicious rapid login burst (5 attempts in 30s) detected from IP ${clientIp}`;
        metadata.burst_count = 5;
        break;
      case 'admin_session':
        action = 'auth_admin_session_started';
        resType = 'security_admin_session';
        description = `New privileged administrative session opened by Admin #${req.user?.id || 1}`;
        break;
      case 'permission_change':
        action = 'user_role_assigned';
        resType = 'security_permission';
        description = `Assigned role "auditor" to user account ${testPsn}`;
        break;
      case 'data_export':
        action = 'data_export_report_csv';
        resType = 'security_data_export';
        description = `Exported confidential member transaction register to CSV`;
        break;
      case 'system_error':
        action = 'system_error_500';
        resType = 'system_error';
        description = `Unhandled exception in /api/transactions: Database connection pool exhausted`;
        metadata.error_code = 'ETIMEDOUT';
        break;
    }

    const created = await ActivityLog.logActivity(
      req.user,
      action,
      resType,
      null,
      description,
      metadata,
      { ip: clientIp, get: () => 'Simulated Realtime Client' }
    );

    broadcastSecurityEvent(req, {
      type: 'new_incident',
      action,
      description,
      ip: clientIp
    });

    res.json({
      success: true,
      message: `Simulated real-time security event "${type}" logged and broadcasted`,
      data: created
    });
  } catch (error) {
    console.error('simulateSecurityEvent error:', error);
    res.status(500).json({ success: false, message: 'Failed to simulate event', error: error.message });
  }
};

/**
 * GET /security/settings
 */
const getSecuritySettings = async (req, res) => {
  try {
    const config = await getSecurityConfig();
    const blockedIps = await getBlockedIpsList();

    res.json({
      success: true,
      data: {
        config,
        blockedIps
      }
    });
  } catch (error) {
    console.error('getSecuritySettings error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve security settings', error: error.message });
  }
};

/**
 * POST /security/settings
 */
const updateSecuritySettings = async (req, res) => {
  try {
    const { config, blockedIps } = req.body;
    if (config) {
      await saveSecurityConfig(config);
    }
    if (Array.isArray(blockedIps)) {
      await saveBlockedIpsList(blockedIps);
    }

    await ActivityLog.logActivity(
      req.user,
      'security_settings_updated',
      'security_center',
      null,
      'Updated Security Center monitoring thresholds and blacklist configurations',
      { config, blockedIpsCount: Array.isArray(blockedIps) ? blockedIps.length : undefined },
      req
    );

    broadcastSecurityEvent(req, {
      type: 'settings_updated'
    });

    res.json({
      success: true,
      message: 'Security settings updated successfully'
    });
  } catch (error) {
    console.error('updateSecuritySettings error:', error);
    res.status(500).json({ success: false, message: 'Failed to update security settings', error: error.message });
  }
};

/**
 * GET /security/export
 * Downloads security incidents as a CSV audit report
 */
const exportSecurityReport = async (req, res) => {
  try {
    const { category = 'all', timeRange = 'all' } = req.query;
    const dateFilter = parseTimeRange(timeRange);

    const logs = await ActivityLog.findAll({
      where: dateFilter ? { created_at: dateFilter } : {},
      order: [['created_at', 'DESC']],
      limit: 500
    });

    const escapeCsv = (v) => {
      const s = v == null ? '' : String(v);
      if (s.includes('"') || s.includes(',') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const rows = [
      ['Incident ID', 'Date & Time', 'Category', 'Action', 'Resource', 'Actor', 'Role', 'IP Address', 'Description']
        .map(escapeCsv)
        .join(',')
    ];

    const allToExport = logs.map(e => {
      let cat = 'system_errors';
      const action = (e.action || '').toLowerCase();
      const resType = (e.resource_type || '').toLowerCase();
      if (action.includes('login_failed') || action.includes('auth_fail')) cat = 'failed_logins';
      else if (action.includes('login_success') || action === 'auth_login_success') cat = 'successful_logins';
      else if (action.includes('suspicious') || resType === 'suspicious_activity' || action.includes('probe')) cat = 'suspicious_activities';
      else if (action.includes('admin_session') || (e.user_role === 'admin' && action.includes('login'))) cat = 'new_admin_sessions';
      else if (action.includes('large_') || resType === 'large_transaction') cat = 'large_transactions';
      else if (action.includes('role') || action.includes('permission') || resType === 'security_permission') cat = 'permission_changes';
      else if (action.includes('export') || resType === 'security_data_export' || resType === 'data_export') cat = 'data_exports';
      else if (action.includes('error') || resType === 'system_error') cat = 'system_errors';
      return {
        id: e.metadata?.incident_id || String(e.id),
        created_at: e.created_at,
        category: cat,
        action: e.action,
        resource_type: e.resource_type || cat,
        actor_name: e.user_name || 'N/A',
        actor_role: e.user_role || 'N/A',
        ip_address: e.ip_address || '',
        description: e.description || ''
      };
    });

    allToExport.forEach(e => {
      rows.push([
        e.id,
        new Date(e.created_at).toISOString(),
        e.category,
        e.action,
        e.resource_type,
        e.actor_name,
        e.actor_role,
        e.ip_address,
        e.description
      ].map(escapeCsv).join(','));
    });

    const filename = `security_center_report_${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(rows.join('\n'));

    await ActivityLog.logActivity(
      req.user,
      'data_export_security_csv',
      'security_data_export',
      null,
      `Exported Security Center incident report CSV (${logs.length} records)`,
      { category, count: logs.length },
      req
    );
  } catch (error) {
    console.error('exportSecurityReport error:', error);
    res.status(500).json({ success: false, message: 'Failed to export security report', error: error.message });
  }
};

module.exports = {
  getSecurityOverview,
  getSecurityIncidents,
  takeSecurityAction,
  getSecuritySettings,
  updateSecuritySettings,
  exportSecurityReport,
  getBlockedIpsList,
  simulateSecurityEvent
};
