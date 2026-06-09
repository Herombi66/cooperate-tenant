if (process.env.NODE_ENV !== 'test') {
  require('dotenv').config();
}
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const helmet = require('helmet');
const cors = require('cors');

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const dashboardRouter = require('./routes/dashboard');
const contributionsRouter = require('./routes/contributions');
const expensesRouter = require('./routes/expenses');
const layyahRouter = require('./routes/layyah');
const applicationsRouter = require('./routes/applications');
const authRouter = require('./routes/auth');
const membersRouter = require('./routes/members');
// notifications router migrated to src/modules
const loanRepaymentsRouter = require('./src/modules/loans/loan-repayments.routes');
const settingsRouter = require('./routes/settings');
const profitSharesRouter = require('./routes/profitShares');
const reportsRouter = require('./routes/reports');
const communicationRouter = require('./routes/communication');
const directMessagesRouter = require('./routes/directMessages');
const treasurerRouter = require('./routes/treasurer');
const withdrawalsRouter = require('./routes/withdrawals');
const complaintsRouter = require('./routes/complaints');
const bulkUploadsRouter = require('./routes/bulkUploads');

// Import new middleware
const tenantContext = require('./src/middleware/tenant-context');

// Initialize database
const { testConnection, sequelize } = require('./db/connection');
const runMigrations = require('./run_all_migrations');
const repairDatabase = require('./db/repair');

if (process.env.NODE_ENV !== 'test') {
  testConnection();
}
require('./models');

// Run migrations and repairs on startup
if (process.env.NODE_ENV !== 'test' && !process.env.SKIP_DB_INIT) {
  // Execute repair script to fix schema (enums, columns) automatically
  repairDatabase().then(() => {
      console.log('✅ Startup DB Repair completed.');
  }).catch(err => console.error('❌ Startup DB Repair failed:', err));

  // runMigrations().then(async () => {
  //   console.log('✅ Database migrations executed successfully');
    
    // Run repair script to ensure schema integrity
    // await repairDatabase();

    // Force sync for new ContributionWithdrawal table (Temporary Fix)
    const { ContributionWithdrawal } = require('./models');
    ContributionWithdrawal.sync({ alter: true })
      .then(() => console.log('✅ ContributionWithdrawal table synced'))
      .catch(err => console.error('❌ ContributionWithdrawal sync failed:', err));

    if (process.env.NODE_ENV !== 'production') {
      sequelize.sync().then(() => {
        console.log('✅ Database tables synchronized successfully');
      }).catch(err => console.error('❌ Database sync failed:', err));
    }
  // }).catch(err => {
  //   console.error('❌ Database migration failed:', err);
  // });
}

const app = express();

// Avoid 304 responses with empty bodies for API clients (fixes Layyah groups list/search issues on some deployments)
app.set('etag', false);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// -----------------------------
// CORS CONFIGURATION
// -----------------------------
// Parse FRONTEND_URL from env (comma separated)
const envOrigins = [
  ...(process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : []),
  ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [])
].map(url => url.trim()).filter(Boolean);

const allowedOrigins = Array.from(new Set([
  ...envOrigins,
  "http://localhost:5173",            // Local frontend (Vite default)
  "http://localhost:5174",            // Local frontend (Vite alternative)
  "http://localhost:3000",            // Local frontend (alt)
  "http://127.0.0.1:3000",            // Local frontend (alt)
  "https://imanmcs-project.vercel.app", // Default Vercel domain
  "https://imanmcs.vercel.app",        // Alternative Vercel domain
  "https://imanmcs.duckdns.org",       // Dynamic DNS domain
  "https://www.imanmcs.com",           // Custom domain
  "https://imanmcs.com",               // Custom domain (root)
  "https://app.imanmcs.com",           // Member portal
  "https://admin.imanmcs.com",         // Admin portal
  "http://imanmcs.duckdns.org",        // Digital Ocean domain (HTTP)
  "http://209.38.106.28:3000"          // Direct IP frontend (production/staging)
]));

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  try {
    const { hostname } = new URL(origin);
    const lowerHost = hostname.toLowerCase();
    if (lowerHost === 'localhost' || lowerHost === '127.0.0.1') return true;
    if (lowerHost === '209.38.106.28') return true;
    if (lowerHost === 'imanmcs.com' || lowerHost === 'www.imanmcs.com') return true;
    if (lowerHost.endsWith('.imanmcs.com')) return true;
    if (lowerHost.endsWith('.duckdns.org') && lowerHost.includes('imanmcs')) return true;
    if (lowerHost.endsWith('.vercel.app') && lowerHost.includes('imanmcs')) return true;
    return false;
  } catch {
    return false;
  }
};

