const { User, MembershipApplication } = require('./models');

async function check() {
  try {
    const apps = await MembershipApplication.findAll({
      where: {
        email: 'wurojuli@gmail.com'
      }
    });
    
    console.log("Found Applications by email:", apps.map(a => a.toJSON()));

    const users = await User.findAll({
      include: [{
        model: MembershipApplication,
        as: 'membershipApplication'
      }]
    });
    
    const matchedUsers = users.filter(u => 
      u.membershipApplication && (u.membershipApplication.email === 'wurojuli@gmail.com' || u.membershipApplication.psn === 'TENANT-ADM-001')
    );
    
    console.log("Found Users:", matchedUsers.map(u => ({
      id: u.id,
      tenant_id: u.tenant_id,
      role: u.role,
      status: u.status,
      password_hash: u.password_hash,
      psn: u.membershipApplication.psn,
      email: u.membershipApplication.email
    })));
  } catch (e) {
    console.error(e);
  }
  process.exit();
}

check();
