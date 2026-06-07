
const { Contribution, User, MembershipApplication, sequelize } = require('./models');
const { Op } = require('sequelize');

async function findAndFixDiscrepancy() {
  try {
    console.log('🔍 Starting audit...');

    // 1. Check MembershipApplication for huge defaults
    const hugeDefaults = await MembershipApplication.findAll({
        where: {
            [Op.or]: [
                { savings: { [Op.gt]: 1000000 } },
                { investment: { [Op.gt]: 1000000 } },
                { target_saving: { [Op.gt]: 1000000 } }
            ]
        }
    });
    
    if (hugeDefaults.length > 0) {
        console.log('🚨 Found MembershipApplication with huge defaults:');
        hugeDefaults.forEach(m => {
            console.log(` - ID ${m.id} (${m.name}): Savings=${m.savings}, Inv=${m.investment}, Target=${m.target_saving}`);
            // Fix it if it matches 1,090,000
             if (Math.abs(parseFloat(m.savings) - 1090000) < 1000) {
                 console.log('   -> Matches 1,090,000! This is likely the error.');
                 // Apply fix logic here if desired, or just report
                 m.savings = 55000; // Assuming the error was in savings
                 // m.save(); // Uncomment to fix
             }
        });
    } else {
        console.log('ℹ️ No huge defaults found in MembershipApplication.');
    }

    // 2. Check for ALL huge contribution records
    const hugeContributions = await Contribution.findAll({
        where: {
            total_amount: { [Op.gt]: 500000 }
        },
        include: [{
             model: User,
             as: 'user',
             include: ['membershipApplication']
        }]
    });

    if (hugeContributions.length > 0) {
        console.log(`🚨 Found ${hugeContributions.length} huge contributions:`);
        hugeContributions.forEach(c => {
             console.log(` - ID ${c.id} (User: ${c.user?.membershipApplication?.name || c.user_id}): Total=${c.total_amount}, Savings=${c.savings}, Inv=${c.investment}`);
        });
    } else {
        console.log('ℹ️ No huge contribution records found.');
    }


    // 2. Scan for all discrepancies
    const contributions = await Contribution.findAll();
    let discrepancyCount = 0;
    
    for (const c of contributions) {
      const sum = parseFloat(c.savings) + parseFloat(c.investment) + parseFloat(c.target_saving);
      const total = parseFloat(c.total_amount);
      
      if (Math.abs(sum - total) > 0.01) {
        console.log(`⚠️ Discrepancy found in ID ${c.id}: Sum=${sum}, Total=${total}`);
        discrepancyCount++;
      }
    }
    
    console.log(`🏁 Audit complete. Found ${discrepancyCount} internal calculation discrepancies.`);

  } catch (error) {
    console.error('Audit failed:', error);
  } finally {
    await sequelize.close();
  }
}

findAndFixDiscrepancy();
