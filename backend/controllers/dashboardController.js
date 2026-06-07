const { User, MembershipApplication, Contribution, Loan, Expense, ActivityLog, LoanRepayment, Settings } = require('../models');
const { Op } = require('sequelize');

const WHATSAPP_GROUP_INVITE_URL = 'https://chat.whatsapp.com/KLhdr510SRrIipgOkmzfjC';
const WHATSAPP_GROUP_HEALTH_TTL_MS = Number(process.env.WHATSAPP_GROUP_HEALTH_TTL_MS || 6 * 60 * 60 * 1000);
let whatsappGroupHealthCache = null;

const checkWhatsappGroupInviteHealth = async () => {
  const now = Date.now();
  if (whatsappGroupHealthCache && whatsappGroupHealthCache.expires_at > now) {
    return whatsappGroupHealthCache;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  let status = null;
  let ok = false;
  try {
    let response;
    try {
      response = await fetch(WHATSAPP_GROUP_INVITE_URL, { method: 'HEAD', redirect: 'follow', signal: controller.signal });
    } catch {
      response = await fetch(WHATSAPP_GROUP_INVITE_URL, { method: 'GET', redirect: 'follow', signal: controller.signal });
    }
    status = response?.status ?? null;
    ok = Boolean(response && response.status >= 200 && response.status < 400);
  } catch (e) {
    status = null;
    ok = false;
  } finally {
    clearTimeout(timeout);
  }

  whatsappGroupHealthCache = {
    url: WHATSAPP_GROUP_INVITE_URL,
    ok,
    status,
    checked_at: new Date().toISOString(),
    expires_at: now + WHATSAPP_GROUP_HEALTH_TTL_MS
  };

  return whatsappGroupHealthCache;
};

// Helper to calculate system-wide stats (for Admin, Chairman, Treasurer)
const calculateSystemStats = async () => {
    // Get total active members
    const totalMembers = await User.count({ where: { status: 'active' } });

    // Get active membership applications
    const activeApplications = await MembershipApplication.count({ where: { status: 'pending' } });

    // Get pending loans
    const pendingLoans = await Loan.count({
      where: {
        status: { [Op.in]: ['pending', 'waiting_disbursement', 'approved'] }
      }
    });

    // Get pending expenses
    const pendingExpenses = await Expense.count({
      where: { status: { [Op.in]: ['pending', 'approved'] } }
    });

    // Get total approved contributions
    const totalContributionsResult = await Contribution.sum('total_amount', {
      where: { status: 'approved' }
    });
    const totalContributions = totalContributionsResult || 0;

    // Get current month expenses (approved and paid)
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    const monthlyExpensesResult = await Expense.sum('amount', {
      where: {
        status: 'paid',
        month: currentMonth,
        year: currentYear
      }
    });
    const monthlyExpenses = monthlyExpensesResult || 0;

    // Calculate total reserves (total contributions - total expenses)
    const totalExpensesResult = await Expense.sum('amount', {
      where: { status: 'paid' }
    });
    const totalExpenses = totalExpensesResult || 0;
    const totalReserves = totalContributions - totalExpenses;
    const disbursedTotalResult = await Loan.sum('amount_approved', {
      where: { status: { [Op.in]: ['disbursed', 'active'] } }
    });
    const totalDisbursed = disbursedTotalResult || 0;

    // Mock data for features not yet implemented
    const totalProfitShared = 0; // Would need profit sharing table
    const totalLayyahApplications = 0; // Would need layyah applications table
    const pendingLayyahApplications = 0; // Would need layyah applications table
    const activeLayyahGroups = 0; // Would need layyah groups table

    // Contribution model doesn't have contribution_type field, so set to 0
    const totalWithdrawals = 0;

    const terminationsResult = await MembershipApplication.sum('termination_amount', {
      where: { status: 'terminated' }
    });
    const totalTerminations = terminationsResult || 0;

    const totalIncomeResult = await Contribution.sum('total_amount', {
      where: { status: 'approved' }
    });
    const totalIncome = totalIncomeResult || 0;

    const outstandingLoanBalanceResult = await Loan.sum('amount_approved', {
      where: { status: { [Op.in]: ['disbursed', 'active'] } }
    });
    const outstandingLoanBalance = outstandingLoanBalanceResult || 0;

    return {
      totalMembers,
      totalContributions,
      totalDisbursed,
      pendingLoans,
      totalProfitShared,
      pendingExpenses,
      monthlyExpenses,
      totalReserves,
      activeApplications,
      totalLayyahApplications,
      pendingLayyahApplications,
      activeLayyahGroups,
      totalWithdrawals,
      totalTerminations,
      totalIncome,
      outstandingLoanBalance
    };
};

// Helper to calculate member stats
const calculateMemberStats = async (userId) => {
    // Get total savings (sum of savings field from approved contributions)
    const savingsResult = await Contribution.sum('savings', {
      where: {
        user_id: userId,
        status: 'approved'
      }
    });

    // Get total investment (sum of investment field from approved contributions)
    const investmentResult = await Contribution.sum('investment', {
      where: {
        user_id: userId,
        status: 'approved'
      }
    });

    // Get target savings from user's membership application
    const user = await User.findByPk(userId, {
      include: [{
        model: MembershipApplication,
        as: 'membershipApplication',
        required: false // Changed to false to avoid error if no application
      }]
    });
    const targetSavings = user?.membershipApplication?.target_saving || 200000;

    // Get loan balance (outstanding loan amounts)
    const loans = await Loan.findAll({
      where: { 
        user_id: userId, 
        status: { [Op.in]: ['disbursed', 'active', 'defaulted'] } 
      },
      attributes: ['id', 'amount_approved', 'loan_type', 'total_repayment']
    });

    let loanBalance = 0;
    let totalInvestmentLoans = 0;
    let totalCashLoans = 0;
    let totalPaidLoans = 0;

    for (const loan of loans) {
      const amountApproved = parseFloat(loan.amount_approved) || 0;
      const totalRepayment = parseFloat(loan.total_repayment) || amountApproved;

      // Get total repayments for this loan
      const repaymentResult = await LoanRepayment.sum('repayment_amount', {
        where: { loan_id: loan.id, user_id: userId }
      });
      const totalRepaid = parseFloat(repaymentResult || 0);

      const outstanding = totalRepayment - totalRepaid;
      loanBalance += outstanding;
      totalPaidLoans += totalRepaid;

      if (loan.loan_type === 'investment') {
        totalInvestmentLoans += amountApproved;
      } else if (loan.loan_type === 'cash' || loan.loan_type === 'educational') {
        totalCashLoans += amountApproved;
      }
    }

    // Get monthly savings (current month approved contributions)
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    
    let monthlySavings = 0;
    try {
        const monthlySavingsResult = await Contribution.sum('total_amount', {
            where: {
                user_id: userId,
                status: 'approved',
                month: currentMonth,
                year: currentYear
            }
        });
        monthlySavings = monthlySavingsResult || 0;
    } catch (err) {
        console.warn('⚠️ Could not calculate monthly savings:', err.message);
    }

    // Get pending loans count
    const pendingLoans = await Loan.count({
        where: {
            user_id: userId,
            status: { [Op.in]: ['pending', 'waiting_disbursement', 'approved'] }
        }
    });

    // Get approved loans count
    const approvedLoans = await Loan.count({
        where: {
            user_id: userId,
            status: { [Op.in]: ['disbursed', 'active', 'defaulted'] }
        }
    });

    // Get profit earned (mock)
    const profitEarned = 0;
    const profitShare = 0; // Alias for backward compatibility

    // Get Layyah stats (mock)
    const totalLayyahApplications = 0;
    const activeLayyahGroups = 0;
    const pendingInvitations = 0;

    return {
      totalSavings: savingsResult || 0,
      totalInvestment: investmentResult || 0,
      targetSavings,
      loanBalance,
      totalInvestmentLoans,
      totalCashLoans,
      totalPaidLoans,
      profitEarned,
      profitShare,
      totalLayyahApplications,
      activeLayyahGroups,
      pendingInvitations,
      // Additional fields for MemberStats interface
      totalContributions: (savingsResult || 0) + (investmentResult || 0), // Approx
      pendingLoans,
      approvedLoans,
      monthlySavings,
      investmentBalance: investmentResult || 0
    };
};

// Helper to calculate disbursed stats
const calculateDisbursedStats = async (period = 'last_6_months', loanType = 'all') => {
    const whereClause = {
        status: { [Op.in]: ['disbursed', 'active'] }
    };
    if (loanType && loanType !== 'all') whereClause.loan_type = loanType;
    
    // Date filtering based on period
    const end = new Date();
    if (period === 'this_month') {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        whereClause.disbursement_date = { [Op.between]: [start, nextMonth] };
    } else if (period === 'this_year') {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 1);
        const nextYear = new Date(now.getFullYear() + 1, 0, 1);
        whereClause.disbursement_date = { [Op.between]: [start, nextYear] };
    } else if (period === 'last_6_months') {
        const start = new Date();
        start.setMonth(start.getMonth() - 6);
        whereClause.disbursement_date = { [Op.between]: [start, end] };
    }

    const totalResult = await Loan.sum('amount_approved', { where: whereClause });
    const total = totalResult || 0;
    
    let series = [];
    if (period === 'last_6_months' || period === 'this_year') {
        const sequelize = Loan.sequelize;
        const dialect = sequelize.options.dialect;
        let monthCol;
        
        if (dialect === 'postgres') {
            monthCol = sequelize.fn('TO_CHAR', sequelize.col('disbursement_date'), 'YYYY-MM');
        } else {
            // SQLite or others
            monthCol = sequelize.fn('strftime', '%Y-%m', sequelize.col('disbursement_date'));
        }

        const rows = await Loan.findAll({
            where: whereClause,
            attributes: [
                [monthCol, 'month'],
                [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('amount_approved')), 0), 'total']
            ],
            group: [monthCol],
            order: [[monthCol, 'ASC']],
            raw: true
        });
        series = rows.map(r => ({ month: r.month, total: parseFloat(r.total || 0) }));
    }
    
    return { total_disbursed: total, series };
};

