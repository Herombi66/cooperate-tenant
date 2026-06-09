
const { User, MembershipApplication } = require('../../../../models');
const BaseRepository = require('../../shared/base-repository');

/**
 * Users Repository
 * Handles database operations for users
 */
class UsersRepository extends BaseRepository {
  constructor(tenantId = 'default') {
    super(User, tenantId);
  }

  /**
   * Find user by email
   */
  async findByEmail(email) {
    return User.findOne({ 
      where: { email },
      include: [{
        model: MembershipApplication,
        as: 'membershipApplication'
      }]
    });
  }

  /**
   * Find user with membership application
   */
  async findByIdWithMembership(id) {
    return User.findByPk(id, {
      include: [{
        model: MembershipApplication,
        as: 'membershipApplication'
      }]
    });
  }

  /**
   * Find all users with membership
   */
  async findAllWithMembership(options = {}) {
    return User.findAll({
      ...options,
      include: [{
        model: MembershipApplication,
        as: 'membershipApplication'
      }]
    });
  }

  /**
   * Search members by search query
   */
  async searchMembers(query, userRole) {
    const { Op } = require('sequelize');
    
    const applications = await MembershipApplication.findAll({
      where: {
        [Op.or]: [
          { psn: { [Op.like]: `%${query}%` } },
          { name: { [Op.like]: `%${query}%` } },
          { email: { [Op.like]: `%${query}%` } }
        ],
        status: 'approved'
      },
      include: [{
        model: User,
        as: 'user',
        required: false,
        attributes: ['id', 'role', 'additional_role', 'status']
      }],
      limit: 50,
      order: [['psn', 'ASC'], ['id', 'ASC']]
    });

    return Promise.all(applications.map(async (app) => {
      const allUserAccounts = await User.findAll({
        where: { 
          membership_application_id: app.id,
          ...(userRole !== 'super_admin' ? { role: { [Op.ne]: 'super_admin' } } : {})
        },
        attributes: ['id', 'role', 'status']
      });

      if (allUserAccounts.length === 0 && userRole !== 'super_admin') {
        return null;
      }

      const memberAccount = allUserAccounts.find(u => u.role === 'member');
      const additionalRoles = allUserAccounts.filter(u => u.role !== 'member').map(u => u.role);
      const additionalRole = additionalRoles.length > 0 ? additionalRoles[0] : null;

      return {
        id: memberAccount?.id || app.id,
        membershipApplicationId: app.id,
        psn: app.psn,
        name: app.name,
        email: app.email,
        hasUserAccount: !!memberAccount,
        currentRole: memberAccount?.role || null,
        additionalRole,
        membershipStatus: app.status,
        status: memberAccount?.status || 'inactive',
        allAccounts: allUserAccounts
      };
    })).then(members => members.filter(member => member !== null));
  }
}

module.exports = UsersRepository;
