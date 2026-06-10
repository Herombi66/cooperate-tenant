const { Sequelize } = require('sequelize');
if (process.env.NODE_ENV !== 'test') {
  require('dotenv').config();
}

if (process.env.ALLOW_INSECURE_TLS === 'true') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

// Configuration Priority:
// 1. Individual Environment Variables (DB_HOST, DB_USER, etc.) - HIGHEST PRIORITY
// 2. DATABASE_URL (Connection String)
// 3. SQLite Fallback (Local Development)

const getSequelizeInstance = () => {
  // Option 0: Test Environment (default: SQLite Memory)
  // Set TEST_USE_REAL_DB=true to run tests against Postgres (e.g. DigitalOcean) intentionally.
  if (process.env.NODE_ENV === 'test' && process.env.TEST_USE_REAL_DB !== 'true') {
    console.log('🧪 Using in-memory SQLite for testing');
    return new Sequelize('sqlite::memory:', {
      dialect: 'sqlite',
      logging: false
    });
  }

  const config = {
    logging: false, // Disable logging to keep logs clean
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  };

  // SSL Configuration for Digital Ocean
  const sslConfig = {
    require: true,
    rejectUnauthorized: false // This allows self-signed certificates
  };

  // Option 1: Individual Variables (Digital Ocean style)
  // We check this FIRST to avoid issues where stale DATABASE_URL (sqlite) overrides real config
  if (process.env.DB_HOST) {
    console.log(`🔌 Connecting to DB_HOST: ${process.env.DB_HOST}`);
    
    // Debug password presence (do not log actual password)
    if (!process.env.DB_PASSWORD) {
        console.error('❌ CRITICAL ERROR: DB_PASSWORD is missing or empty in environment variables!');
    } else {
        console.log('🔑 DB_PASSWORD is present (length: ' + process.env.DB_PASSWORD.length + ')');
    }

    return new Sequelize(
      process.env.DB_NAME || 'defaultdb',
      process.env.DB_USER || 'doadmin',
      process.env.DB_PASSWORD,
      {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 25060,
        dialect: 'postgres',
        dialectOptions: {
          ssl: sslConfig
        },
        ...config
      }
    );
  }

  // Option 2: Connection String (DATABASE_URL)
  if (process.env.DATABASE_URL) {
    console.log('🔌 Connecting using DATABASE_URL');
    
    // Check if it's sqlite
    const isSqlite = process.env.DATABASE_URL.startsWith('sqlite');
    console.log(`🔍 Detected dialect: ${isSqlite ? 'sqlite' : 'postgres'}`);
    
    // Additional safety check for production
    if (process.env.NODE_ENV === 'production' && isSqlite) {
       console.warn('⚠️ WARNING: Using SQLite in PRODUCTION via DATABASE_URL. Ensure this is intended.');
    }

    if (!isSqlite) {
      config.dialectOptions = {
        ssl: sslConfig
      };
    }
    
    return new Sequelize(process.env.DATABASE_URL, {
      dialect: isSqlite ? 'sqlite' : 'postgres',
      ...config
    });
  }

  // Option 3: SQLite Fallback
  console.log('⚠️ No database configuration found. Using in-memory SQLite for development.');
  return new Sequelize('sqlite::memory:', {
    dialect: 'sqlite',
    logging: false
  });
};

const tenantStorage = require('../src/middleware/tenant-storage');
const sequelize = getSequelizeInstance();

// Add global hooks for multi-tenancy
const globalModels = ['PlatformAdmin', 'Tenant'];

function applyTenantFilter(options) {
  const modelName = (options && options.model && options.model.name) || (this && this.name);
  if (modelName && globalModels.includes(modelName)) return;

  const tenantId = tenantStorage.getStore();
  // If tenantId exists and we are not explicitly skipping tenant isolation
  if (tenantId && (!options || !options.skipTenant)) {
    options.where = options.where || {};
    // Ensure we don't accidentally override an existing explicit tenant_id query
    if (options.where.tenant_id === undefined) {
      options.where.tenant_id = tenantId;
    }
  }
}

function applyTenantCreate(instance, options) {
  const modelName = (instance && instance.constructor && instance.constructor.name) || (this && this.name);
  if (modelName && globalModels.includes(modelName)) return;

  const tenantId = tenantStorage.getStore();
  if (tenantId && (!options || !options.skipTenant)) {
    instance.tenant_id = tenantId;
  }
}

sequelize.addHook('beforeFind', applyTenantFilter);
sequelize.addHook('beforeCount', applyTenantFilter);
sequelize.addHook('beforeUpdate', applyTenantFilter);
sequelize.addHook('beforeDestroy', applyTenantFilter);

sequelize.addHook('beforeCreate', applyTenantCreate);
sequelize.addHook('beforeBulkCreate', function(instances, options) {
  if (!instances || !instances.length) return;
  const modelName = (instances[0] && instances[0].constructor && instances[0].constructor.name) || (this && this.name);
  if (modelName && globalModels.includes(modelName)) return;

  const tenantId = tenantStorage.getStore();
  if (tenantId && (!options || !options.skipTenant)) {
    instances.forEach(instance => {
      instance.tenant_id = tenantId;
    });
  }
});

module.exports = { sequelize, testConnection: async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection has been established successfully.');
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    return false;
  }
}};
