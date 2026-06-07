const { sequelize, LoanRepayment, User, MembershipApplication } = require('../models');

const TARGET_PSN = '38652';
const TARGET_AMOUNT = '201666.63';

async function run() {
  try {
    await sequelize.authenticate();
    const transaction = await sequelize.transaction();
    try {
      const repayments = await LoanRepayment.findAll({
        where: { repayment_amount: TARGET_AMOUNT },
        include: [
          {
            model: User,
            as: 'user',
            include: [
              {
                model: MembershipApplication,
                as: 'membershipApplication',
                where: { psn: TARGET_PSN }
              }
            ]
          }
        ],
        transaction
      });

      console.log('Matching repayments found:', repayments.length);
      repayments.forEach(r => {
        console.log(
          JSON.stringify(
            {
              id: r.id,
              loan_id: r.loan_id,
              user_id: r.user_id,
              repayment_amount: r.repayment_amount,
              repayment_date: r.repayment_date,
              status: r.status
            },
            null,
            2
          )
        );
      });

      if (repayments.length === 0) {
        console.log('No repayments matched the PSN and amount filter. No changes made.');
        await transaction.rollback();
        await sequelize.close();
        return;
      }

      const ids = repayments.map(r => r.id);
      const deletedCount = await LoanRepayment.destroy({
        where: { id: ids },
        transaction
      });

      console.log('Deleted repayments count:', deletedCount);
      await transaction.commit();
      await sequelize.close();
    } catch (err) {
      console.error('Error while finding or deleting repayments:', err);
      await transaction.rollback();
      await sequelize.close();
      process.exit(1);
    }
  } catch (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
}

run();

