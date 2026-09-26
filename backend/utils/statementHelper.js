const {
  User,
  MembershipApplication,
  Contribution,
  Loan,
  LoanRepayment,
  ProfitShare,
  ContributionWithdrawal,
  LoanLiquidation,
  sequelize
} = require('../models');
const { Op } = require('sequelize');

const parseDateRange = ({ period, startDate, endDate }) => {
  if (startDate && endDate) {
    const from = new Date(startDate);
    const to = new Date(endDate);
    to.setHours(23, 59, 59, 999);
    if (!isNaN(from.getTime()) && !isNaN(to.getTime())) {
      return { from, to, label: `${startDate} to ${endDate}` };
    }
  }

  const now = new Date();
  if (period === 'this_month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { from, to, label: 'This Month' };
  }
  if (period === 'last_month') {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { from, to, label: 'Last Month' };
  }
  if (period === 'this_quarter') {
    const quarter = Math.floor(now.getMonth() / 3);
    const from = new Date(now.getFullYear(), quarter * 3, 1);
    const to = new Date(now.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59, 999);
    return { from, to, label: 'This Quarter' };
  }
  if (period === 'this_year' || period === 'ytd') {
    const from = new Date(now.getFullYear(), 0, 1);
    const to = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    return { from, to, label: `Year ${now.getFullYear()}` };
  }
  if (period === 'last_year') {
    const from = new Date(now.getFullYear() - 1, 0, 1);
    const to = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
    return { from, to, label: `Year ${now.getFullYear() - 1}` };
  }

  return null;
};

/**
 * Compiles a comprehensive, real-time member account statement ledger
 * containing all financial events (contributions, transfers, withdrawals, disbursements, loans, repayments, liquidations, refunds, dividends).
 */
