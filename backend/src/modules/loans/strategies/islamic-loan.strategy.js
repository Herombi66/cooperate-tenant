const BaseLoanStrategy = require('./base-loan.strategy');

class IslamicLoanStrategy extends BaseLoanStrategy {
  validateLimits(loanType, amount, totalSavings, totalInvestment) {
    const totalContributions = totalSavings + totalInvestment;
    const ts = this.tenantSettings || {};
    const sym = ts.currency_symbol || '₦';
    const maxCashSetting = ts.max_cash_loan ?? 500000;
    const maxLoanOverall = ts.max_loan_amount ?? 1000000;
    const multiplier = ts.investment_loan_multiplier ?? 3;

    if (amount > maxLoanOverall) {
      throw new Error(`Loan amount cannot exceed cooperative maximum limit of ${sym}${maxLoanOverall.toLocaleString()}`);
    }

    if (loanType === 'cash') {
      const maxCash = Math.min(maxCashSetting, Math.max(totalSavings, totalContributions * 0.5) * multiplier);
      if (amount > maxCash) throw new Error(`Cash loan cannot exceed max limit of ${sym}${maxCash.toLocaleString()}`);
    } else if (loanType === 'venture') {
      const maxVenture = Math.min(maxLoanOverall, Math.max(totalSavings, totalContributions * 0.5, totalInvestment) * multiplier);
      if (amount > maxVenture) throw new Error(`Venture loan cannot exceed max limit of ${sym}${maxVenture.toLocaleString()}`);
    } else if (loanType === 'emergency') {
      const emergencyLimit = 20000;
      if (amount > emergencyLimit) throw new Error(`Emergency loan cannot exceed ${sym}${emergencyLimit.toLocaleString()}`);
    } else if (loanType === 'educational') {
      const basePool = totalInvestment > 0 ? totalInvestment : Math.max(totalSavings, totalContributions * 0.5);
      const maxEducationalLoan = Math.min(maxLoanOverall, basePool * multiplier);
      if (amount > maxEducationalLoan) throw new Error(`Educational loan cannot exceed ${multiplier}x your savings/investment (${sym}${maxEducationalLoan.toLocaleString()})`);
    } else if (loanType === 'investment') {
      const basePool = totalInvestment > 0 ? totalInvestment : Math.max(totalSavings, totalContributions * 0.5);
      const maxInvestmentLoan = Math.min(maxLoanOverall, basePool * multiplier);
      if (amount > maxInvestmentLoan) throw new Error(`Investment loan cannot exceed ${multiplier}x your savings/investment (${sym}${maxInvestmentLoan.toLocaleString()})`);
    }
  }

  calculateInterestRate(loanType, amount, tenure) {
    const ts = this.tenantSettings || {};
    const configuredRate = ts.loan_interest_rate ?? 5;
    // Islamic loans (Murabaha markup / venture profit rate)
    return loanType === 'venture' ? configuredRate : 0;
  }

  calculateRepaymentSchedule(amount, tenure, interestRate, disbursementDate) {
    // Simple principal divided by tenure + markup divided by tenure
    const markup = (amount * (interestRate / 100));
    const totalAmount = amount + markup;
    const monthlyPayment = totalAmount / tenure;
    
    return {
      principal: amount,
      interestAmount: markup,
      totalAmount,
      monthlyPayment,
      schedule: Array.from({ length: tenure }).map((_, i) => ({
        month: i + 1,
        dueDate: new Date(disbursementDate.getTime() + (i + 1) * 30 * 24 * 60 * 60 * 1000),
        amount: monthlyPayment
      }))
    };
  }
}

module.exports = IslamicLoanStrategy;
