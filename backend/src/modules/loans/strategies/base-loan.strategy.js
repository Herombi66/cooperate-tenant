class BaseLoanStrategy {
  constructor(tenantSettings) {
    this.tenantSettings = tenantSettings;
  }

  /**
   * Validate loan limits based on contribution history.
   */
  validateLimits(loanType, amount, totalSavings, totalInvestment) {
    throw new Error('Method not implemented.');
  }

  /**
   * Calculate interest rate for the loan.
   */
  calculateInterestRate(loanType, amount, tenure) {
    throw new Error('Method not implemented.');
  }

  /**
   * Calculate monthly repayment schedule.
   */
  calculateRepaymentSchedule(amount, tenure, interestRate, disbursementDate) {
    throw new Error('Method not implemented.');
  }
}

module.exports = BaseLoanStrategy;