const getMemberStatementData = async ({ userId, psn, startDate, endDate, period, transaction } = {}) => {
  const normalizedPsn = String(psn || '').trim();
  const requestedUserId = userId != null ? parseInt(String(userId), 10) : null;

  let user = null;
  if (requestedUserId) {
    user = await User.findByPk(requestedUserId, {
      include: [{ model: MembershipApplication, as: 'membershipApplication' }],
      transaction
    });
  } else if (normalizedPsn) {
    user = await User.findOne({
      include: [{
        model: MembershipApplication,
        as: 'membershipApplication',
        where: { psn: normalizedPsn }
      }],
      transaction
    });
  }

  if (!user || user.deleted_at) {
    return null;
  }

  const app = user.membershipApplication || {};
  const dateRange = parseDateRange({ period, startDate, endDate });

  const contribWhere = { user_id: user.id, status: 'approved' };
  const withdrawWhere = { user_id: user.id, status: { [Op.in]: ['approved', 'disbursed'] } };
  const loanWhere = { user_id: user.id, status: { [Op.in]: ['disbursed', 'active', 'completed', 'defaulted'] } };
  const repayWhere = { user_id: user.id, status: 'verified' };
  const profitWhere = { user_id: user.id, status: 'paid' };
  const liqWhere = { member_user_id: user.id };

  if (dateRange) {
    contribWhere.contribution_date = { [Op.between]: [dateRange.from, dateRange.to] };
    withdrawWhere.created_at = { [Op.between]: [dateRange.from, dateRange.to] };
    loanWhere.disbursement_date = { [Op.between]: [dateRange.from, dateRange.to] };
    const fromDateOnly = dateRange.from.toISOString().slice(0, 10);
    const toDateOnly = dateRange.to.toISOString().slice(0, 10);
    repayWhere.repayment_date = { [Op.between]: [fromDateOnly, toDateOnly] };
    profitWhere.paid_at = { [Op.between]: [dateRange.from, dateRange.to] };
    liqWhere.created_at = { [Op.between]: [dateRange.from, dateRange.to] };
  }

  const [contributions, withdrawals, loans, repayments, profits, liquidations] = await Promise.all([
    Contribution.findAll({ where: contribWhere, order: [['contribution_date', 'ASC'], ['id', 'ASC']], transaction }),
    ContributionWithdrawal.findAll({ where: withdrawWhere, order: [['created_at', 'ASC'], ['id', 'ASC']], transaction }),
    Loan.findAll({ where: loanWhere, order: [['created_at', 'ASC'], ['id', 'ASC']], transaction }),
    LoanRepayment.findAll({ where: repayWhere, order: [['repayment_date', 'ASC'], ['id', 'ASC']], transaction }),
    ProfitShare.findAll({ where: profitWhere, order: [['paid_at', 'ASC'], ['id', 'ASC']], transaction }),
    LoanLiquidation.findAll({ where: liqWhere, order: [['created_at', 'ASC'], ['id', 'ASC']], transaction })
  ]);

  const statementEntries = [];

  // 1. Process Contributions & Internal Transfers & Deductions
  contributions.forEach((c) => {
    const rawDate = new Date(c.contribution_date || c.created_at);
    const dateStr = c.contribution_date ? (c.contribution_date.toISOString ? c.contribution_date.toISOString().slice(0, 10) : String(c.contribution_date).slice(0, 10)) : rawDate.toISOString().slice(0, 10);
    const totalAmount = parseFloat(c.total_amount || 0);

    // Case A: Internal Fund Transfer (Move funds between savings, investment, target savings)
    if (c.payment_method === 'internal_transfer' || (c.notes && (c.notes.includes('Transferred from') || c.notes.includes('Fund transfer')))) {
      statementEntries.push({
        id: `ctb-${c.id}`,
        date: dateStr,
        reference: `TRF-${c.id}`,
        category: 'Transfer',
        account: 'Internal Transfer',
        description: c.notes || 'Internal fund transfer between member accounts',
        debit: 0,
        credit: 0,
        status: 'Completed',
        recorded_by: c.user_id ? `User #${c.user_id}` : 'Admin',
        rawDate
      });
      return;
    }

    // Case B: Loan Liquidation Deduction recorded as negative contribution
    if (c.notes && c.notes.includes('Account closure loan liquidation')) {
      statementEntries.push({
        id: `ctb-${c.id}`,
        date: dateStr,
        reference: `LIQ-DED-${c.id}`,
        category: 'Liquidation',
        account: 'Contributions',
        description: c.notes,
        debit: Math.abs(totalAmount),
        credit: 0,
        status: 'Approved',
        recorded_by: c.user_id ? `User #${c.user_id}` : 'Admin',
        rawDate
      });
      return;
    }

    // Case C: Account closure settlement full refund payout
    if (c.notes && c.notes.includes('Account closure full refund')) {
      statementEntries.push({
        id: `ctb-${c.id}`,
        date: dateStr,
        reference: `REF-${c.id}`,
        category: 'Settlement',
        account: 'Contributions',
        description: c.notes,
        debit: Math.abs(totalAmount),
        credit: 0,
        status: 'Approved',
        recorded_by: c.user_id ? `User #${c.user_id}` : 'Admin',
        rawDate
      });
      return;
    }

    // Case D: General negative contribution adjustment
    if (totalAmount < 0) {
      statementEntries.push({
        id: `ctb-${c.id}`,
        date: dateStr,
        reference: `ADJ-${c.id}`,
        category: 'Adjustment',
        account: 'Contributions',
        description: c.notes || 'Contribution balance adjustment',
        debit: Math.abs(totalAmount),
        credit: 0,
        status: 'Approved',
        recorded_by: c.user_id ? `User #${c.user_id}` : 'Admin',
        rawDate
      });
      return;
    }

    // Case E: Standard Approved Contribution
    const parts = [];
    if (Number(c.savings) > 0) parts.push(`Savings: ₦${Number(c.savings).toLocaleString()}`);
    if (Number(c.investment) > 0) parts.push(`Investment: ₦${Number(c.investment).toLocaleString()}`);
    if (Number(c.target_saving) > 0) parts.push(`Target: ₦${Number(c.target_saving).toLocaleString()}`);
    const breakdown = parts.length > 0 ? ` (${parts.join(', ')})` : '';

    statementEntries.push({
      id: `ctb-${c.id}`,
      date: dateStr,
      reference: `CTB-${c.id}`,
      category: 'Contribution',
      account: 'Contributions',
      description: `Member Contribution (Month: ${c.month}/${c.year})${breakdown}${c.payment_method ? ` via ${c.payment_method.replace(/_/g, ' ')}` : ''}`,
      debit: 0,
      credit: totalAmount,
      status: 'Approved',
      recorded_by: c.user_id ? `User #${c.user_id}` : 'Admin',
      rawDate
    });
  });

  // 2. Process Withdrawals and Target Savings Disbursements
  withdrawals.forEach((w) => {
    const rawDate = new Date(w.disbursed_at || w.created_at);
    const dateStr = rawDate.toISOString().slice(0, 10);
    const isTargetDisb = w.withdrawal_type === 'target_savings' || w.is_disbursement || String(w.status).toLowerCase() === 'disbursed';

    if (isTargetDisb) {
      const payoutDetails = w.bank_name ? ` to ${w.bank_name} (${w.account_number || ''})` : '';
      statementEntries.push({
        id: `wth-${w.id}`,
        date: dateStr,
        reference: `TSD-${w.id}`,
        category: 'Disbursement',
        account: 'Target Savings',
        description: `Target Savings Disbursement Payout${payoutDetails}${w.notes ? ` - ${w.notes}` : ''}`,
        debit: parseFloat(w.amount || 0),
        credit: 0,
        status: String(w.status || 'disbursed').toUpperCase(),
        recorded_by: w.approved_by ? `User #${w.approved_by}` : 'Admin',
        rawDate
      });
    } else {
      statementEntries.push({
        id: `wth-${w.id}`,
        date: dateStr,
        reference: `WTH-${w.id}`,
        category: 'Withdrawal',
        account: 'Contributions',
        description: `Contribution Withdrawal - ${w.reason || w.notes || 'Approved withdrawal'}`,
        debit: parseFloat(w.amount || 0),
        credit: 0,
        status: String(w.status || 'approved').toUpperCase(),
        recorded_by: w.approved_by ? `User #${w.approved_by}` : 'Admin',
        rawDate
      });
    }
  });

  // 3. Process Loans and Layyah Top-Ups
  loans.forEach((l) => {
    const rawDate = new Date(l.disbursement_date || l.approval_date || l.created_at);
    const dateStr = rawDate.toISOString().slice(0, 10);
    const basePurpose = l.purpose ? l.purpose.split('|')[0].trim() : '';

    statementEntries.push({
      id: `loan-${l.id}`,
      date: dateStr,
      reference: `DISB-${l.id}`,
      category: 'Loan',
      account: `Loan #${l.id}`,
      description: `Loan Disbursement (#${l.id} - ${String(l.loan_type || 'loan').toUpperCase()})${basePurpose ? ` - ${basePurpose}` : ''}`,
      debit: parseFloat(l.amount_approved || l.amount_requested || 0),
      credit: 0,
      status: String(l.status || 'disbursed').toUpperCase(),
      recorded_by: l.disbursed_by ? `User #${l.disbursed_by}` : 'Treasurer',
      rawDate
    });

    // Check for Layyah facility additions / top-ups on this loan
    if (l.notes) {
      let parsedNotes = null;
      try {
        parsedNotes = typeof l.notes === 'string' ? JSON.parse(l.notes) : l.notes;
      } catch {}

      if (Array.isArray(parsedNotes?.layyah_additions)) {
        parsedNotes.layyah_additions.forEach((addition) => {
          const addDate = new Date(addition.disbursed_at || l.updated_at);
          if (!dateRange || (addDate >= dateRange.from && addDate <= dateRange.to)) {
            statementEntries.push({
              id: `layyah-${addition.layyah_application_id || l.id}-${addDate.getTime()}`,
              date: addDate.toISOString().slice(0, 10),
              reference: `LAYYAH-${addition.layyah_application_id || l.id}`,
              category: 'Layyah Facility',
              account: `Loan #${l.id}`,
              description: addition.group_id
                ? `Layyah Group #${addition.group_id} Allocation (App #${addition.layyah_application_id}): ₦${Number(addition.principal || 0).toLocaleString()} + 10% profit ₦${Number(addition.profit_margin_amount || 0).toLocaleString()} added to loan balance`
                : `Layyah Facility Top-Up (App #${addition.layyah_application_id}): ₦${Number(addition.principal || 0).toLocaleString()} + 10% profit ₦${Number(addition.profit_margin_amount || 0).toLocaleString()} added to loan balance`,
              debit: parseFloat(addition.principal || 0),
              credit: 0,
              status: 'Disbursed',
              recorded_by: 'Admin',
              rawDate: addDate
            });
          }
        });
      }
    }
  });

  // 4. Process Loan Repayments
  repayments.forEach((r) => {
    const rawDate = new Date(r.repayment_date || r.created_at);
    const dateStr = r.repayment_date ? String(r.repayment_date).slice(0, 10) : rawDate.toISOString().slice(0, 10);
    const methodStr = r.payment_method ? r.payment_method.replace(/_/g, ' ') : 'payment';

    statementEntries.push({
      id: `rpm-${r.id}`,
      date: dateStr,
      reference: `RPM-${r.id}`,
      category: 'Repayment',
      account: `Loan #${r.loan_id}`,
      description: `Loan #${r.loan_id} Repayment via ${methodStr}${r.notes ? ` - ${r.notes}` : ''}`,
      debit: 0,
      credit: parseFloat(r.repayment_amount || 0),
      status: String(r.status || 'verified').toUpperCase(),
      recorded_by: r.recorded_by ? `User #${r.recorded_by}` : 'System',
      rawDate
    });
  });

  // 5. Process Profit Dividends
  profits.forEach((p) => {
    const rawDate = new Date(p.paid_at || p.created_at);
    const dateStr = rawDate.toISOString().slice(0, 10);

    statementEntries.push({
      id: `div-${p.id}`,
      date: dateStr,
      reference: `DIV-${p.id}`,
      category: 'Dividend',
      account: 'Profit Share',
      description: `Profit Dividend (${p.period || 'Cooperative Return'})`,
      debit: 0,
      credit: parseFloat(p.profit_amount || 0),
      status: 'PAID',
      recorded_by: p.paid_by ? `User #${p.paid_by}` : 'Treasurer',
      rawDate
    });
  });

  // Sort strictly chronologically
  statementEntries.sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());

  // Calculate sequential running balance
  let runningBalance = 0;
  const ledger = statementEntries.map((entry) => {
    runningBalance = Math.round((runningBalance + entry.credit - entry.debit) * 100) / 100;
    return {
      id: entry.id,
      date: entry.date,
      reference: entry.reference,
      category: entry.category,
      account: entry.account,
      description: entry.description,
      debit: entry.debit,
      credit: entry.credit,
      balance: runningBalance,
      status: entry.status,
      recorded_by: entry.recorded_by
    };
  });

  // Calculate overall financial balances for the member
  const totalApprovedSavings = Math.max(0, parseFloat(await Contribution.sum('savings', { where: { user_id: user.id, status: 'approved' }, transaction }) || 0));
  const totalApprovedInvestment = Math.max(0, parseFloat(await Contribution.sum('investment', { where: { user_id: user.id, status: 'approved' }, transaction }) || 0));
  const totalApprovedTargetSaving = Math.max(0, parseFloat(await Contribution.sum('target_saving', { where: { user_id: user.id, status: 'approved' }, transaction }) || 0));
  const totalTargetWithdrawn = Math.max(0, parseFloat(await ContributionWithdrawal.sum('amount', {
    where: { user_id: user.id, withdrawal_type: 'target_savings', status: { [Op.in]: ['approved', 'disbursed'] } },
    transaction
  }) || 0));
  const netTargetSaving = Math.max(0, Math.round((totalApprovedTargetSaving - totalTargetWithdrawn) * 100) / 100);

  const totalApprovedContribSum = Math.round((totalApprovedSavings + totalApprovedInvestment + totalApprovedTargetSaving) * 100) / 100;
  const totalApprovedWithdrawalSum = Math.max(0, parseFloat(await ContributionWithdrawal.sum('amount', {
    where: { user_id: user.id, status: { [Op.in]: ['approved', 'disbursed'] } },
    transaction
  }) || 0));
  const contributionBalance = Math.max(0, Math.round((totalApprovedContribSum - totalApprovedWithdrawalSum) * 100) / 100);

  // Active Loan & Outstanding Balance
  const allActiveLoans = await Loan.findAll({
    where: { user_id: user.id, status: { [Op.in]: ['disbursed', 'active', 'defaulted'] } },
    transaction
  });

  let totalOutstandingLoans = 0;
  for (const l of allActiveLoans) {
    const target = parseFloat(l.total_repayment || l.amount_approved || l.amount_requested || 0);
    const paid = parseFloat(await LoanRepayment.sum('repayment_amount', {
      where: { loan_id: l.id, status: 'verified' },
      transaction
    }) || 0);
    const rem = Math.max(0, Math.round((target - paid) * 100) / 100);
    totalOutstandingLoans = Math.round((totalOutstandingLoans + rem) * 100) / 100;
  }

  return {
    period: dateRange ? dateRange.label : 'All Time',
    member: {
      user_id: user.id,
      psn: app.psn || 'N/A',
      name: app.name || 'N/A',
      email: app.email || 'N/A',
      phone: app.phone || null,
      facility_name: app.facility_name || null,
      status: user.status
    },
    balances: {
      total_savings: totalApprovedSavings,
      total_investment: totalApprovedInvestment,
      total_target_saving: netTargetSaving,
      total_target_withdrawn: totalTargetWithdrawn,
      total_contributions_approved: totalApprovedContribSum,
      total_withdrawals_approved: totalApprovedWithdrawalSum,
      contribution_balance: contributionBalance,
      total_outstanding_loans: totalOutstandingLoans,
      net_balance: Math.max(0, Math.round((totalApprovedSavings + totalApprovedInvestment + netTargetSaving) * 100) / 100),
      closing_ledger_balance: runningBalance
    },
    statement: ledger,
    generatedAt: new Date()
  };
};

module.exports = {
  parseDateRange,
  getMemberStatementData
};
