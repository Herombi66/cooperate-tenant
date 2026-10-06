const jwt = require('jsonwebtoken');
const { User, Role, Module, RolePermission, ActivityLog, MembershipApplication } = require('../models');

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

    const method = (req.method || '').toUpperCase();
    const isReadMethod = method === 'GET' || method === 'HEAD' || method === 'OPTIONS';

    // Audit logging for state auditor views
    if (user.role === 'state_auditor' && isReadMethod) {
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

    // Audit logging for secretarial views
    if ((user.role === 'secretary' || user.role === 'assistant_secretary') && isReadMethod) {
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

const requireAdmin = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Super Admin and Admin always have full system access
  if (req.user.role === 'admin' || req.user.role === 'super_admin') {
    return next();
  }

  try {
    const { getUserRoleNames, hasPermissionForModule } = require('./rbac');
    const userRoleNames = await getUserRoleNames(req.user);

    if (userRoleNames.includes('super_admin') || userRoleNames.includes('admin')) {
      return next();
    }

    // Check dynamic RBAC module permissions
    const pathname = (req.originalUrl || req.baseUrl || req.path || '').split('?')[0];
    const moduleKey = getModuleFromUrl(pathname);

    if (moduleKey) {
      const method = (req.method || '').toUpperCase();
      const isRead = method === 'GET' || method === 'HEAD' || method === 'OPTIONS';
      const isDelete = method === 'DELETE';
      const isWrite = method === 'POST';
      const action = isRead ? 'read' : isDelete ? 'delete' : (isWrite ? 'write' : 'edit');

      const hasDynamicPerm = await hasPermissionForModule(req.user, moduleKey, action);
      if (hasDynamicPerm) {
        return next();
      }
    }
  } catch (err) {
    console.warn('⚠️ [requireAdmin] RBAC check failed, falling back:', err);
  }

  return res.status(403).json({
    success: false,
    message: 'Access denied. Admin privileges required.'
  });
};

function getModuleFromUrl(pathname) {
  let p = (pathname || '').toLowerCase();
  // Strip /api/v1 or /api prefix so routes mounted on /api work identically
  p = p.replace(/^\/api(\/v\d+)?/, '');
  if (!p.startsWith('/')) p = '/' + p;

  if (p.startsWith('/members')) return 'members';
  if (p.startsWith('/applications') || p.startsWith('/member-applications')) return 'member_applications';
  if (p.startsWith('/contributions')) return 'contributions';
  if (p.startsWith('/withdrawals')) return 'savings';
  if (p.startsWith('/loans') || p.startsWith('/loan-applications')) return 'loans';
  if (p.startsWith('/loan-repayments')) return 'repayments';
  if (p.startsWith('/layyah') || p.startsWith('/admin-layyah') || p.startsWith('/admin-animal-requests')) return 'investments';
  if (p.startsWith('/expenses')) return 'expenses';
  if (p.startsWith('/profit-shares') || p.startsWith('/profit-sharing')) return 'profit_distribution';
  if (p.startsWith('/reports')) return 'reports';
  if (p.startsWith('/audit') || p.startsWith('/security')) return 'audit';
  if (p.startsWith('/communication') || p.startsWith('/direct-messages') || p.startsWith('/notifications')) return 'notifications';
  if (p.startsWith('/documents') || p.startsWith('/document-templates') || p.startsWith('/receipt-templates') || p.startsWith('/receipts') || p.startsWith('/agreements') || p.startsWith('/settings/bylaw') || p.startsWith('/bylaws')) return 'documents';
  if (p.startsWith('/settings')) return 'settings';
  if (p.startsWith('/users') || p.startsWith('/user-management') || p.startsWith('/roles')) return 'user_management';
  return null;
}

const authorizeRole = (roles) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    // Super Admin and Admin always have full system access
    if (req.user.role === 'super_admin' || req.user.role === 'admin') {
      return next();
    }

    const { getUserRoleNames, hasPermissionForModule } = require('./rbac');
    const userRoleNames = await getUserRoleNames(req.user);

    if (userRoleNames.includes('super_admin') || userRoleNames.includes('admin')) {
      return next();
    }

    // Check if user has one of the statically allowed roles for this route
    const staticRolesList = Array.isArray(roles) ? roles : [roles];
    const hasStaticRole = userRoleNames.some(r => {
      const rNorm = (r || '').toLowerCase().trim().replace(/[\s-]+/g, '_');
      return staticRolesList.some(sr => {
        const srNorm = (sr || '').toLowerCase().trim().replace(/[\s-]+/g, '_');
        return rNorm === srNorm || (r || '').toLowerCase() === (sr || '').toLowerCase();
      });
    });

    const pathname = (req.originalUrl || req.baseUrl || req.path || '').split('?')[0];
    const moduleKey = getModuleFromUrl(pathname);
    const method = (req.method || '').toUpperCase();
    const isRead = method === 'GET' || method === 'HEAD' || method === 'OPTIONS';
    const isDelete = method === 'DELETE';
    const isWrite = method === 'POST';
    const action = isRead ? 'read' : isDelete ? 'delete' : (isWrite ? 'write' : 'edit');

    // 1. If route maps to a system module, check dynamic permissions in DB
    if (moduleKey) {
      try {
        const hasDynamicPerm = await hasPermissionForModule(req.user, moduleKey, action);
        if (hasDynamicPerm) {
          return next();
        }
      } catch (err) {
        console.warn('⚠️ [authorizeRole] Dynamic RBAC check failed, using fallback:', err);
      }
    }
    
    // 2. Fallback: check if any of user's roles is included in the static roles list
    if (hasStaticRole) {
      return next();
    }

    const actionLabel = isRead ? 'READ' : isDelete ? 'DELETE' : isWrite ? 'WRITE' : 'EDIT';
    return res.status(403).json({
      success: false,
      message: moduleKey
        ? `Access denied. Insufficient permissions for module '${moduleKey}' (${actionLabel}).`
        : 'Access denied. Insufficient privileges.'
    });
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
  requirePermission,
  getModuleFromUrl
};
