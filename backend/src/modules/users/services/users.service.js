
const { eventBus, DomainEvents } = require('../../shared/event-bus');

/**
 * Users Service
 * Business logic for user operations
 */
class UsersService {
  constructor(usersRepository, tenantSettings) {
    this.usersRepository = usersRepository;
    this.tenantSettings = tenantSettings;
  }

  /**
   * Search members
   */
  async searchMembers(query, userRole) {
    return this.usersRepository.searchMembers(query, userRole);
  }

  /**
   * Get user by ID
   */
  async getUserById(id) {
    return this.usersRepository.findByIdWithMembership(id);
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email) {
    return this.usersRepository.findByEmail(email);
  }

  /**
   * Update user
   */
  async updateUser(id, updateData, currentUser) {
    const user = await this.usersRepository.updateById(id, updateData);
    eventBus.publish(DomainEvents.USER_UPDATED, { 
      userId: id, 
      updatedBy: currentUser?.id, 
      changes: updateData 
    });
    return user;
  }

  /**
   * Delete user
   */
  async deleteUser(id, currentUser) {
    await this.usersRepository.destroyById(id);
    eventBus.publish(DomainEvents.USER_DELETED, { 
      userId: id, 
      deletedBy: currentUser?.id 
    });
  }
}

module.exports = UsersService;
