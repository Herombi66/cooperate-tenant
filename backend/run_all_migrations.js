const fs = require('fs');
const path = require('path');
const { sequelize } = require('./db/connection');

async function runMigrations() {
  const migrationsPath = path.join(__dirname, 'db', 'migrations');

  try {
    console.log('🔄 Starting database migrations...');
    console.log('📁 Reading migration files from:', migrationsPath);

    // Read all migration files
    const files = fs.readdirSync(migrationsPath)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort to ensure correct order

    console.log(`📋 Found ${files.length} migration files:`);
    files.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file}`);
    });

    // Run each migration
    for (const file of files) {
      const migrationPath = path.join(migrationsPath, file);
      const sql = fs.readFileSync(migrationPath, 'utf8');

      console.log(`\n🚀 Running migration: ${file}`);

      try {
        await sequelize.query(sql);
        console.log(`✅ Migration ${file} completed successfully`);
      } catch (error) {
        console.error(`❌ Migration ${file} failed:`, error.message);
        // Continue with other migrations instead of stopping
        if (error.message.includes('already exists') || error.message.includes('duplicate key')) {
          console.log(`⚠️ Migration ${file} appears to have already been run, continuing...`);
        } else {
          throw error;
        }
      }
    }

    console.log('\n🎉 All migrations completed successfully!');
    // process.exit(0); // Don't exit if imported

  } catch (error) {
    console.error('❌ Migration process failed:', error);
    throw error; // Re-throw to handle in caller
    // process.exit(1);
  } finally {
    // Only close if running standalone, otherwise keep connection open for app
    if (require.main === module) {
      await sequelize.close();
    }
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = runMigrations;
