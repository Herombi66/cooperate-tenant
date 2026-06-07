const { sequelize } = require('./db/connection');

async function waitForDatabase(maxRetries = 60, retryDelay = 5000) {
  console.log('⏳ Waiting for database connection...');

  for (let i = 1; i <= maxRetries; i++) {
    try {
      console.log(`🔄 Attempt ${i}/${maxRetries} - Connecting to database...`);
      await sequelize.authenticate();
      console.log('✅ Database connection established successfully!');

      // Now run migrations
      console.log('🚀 Starting database migrations...');
      const { spawn } = require('child_process');

      return new Promise((resolve, reject) => {
        const migrateProcess = spawn('node', ['./run_all_migrations.js'], {
          stdio: 'inherit',
          cwd: process.cwd()
        });

        migrateProcess.on('close', (code) => {
          if (code === 0) {
            console.log('✅ Database migrations completed successfully!');
            resolve();
          } else {
            console.error(`❌ Migration process failed with exit code ${code}`);
            reject(new Error(`Migration failed with exit code ${code}`));
          }
        });

        migrateProcess.on('error', (error) => {
          console.error('❌ Migration process error:', error);
          reject(error);
        });
      });

    } catch (error) {
      if (i === maxRetries) {
        console.error('❌ Failed to connect to database after all retries');
        throw error;
      }

      console.log(`❌ Database connection attempt ${i} failed, retrying in ${retryDelay}ms...`);
      console.log(`Error: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
}

waitForDatabase()
  .then(() => {
    console.log('🎉 Database is ready and migrations completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Failed to initialize database:', error);
    process.exit(1);
  });
