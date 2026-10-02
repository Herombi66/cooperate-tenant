
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
    return Settings.findOne({ where: { key }, skipTenant: true });
  }

  /**
   * Set a setting by key
   */
  async setByKey(key, value, description = '') {
    const existing = await Settings.findOne({ where: { key }, skipTenant: true });
    
    if (existing) {
      return existing.update({
        value: typeof value === 'object' ? JSON.stringify(value) : value,
        description
      });
    } else {
      try {
        return await Settings.create({
          key,
          value: typeof value === 'object' ? JSON.stringify(value) : value,
          description
        }, { skipTenant: true });
      } catch (createErr) {
        if (createErr.name === 'SequelizeUniqueConstraintError' || createErr.original?.code === '23505') {
          const fallback = await Settings.findOne({ where: { key }, skipTenant: true });
          if (fallback) {
            return fallback.update({
              value: typeof value === 'object' ? JSON.stringify(value) : value,
              description
            });
          }
        }
        throw createErr;
      }
    }
  }
}

module.exports = SettingsRepository;
