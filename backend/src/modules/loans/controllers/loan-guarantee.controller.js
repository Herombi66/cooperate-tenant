/**
 * Loan Guarantee Controller
 * Handles guarantor validation, guarantee requests, and responses.
 */
const { Loan, User, MembershipApplication, ActivityLog } = require('../../../../models');
const { sequelize } = require('../../../../db/connection');
const { Op } = require('sequelize');

const validateGrantor = async (req, res) => {
  try {
    const { psn } = req.body;
    const applicantId = req.user.id;

    if (!psn) {
      return res.status(400).json({ success: false, message: 'PSN is required', code: 'PSN_REQUIRED' });
    }

    const psnRegex = /^[A-Za-z0-9_]{3,20}$/;
    if (!psnRegex.test(psn)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid PSN format. Must be 3-20 alphanumeric characters.', 
        code: 'INVALID_FORMAT',
        expected_pattern: '^[A-Za-z0-9_]{3,20}$'
      });
    }

    const grantorApplication = await MembershipApplication.findOne({
      where: { psn },
      include: [{ model: User, as: 'user', required: false }]
    });

    if (!grantorApplication) {
       return res.status(404).json({ success: false, message: 'PSN not found in system.', code: 'PSN_NOT_FOUND' });
    }

    const grantorUser = grantorApplication.user;
    if (!grantorUser) {
        return res.status(404).json({ success: false, message: 'User account associated with this PSN not found.', code: 'USER_NOT_FOUND' });
    }

    if (grantorUser.id === applicantId) {
        return res.status(400).json({ success: false, message: 'You cannot be your own grantor.', code: 'SELF_GRANTOR' });
    }

    if (grantorUser.status !== 'active') {
        return res.status(400).json({ success: false, message: 'Grantor account is not active.', code: 'GRANTOR_INACTIVE' });
    }

    const defaultedLoans = await Loan.count({
        where: { user_id: grantorUser.id, status: 'defaulted' }
    });

    if (defaultedLoans > 0) {
        return res.status(400).json({ success: false, message: 'Grantor is not eligible due to defaulted loans.', code: 'GRANTOR_RESTRICTED' });
    }

    await ActivityLog.logActivity(
        req.user, 'validate_grantor', 'loan', null,
        `Validated grantor PSN: ${psn} - Success`,
        { psn, grantor_id: grantorUser.id }, req
    );

    return res.json({ 
        success: true, 
        message: 'Grantor is valid.',
        grantor: {
            name: grantorApplication.name,
            psn: grantorApplication.psn,
            email: grantorApplication.email,
            phone: grantorApplication.phone
        }
    });

  } catch (error) {
    console.error('Validate grantor error:', error);
    try {
        await ActivityLog.logActivity(
            req.user, 'validate_grantor_error', 'loan', null,
            `Validation failed for PSN: ${req.body.psn}`,
            { error: error.message }, req
        );
    } catch (logError) {
        console.error('Failed to log validation error:', logError);
    }
    res.status(500).json({ success: false, message: 'Server error during validation' });
  }
};

const respondToGuaranteeRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; 
        console.log(`📝 Responding to guarantee request: Loan ${id}, Status ${status}, User ${req.user.id}`);
        
        const loan = await Loan.findByPk(id);
        if (!loan) {
            console.warn(`⚠️ Loan ${id} not found for guarantee response`);
            return res.status(404).json({ success: false, message: 'Loan not found' });
        }
        
        const user = await User.findByPk(req.user.id, { include: [{ model: MembershipApplication, as: 'membershipApplication' }] });
        if (user && user.membershipApplication && loan.guarantor_psn !== user.membershipApplication.psn) {
             console.warn(`⛔ User ${req.user.id} (PSN ${user.membershipApplication.psn}) tried to respond to guarantee for Loan ${id} (Guarantor PSN ${loan.guarantor_psn})`);
             return res.status(403).json({ success: false, message: 'Unauthorized: You are not the guarantor' });
        }

        await loan.update({ 
            guarantor_approved: status === 'approved',
            guarantor_response_date: new Date(),
            guarantor_response_notes: req.body.notes || ''
        });
        
        console.log(`✅ Guarantee response recorded for Loan ${id}`);
        res.json({ success: true, message: 'Response recorded' });
    } catch (error) {
        console.error('❌ Error responding to guarantee request:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getGuaranteeRequests = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, { include: [{ model: MembershipApplication, as: 'membershipApplication' }] });
        if (!user || !user.membershipApplication) {
            console.log(`⚠️ Guarantee requests: User ${req.user.id} has no membership application`);
            return res.json({ success: true, requests: [], guarantee_requests: [] });
        }
        
        const psn = user.membershipApplication.psn;
        console.log(`🔍 Checking guarantee requests for PSN: ${psn}`);
        
        const requests = await Loan.findAll({ 
            where: { guarantor_psn: psn },
            order: [['application_date', 'DESC'], ['id', 'DESC']],
            include: [{
                model: User, as: 'user',
                include: [{ model: MembershipApplication, as: 'membershipApplication' }]
            }]
        });
        
        console.log(`✅ Found ${requests.length} guarantee requests for PSN ${psn}`);
        res.json({ success: true, requests, guarantee_requests: requests });
    } catch (error) {
        console.error('❌ Error getting guarantee requests:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getGuaranteeSummary = async (req, res) => {
    try {
        const allowedRoles = ['admin', 'super_admin', 'treasurer', 'chairman', 'secretary'];
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Access denied. Only admins can view guarantee summary.' });
        }

        const rows = await Loan.findAll({
            attributes: [
                'guarantor_psn',
                [sequelize.fn('COUNT', sequelize.col('id')), 'open_requests']
            ],
            where: {
                guarantor_psn: { [Op.ne]: null },
                guarantor_approved: null,
                status: 'pending'
            },
            group: ['guarantor_psn'],
            order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']]
        });

        const summary = rows.map(row => {
            const plain = row.toJSON();
            return {
                guarantor_psn: plain.guarantor_psn,
                open_requests: parseInt(plain.open_requests, 10) || 0
            };
        });

        res.json({ success: true, summary });
    } catch (error) {
        console.error('❌ Error getting guarantee summary:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = {
  validateGrantor,
  respondToGuaranteeRequest,
  getGuaranteeRequests,
  getGuaranteeSummary
};