const getAdminStats = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
    const stats = await calculateSystemStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

const getMemberStats = async (req, res) => {
  try {
    const userId = req.params.userId;
    const stats = await calculateMemberStats(userId);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Get member stats error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

const getCurrentUserStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await calculateMemberStats(userId);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Get current user stats error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

const getChairmanStats = async (req, res) => {
  try {
    if (!['chairman', 'secretary', 'admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
    const stats = await calculateSystemStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Get chairman stats error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

const getTreasurerStats = async (req, res) => {
  try {
    if (!['treasurer', 'admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
    const stats = await calculateSystemStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Get treasurer stats error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

const getActivityLogs = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin' && req.user.role !== 'state_auditor') {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
    const { page = 1, limit = 20, resource_type, resource_id, action, user_id } = req.query;
    const offset = (page - 1) * limit;
    const whereClause = {};
    if (resource_type) whereClause.resource_type = resource_type;
    if (resource_id) whereClause.resource_id = resource_id;
    if (action) whereClause.action = action;
    if (user_id) whereClause.user_id = user_id;

    const { count, rows } = await ActivityLog.findAndCountAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    });

    res.json({
      success: true,
      data: {
        logs: rows.map(log => ({
            id: log.id,
            user_id: log.user_id,
            user_name: log.user_name,
            user_role: log.user_role,
            action: log.action,
            resource_type: log.resource_type,
            resource_id: log.resource_id,
            description: log.description,
            created_at: log.created_at,
            metadata: log.metadata, // Include metadata if needed
            user: null
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get activity logs error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

const getUnifiedDashboardData = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.id;
    const { limit = 5 } = req.query;
    
    const responseData = {
        role: userRole
    };

    if (userRole === 'admin' || userRole === 'super_admin') {
        // --- Admin Data ---
        const stats = await calculateSystemStats();
        
        // Expenses
        const expenses = await Expense.findAll({
            limit: parseInt(limit),
            order: [['created_at', 'DESC']]
        });

        // Activity Logs
        // 1. Recent Loans
        const recentLoanLogs = await ActivityLog.findAll({
            where: { resource_type: 'loan' },
            limit: parseInt(limit),
            order: [['created_at', 'DESC']]
        });

        // 2. Recent Member Activities
        const recentMemberLogs = await ActivityLog.findAll({
            where: { resource_type: 'user' },
            limit: parseInt(limit),
            order: [['created_at', 'DESC']]
        });
        
        // 3. General Activity Logs (for initial list)
        const generalLogs = await ActivityLog.findAll({
            limit: 10,
            order: [['created_at', 'DESC']]
        });

        const { disbursedPeriod = 'last_6_months', disbursedType = 'all' } = req.query;
        const disbursedStats = await calculateDisbursedStats(disbursedPeriod, disbursedType);

        responseData.admin = {
            stats,
            expenses,
            recentActivity: {
                loans: recentLoanLogs.map(log => ({
                    id: log.id,
                    description: log.description || 'Loan activity',
                    amount: log.metadata?.amount ? `₦${log.metadata.amount.toLocaleString()}` : '',
                    status: log.action, // Simplified, mapping done in frontend
                    original: log // send full log for flexibility
                })),
                members: recentMemberLogs.map(log => ({
                    id: log.id,
                    description: log.description || 'Member activity',
                    amount: '',
                    status: log.action,
                    original: log
                })),
                all: generalLogs
            },
            disbursedStats
        };
    } else if (userRole === 'committee' || userRole === 'treasurer' || userRole === 'president') {
        const stats = await calculateSystemStats();
        responseData[userRole] = { stats };
    }

    // Fetch active settings to provide dynamically configured limits
    let settingsMap = {};
    try {
        const allSettings = await Settings.findAll();
        for (const setting of allSettings) {
            try {
                settingsMap[setting.key] = JSON.parse(setting.value);
            } catch {
                const num = parseFloat(setting.value);
                settingsMap[setting.key] = isNaN(num) ? setting.value : num;
            }
        }
    } catch (settingsError) {
        console.warn('⚠️ Could not fetch settings:', settingsError.message);
    }

    // --- Member Data (Available for all roles usually, or strictly for members) ---
    // Even admins have personal stats
    const memberStats = await calculateMemberStats(userId);
    
    const contributions = await Contribution.findAll({
        where: { user_id: userId },
        limit: parseInt(limit),
        order: [['created_at', 'DESC']]
    });

    const loans = await Loan.findAll({
        where: { user_id: userId, status: { [Op.in]: ['active', 'disbursed', 'pending', 'waiting_disbursement'] } }
    });
    
    const activeLoan = loans.find(l => l.status === 'disbursed' || l.status === 'active');

    responseData.member = {
        stats: memberStats,
        recentContributions: contributions,
        activeLoan: activeLoan || null,
        loans: loans,
        settings: settingsMap
    };

    res.json({
        success: true,
        data: responseData
    });

  } catch (error) {
    console.error('Get unified dashboard data error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

const trackWhatsappGroupInviteClick = async (req, res) => {
  try {
    await ActivityLog.logActivity(
      req.user,
      'whatsapp_group_invite_click',
      'engagement',
      null,
      'Member clicked WhatsApp group invite link',
      {
        url: WHATSAPP_GROUP_INVITE_URL,
        source: req.body?.source || 'member_dashboard',
        ts: new Date().toISOString()
      },
      req
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Track WhatsApp group invite click error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getWhatsappGroupInviteHealth = async (req, res) => {
  try {
    const health = await checkWhatsappGroupInviteHealth();
    res.json({ success: true, data: { url: health.url, ok: health.ok, status: health.status, checked_at: health.checked_at } });
  } catch (error) {
    console.error('Get WhatsApp group invite health error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = {
  getAdminStats,
  getMemberStats,
  getCurrentUserStats,
  getChairmanStats,
  getTreasurerStats,
  getActivityLogs,
  getUnifiedDashboardData,
  trackWhatsappGroupInviteClick,
  getWhatsappGroupInviteHealth
};
