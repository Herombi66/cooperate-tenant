const loanApplicationService = require('../services/loan-application.service');

const createLoan = async (req, res) => {
  try {
    const { newLoan, riskAssessment } = await loanApplicationService.applyForLoan(
      req.user.id,
      req.body,
      req.files || (req.file ? { payslip: [req.file] } : {}),
      req.user,
      req
    );

    res.json({
      success: true,
      message: 'Loan application submitted',
      loan: newLoan,
      risk_assessment: riskAssessment
    });
  } catch (error) {
    console.error('Create loan error:', error);
    res.status(error.message.includes('not found') ? 404 : 400).json({
      success: false,
      message: error.message,
      error: error.toString()
    });
  }
};

module.exports = {
  createLoan
};
