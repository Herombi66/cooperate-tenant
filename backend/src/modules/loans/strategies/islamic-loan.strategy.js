const BaseLoanStrategy = require('./base-loan.strategy');

class IslamicLoanStrategy extends BaseLoanStrategy {
  validateLimits(loanType, amount, totalSavings, totalInvestment) {
    const totalContributions = totalSavings + totalInvestment;

    if (loanType === 'cash') {
      const maxCash = Math.min(500000, totalContributions * 0.5 * 3);
      if (amount > maxCash) throw new Error(`Cash loan cannot exceed max limit of ₦${maxCash.toLocaleString()}`);
    } else if (loanType === 'venture') {
      const maxVenture = Math.min(1000000, totalContributions * 0.3 * 10);
      if (amount > maxVenture) throw new Error(`Venture loan cannot exceed max limit of ₦${maxVenture.toLocaleString()}`);
    } else if (loanType === 'emergency') {
      if (amount > 20000) throw new Error(`Emergency loan cannot exceed ₦20,000`);
    } else if (loanType === 'educational') {
      const maxEducationalLoan = totalInvestment * 3;
      if (amount > maxEducationalLoan) throw new Error(`Educational loan cannot exceed 3x your total investment (₦${maxEducationalLoan.toLocaleString()})`);
    } else if (loanType === 'investment') {
      const maxInvestmentLoan = totalInvestment * 3;
      if (amount > maxInvestmentLoan) throw new Error(`Investment loan cannot exceed 3x your total investment (₦${maxInvestmentLoan.toLocaleString()})`);
    }
  }

  calculateInterestRate(loanType, amount, tenure) {
    // Islamic loans (Qard Hasan / Murabaha / Mudarabah)
    // For venture capital, it uses profit sharing instead of interest. 
    // Here we preserve the legacy logic where 'venture' was given a 5% "markup/profit share rate" temporarily.
    return loanType === 'venture' ? 5 : 0;
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
