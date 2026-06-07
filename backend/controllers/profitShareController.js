const { ProfitShare, User, Contribution, Settings, Expense } = require('../models');

// Get calculated investment and profit data for a period
const getPeriodData = async (req, res) => {
  try {
    const { period } = req.query;

    if (!period) {
      return res.status(400).json({
        success: false,
        message: 'Period is required'
      });
    }

    // Calculate total investment from member contributions for the given period
    // For quarterly periods like "Q4 2024", we look at annual contributions in that year
    let year, quarter, quarterStr, yearStr;
    if (period.includes(' ')) {
      [quarterStr, yearStr] = period.split(' ');
      quarter = quarterStr.replace('Q', '');
      year = parseInt(yearStr);
    } else if (period.match(/^\d+$/)) {
      // Just a year
      year = parseInt(period);
      quarter = null;
      quarterStr = null;
    } else {
      // Default to current year if format is unrecognized
      year = new Date().getFullYear();
      quarter = null;
      quarterStr = null;
    }

    console.log(`Processing period: "${period}" -> year: ${year}, quarter: ${quarterStr || 'all'}`);

    // Get member investments for the period
    const membersWithInvestments = await User.findAll({
      where: { status: 'active' },
      attributes: ['id'],
      include: [
        {
          model: require('../models/MembershipApplication'),
          as: 'membershipApplication',
          attributes: ['psn', 'name', 'investment'],
          required: true
        },
        {
          model: Contribution,
          as: 'contributions',
          where: {
            status: 'approved',
            year: year
          },
          attributes: ['total_amount', 'investment'],
          required: false
        }
      ]
    });

    // Calculate total investment pool
    let totalInvestmentPool = 0;
    const memberInvestments = [];

    membersWithInvestments.forEach(member => {
      const yearlyContribution30Percent = member.contributions?.reduce((sum, contrib) => {
        return sum + (parseFloat(contrib.total_amount || 0) * 0.3);
      }, 0) || 0;
      
      const shareCapital = parseFloat(member.membershipApplication?.share_capital || 0);
      const totalMemberBase = yearlyContribution30Percent + shareCapital;

      if (totalMemberBase > 0) {
        totalInvestmentPool += totalMemberBase;
        memberInvestments.push({
          user_id: member.id,
          name: member.membershipApplication.name,
          psn: member.membershipApplication.psn,
          amount: totalMemberBase,
          contributionBase: yearlyContribution30Percent,
          shareCapital: shareCapital
        });
      }
    });

    // Calculate total profit (simplified: total contributions - total expenses for the period)
    const totalContributions = await Contribution.sum('total_amount', {
      where: { status: 'approved', year }
    });

    const totalExpenses = await Expense.sum('amount', {
      where: {
        status: 'paid',
        year: year
      }
    });

    const totalProfit = (totalContributions || 0) - (totalExpenses || 0);

    res.json({
      success: true,
      period,
      totalInvestmentPool,
      totalProfit: Math.max(0, totalProfit), // Ensure non-negative
      memberInvestments,
      calculations: {
        totalContributions: totalContributions || 0,
        totalExpenses: totalExpenses || 0,
        memberCountWithInvestments: memberInvestments.length
      }
    });

  } catch (error) {
    console.error('Get period data error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      debug: error.message
    });
  }
};

