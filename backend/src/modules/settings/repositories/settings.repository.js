
const { Settings } = require('../../../../models');
const BaseRepository = require('../../shared/base-repository');

/**
 * Settings Repository
 * Handles database operations for settings
 */
class SettingsRepository extends BaseRepository {
  constructor(tenantId = 'default') {
    super(Settings, tenantId);
  }

  /**
   * Get a setting by key
   */
  async getByKey(key) {
    return Settings.findOne({ where: { key } });
  }

  /**
   * Set a setting by key
   */
  async setByKey(key, value, description = '') {
    const existing = await Settings.findOne({ where: { key } });
    
    if (existing) {
      return existing.update({
        value: typeof value === 'object' ? JSON.stringify(value) : value,
        description
      });
    } else {
      return Settings.create({
        key,
        value: typeof value === 'object' ? JSON.stringify(value) : value,
        description
      });
    }
  }
}

module.exports = SettingsRepository;
