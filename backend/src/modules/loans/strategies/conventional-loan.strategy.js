const BaseLoanStrategy = require('./base-loan.strategy');

class ConventionalLoanStrategy extends BaseLoanStrategy {
  validateLimits(loanType, amount, totalSavings, totalInvestment) {
    const totalContributions = totalSavings + totalInvestment;

    // Conventional cooperatives generally have simpler limits (e.g., 200% of total savings)
    const maxLoan = totalContributions * 2;
    if (amount > maxLoan) {
      throw new Error(`Loan amount cannot exceed 200% of total savings (₦${maxLoan.toLocaleString()})`);
    }
  }

  calculateInterestRate(loanType, amount, tenure) {
    // Conventional flat interest rates (e.g. 10% flat rate)
    // Could be dynamic based on tenant settings, hardcoded to 10 for now.
    const baseRate = this.tenantSettings?.base_interest_rate || 10;
    
    if (loanType === 'emergency') {
      return baseRate + 5; // Higher rate for emergency
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