// Get profit shares with pagination and filtering
const getProfitShares = async (req, res) => {
  try {
    const { page = 1, limit = 10, period, status, user_id } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const whereClause = {};
    if (period) whereClause.period = period;
    if (status) whereClause.status = status;
    if (user_id) whereClause.user_id = parseInt(user_id);

    const profitShares = await ProfitShare.findAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: offset,
      order: [['created_at', 'DESC']],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'role', 'status'],
          include: [{
            model: require('../models/MembershipApplication'),
            as: 'membershipApplication',
            attributes: ['psn', 'name', 'email']
          }]
        },
        {
          model: User,
          as: 'approvedBy',
          attributes: ['id'],
          required: false,
          include: [{
            model: require('../models/MembershipApplication'),
            as: 'membershipApplication',
            attributes: ['name']
          }]
        },
        {
          model: User,
          as: 'paidBy',
          attributes: ['id'],
          required: false,
          include: [{
            model: require('../models/MembershipApplication'),
            as: 'membershipApplication',
            attributes: ['name']
          }]
        }
      ]
    });

    // Get total count
    const totalCount = await ProfitShare.count({ where: whereClause });

    // Format response to match expected structure
    const formattedProfitShares = profitShares.map(profitShare => ({
      ...profitShare.toJSON(),
      user: {
        id: profitShare.user.id,
        name: profitShare.user.membershipApplication?.name || 'Unknown',
        psn: profitShare.user.membershipApplication?.psn,
        email: profitShare.user.membershipApplication?.email,
        role: profitShare.user.role,
        status: profitShare.user.status
      },
      approvedBy: profitShare.approvedBy ? {
        id: profitShare.approvedBy.id,
        name: profitShare.approvedBy.membershipApplication?.name || 'Unknown'
      } : null,
      paidBy: profitShare.paidBy ? {
        id: profitShare.paidBy.id,
        name: profitShare.paidBy.membershipApplication?.name || 'Unknown'
      } : null
    }));

    res.json({
      success: true,
      profitShares: formattedProfitShares,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalCount / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get profit shares error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get profit shares for current user (member view)
const getMyProfitShares = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('🔍 USER ID requesting profit shares:', userId);

    const { period } = req.query;
    const whereClause = { user_id: userId };
    if (period) whereClause.period = period;

    console.log('🔍 WHERE clause:', whereClause);

    // Simplified query without includes for testing
    const profitShares = await ProfitShare.findAll({
      where: whereClause,
      order: [['period', 'DESC'], ['created_at', 'DESC']]
    });

    console.log('✅ Found profit shares:', profitShares.length);
    console.log('✅ Sample profit share:', profitShares[0] || 'None found');

    res.json({
      success: true,
      profitShares
    });

  } catch (error) {
    console.error('❌ Get my profit shares error:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error details:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      debug: error.message
    });
  }
};

