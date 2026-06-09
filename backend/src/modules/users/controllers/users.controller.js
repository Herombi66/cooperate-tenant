
const UsersRepository = require('../repositories/users.repository');
const UsersService = require('../services/users.service');

/**
 * Users Controller
 * Handles HTTP requests for user operations
 */
class UsersController {
  constructor() {
    this.usersRepository = new UsersRepository();
    this.usersService = null;
  }

  /**
   * Initialize service with tenant settings
   */
  initialize(tenantSettings) {
    this.usersService = new UsersService(this.usersRepository, tenantSettings);
  }

  /**
   * Search members
   */
  async searchMembers(req, res) {
    try {
      if (!this.usersService) {
        this.initialize(req.tenantSettings);
      }
      
      const { q } = req.query;
      
      if (!q || q.length < 2) {
        return res.json({
          success: true,
          members: []
        });
      }

      const members = await this.usersService.searchMembers(q, req.user?.role);
      
      res.json({
        success: true,
        members
      });
    } catch (error) {
      console.error('Search members error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = new UsersController();
