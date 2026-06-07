process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret';

const request = require('supertest');
const app = require('../app');
const {
    sequelize,
    User,
    MembershipApplication,
    Loan,
    Contribution,
    LoanRepayment
} = require('../models');
const jwt = require('jsonwebtoken');

describe('Loan Liquidation Endpoint', () => {
    jest.setTimeout(30000);
    let adminToken, userToken, loan, user, admin;
    const useRealDb = process.env.TEST_USE_REAL_DB === 'true';
    const unique = `LIQ_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
    let created = null;

    beforeAll(async () => {
        if (!useRealDb) {
            await sequelize.sync({ force: true });
        } else {
            await sequelize.authenticate();
        }

        const adminMembership = await MembershipApplication.create({
            name: `Admin ${unique}`,
            psn: `ADMIN_${unique}`,
            email: `admin_${unique.toLowerCase()}@test.local`,
            phone: '1234567890',
            facility_name: 'Admin Facility',
            next_of_kin_name: 'Admin NOK',
            next_of_kin_phone: '1234500000',
            status: 'approved'
        });

        admin = await User.create({
            membership_application_id: adminMembership.id,
            password_hash: 'password',
            role: 'admin',
            can_liquidate_loans: true
        });

        adminToken = jwt.sign({ id: admin.id }, 'test_secret');

        const userMembership = await MembershipApplication.create({
            name: `User ${unique}`,
            psn: `USER_${unique}`,
            email: `user_${unique.toLowerCase()}@test.local`,
            phone: '0987654321',
            facility_name: 'User Facility',
            next_of_kin_name: 'User NOK',
            next_of_kin_phone: '0987600000',
            status: 'approved'
        });

        user = await User.create({
            membership_application_id: userMembership.id,
            password_hash: 'password',
            role: 'member'
        });

        userToken = jwt.sign({ id: user.id }, 'test_secret');

        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();

        await Contribution.create({
            user_id: user.id,
            savings: 50000,
            investment: 0,
            target_saving: 0,
            payment_method: 'cash',
            total_amount: 50000,
            contribution_date: now,
            month,
            year,
            status: 'approved',
            approved_by: admin.id,
            approval_date: now,
            notes: 'Seed contribution'
        });

        loan = await Loan.create({
            user_id: user.id,
            loan_type: 'cash',
            amount_requested: 20000,
            amount_approved: 20000,
            interest_rate: 0,
            repayment_period_months: 1,
            monthly_repayment: 22000,
            total_repayment: 22000,
            status: 'active'
        });

        await LoanRepayment.create({
            loan_id: loan.id,
            user_id: user.id,
            repayment_amount: 10000,
            repayment_date: now.toISOString().slice(0, 10),
            payment_method: 'cash',
            status: 'verified',
            recorded_by: admin.id,
            notes: 'Seed repayment'
        });

        if (useRealDb) {
            created = {
                admin_membership_application_id: adminMembership.id,
                admin_user_id: admin.id,
                user_membership_application_id: userMembership.id,
                user_id: user.id,
                loan_id: loan.id
            };
        }
    });

    afterAll(async () => {
        if (useRealDb && created) {
            await sequelize.transaction(async (transaction) => {
                await LoanRepayment.destroy({ where: { loan_id: created.loan_id }, transaction });
                await Loan.destroy({ where: { id: created.loan_id }, transaction });
                await Contribution.destroy({ where: { user_id: created.user_id }, transaction });
                await User.destroy({ where: { id: created.user_id }, force: true, transaction });
                await User.destroy({ where: { id: created.admin_user_id }, force: true, transaction });
                await MembershipApplication.destroy({ where: { id: created.user_membership_application_id }, force: true, transaction });
                await MembershipApplication.destroy({ where: { id: created.admin_membership_application_id }, force: true, transaction });
            });
        }
        await sequelize.close();
    });

    it('should allow an admin to liquidate a loan', async () => {
        const previewRes = await request(app)
            .post(`/loans/${loan.id}/liquidate`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({});

        expect(previewRes.statusCode).toEqual(200);
        expect(previewRes.body.success).toBe(true);
        expect(previewRes.body.requires_confirmation).toBe(true);
        expect(previewRes.body.remaining_loan_balance).toBe(12000);
        expect(previewRes.body.contribution_balance).toBe(50000);

        const res = await request(app)
            .post(`/loans/${loan.id}/liquidate`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ confirm: true });

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toBe(true);
        expect(res.body.deducted_amount).toBe(12000);
        expect(res.body.liquidation_id).toBeDefined();

        const updatedLoan = await Loan.findByPk(loan.id);
        expect(updatedLoan.status).toBe('completed');

        const totalContributionBalanceResult = await Contribution.sum('total_amount', {
            where: { user_id: user.id, status: 'approved' }
        });
        expect(parseFloat(totalContributionBalanceResult)).toBe(38000);

        const totalRepaidResult = await LoanRepayment.sum('repayment_amount', {
            where: { loan_id: loan.id, user_id: user.id, status: 'verified' }
        });
        expect(parseFloat(totalRepaidResult)).toBe(22000);

        const receiptRes = await request(app)
            .get(`/loans/liquidations/${res.body.liquidation_id}/receipt`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(receiptRes.statusCode).toEqual(200);
        expect(receiptRes.headers['content-type']).toMatch(/application\/pdf/);
    });

    it('should allow partial liquidation with amount validation', async () => {
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();

        const loan2 = await Loan.create({
            user_id: user.id,
            loan_type: 'cash',
            amount_requested: 20000,
            amount_approved: 20000,
            interest_rate: 0,
            repayment_period_months: 1,
            monthly_repayment: 22000,
            total_repayment: 22000,
            status: 'active'
        });

        await LoanRepayment.create({
            loan_id: loan2.id,
            user_id: user.id,
            repayment_amount: 10000,
            repayment_date: now.toISOString().slice(0, 10),
            payment_method: 'cash',
            status: 'verified',
            recorded_by: admin.id,
            notes: 'Seed repayment for loan2'
        });

        const previewRes = await request(app)
            .post(`/loans/${loan2.id}/liquidate`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ amount: 5000 });

        expect(previewRes.statusCode).toEqual(200);
        expect(previewRes.body.success).toBe(true);
        expect(previewRes.body.requires_confirmation).toBe(true);
        expect(previewRes.body.amount_to_deduct).toBe(5000);

        const res = await request(app)
            .post(`/loans/${loan2.id}/liquidate`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ confirm: true, amount: 5000 });

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toBe(true);
        expect(res.body.deducted_amount).toBe(5000);
        expect(res.body.remaining_loan_balance_after).toBe(7000);

        const updatedLoan = await Loan.findByPk(loan2.id);
        expect(updatedLoan.status).toBe('active');

        const invalidRes = await request(app)
            .post(`/loans/${loan2.id}/liquidate`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ confirm: true, amount: 999999 });
        expect(invalidRes.statusCode).toEqual(400);
    });

    it('should not allow a non-admin to liquidate a loan', async () => {
        const res = await request(app)
            .post(`/loans/${loan.id}/liquidate`)
            .set('Authorization', `Bearer ${userToken}`)
            .send({ confirm: true });

        expect(res.statusCode).toEqual(403);
    });
});
