const IslamicLoanStrategy = require('./islamic-loan.strategy');
const ConventionalLoanStrategy = require('./conventional-loan.strategy');

class LoanStrategyFactory {
  static getStrategy(tenant, tenantSettings) {
    if (tenant && tenant.cooperative_type === 'conventional') {
      return new ConventionalLoanStrategy(tenantSettings);
    }
    // Default to Islamic as per legacy system behavior
    return new IslamicLoanStrategy(tenantSettings);
  }
}

module.exports = {
  LoanStrategyFactory
};
