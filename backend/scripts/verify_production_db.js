require('dotenv').config();
const { sequelize } = require('../db/connection');

async function testProductionConnection() {
    console.log('\n🔍 Starting Production Database Connection Test...\n');

    // 1. Check Environment Variables
    console.log('📊 Environment Configuration:');
    console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`   DB_HOST: ${process.env.DB_HOST ? process.env.DB_HOST : '(not set)'}`);
    console.log(`   DB_USER: ${process.env.DB_USER ? process.env.DB_USER : '(not set)'}`);
    console.log(`   DB_NAME: ${process.env.DB_NAME ? process.env.DB_NAME : '(not set)'}`);
    console.log(`   DB_PORT: ${process.env.DB_PORT ? process.env.DB_PORT : '(not set)'}`);
    console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? (process.env.DATABASE_URL.substring(0, 10) + '...') : '(not set)'}`);
    console.log('---------------------------------------------------\n');

    try {
        // 2. Authenticate
        console.log('🔌 Attempting to authenticate with Sequelize...');
        await sequelize.authenticate();
        console.log('✅ Authentication SUCCESSFUL!');

        // 3. Get Dialect Info
        const dialect = sequelize.getDialect();
        console.log(`ℹ️  Connected Dialect: ${dialect}`);

        if (dialect === 'sqlite') {
            console.warn('⚠️  WARNING: You are connected to SQLite, NOT Digital Ocean Postgres!');
            if (process.env.NODE_ENV === 'production') {
                console.error('❌ CRITICAL: Production environment should use Postgres.');
            }
        } else if (dialect === 'postgres') {
            console.log('✅ Correctly connected to Postgres.');
        }

        // 4. Run a simple query (Validation)
        console.log('\n📝 Running validation query (SELECT 1+1)...');
        const [results, metadata] = await sequelize.query("SELECT 1+1 AS result");
        console.log(`✅ Query Result: ${JSON.stringify(results)}`);

        // 5. Check Users Table
        console.log('\n👥 Checking "Users" table count...');
        try {
            // Note: Postgres usually lowercases table names unless quoted. Sequelize models handle this.
            // We'll use raw query carefully or just try generic.
            const [userCount] = await sequelize.query('SELECT count(*) as count FROM "Users"'); 
            // In Postgres, created by Sequelize, table is usually "Users" (quoted) if model name is User.
            // Let's try both "Users" and "users" to be safe/informative.
            console.log(`✅ Users Table Count: ${JSON.stringify(userCount)}`);
        } catch (err) {
            console.log('⚠️  Could not query "Users" table directly (might be casing or empty). Trying lowercase...');
            try {
                const [userCountLower] = await sequelize.query('SELECT count(*) as count FROM users');
                console.log(`✅ users (lowercase) Table Count: ${JSON.stringify(userCountLower)}`);
            } catch (err2) {
                 console.error('❌ Could not query users table:', err2.message);
            }
        }

        console.log('\n🎉 Database Test Completed Successfully!');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Connection Failed:');
        console.error(error.message);
        if (error.original && error.original.code) {
             console.error(`   Error Code: ${error.original.code}`);
        }
        process.exit(1);
    }
}

testProductionConnection();
