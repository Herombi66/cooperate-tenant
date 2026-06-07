const jwt = require('jsonwebtoken');
const { User, ActivityLog, MembershipApplication } = require('../models');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    
    // Debug logging for auth
    if (req.path.includes('bulk-upload') || req.path.includes('agreements')) {
       console.log(`🔐 [AUTH] Checking auth for: ${req.method} ${req.path}`);
       console.log(`🔐 [AUTH] Header present: ${!!authHeader}`);
       if (authHeader) console.log(`🔐 [AUTH] Header start: ${authHeader.substring(0, 15)}...`);
    }

    let token = authHeader && authHeader.split(' ')[1];

    // Check cookies if token not in header
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    // Check query params (useful for file downloads/views in new tab)
    if (!token && req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      console.log('❌ [AUTH] Token missing from header and cookies');
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database with membership application
    const user = await User.findByPk(decoded.id, {
      include: [{
        model: MembershipApplication,
        as: 'membershipApplication',
        attributes: ['id', 'psn', 'name', 'email']
      }]
    });

    if (!user || user.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    // Attach user to request
    req.user = user;

    if (user.role === 'state_auditor') {
      const method = (req.method || '').toUpperCase();
      const isReadMethod = method === 'GET' || method === 'HEAD' || method === 'OPTIONS';
      const isAllowedWrite =
        (method === 'PUT' && (req.originalUrl || '').startsWith('/auth/change-password')) ||
        (method === 'PUT' && (req.originalUrl || '').startsWith('/auth/profile')) ||
        (method === 'PATCH' && (req.originalUrl || '').startsWith('/auth/profile'));

      if (!isReadMethod && !isAllowedWrite) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. State Auditor role is read-only.'
        });
      }

      const pathname = (req.originalUrl || req.path || '').split('?')[0];
      const shouldLog =
        pathname.startsWith('/dashboard') ||
        pathname.startsWith('/reports') ||
        pathname.startsWith('/loans') ||
        pathname.startsWith('/loan-repayments') ||
        pathname.startsWith('/expenses') ||
        pathname.startsWith('/profit-shares') ||
        pathname.startsWith('/layyah') ||
        pathname.startsWith('/members') ||
        pathname.startsWith('/contributions') ||
        pathname.startsWith('/withdrawals') ||
        pathname.startsWith('/bulk-uploads');

      if (shouldLog) {
        const logUser = {
          id: user.id,
          role: user.role,
          name: user?.membershipApplication?.name || null
        };
        await ActivityLog.logActivity(
          logUser,
          'state_auditor_view',
          'audit',
          null,
          `${method} ${pathname}`,
          { path: pathname, query: req.query || {} },
          req
        );
      }
    }

    if (user.role === 'secretary') {
      const method = (req.method || '').toUpperCase();
      const isReadMethod = method === 'GET' || method === 'HEAD' || method === 'OPTIONS';
      const isAllowedWrite =
        (method === 'PUT' && (req.originalUrl || '').startsWith('/auth/change-password')) ||
        (method === 'PUT' && (req.originalUrl || '').startsWith('/auth/profile')) ||
        (method === 'PATCH' && (req.originalUrl || '').startsWith('/auth/profile'));

      if (!isReadMethod && !isAllowedWrite) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Secretary role is view-only.'
        });
      }

      if (isReadMethod) {
        const pathname = (req.originalUrl || req.path || '').split('?')[0];
        const shouldLog =
          pathname.startsWith('/dashboard') ||
          pathname.startsWith('/reports') ||
          pathname.startsWith('/loans') ||
          pathname.startsWith('/expenses') ||
          pathname.startsWith('/profit-shares') ||
          pathname.startsWith('/layyah') ||
          pathname.startsWith('/members') ||
          pathname.startsWith('/contributions');

        if (shouldLog) {
          const logUser = {
            id: user.id,
            role: user.role,
            name: user?.membershipApplication?.name || null
          };
          await ActivityLog.logActivity(
            logUser,
            'secretary_view',
            'chairman_data',
            null,
            `${method} ${pathname}`,
            { path: pathname, query: req.query || {} },
            req
          );
        }
      }
    }

    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    console.error('❌ [AuthMiddleware] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during authentication',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }

  next();
};

const authorizeRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    if (req.user.role === 'super_admin') {
      return next();
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient privileges.'
      });
    }
    next();
  };
};

const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const p = (permission || '').toString().trim();
    if (!p) {
      return res.status(500).json({
        success: false,
        message: 'Permission is not configured'
      });
    }

    if (req.user.role === 'super_admin') return next();

    if (p === 'animal-request-create') {
      const isAdminRole = req.user.role === 'admin';
      if (!isAdminRole || req.user.can_create_animal_requests !== true) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. animal-request-create permission required.'
        });
      }
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Access denied. Unknown permission.'
    });
  };
};

module.exports = {
  authenticateToken,
  requireAdmin,
  authorizeRole,
  requirePermission
};
