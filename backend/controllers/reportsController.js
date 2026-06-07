const { User, Contribution, Loan, Expense, ProfitShare, Settings, MembershipApplication, ContributionWithdrawal, LoanRepayment } = require('../models');
const { Op, Sequelize } = require('sequelize');
const { ActivityLog } = require('../models');

const isTransientDbError = (err) => {
  const code = err?.original?.code || err?.parent?.code || err?.code;
  const msg = String(err?.message || '').toLowerCase();
  return (
    code === '40001' ||
    code === '40P01' ||
    code === '57P01' ||
    msg.includes('deadlock') ||
    msg.includes('could not serialize') ||
    msg.includes('timeout') ||
    msg.includes('econnreset') ||
    msg.includes('connection')
  );
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const withRetries = async (fn, attempts = 3) => {
  let lastErr = null;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (!isTransientDbError(e) || i === attempts - 1) throw e;
      await sleep(120 * Math.pow(2, i));
    }
  }
  throw lastErr;
};

const parseDateRange = ({ period, startDate, endDate }) => {
  const hasStart = !!startDate;
  const hasEnd = !!endDate;
  if (hasStart && hasEnd) {
    const from = new Date(String(startDate));
    const to = new Date(String(endDate));
    if (!isNaN(from.getTime()) && !isNaN(to.getTime())) return { from, to };
  }
  if (period && String(period).match(/^\d{4}$/)) {
    const y = parseInt(String(period), 10);
    const from = new Date(y, 0, 1, 0, 0, 0);
    const to = new Date(y, 11, 31, 23, 59, 59, 999);
    return { from, to };
  }
  return null;
};

const monthBucketExpr = (columnName) => {
  const dialect = Contribution?.sequelize?.getDialect ? Contribution.sequelize.getDialect() : null;
  if (dialect === 'postgres') return Sequelize.fn('TO_CHAR', Sequelize.col(columnName), 'YYYY-MM');
  if (dialect === 'sqlite') return Sequelize.fn('strftime', '%Y-%m', Sequelize.col(columnName));
  if (dialect === 'mysql') return Sequelize.fn('DATE_FORMAT', Sequelize.col(columnName), '%Y-%m');
  return Sequelize.fn('TO_CHAR', Sequelize.col(columnName), 'YYYY-MM');
};

const finishReport = async ({ req, res, reportType, report, warnings, startedAt }) => {
  const durationMs = Date.now() - startedAt;
  try {
    res.set('X-Report-Gen-Ms', String(durationMs));
  } catch {}

  const meta = { generated_in_ms: durationMs, warnings: warnings || [] };

  if (req?.user && ActivityLog?.logActivity) {
    try {
      await ActivityLog.logActivity(
        req.user,
        'VIEW_REPORT',
        'report',
        null,
        `Viewed ${reportType} report`,
        { reportType, duration_ms: durationMs, warnings: meta.warnings },
        req
      );
    } catch {}
  }

  return res.json({ success: true, report, meta });
};

