const { sequelize } = require('./db/connection');

async function debugUserLink() {
    try {
        console.log('🔌 Connecting to database...');
        
        // 1. Check Membership Application 96
        const [apps] = await sequelize.query(`SELECT * FROM "membership_applications" WHERE id = 96`);
        console.log('📄 Application 96:', apps[0] ? 'Found' : 'Not Found');
        if (apps[0]) console.log(apps[0]);

        // 2. Check for ANY user linked to this application
        const [users] = await sequelize.query(`SELECT * FROM "users" WHERE membership_application_id = 96`);
        console.log('👤 Linked Users:', users.length);
        users.forEach(u => console.log(`   - User ID: ${u.id}, Status: ${u.status}, Role: ${u.role}, Deleted: ${u.deleted_at}`));

        // 3. Check for users with similar emails or PSNs to see if there's a mismatch
        if (apps[0]) {
            const email = apps[0].email;
            const [usersByEmail] = await sequelize.query(`SELECT * FROM "users" WHERE email = '${email}'`);
            console.log(`📧 Users with email ${email}:`, usersByEmail.length);
            usersByEmail.forEach(u => console.log(`   - User ID: ${u.id}, App ID: ${u.membership_application_id}`));
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit();
    }
}

debugUserLink();