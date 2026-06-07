
const settingsRoutes = require('./routes/settings.routes');
const settingsController = require('./controllers/settings.controller');
const tenantSettingsService = require('./services/tenant-settings.service');
const SettingsRepository = require('./repositories/settings.repository');

module.exports = {
  name: 'settings',
  routes: settingsRoutes,
  controllers: { settings: settingsController },
  services: { tenantSettings: tenantSettingsService },
  repositories: { Settings: SettingsRepository },
  events: null,
  initialize: (tenantSettings) => {
    console.log('Settings module initialized');
    return {
      settings: tenantSettings
    };
  }
};