const escapeCsv = (v) => {
  const s = v == null ? '' : String(v);
  if (s.includes('"') || s.includes(',') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const sendCsvDownload = ({ res, filename, lines }) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(lines.join('\n'));
};

const tryGetPdfKit = () => {
  try {
    return require('pdfkit');
  } catch {
    return null;
  }
};

// Get financial summary report - FIXED DATA FILTERING
const getFinancialReport = async (req, res) => {
  const startedAt = Date.now();
  const warnings = [];
  try {
    const { period, startDate, endDate } = req.query;
    const range = parseDateRange({ period, startDate, endDate });

    const contributionWhere = { status: 'approved' };
    const expenseWhere = { status: 'paid' };
    const loanWhere = { status: { [Op.in]: ['approved', 'disbursed', 'active', 'waiting_disbursement', 'defaulted'] } };
    const profitWhere = { status: 'paid' };

    if (range) {
      contributionWhere.contribution_date = { [Op.between]: [range.from, range.to] };
      expenseWhere.expense_date = { [Op.between]: [range.from, range.to] };
      loanWhere.application_date = { [Op.between]: [range.from, range.to] };
      profitWhere.created_at = { [Op.between]: [range.from, range.to] };
    }

    const [
      totalMembers,
      newMembers,
      totalContributions,
      savingsContributions,
      investmentContributions,
      targetSavingsContributions,
      totalExpenses,
      totalLoans,
      loansAmount,
      sharesProcessed,
      profitDistributed
    ] = await withRetries(
      async () =>
        Promise.all([
          User.count({ where: { status: 'active' } }),
          range ? User.count({ where: { status: 'active', created_at: { [Op.between]: [range.from, range.to] } } }) : 0,
          Contribution.sum('total_amount', { where: contributionWhere }),
          Contribution.sum('savings', { where: contributionWhere }),
          Contribution.sum('investment', { where: contributionWhere }),
          Contribution.sum('target_saving', { where: contributionWhere }),
          Expense.sum('amount', { where: expenseWhere }),
          Loan.count({ where: loanWhere }),
          Loan.sum('amount_approved', { where: loanWhere }),
          ProfitShare.count({ where: profitWhere }),
          ProfitShare.sum('profit_amount', { where: profitWhere })
        ]),
      3
    );

    const totalContrib = Number(totalContributions || 0);
    const totalExp = Number(totalExpenses || 0);
    const profitGenerated = Math.max(0, totalContrib - totalExp);

    const reportData = {
      period: period || (range ? `${range.from.toISOString()} to ${range.to.toISOString()}` : 'All Time'),
      totalMembers: totalMembers || 0,
      newMembers: newMembers || 0,
      totalContributions: totalContrib,
      savingsContributions: Number(savingsContributions || 0),
      investmentContributions: Number(investmentContributions || 0),
      targetSavingsContributions: Number(targetSavingsContributions || 0),
      totalLoans: totalLoans || 0,
      loansAmount: Number(loansAmount || 0),
      repaidAmount: 0,
      outstandingAmount: 0,
      totalExpenses: totalExp,
      profitGenerated,
      profitDistributed: Number(profitDistributed || 0),
      sharesProcessed: sharesProcessed || 0,
      generatedAt: new Date()
    };

    if (Date.now() - startedAt > 2000) {
      warnings.push('Report generation exceeded 2 seconds. Try filtering by period/date range for faster performance.');
    }

    return await finishReport({ req, res, reportType: 'financial', report: reportData, warnings, startedAt });
  } catch (error) {
    const retryable = isTransientDbError(error);
    console.error('Get financial report error:', error);
    return res.status(500).json({
      success: false,
      message: retryable ? 'Temporary database issue while generating the report. Please retry.' : 'Internal server error',
      retryable,
      error: { message: error?.message || 'Unknown error' }
    });
  }
};

// Get member activity report - SIMPLIFIED VERSION
const getMemberReport = async (req, res) => {
  const startedAt = Date.now();
  const warnings = [];
  try {
    const { period, startDate, endDate } = req.query;
    const range = parseDateRange({ period, startDate, endDate });

    const contributionWhere = { status: 'approved' };
    if (range) {
      contributionWhere.contribution_date = { [Op.between]: [range.from, range.to] };
    }

    const [totalMembers, activeMembers, totalContributions, uniqueContributors] = await withRetries(
      async () =>
        Promise.all([
          User.count(),
          User.count({ where: { status: 'active' } }),
          Contribution.sum('total_amount', { where: contributionWhere }),
          Contribution.count({ distinct: true, col: 'user_id', where: contributionWhere })
        ]),
      3
    );

    const recentWhere = { status: 'approved' };
    if (range) {
      recentWhere.contribution_date = { [Op.between]: [range.from, range.to] };
    }

    const recentContributors = await Contribution.findAll({
      limit: 8,
      order: [['contribution_date', 'DESC'], ['id', 'DESC']],
      include: [
        {
          model: User,
          as: 'user',
          include: [{ model: MembershipApplication, as: 'membershipApplication', attributes: ['name', 'psn'] }],
          attributes: ['id'],
          required: false
        }
      ],
      attributes: ['id', 'total_amount', 'contribution_date'],
      where: recentWhere
    });

    const totalContrib = Number(totalContributions || 0);
    const uniq = Number(uniqueContributors || 0);

    const reportData = {
      period: period || (range ? `${range.from.toISOString()} to ${range.to.toISOString()}` : 'All Time'),
      memberStats: {
        totalMembers: totalMembers || 0,
        activeMembers: activeMembers || 0,
        totalContributions: totalContrib,
        uniqueContributors: uniq,
        averageContribution: uniq > 0 ? totalContrib / uniq : 0,
        contributionRatio: totalMembers > 0 ? ((uniq / totalMembers) * 100).toFixed(1) + '%' : '0%'
      },
      recentContributors: recentContributors.map((contrib) => ({
        memberName: contrib.user?.membershipApplication?.name || 'Unknown',
        memberPSN: contrib.user?.membershipApplication?.psn || 'Unknown',
        amount: contrib.total_amount,
        date: contrib.contribution_date
      })),
      generatedAt: new Date()
    };

    if (Date.now() - startedAt > 2000) {
      warnings.push('Report generation exceeded 2 seconds. Try filtering by period/date range for faster performance.');
    }

    return await finishReport({ req, res, reportType: 'members', report: reportData, warnings, startedAt });
  } catch (error) {
    const retryable = isTransientDbError(error);
    console.error('Get member report error:', error);
    return res.status(500).json({
      success: false,
      message: retryable ? 'Temporary database issue while generating the report. Please retry.' : 'Internal server error',
      retryable,
      error: { message: error?.message || 'Unknown error' }
    });
  }
};

// Get loan portfolio report - PostgreSQL compatible
const getLoanReport = async (req, res) => {
  const startedAt = Date.now();
  const warnings = [];
  try {
    const { period, startDate, endDate, status } = req.query;
    const range = parseDateRange({ period, startDate, endDate });

    const whereLoans = {};
    if (status && String(status).trim() && String(status).toLowerCase() !== 'all') {
      whereLoans.status = String(status).trim();
    }
    if (range) {
      whereLoans.application_date = { [Op.between]: [range.from, range.to] };
    }

    const loanStats = await withRetries(
      async () =>
        Loan.findAll({
          where: whereLoans,
          attributes: [
            'status',
            [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
            [Sequelize.fn('COALESCE', Sequelize.fn('SUM', Sequelize.col('amount_approved')), 0), 'total_amount'],
            [Sequelize.fn('COALESCE', Sequelize.fn('AVG', Sequelize.col('interest_rate')), 0), 'avg_interest']
          ],
          group: ['status'],
          raw: true
        }),
      3
    );

    let monthlyLoans = [];
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const trendFrom = range ? (range.from > sixMonthsAgo ? range.from : sixMonthsAgo) : sixMonthsAgo;
      const trendTo = range ? range.to : new Date();

      monthlyLoans = await Loan.findAll({
        where: {
          ...(status && String(status).toLowerCase() !== 'all' ? { status: String(status).trim() } : {}),
          application_date: { [Op.between]: [trendFrom, trendTo] }
        },
        attributes: [
          [monthBucketExpr('application_date'), 'month'],
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
          [Sequelize.fn('COALESCE', Sequelize.fn('SUM', Sequelize.col('amount_approved')), 0), 'total_amount']
        ],
        group: [monthBucketExpr('application_date')],
        order: [[monthBucketExpr('application_date'), 'ASC']],
        raw: true
      });
    } catch (e) {
      console.error('Monthly loan trends query error:', e);
      warnings.push('Monthly loan trends are temporarily unavailable.');
      monthlyLoans = [];
    }

    const reportData = {
      period: period || (range ? `${range.from.toISOString()} to ${range.to.toISOString()}` : 'All Time'),
      portfolioSummary: loanStats,
      repaymentRate: 0,
      monthlyTrends: monthlyLoans,
      riskAnalysis: { highRisk: [], mediumRisk: [], lowRisk: [] },
      generatedAt: new Date()
    };

    if (Date.now() - startedAt > 2000) {
      warnings.push('Report generation exceeded 2 seconds. Try filtering by period/date range for faster performance.');
    }

    return await finishReport({ req, res, reportType: 'loans', report: reportData, warnings, startedAt });
  } catch (error) {
    const retryable = isTransientDbError(error);
    console.error('Get loan report error:', error);
    return res.status(500).json({
      success: false,
      message: retryable ? 'Temporary database issue while generating the report. Please retry.' : 'Internal server error',
      retryable,
      error: { message: error?.message || 'Unknown error' }
    });
  }
};

// Get expense analysis report - PostgreSQL compatible
const getExpenseReport = async (req, res) => {
  const startedAt = Date.now();
  const warnings = [];
  try {
    const { period, startDate, endDate, category } = req.query;
    const range = parseDateRange({ period, startDate, endDate });

    const whereClause = { status: 'paid' };
    if (category && String(category).toLowerCase() !== 'all') {
      whereClause.category = String(category);
    }
    if (range) {
      whereClause.expense_date = { [Op.between]: [range.from, range.to] };
    }

    const expenseStats = await withRetries(
      async () =>
        Expense.findAll({
          where: whereClause,
          attributes: [
            'category',
            [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
            [Sequelize.fn('COALESCE', Sequelize.fn('SUM', Sequelize.col('amount')), 0), 'total_amount'],
            [Sequelize.fn('COALESCE', Sequelize.fn('AVG', Sequelize.col('amount')), 0), 'avg_amount']
          ],
          group: ['category'],
          raw: true
        }),
      3
    );

    let monthlyExpenses = [];
    try {
      const now = new Date();
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
      const trendFrom = range ? range.from : twelveMonthsAgo;
      const trendTo = range ? range.to : now;

      monthlyExpenses = await Expense.findAll({
        where: {
          ...(category && String(category).toLowerCase() !== 'all' ? { category: String(category) } : {}),
          status: 'paid',
          expense_date: { [Op.between]: [trendFrom, trendTo] }
        },
        attributes: [
          [monthBucketExpr('expense_date'), 'month'],
          'category',
          [Sequelize.fn('COALESCE', Sequelize.fn('SUM', Sequelize.col('amount')), 0), 'total_amount']
        ],
        group: [monthBucketExpr('expense_date'), 'category'],
        order: [[monthBucketExpr('expense_date'), 'ASC']],
        raw: true
      });
    } catch (e) {
      console.error('Monthly expense trends query error:', e);
      warnings.push('Monthly expense trends are temporarily unavailable.');
      monthlyExpenses = [];
    }

    const reportData = {
      period: period || (range ? `${range.from.toISOString()} to ${range.to.toISOString()}` : 'All Time'),
      expenseBreakdown: expenseStats,
      totalExpenses: expenseStats.reduce((sum, exp) => sum + parseFloat(exp.total_amount || 0), 0),
      monthlyTrends: monthlyExpenses,
      topExpenseCategories: [...expenseStats]
        .sort((a, b) => parseFloat(b.total_amount || 0) - parseFloat(a.total_amount || 0))
        .slice(0, 5),
      generatedAt: new Date()
    };

    if (Date.now() - startedAt > 2000) {
      warnings.push('Report generation exceeded 2 seconds. Try filtering by period/date range for faster performance.');
    }

    return await finishReport({ req, res, reportType: 'expenses', report: reportData, warnings, startedAt });
  } catch (error) {
    const retryable = isTransientDbError(error);
    console.error('Get expense report error:', error);
    return res.status(500).json({
      success: false,
      message: retryable ? 'Temporary database issue while generating the report. Please retry.' : 'Internal server error',
      retryable,
      error: { message: error?.message || 'Unknown error' }
    });
  }
};

// Get profit sharing report - SIMPLIFIED VERSION
const getProfitSharingReport = async (req, res) => {
  const startedAt = Date.now();
  const warnings = [];
  try {
    const { period, startDate, endDate } = req.query;
    const range = parseDateRange({ period, startDate, endDate });

    const baseWhere = {};
    if (range) {
      baseWhere.created_at = { [Op.between]: [range.from, range.to] };
    }

    const [totalShares, paidShares, totalProfitDistributed, totalInvestmentPool, uniqueMembers] = await withRetries(
      async () =>
        Promise.all([
          ProfitShare.count({ where: baseWhere }),
          ProfitShare.count({ where: { ...baseWhere, status: 'paid' } }),
          ProfitShare.sum('profit_amount', { where: { ...baseWhere, status: 'paid' } }),
          ProfitShare.sum('total_investment_pool', { where: { ...baseWhere, status: { [Op.in]: ['approved', 'paid'] } } }),
          ProfitShare.count({ distinct: true, col: 'user_id', where: baseWhere })
        ]),
      3
    );

    const recentShares = await ProfitShare.findAll({
      limit: 10,
      order: [['created_at', 'DESC'], ['id', 'DESC']],
      include: [
        {
          model: User,
          as: 'user',
          include: [{ model: MembershipApplication, as: 'membershipApplication', attributes: ['name', 'psn'] }],
          attributes: ['id'],
          required: false
        }
      ],
      attributes: ['id', 'profit_amount', 'status', 'created_at'],
      where: baseWhere
    });

    const totalSharesNum = Number(totalShares || 0);
    const paidSharesNum = Number(paidShares || 0);
    const totalProfitNum = Number(totalProfitDistributed || 0);
    const totalInvestmentNum = Number(totalInvestmentPool || 0);

    const reportData = {
      period: period || (range ? `${range.from.toISOString()} to ${range.to.toISOString()}` : 'All Time'),
      summary: {
        totalShares: totalSharesNum,
        paidShares: paidSharesNum,
        pendingShares: Math.max(0, totalSharesNum - paidSharesNum),
        totalProfitDistributed: totalProfitNum,
        uniqueMembers: Number(uniqueMembers || 0),
        averageProfitPerShare: totalSharesNum > 0 ? totalProfitNum / totalSharesNum : 0
      },
      overallStats: {
        totalProfitDistributed: totalProfitNum,
        totalInvestment: totalInvestmentNum,
        averageReturn: totalInvestmentNum > 0 ? (totalProfitNum / totalInvestmentNum) * 100 : 0,
        memberCount: Number(uniqueMembers || 0)
      },
      recentShares: recentShares.map((share) => ({
        id: share.id,
        memberName: share.user?.membershipApplication?.name || 'Unknown',
        memberPSN: share.user?.membershipApplication?.psn || 'Unknown',
        profitAmount: share.profit_amount,
        status: share.status,
        createdAt: share.created_at
      })),
      generatedAt: new Date()
    };

    if (Date.now() - startedAt > 2000) {
      warnings.push('Report generation exceeded 2 seconds. Try filtering by period/date range for faster performance.');
    }

    return await finishReport({ req, res, reportType: 'profit-sharing', report: reportData, warnings, startedAt });
  } catch (error) {
    const retryable = isTransientDbError(error);
    console.error('Get profit sharing report error:', error);
    return res.status(500).json({
      success: false,
      message: retryable ? 'Temporary database issue while generating the report. Please retry.' : 'Internal server error',
      retryable,
      error: { message: error?.message || 'Unknown error' }
    });
  }
};

// Get compliance and audit report - PostgreSQL compatible
const getComplianceReport = async (req, res) => {
  const startedAt = Date.now();
  const warnings = [];
  try {
    const { period, startDate, endDate } = req.query;
    const range = parseDateRange({ period, startDate, endDate });

    const [totalMembers, membersWithApplications, approvedContributions, pendingContributions, disbursedLoans, paidExpenses, paidProfitShares] =
      await withRetries(
        async () =>
          Promise.all([
            User.count({ where: { status: 'active' } }),
            User.count({
              include: [{ model: MembershipApplication, as: 'membershipApplication', required: true }],
              where: { status: 'active' }
            }),
            Contribution.count({ where: { status: 'approved', ...(range ? { contribution_date: { [Op.between]: [range.from, range.to] } } : {}) } }),
            Contribution.count({
              where: {
                status: { [Op.not]: 'approved' },
                ...(range ? { contribution_date: { [Op.between]: [range.from, range.to] } } : {})
              }
            }),
            Loan.count({
              where: {
                status: { [Op.in]: ['disbursed', 'active', 'defaulted'] },
                ...(range ? { application_date: { [Op.between]: [range.from, range.to] } } : {})
              }
            }),
            Expense.count({ where: { status: 'paid', ...(range ? { expense_date: { [Op.between]: [range.from, range.to] } } : {}) } }),
            ProfitShare.count({ where: { status: 'paid', ...(range ? { created_at: { [Op.between]: [range.from, range.to] } } : {}) } })
          ]),
        3
      );

    const reportData = {
      period: period || (range ? `${range.from.toISOString()} to ${range.to.toISOString()}` : 'All Time'),
      complianceStatus: {
        membershipApplications: membersWithApplications === totalMembers ? 'PASS' : 'REVIEW',
        contributionApprovals: pendingContributions === 0 ? 'PASS' : 'REVIEW',
        loanDisbursements: 'PASS',
        expensePayments: 'PASS',
        profitDistribution: 'PASS'
      },
      auditTrail: {
        totalActivities: 0,
        lastActivityDate: null,
        userActivitySummary: []
      },
      riskIndicators: {
        high: pendingContributions > 10,
        medium: pendingContributions > 5,
        low: pendingContributions <= 5
      },
      recommendations: [
        pendingContributions > 0 ? 'Review pending contributions for approval' : 'All contributions are approved',
        membersWithApplications < totalMembers ? 'Some members need membership applications' : 'All active members have applications'
      ].filter(Boolean),
      generatedAt: new Date()
    };

    if (Date.now() - startedAt > 2000) {
      warnings.push('Report generation exceeded 2 seconds. Try filtering by period/date range for faster performance.');
    }

    return await finishReport({ req, res, reportType: 'compliance', report: reportData, warnings, startedAt });
  } catch (error) {
    const retryable = isTransientDbError(error);
    console.error('Get compliance report error:', error);
    return res.status(500).json({
      success: false,
      message: retryable ? 'Temporary database issue while generating the report. Please retry.' : 'Internal server error',
      retryable,
      error: { message: error?.message || 'Unknown error' }
    });
  }
};

const getFinancialTrackingReport = async (req, res) => {
  const startedAt = Date.now();
  const warnings = [];
  try {
    const { period, startDate, endDate } = req.query;
    const range = parseDateRange({ period, startDate, endDate });

    const dateFilterUsers = range ? { created_at: { [Op.between]: [range.from, range.to] } } : {};
    const dateFilterContribs = range ? { contribution_date: { [Op.between]: [range.from, range.to] } } : {};
    const periodFilterProfit = period && String(period).match(/^\d{4}$/) ? { period: { [Op.like]: `${period}-%` } } : {};

    const settingsKeys = [
      'reserve_fund_percentage',
      'education_fund_percentage',
      'committee_bonus_percentage',
      'bad_debt_reserve_percentage',
      'general_reserve_percentage',
      'registration_fee',
      'monthly_admin_fee'
    ];

    const settingsRows = await withRetries(
      async () =>
        Settings.findAll({
          where: { key: { [Op.in]: settingsKeys } }
        }),
      3
    );

    const settingsMap = {};
    settingsRows.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    const reservePct = parseFloat(settingsMap['reserve_fund_percentage'] ?? 10);
    const educationPct = parseFloat(settingsMap['education_fund_percentage'] ?? 5);
    const committeePct = parseFloat(settingsMap['committee_bonus_percentage'] ?? 5);
    const badDebtPct = parseFloat(settingsMap['bad_debt_reserve_percentage'] ?? 3.5);
    const generalPct = parseFloat(settingsMap['general_reserve_percentage'] ?? 2.8);
    const registrationFee = parseFloat(settingsMap['registration_fee'] ?? 1500);
    const monthlyAdminFee = parseFloat(settingsMap['monthly_admin_fee'] ?? 1000);

    const profitPools = await ProfitShare.findAll({
      where: { status: { [Op.in]: ['approved', 'paid'] }, ...periodFilterProfit },
      attributes: ['period', [Sequelize.fn('MAX', Sequelize.col('total_profit')), 'period_profit']],
      group: ['period'],
      raw: true
    });

    const totalProfit = profitPools.reduce((sum, p) => sum + parseFloat(p.period_profit || 0), 0);
    const reserveFund = (totalProfit * reservePct) / 100;
    const educationFund = (totalProfit * educationPct) / 100;
    const committeeBonus = (totalProfit * committeePct) / 100;
    const badDebtReserve = (totalProfit * badDebtPct) / 100;
    const generalReserve = (totalProfit * generalPct) / 100;

    const activeMembers = await User.count({ where: { status: 'active', ...dateFilterUsers } });

    const dialect = Contribution?.sequelize?.getDialect ? Contribution.sequelize.getDialect() : null;
    const concatExpr =
      dialect === 'postgres'
        ? `CAST("user_id" AS TEXT) || '-' || CAST("month" AS TEXT) || '-' || CAST("year" AS TEXT)`
        : dialect === 'mysql'
          ? `CONCAT(user_id,'-',month,'-',year)`
          : `user_id || '-' || month || '-' || year`;

    const distinctRows = await Contribution.findAll({
      where: { status: 'approved', ...dateFilterContribs },
      attributes: [[Sequelize.fn('COUNT', Sequelize.fn('DISTINCT', Sequelize.literal(concatExpr))), 'cnt']],
      raw: true
    });
    const monthlyFeeCount = parseInt(String(distinctRows?.[0]?.cnt || 0), 10) || 0;

    const registrationFeeTotal = activeMembers * registrationFee;
    const monthlyAdminFeeTotal = monthlyFeeCount * monthlyAdminFee;
    const totalAdminFees = registrationFeeTotal + monthlyAdminFeeTotal;

    const reportData = {
      period: period || (range ? `${range.from.toISOString()} to ${range.to.toISOString()}` : 'All Time'),
      funds: { totalProfit, reserveFund, educationFund, committeeBonus, badDebtReserve, generalReserve },
      adminFees: {
        registrationFeeTotal,
        monthlyAdminFeeTotal,
        totalAdminFees,
        breakdown: {
          activeMembers,
          uniqueContributionMonths: monthlyFeeCount,
          feePerMonth: monthlyAdminFee,
          feePerRegistration: registrationFee
        }
      },
      generatedAt: new Date()
    };

    if (Date.now() - startedAt > 2000) {
      warnings.push('Report generation exceeded 2 seconds. Try filtering by period/date range for faster performance.');
    }

    return await finishReport({ req, res, reportType: 'financial-tracking', report: reportData, warnings, startedAt });
  } catch (error) {
    const retryable = isTransientDbError(error);
    console.error('Get financial tracking report error:', error);
    return res.status(500).json({
      success: false,
      message: retryable ? 'Temporary database issue while generating the report. Please retry.' : 'Internal server error',
      retryable,
      error: { message: error?.message || 'Unknown error' }
    });
  }
};

const getMemberStatementReport = async (req, res) => {
  const startedAt = Date.now();
  const warnings = [];
  try {
    const { psn, user_id, period, startDate, endDate, format } = req.query;
    const normalizedPsn = String(psn || '').trim();
    const requestedUserId = user_id != null ? parseInt(String(user_id), 10) : null;

    if (!normalizedPsn && !requestedUserId) {
      return res.status(400).json({ success: false, message: 'psn or user_id is required' });
    }

    const range = parseDateRange({ period, startDate, endDate });

    const user = await withRetries(async () => {
      if (requestedUserId) {
        return User.findByPk(requestedUserId, {
          include: [{ model: MembershipApplication, as: 'membershipApplication', attributes: ['id', 'psn', 'name', 'email', 'phone', 'facility_name'] }]
        });
      }
      return User.findOne({
        where: { role: 'member' },
        include: [{ model: MembershipApplication, as: 'membershipApplication', where: { psn: normalizedPsn }, attributes: ['id', 'psn', 'name', 'email', 'phone', 'facility_name'] }]
      });
    }, 3);

    if (!user || !user.membershipApplication) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    const contribWhere = { user_id: user.id };
    const withdrawalWhere = { user_id: user.id };
    const loanWhere = { user_id: user.id };
    const repaymentWhere = { user_id: user.id };

    if (range) {
      contribWhere.contribution_date = { [Op.between]: [range.from, range.to] };
      withdrawalWhere.created_at = { [Op.between]: [range.from, range.to] };
      loanWhere.application_date = { [Op.between]: [range.from, range.to] };
      const fromDateOnly = range.from.toISOString().slice(0, 10);
      const toDateOnly = range.to.toISOString().slice(0, 10);
      repaymentWhere.repayment_date = { [Op.between]: [fromDateOnly, toDateOnly] };
    }

    const [contributions, withdrawals, loans, repayments] = await withRetries(
      async () =>
        Promise.all([
          Contribution.findAll({ where: contribWhere, order: [['contribution_date', 'ASC'], ['id', 'ASC']] }),
          ContributionWithdrawal.findAll({ where: withdrawalWhere, order: [['created_at', 'ASC'], ['id', 'ASC']] }),
          Loan.findAll({ where: loanWhere, order: [['application_date', 'ASC'], ['id', 'ASC']] }),
          LoanRepayment.findAll({ where: repaymentWhere, order: [['repayment_date', 'ASC'], ['id', 'ASC']] })
        ]),
      3
    );

    const approvedContribSum = contributions
      .filter((c) => String(c.status || '').toLowerCase() === 'approved')
      .reduce((sum, c) => sum + Number(c.total_amount || 0), 0);

    const approvedWithdrawalSum = withdrawals
      .filter((w) => ['approved', 'disbursed'].includes(String(w.status || '').toLowerCase()))
      .reduce((sum, w) => sum + Number(w.amount || 0), 0);

    const contributionBalance = Math.max(0, approvedContribSum - approvedWithdrawalSum);

    const verifiedRepaymentsByLoanId = repayments
      .filter((r) => String(r.status || '').toLowerCase() === 'verified')
      .reduce((acc, r) => {
        const id = Number(r.loan_id);
        acc[id] = (acc[id] || 0) + Number(r.repayment_amount || 0);
        return acc;
      }, {});

    const loanSummaries = loans.map((loan) => {
      const approved = Number(loan.amount_approved || 0);
      const repaid = Number(verifiedRepaymentsByLoanId[Number(loan.id)] || 0);
      const outstanding = Math.max(0, approved - repaid);
      return {
        id: loan.id,
        status: loan.status,
        loan_type: loan.loan_type,
        amount_approved: approved,
        amount_requested: Number(loan.amount_requested || 0),
        interest_rate: Number(loan.interest_rate || 0),
        application_date: loan.application_date,
        approval_date: loan.approval_date,
        disbursement_date: loan.disbursement_date,
        repaid_amount: repaid,
        outstanding_amount: outstanding
      };
    });

    const totalOutstandingLoans = loanSummaries.reduce((sum, l) => sum + Number(l.outstanding_amount || 0), 0);

    const report = {
      period: period || (range ? `${range.from.toISOString()} to ${range.to.toISOString()}` : 'All Time'),
      member: {
        user_id: user.id,
        psn: user.membershipApplication.psn,
        name: user.membershipApplication.name,
        email: user.membershipApplication.email,
        phone: user.membershipApplication.phone || null,
        facility_name: user.membershipApplication.facility_name || null
      },
      balances: {
        total_contributions_approved: approvedContribSum,
        total_withdrawals_approved: approvedWithdrawalSum,
        contribution_balance: contributionBalance,
        total_outstanding_loans: totalOutstandingLoans
      },
      transactions: {
        contributions: contributions.map((c) => ({
          id: c.id,
          contribution_date: c.contribution_date,
          month: c.month,
          year: c.year,
          savings: Number(c.savings || 0),
          investment: Number(c.investment || 0),
          target_saving: Number(c.target_saving || 0),
          total_amount: Number(c.total_amount || 0),
          status: c.status,
          payment_method: c.payment_method,
          notes: c.notes || null,
          created_at: c.created_at
        })),
        withdrawals: withdrawals.map((w) => ({
          id: w.id,
          created_at: w.created_at,
          year: w.year,
          amount: Number(w.amount || 0),
          status: w.status,
          reason: w.reason || null,
          approved_at: w.approved_at || null,
          rejection_reason: w.rejection_reason || null
        })),
        loans: loanSummaries,
        repayments: repayments.map((r) => ({
          id: r.id,
          loan_id: r.loan_id,
          repayment_date: r.repayment_date,
          repayment_amount: Number(r.repayment_amount || 0),
          payment_method: r.payment_method,
          status: r.status,
          recorded_by: r.recorded_by
        }))
      },
      generatedAt: new Date()
    };

    const formatVal = String(format || '').toLowerCase().trim();
    if (formatVal === 'csv') {
      const rows = [];
      rows.push(['timestamp', 'type', 'reference', 'status', 'credit', 'debit', 'notes'].map(escapeCsv).join(','));

      const tx = [];
      for (const c of report.transactions.contributions) {
        tx.push({
          ts: c.contribution_date || c.created_at,
          type: 'contribution',
          ref: `contribution#${c.id}`,
          status: c.status,
          credit: c.total_amount,
          debit: '',
          notes: c.notes || ''
        });
      }
      for (const w of report.transactions.withdrawals) {
        tx.push({
          ts: w.created_at,
          type: 'withdrawal',
          ref: `withdrawal#${w.id}`,
          status: w.status,
          credit: '',
          debit: w.amount,
          notes: w.reason || ''
        });
      }
      for (const l of report.transactions.loans) {
        tx.push({
          ts: l.application_date,
          type: 'loan',
          ref: `loan#${l.id}`,
          status: l.status,
          credit: '',
          debit: l.amount_approved,
          notes: ''
        });
      }
      for (const r of report.transactions.repayments) {
        tx.push({
          ts: r.repayment_date,
          type: 'loan_repayment',
          ref: `repayment#${r.id} loan#${r.loan_id}`,
          status: r.status,
          credit: r.repayment_amount,
          debit: '',
          notes: ''
        });
      }

      tx.sort((a, b) => new Date(a.ts || 0).getTime() - new Date(b.ts || 0).getTime());
      tx.forEach((t) => {
        rows.push([t.ts, t.type, t.ref, t.status, t.credit, t.debit, t.notes].map(escapeCsv).join(','));
      });

      const filename = `member_statement_${report.member.psn}_${new Date().toISOString().slice(0, 10)}.csv`;
      if (Date.now() - startedAt > 2000) warnings.push('Report generation exceeded 2 seconds.');
      await ActivityLog.logActivity(req.user, 'export_member_statement_csv', 'report', null, `Exported member statement CSV for ${report.member.psn}`, { psn: report.member.psn }, req);
      return sendCsvDownload({ res, filename, lines: rows });
    }

    if (formatVal === 'pdf') {
      const Pdf = tryGetPdfKit();
      if (!Pdf) return res.status(500).json({ success: false, message: 'PDF generation is not available' });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="member_statement_${report.member.psn}_${new Date().toISOString().slice(0, 10)}.pdf"`);

      const doc = new Pdf({ margin: 40, size: 'A4' });
      doc.pipe(res);

      doc.fontSize(16).text('Member Account Statement', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`);
      doc.fontSize(10).text(`Period: ${report.period}`);
      doc.moveDown(0.5);
      doc.fontSize(11).text(`Member: ${report.member.name} (${report.member.psn})`);
      doc.fontSize(10).text(`Email: ${report.member.email}`);
      if (report.member.phone) doc.fontSize(10).text(`Phone: ${report.member.phone}`);
      if (report.member.facility_name) doc.fontSize(10).text(`Facility: ${report.member.facility_name}`);
      doc.moveDown(0.8);

      doc.fontSize(12).text('Balances', { underline: true });
      doc.fontSize(10).text(`Total Approved Contributions: ₦${report.balances.total_contributions_approved.toLocaleString()}`);
      doc.fontSize(10).text(`Total Approved Withdrawals: ₦${report.balances.total_withdrawals_approved.toLocaleString()}`);
      doc.fontSize(10).text(`Contribution Balance: ₦${report.balances.contribution_balance.toLocaleString()}`);
      doc.fontSize(10).text(`Total Outstanding Loans: ₦${report.balances.total_outstanding_loans.toLocaleString()}`);
      doc.moveDown(0.8);

      const writeTable = (title, headers, rowsData) => {
        doc.fontSize(12).text(title, { underline: true });
        doc.moveDown(0.3);
        doc.fontSize(9).text(headers.join(' | '));
        doc.moveDown(0.2);
        for (const row of rowsData) {
          if (doc.y > 760) doc.addPage();
          doc.fontSize(9).text(row.join(' | '));
        }
        doc.moveDown(0.6);
      };

      writeTable(
        'Contributions',
        ['Date', 'Total', 'Status', 'Method'],
        report.transactions.contributions.slice(-200).map((c) => [
          c.contribution_date ? new Date(c.contribution_date).toLocaleDateString() : '—',
          `₦${Number(c.total_amount || 0).toLocaleString()}`,
          String(c.status || ''),
          String(c.payment_method || '')
        ])
      );

      writeTable(
        'Withdrawals',
        ['Date', 'Amount', 'Status'],
        report.transactions.withdrawals.slice(-200).map((w) => [
          w.created_at ? new Date(w.created_at).toLocaleDateString() : '—',
          `₦${Number(w.amount || 0).toLocaleString()}`,
          String(w.status || '')
        ])
      );

      writeTable(
        'Loans',
        ['Date', 'Loan', 'Approved', 'Outstanding', 'Status'],
        report.transactions.loans.slice(-200).map((l) => [
          l.application_date ? new Date(l.application_date).toLocaleDateString() : '—',
          `#${l.id}`,
          `₦${Number(l.amount_approved || 0).toLocaleString()}`,
          `₦${Number(l.outstanding_amount || 0).toLocaleString()}`,
          String(l.status || '')
        ])
      );

      writeTable(
        'Loan Repayments',
        ['Date', 'Loan', 'Amount', 'Status'],
        report.transactions.repayments.slice(-200).map((r) => [
          r.repayment_date ? String(r.repayment_date) : '—',
          `#${r.loan_id}`,
          `₦${Number(r.repayment_amount || 0).toLocaleString()}`,
          String(r.status || '')
        ])
      );

      doc.end();
      await ActivityLog.logActivity(req.user, 'export_member_statement_pdf', 'report', null, `Exported member statement PDF for ${report.member.psn}`, { psn: report.member.psn }, req);
      return;
    }

    if (Date.now() - startedAt > 2000) warnings.push('Report generation exceeded 2 seconds.');
    return await finishReport({ req, res, reportType: 'member-statement', report, warnings, startedAt });
  } catch (error) {
    const retryable = isTransientDbError(error);
    console.error('Get member statement report error:', error);
    return res.status(500).json({
      success: false,
      message: retryable ? 'Temporary database issue while generating the report. Please retry.' : 'Internal server error',
      retryable,
      error: { message: error?.message || 'Unknown error' }
    });
  }
};

const getGeneralLedgerReport = async (req, res) => {
  const startedAt = Date.now();
  const warnings = [];
  try {
    const { period, startDate, endDate, format } = req.query;
    const range = parseDateRange({ period, startDate, endDate });

    const contribWhere = { status: 'approved' };
    const withdrawalWhere = { status: { [Op.in]: ['approved', 'disbursed'] } };
    const loanWhere = { status: { [Op.in]: ['disbursed', 'active', 'defaulted', 'approved', 'waiting_disbursement'] } };
    const repaymentWhere = { status: 'verified' };
    const expenseWhere = { status: 'paid' };

    if (range) {
      contribWhere.contribution_date = { [Op.between]: [range.from, range.to] };
      withdrawalWhere.created_at = { [Op.between]: [range.from, range.to] };
      loanWhere.application_date = { [Op.between]: [range.from, range.to] };
      expenseWhere.expense_date = { [Op.between]: [range.from, range.to] };
      const fromDateOnly = range.from.toISOString().slice(0, 10);
      const toDateOnly = range.to.toISOString().slice(0, 10);
      repaymentWhere.repayment_date = { [Op.between]: [fromDateOnly, toDateOnly] };
    }

    const [totalContributions, totalWithdrawals, totalLoanApproved, totalLoanRepayments, totalExpenses] = await withRetries(
      async () =>
        Promise.all([
          Contribution.sum('total_amount', { where: contribWhere }),
          ContributionWithdrawal.sum('amount', { where: withdrawalWhere }),
          Loan.sum('amount_approved', { where: loanWhere }),
          LoanRepayment.sum('repayment_amount', { where: repaymentWhere }),
          Expense.sum('amount', { where: expenseWhere })
        ]),
      3
    );

    const report = {
      period: period || (range ? `${range.from.toISOString()} to ${range.to.toISOString()}` : 'All Time'),
      totals: {
        contributions: Number(totalContributions || 0),
        withdrawals: Number(totalWithdrawals || 0),
        loan_approved: Number(totalLoanApproved || 0),
        loan_repayments: Number(totalLoanRepayments || 0),
        expenses: Number(totalExpenses || 0)
      },
      generatedAt: new Date()
    };

    const formatVal = String(format || '').toLowerCase().trim();
    if (formatVal === 'csv') {
      const lines = [];
      lines.push(['period', 'contributions', 'withdrawals', 'loan_approved', 'loan_repayments', 'expenses'].map(escapeCsv).join(','));
      lines.push(
        [
          report.period,
          report.totals.contributions,
          report.totals.withdrawals,
          report.totals.loan_approved,
          report.totals.loan_repayments,
          report.totals.expenses
        ]
          .map(escapeCsv)
          .join(',')
      );
      const filename = `general_ledger_${new Date().toISOString().slice(0, 10)}.csv`;
      await ActivityLog.logActivity(req.user, 'export_general_ledger_csv', 'report', null, 'Exported general ledger CSV', { period: report.period }, req);
      return sendCsvDownload({ res, filename, lines });
    }

    if (Date.now() - startedAt > 2000) warnings.push('Report generation exceeded 2 seconds.');
    return await finishReport({ req, res, reportType: 'general-ledger', report, warnings, startedAt });
  } catch (error) {
    const retryable = isTransientDbError(error);
    console.error('Get general ledger report error:', error);
    return res.status(500).json({
      success: false,
      message: retryable ? 'Temporary database issue while generating the report. Please retry.' : 'Internal server error',
      retryable,
      error: { message: error?.message || 'Unknown error' }
    });
  }
};

module.exports = {
  getFinancialReport,
  getMemberReport,
  getLoanReport,
  getExpenseReport,
  getProfitSharingReport,
  getComplianceReport,
  getFinancialTrackingReport,
  getMemberStatementReport,
  getGeneralLedgerReport
};