// Calculate profit shares for a specific period
const calculateProfitShares = async (req, res) => {
  try {
    const { period, totalProfit, totalInvestmentPool, memberInvestments } = req.body;

    if (!period || !totalProfit || !totalInvestmentPool || !memberInvestments) {
      return res.status(400).json({
        success: false,
        message: 'Period, total profit, total investment pool, and member investments are required'
      });
    }

    const totalProfitAmount = parseFloat(totalProfit);
    const totalInvestmentAmount = parseFloat(totalInvestmentPool);
    const memberInvestmentsData = memberInvestments;

    if (totalProfitAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Total profit must be greater than 0'
      });
    }

    if (totalInvestmentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Total investment pool must be greater than 0'
      });
    }

    if (!Array.isArray(memberInvestmentsData) || memberInvestmentsData.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Member investments data is required and must be an array'
      });
    }

    // Get profit sharing settings
    const settings = await Settings.findOne();
    const reserveFundPercentage = settings?.reserve_fund_percentage || 10;
    const educationFundPercentage = settings?.education_fund_percentage || 5;
    const committeeBonusPercentage = settings?.committee_bonus_percentage || 5;
    const badDebtReservePercentage = settings?.bad_debt_reserve_percentage || 3.5;
    const generalReservePercentage = settings?.general_reserve_percentage || 2.8;

    // Calculate deductions
    const reserveFundDeduction = totalProfitAmount * 0.10; // 10% net profit
    const remainingAfterReserve = totalProfitAmount * 0.90; // 90% net profit
    
    // Percentages of 90% net profit
    const educationFundDeduction = remainingAfterReserve * 0.055;
    const committeeBonusDeduction = remainingAfterReserve * 0.05;
    const badDebtReserveDeduction = remainingAfterReserve * 0.035;
    const charityDeduction = remainingAfterReserve * 0.03;
    const generalReserveDeduction = remainingAfterReserve * 0.02;

    const totalDeductions = reserveFundDeduction + educationFundDeduction + committeeBonusDeduction + badDebtReserveDeduction + charityDeduction + generalReserveDeduction;
    const netProfitForMembers = totalProfitAmount - totalDeductions;
    const totalDeductionPercentage = (totalDeductions / totalProfitAmount) * 100;

    // Check if existing profit shares exist for this period
    const existing = await ProfitShare.count({ where: { period } });
    if (existing > 0) {
      return res.status(400).json({
        success: false,
        message: `Profit shares already calculated for period ${period}`
      });
    }

    // Validate that all members exist and get their details
    const memberIds = memberInvestmentsData.map(mi => mi.user_id);
    const members = await User.findAll({
      where: { id: { [require('sequelize').Op.in]: memberIds } },
      include: [{
        model: require('../models/MembershipApplication'),
        as: 'membershipApplication',
        attributes: ['psn', 'name']
      }]
    });

    if (members.length !== memberInvestmentsData.length) {
      return res.status(400).json({
        success: false,
        message: 'Some users were not found'
      });
    }

    // Calculate and create profit shares for each member
    const createdProfitShares = [];
    const memberMap = members.reduce((map, member) => {
      map[member.id] = member;
      return map;
    }, {});

    for (const memberInvestment of memberInvestmentsData) {
      const userId = memberInvestment.user_id;
      const memberInvestmentAmount = parseFloat(memberInvestment.amount);

      if (memberInvestmentAmount <= 0) continue; // Skip members with no investment

      const sharePercentage = (memberInvestmentAmount / totalInvestmentAmount) * 100;
      
      // Calculate 5% interest on 30% total contribution base
      const contributionBase = parseFloat(memberInvestment.contributionBase || 0);
      const interestPayout = contributionBase * 0.05;
      
      // Calculate dividend based on share proportion
      const dividendPayout = (memberInvestmentAmount / totalInvestmentAmount) * netProfitForMembers;
      
      const profitAmount = interestPayout + dividendPayout;

      const profitShare = await ProfitShare.create({
        user_id: userId,
        period,
        total_investment_pool: totalInvestmentAmount,
        total_profit: totalProfitAmount,
        member_investment: memberInvestmentAmount,
        share_percentage: sharePercentage,
        profit_amount: profitAmount,
        status: 'calculated',
        calculated_at: new Date()
      });

      createdProfitShares.push({
        ...profitShare.toJSON(),
        user: memberMap[userId]
      });
    }

    res.json({
      success: true,
      message: `Profit shares calculated for ${createdProfitShares.length} members`,
      data: {
        period,
        totalInvestmentPool: totalInvestmentAmount,
        totalProfit: totalProfitAmount,
        deductions: totalDeductionPercentage,
        netProfitForMembers,
        memberCount: createdProfitShares.length,
        profitShares: createdProfitShares,
        deductionBreakdown: {
          reserve_fund: reserveFundPercentage,
          education_fund: educationFundPercentage,
          committee_bonus: committeeBonusPercentage,
          bad_debt_reserve: badDebtReservePercentage,
          general_reserve: generalReservePercentage
        }
      }
    });

  } catch (error) {
    console.error('Calculate profit shares error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Approve profit shares
const approveProfitShares = async (req, res) => {
  try {
    const { period, profitShareIds } = req.body;

    if (!period && !profitShareIds) {
      return res.status(400).json({
        success: false,
        message: 'Either period or profitShareIds must be provided'
      });
    }

    const whereClause = { status: 'calculated' };
    if (period) {
      whereClause.period = period;
    } else if (profitShareIds) {
      whereClause.id = { [require('sequelize').Op.in]: profitShareIds };
    }

    const [updatedCount] = await ProfitShare.update({
      status: 'approved',
      approved_at: new Date(),
      approved_by: req.user?.id
    }, {
      where: whereClause
    });

    if (updatedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'No profit shares found to approve'
      });
    }

    res.json({
      success: true,
      message: `${updatedCount} profit shares approved successfully`,
      updatedCount
    });

  } catch (error) {
    console.error('Approve profit shares error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Mark profit shares as paid
const payProfitShares = async (req, res) => {
  try {
    const { profitShareIds } = req.body;

    if (!profitShareIds || !Array.isArray(profitShareIds)) {
      return res.status(400).json({
        success: false,
        message: 'profitShareIds array is required'
      });
    }

    const [updatedCount] = await ProfitShare.update({
      status: 'paid',
      paid_at: new Date(),
      paid_by: req.user?.id
    }, {
      where: {
        id: { [require('sequelize').Op.in]: profitShareIds },
        status: 'approved'
      }
    });

    if (updatedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'No approved profit shares found to mark as paid'
      });
    }

    res.json({
      success: true,
      message: `${updatedCount} profit shares marked as paid successfully`,
      updatedCount
    });

  } catch (error) {
    console.error('Pay profit shares error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get profit sharing statistics
const getProfitShareStats = async (req, res) => {
  try {
    const { period } = req.query;

    const whereClause = {};
    if (period) whereClause.period = period;

    const [totalProfitShared, paidAmount, pendingAmount, memberCount, periodCount] = await Promise.all([
      ProfitShare.sum('profit_amount', { where: { ...whereClause, status: 'paid' } }),
      ProfitShare.sum('profit_amount', { where: { ...whereClause, status: 'approved' } }),
      ProfitShare.sum('profit_amount', { where: { ...whereClause, status: 'calculated' } }),
      ProfitShare.count({ distinct: true, col: 'user_id', where: whereClause }),
      ProfitShare.findAll({
        attributes: ['period'],
        group: ['period'],
        raw: true
      }).then(results => results.length)
    ]);

    res.json({
      success: true,
      stats: {
        total_profit_shared: totalProfitShared || 0,
        paid_amount: paidAmount || 0,
        pending_amount: pendingAmount || 0,
        member_count: memberCount || 0,
        period_count: periodCount || 0
      }
    });

  } catch (error) {
    console.error('Get profit share stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Cancel profit shares
const cancelProfitShares = async (req, res) => {
  try {
    const { profitShareIds, reason } = req.body;

    if (!profitShareIds || !Array.isArray(profitShareIds)) {
      return res.status(400).json({
        success: false,
        message: 'profitShareIds array is required'
      });
    }

    const [updatedCount] = await ProfitShare.update({
      status: 'cancelled',
      notes: reason || null
    }, {
      where: {
        id: { [require('sequelize').Op.in]: profitShareIds },
        status: { [require('sequelize').Op.not]: 'paid' }
      }
    });

    if (updatedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'No cancellable profit shares found'
      });
    }

    res.json({
      success: true,
      message: `${updatedCount} profit shares cancelled successfully`,
      updatedCount
    });

  } catch (error) {
    console.error('Cancel profit shares error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get profit share by ID
const getProfitShareById = async (req, res) => {
  try {
    const { id } = req.params;

    const profitShare = await ProfitShare.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name'],
          include: [{
            model: require('../models/MembershipApplication'),
            as: 'membershipApplication',
            attributes: ['psn', 'name', 'email']
          }]
        },
        {
          model: User,
          as: 'approvedBy',
          attributes: ['id', 'name'],
          required: false
        },
        {
          model: User,
          as: 'paidBy',
          attributes: ['id', 'name'],
          required: false
        }
      ]
    });

    if (!profitShare) {
      return res.status(404).json({
        success: false,
        message: 'Profit share not found'
      });
    }

    res.json({
      success: true,
      profitShare
    });

  } catch (error) {
    console.error('Get profit share by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get distinct periods for dropdown
const getProfitSharePeriods = async (req, res) => {
  try {
    const periods = await ProfitShare.findAll({
      attributes: ['period'],
      group: ['period'],
      order: [['period', 'DESC']],
      raw: true
    });

    res.json({
      success: true,
      periods: periods.map(p => p.period)
    });

  } catch (error) {
    console.error('Get profit share periods error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  getPeriodData,
  getProfitShares,
  getMyProfitShares,
  calculateProfitShares,
  approveProfitShares,
  payProfitShares,
  getProfitShareStats,
  cancelProfitShares,
  getProfitShareById,
  getProfitSharePeriods
};
