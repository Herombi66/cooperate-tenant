const BaseLoanStrategy = require('./base-loan.strategy');

class ConventionalLoanStrategy extends BaseLoanStrategy {
  validateLimits(loanType, amount, totalSavings, totalInvestment) {
    const totalContributions = totalSavings + totalInvestment;
    const ts = this.tenantSettings || {};
    const sym = ts.currency_symbol || '₦';
    const multiplier = ts.investment_loan_multiplier ?? 3;
    const maxLoanOverall = ts.max_loan_amount ?? 1000000;

    if (amount > maxLoanOverall) {
      throw new Error(`Loan amount cannot exceed cooperative maximum limit of ${sym}${maxLoanOverall.toLocaleString()}`);
    }

    const maxLoan = totalContributions * multiplier;
    if (amount > maxLoan) {
      throw new Error(`Loan amount cannot exceed ${multiplier}x of total savings (${sym}${maxLoan.toLocaleString()})`);
    }
  }

  calculateInterestRate(loanType, amount, tenure) {
    const ts = this.tenantSettings || {};
    const baseRate = ts.loan_interest_rate ?? ts.base_interest_rate ?? 5;
    
    if (loanType === 'emergency') {
      return baseRate + 2;
    }
    return baseRate;
  }

  calculateRepaymentSchedule(amount, tenure, interestRate, disbursementDate) {
    // Amortized or Flat Rate calculation. Using Flat rate for simplicity.
    const interestAmount = amount * (interestRate / 100) * (tenure / 12);
    const totalAmount = amount + interestAmount;
    const monthlyPayment = totalAmount / tenure;

    return {
      principal: amount,
      interestAmount,
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

module.exports = ConventionalLoanStrategy;