// Add unique debug route to identify server version
app.get('/debug-check', (req, res) => {
  res.json({ 
    message: 'Backend is running correctly (v5 - CORS PATCH Fix)', 
    timestamp: new Date().toISOString(),
    pid: process.pid 
  });
});

// Manual trigger for DB repair
app.get('/debug-repair', async (req, res) => {
  try {
    const result = await repairDatabase();
    res.json({
      message: 'Database repair script executed manually',
      timestamp: new Date().toISOString(),
      result
    });
  } catch (err) {
    res.status(500).json({ 
      message: 'Error executing repair script',
      error: err.message 
    });
  }
});

const corsOptions = {
  origin: function(origin, callback) {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    } else {
      console.log('❌ CORS Blocked Origin:', origin);
      const err = new Error(`Not allowed by CORS: ${origin}`);
      err.status = 403;
      return callback(err);
    }
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','PATCH','OPTIONS'],
  exposedHeaders: ['ETag'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-CSRF-Token',
    'X-XSRF-Token',
    'X-Requested-With',
    'If-Match',
    'If-None-Match'
  ]
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Enable pre-flight for all routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'IMAN MCS Backend is running' });
});

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Disable caching for API routes to prevent stale/empty conditional responses
app.use((req, res, next) => {
  if (req.path.startsWith('/uploads')) return next();
  res.setHeader('Cache-Control', 'no-store');
  return next();
});

// Tenant context middleware - adds tenantId and tenantSettings to request
app.use(tenantContext);

// Serve uploaded files with proper CORS headers
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  if (req.method === 'OPTIONS') return res.sendStatus(200);

  express.static(path.join(__dirname, 'uploads'))(req, res, next);
});

// -----------------------------
// API ROUTES
// -----------------------------
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/dashboard', dashboardRouter);
app.use('/contributions', contributionsRouter);
app.use('/expenses', expensesRouter);
app.use('/layyah', layyahRouter);
app.use('/applications', applicationsRouter);
app.use('/auth', authRouter);
app.use('/members', membersRouter);
const apiModulesRouter = require('./src/modules');
app.use('/', apiModulesRouter);
app.use('/loan-repayments', loanRepaymentsRouter);
app.use('/settings', settingsRouter);
app.use('/profit-shares', profitSharesRouter);
app.use('/reports', reportsRouter);
app.use('/communication', communicationRouter);
app.use('/direct-messages', directMessagesRouter);
app.use('/treasurer', treasurerRouter);
app.use('/withdrawals', withdrawalsRouter);
app.use('/complaints', complaintsRouter);
app.use('/bulk-uploads', bulkUploadsRouter);

// 404 handler
app.use(function(req, res, next) {
  next(createError(404));
});

// Error handler
app.use(function(err, req, res, next) {
  const isCorsBlocked = err?.status === 403 && /Not allowed by CORS/i.test(err?.message || '');

  if (err.status !== 404 && !isCorsBlocked) {
    console.error('Error:', err);
  }
  if (isCorsBlocked) {
    console.warn('❌ CORS Blocked:', err.message);
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: req.app.get('env') === 'development' ? err.stack : undefined
  });
});

// -----------------------------
// START SERVER
// -----------------------------
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Backend running on port ${PORT}`);
  });
}

module.exports = app;
