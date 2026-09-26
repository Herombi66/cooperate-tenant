let Server = null;
try {
  Server = require('socket.io').Server;
} catch (e) {
  console.warn('⚠️ [socketService] socket.io package is not installed in node_modules.');
  console.warn('⚠️ Run "cd /root/imanmcs_project/backend && npm install" to enable real-time WebSockets.');
}

const jwt = require('jsonwebtoken');
let User, MembershipApplication;
try {
  const models = require('../models');
  User = models.User;
  MembershipApplication = models.MembershipApplication;
} catch (_) {}

let ioInstance = null;

function initSocket(server, app) {
  if (ioInstance) {
    if (app && !app.get('io')) {
      app.set('io', ioInstance);
    }
    return ioInstance;
  }

  if (!Server) {
    console.warn('⚠️ [socketService] Skipping WebSocket initialization (socket.io not found).');
    return null;
  }

  try {
    const io = new Server(server, {
      cors: {
        origin: true,
        credentials: true
      },
      transports: ['polling', 'websocket'],
      allowEIO3: true
    });

    io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth?.token || socket.handshake.query?.token;
        if (!token) return next(new Error('unauthorized'));
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'iman_default_secret_key');
        if (!User) return next();
        const user = await User.findByPk(decoded.id, {
          include: MembershipApplication ? [{ model: MembershipApplication, as: 'membershipApplication', attributes: ['psn', 'name', 'email'] }] : []
        });
        if (!user || user.status !== 'active') return next(new Error('unauthorized'));
        socket.user = { id: user.id, role: user.role };
        return next();
      } catch {
        return next(new Error('unauthorized'));
      }
    });

    io.on('connection', (socket) => {
      // Join role room for targeted broadcasts
      if (socket.user?.role) {
        socket.join(`role:${socket.user.role}`);
      }
      // Join private user room
      if (socket.user?.id) {
        socket.join(`user:${socket.user.id}`);
      }
    });

    if (app) {
      app.set('io', io);
    }

    ioInstance = io;
    console.log('✅ [socketService] Real-time WebSocket server initialized successfully');
    return io;
  } catch (err) {
    console.error('❌ [socketService] Error starting socket server:', err.message);
    return null;
  }
}

function getIO() {
  return ioInstance;
}

module.exports = {
  initSocket,
  getIO
};
