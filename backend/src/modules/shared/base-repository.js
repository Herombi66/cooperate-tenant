
/**
 * Base Repository - Tenant-aware database access layer
 * Provides common CRUD operations with automatic tenant filtering
 */
class BaseRepository {
  constructor(model, tenantId = 'default') {
    this.model = model;
    this.tenantId = tenantId;
  }

  /**
   * Find all records with tenant filtering
   */
  async findAll(options = {}) {
    const where = {
      ...(options.where || {}),
      tenantId: this.tenantId
    };
    return this.model.findAll({ ...options, where });
  }

  /**
   * Find one record with tenant filtering
   */
  async findOne(options = {}) {
    const where = {
      ...(options.where || {}),
      tenantId: this.tenantId
    };
    return this.model.findOne({ ...options, where });
  }

  /**
   * Find by primary key with tenant filtering
   */
  async findByPk(id, options = {}) {
    const record = await this.model.findByPk(id, options);
    if (record && record.tenantId !== this.tenantId) {
      return null;
    }
    return record;
  }

  /**
   * Create a new record with tenant ID
   */
  async create(data, options = {}) {
    const dataWithTenant = {
      ...data,
      tenantId: this.tenantId
    };
    return this.model.create(dataWithTenant, options);
  }

  /**
   * Update records with tenant filtering
   */
  async update(data, options = {}) {
    const where = {
      ...(options.where || {}),
      tenantId: this.tenantId
    };
    return this.model.update(data, { ...options, where });
  }

  /**
   * Update a single record by ID
   */
  async updateById(id, data, options = {}) {
    const record = await this.findByPk(id, options);
    if (!record) {
      throw new Error('Record not found');
    }
    return record.update(data, options);
  }

  /**
   * Delete records with tenant filtering
   */
  async destroy(options = {}) {
    const where = {
      ...(options.where || {}),
      tenantId: this.tenantId
    };
    return this.model.destroy({ ...options, where });
  }

  /**
   * Delete a single record by ID
   */
  async destroyById(id, options = {}) {
    const record = await this.findByPk(id, options);
    if (!record) {
      throw new Error('Record not found');
    }
    return record.destroy(options);
  }

  /**
   * Count records with tenant filtering
   */
  async count(options = {}) {
    const where = {
      ...(options.where || {}),
      tenantId: this.tenantId
    };
    return this.model.count({ ...options, where });
  }
}

module.exports = BaseRepository;
