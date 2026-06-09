
const usersRoutes = require('./routes/users.routes');
const usersController = require('./controllers/users.controller');
const UsersService = require('./services/users.service');
const UsersRepository = require('./repositories/users.repository');

module.exports = {
  name: 'users',
  routes: usersRoutes,
  controllers: { users: usersController },
  services: { UsersService },
  repositories: { UsersRepository },
  events: null,
  initialize: (tenantSettings) => {
    console.log('Users module initialized');
    usersController.initialize(tenantSettings);
    return {
      settings: tenantSettings
    };
  }
};
