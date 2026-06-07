const { sequelize } = require('./db/connection');

async function restoreUser() {
    try {
        console.log('🔌 Connecting to database...');
        
        // Restore User 98
        const [results, metadata] = await sequelize.query(`
            UPDATE "users" 
            SET "deleted_at" = NULL 
            WHERE "id" = 98
        `);

        console.log('✅ User 98 restored successfully.');
        console.log('Metadata:', metadata);

        // Verify restoration
        const [user] = await sequelize.query(`SELECT * FROM "users" WHERE id = 98`);
        console.log('👤 User 98 Status:', user[0] ? user[0].status : 'Not Found');
        console.log('   Deleted At:', user[0] ? user[0].deleted_at : 'N/A');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit();
    }
}

restoreUser();