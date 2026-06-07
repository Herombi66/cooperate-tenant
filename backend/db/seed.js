const bcrypt = require('bcryptjs');
const { sequelize } = require('./connection');
const { 
  User, 
  MembershipApplication, 
  Contribution, 
  Loan, 
  Expense, 
  Settings, 
  Notification, 
  Complaint, 
  DirectMessage, 
  ActivityLog 
} = require('../models');

const seedUsers = async () => {
  try {
    // Sync database
    await sequelize.sync({ force: true }); // Use force to recreate tables
    console.log('✅ Database synced successfully.');

    // Hash passwords
    const saltRounds = 10;
    const hashedPasswords = {
      admin: await bcrypt.hash('admin123', saltRounds),
      member: await bcrypt.hash('member123', saltRounds),
      treasurer: await bcrypt.hash('treasurer123', saltRounds),
      chairman: await bcrypt.hash('chairman123', saltRounds)
    };

    // Create seed membership applications first
    const applications = [
      // Admin Users
      {
        psn: 'ADMIN001',
        name: 'System Administrator',
        email: 'admin@imancooperative.org',
        phone: '+2348012345678',
        facility_name: 'IMAN Cooperative HQ',
        next_of_kin_name: 'System Support',
        next_of_kin_phone: '+2348012345679',
        savings: 100000,
        investment: 50000,
        target_saving: 200000,
        target_period: 24,
        status: 'approved',
        application_date: new Date(),
        approved_by: 'System',
        approved_at: new Date(),
        reviewed_by: null, // Will update after users are created
        review_date: new Date()
      },
      {
        psn: 'ADMIN002',
        name: 'Abdul Rahman Adebayo',
        email: 'abdul.admin@imancooperative.org',
        phone: '+2348012345680',
        facility_name: 'IMAN Cooperative HQ',
        next_of_kin_name: 'Hafsah Adebayo',
        next_of_kin_phone: '+2348012345681',
        savings: 120000,
        investment: 60000,
        target_saving: 250000,
        target_period: 24,
        status: 'approved',
        application_date: new Date(),
        approved_by: 'System',
        approved_at: new Date(),
        reviewed_by: null, // Will update after users are created
        review_date: new Date()
      },

      // Member Users
      {
        psn: 'MEMBER001',
        name: 'Dr. Amina Hassan',
        email: 'amina.hassan@gmail.com',
        phone: '+2348023456789',
        facility_name: 'General Hospital Lagos',
        next_of_kin_name: 'Dr. Hassan Musa',
        next_of_kin_phone: '+2348023456790',
        savings: 50000,
        investment: 25000,
        target_saving: 100000,
        target_period: 12,
        status: 'approved',
        application_date: new Date(),
        approved_by: 'System',
        approved_at: new Date(),
        reviewed_by: null, // Will update after users are created
        review_date: new Date()
      },
      {
        psn: 'MEMBER002',
        name: 'Dr. Suleiman Ibrahim',
        email: 'suleiman.ibrahim@gmail.com',
        phone: '+2348023456791',
        facility_name: 'National Hospital Abuja',
        next_of_kin_name: 'Ayesha Ibrahim',
        next_of_kin_phone: '+2348023456792',
        savings: 45000,
        investment: 20000,
        target_saving: 90000,
        target_period: 12,
        status: 'approved',
        application_date: new Date(),
        approved_by: 'System',
        approved_at: new Date(),
        reviewed_by: null, // Will update after users are created
        review_date: new Date()
      },
      {
        psn: 'MEMBER003',
        name: 'Hajiya Mariam Abdullahi',
        email: 'mariam.abdullahi@gmail.com',
        phone: '+2348023456793',
        facility_name: 'Federal Medical Center Kano',
        next_of_kin_name: 'Abdullahi Baba',
        next_of_kin_phone: '+2348023456794',
        savings: 55000,
        investment: 30000,
        target_saving: 110000,
        target_period: 12,
        status: 'approved',
        application_date: new Date(),
        approved_by: 'System',
        approved_at: new Date(),
        reviewed_by: null, // Will update after users are created
        review_date: new Date()
      },
      {
        psn: 'MEMBER004',
        name: 'Dr. Yusuf Adeyemi',
        email: 'yusuf.adeyemi@gmail.com',
        phone: '+2348023456795',
        facility_name: 'University College Hospital Ibadan',
        next_of_kin_name: 'Bolanle Adeyemi',
        next_of_kin_phone: '+2348023456796',
        savings: 60000,
        investment: 35000,
        target_saving: 120000,
        target_period: 12,
        status: 'approved',
        application_date: new Date(),
        approved_by: 'System',
        approved_at: new Date(),
        reviewed_by: null, // Will update after users are created
        review_date: new Date()
      },
      {
        psn: 'MEMBER005',
        name: 'Dr. Fatima Bello',
        email: 'fatima.bello@gmail.com',
        phone: '+2348023456797',
        facility_name: 'Ahmadu Bello University Teaching Hospital',
        next_of_kin_name: 'Ahmed Bello',
        next_of_kin_phone: '+2348023456798',
        savings: 48000,
        investment: 22000,
        target_saving: 95000,
        target_period: 12,
        status: 'approved',
        application_date: new Date(),
        approved_by: 'System',
        approved_at: new Date(),
        reviewed_by: null, // Will update after users are created
        review_date: new Date()
      },

      // Treasurer Users
      {
        psn: 'TREASURER001',
        name: 'Hajiya Fatima Umar',
        email: 'fatima.umar@gmail.com',
        phone: '+2348034567890',
        facility_name: 'Federal Medical Center',
        next_of_kin_name: 'Alhaji Umar Sani',
        next_of_kin_phone: '+2348034567891',
        savings: 75000,
        investment: 35000,
        target_saving: 150000,
        target_period: 18,
        status: 'approved',
        application_date: new Date(),
        approved_by: 'System',
        approved_at: new Date(),
        reviewed_by: null,
        approved_by: 'System',
        approved_at: new Date(),
        review_date: new Date()
      },
      {
        psn: 'TREASURER002',
        name: 'Alhaji Musa Garba',
        email: 'musa.garba@gmail.com',
        phone: '+2348034567892',
        facility_name: 'Jos University Teaching Hospital',
        next_of_kin_name: 'Amina Garba',
        next_of_kin_phone: '+2348034567893',
        savings: 80000,
        investment: 40000,
        target_saving: 160000,
        target_period: 18,
        status: 'approved',
        application_date: new Date(),
        approved_by: 'System',
        approved_at: new Date(),
        reviewed_by: null,
        approved_by: 'System',
        approved_at: new Date(),
        review_date: new Date()
      },

      // Chairman Users
      {
        psn: 'CHAIRMAN001',
        name: 'Dr. Ibrahim Musa',
        email: 'ibrahim.musa@gmail.com',
        phone: '+2348045678901',
        facility_name: 'University Teaching Hospital',
        next_of_kin_name: 'Prof. Musa Ibrahim',
        next_of_kin_phone: '+2348045678902',
        savings: 90000,
        investment: 40000,
        target_saving: 180000,
        target_period: 20,
        status: 'approved',
        application_date: new Date(),
        approved_by: 'System',
        approved_at: new Date(),
        reviewed_by: null,
        review_date: new Date()
      },
      {
        psn: 'CHAIRMAN002',
        name: 'Prof. Adebayo Ajayi',
        email: 'adebayo.ajayi@gmail.com',
        phone: '+2348045678903',
        facility_name: 'Lagos State University Teaching Hospital',
        next_of_kin_name: 'Oluwafunke Ajayi',
        next_of_kin_phone: '+2348045678904',
        savings: 95000,
        investment: 45000,
        target_saving: 190000,
        target_period: 20,
        status: 'approved',
        application_date: new Date(),
        approved_by: 'System',
        approved_at: new Date(),
        reviewed_by: null,
        review_date: new Date()
      },

      // Pending Applications for Testing
      {
        psn: 'MEMBER006',
        name: 'Dr. Olayinka Oni',
        email: 'olayinka.oni@gmail.com',
        phone: '+2348056789012',
        facility_name: 'Obafemi Awolowo University Teaching Hospital',
        next_of_kin_name: 'Bamidele Oni',
        next_of_kin_phone: '+2348056789013',
        savings: 40000,
        investment: 15000,
        target_saving: 80000,
        target_period: 12,
        status: 'pending',
        application_date: new Date(),
        approved_by: null,
        approved_at: null,
        reviewed_by: null,
        review_date: null
      },
      {
        psn: 'MEMBER007',
        name: 'Hajiya Zainab Ibrahim',
        email: 'zainab.ibrahim@gmail.com',
        phone: '+2348056789014',
        facility_name: 'Bayero University Kano',
        next_of_kin_name: 'Sani Ibrahim',
        next_of_kin_phone: '+2348056789015',
        savings: 35000,
        investment: 12000,
        target_saving: 70000,
        target_period: 12,
        status: 'under_review',
        application_date: new Date(),
        approved_by: null,
        approved_at: null,
        reviewed_by: null, // Will update after users are created
        review_date: null
      }
    ];

    // Import MembershipApplication here to avoid circular dependency
    
    const createdApplications = await MembershipApplication.bulkCreate(applications);
    console.log('✅ Seed membership applications created successfully.');

    // Create seed users linked to applications
    const users = [
      // Admin Users
      {
        membership_application_id: createdApplications[0].id, // ADMIN001
        password_hash: hashedPasswords.admin,
        role: 'admin',
        is_default_password: false,
        status: 'active'
      },
      {
        membership_application_id: createdApplications[1].id, // ADMIN002
        password_hash: hashedPasswords.admin,
        role: 'admin',
        is_default_password: false,
        status: 'active'
      },

      // Member Users
      {
        membership_application_id: createdApplications[2].id, // MEMBER001
        password_hash: hashedPasswords.member,
        role: 'member',
        is_default_password: false,
        status: 'active'
      },
      {
        membership_application_id: createdApplications[3].id, // MEMBER002
        password_hash: hashedPasswords.member,
        role: 'member',
        is_default_password: false,
        status: 'active'
      },
      {
        membership_application_id: createdApplications[4].id, // MEMBER003
        password_hash: hashedPasswords.member,
        role: 'member',
        is_default_password: false,
        status: 'active'
      },
      {
        membership_application_id: createdApplications[5].id, // MEMBER004
        password_hash: hashedPasswords.member,
        role: 'member',
        is_default_password: false,
        status: 'active'
      },
      {
        membership_application_id: createdApplications[6].id, // MEMBER005
        password_hash: hashedPasswords.member,
        role: 'member',
        is_default_password: false,
        status: 'active'
      },

      // Treasurer Users
      {
        membership_application_id: createdApplications[7].id, // TREASURER001
        password_hash: hashedPasswords.treasurer,
        role: 'treasurer',
        is_default_password: false,
        status: 'active'
      },
      {
        membership_application_id: createdApplications[8].id, // TREASURER002
        password_hash: hashedPasswords.treasurer,
        role: 'treasurer',
        is_default_password: false,
        status: 'active'
      },

      // Chairman Users
      {
        membership_application_id: createdApplications[9].id, // CHAIRMAN001
        password_hash: hashedPasswords.chairman,
        role: 'chairman',
        is_default_password: false,
        status: 'active'
      },
      {
        membership_application_id: createdApplications[10].id, // CHAIRMAN002
        password_hash: hashedPasswords.chairman,
        role: 'chairman',
        is_default_password: false,
        status: 'active'
      }
    ];

    const createdUsers = await User.bulkCreate(users, { returning: true });
    console.log('✅ Seed users created successfully.');

    // Create demo contributions
    const contributions = [];
    const currentDate = new Date();

    // Create contributions for each member for the last 6 months
    createdUsers.filter(u => u.role === 'member').forEach((user, index) => {
      for (let month = 1; month <= 6; month++) {
        const contributionDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - month + 1, 15);

        // Vary the contribution amounts slightly for each member
        const savingsAmount = 5000 + (index * 1000) + (Math.random() * 2000); // 5000-9000 range
        const investmentAmount = 2000 + (index * 500) + (Math.random() * 1000); // 2000-4500 range

        contributions.push({
          user_id: user.id,
          savings: savingsAmount,
          investment: investmentAmount,
          total_amount: savingsAmount + investmentAmount,
          contribution_date: contributionDate,
          month: contributionDate.getMonth() + 1,
          year: contributionDate.getFullYear(),
          status: 'approved',
          approved_by: createdUsers[0].id, // Approved by first admin
          approval_date: new Date(contributionDate.getTime() + (24 * 60 * 60 * 1000)), // Day after contribution
          notes: `Monthly contribution for ${contributionDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
        });
      }
    });

    await Contribution.bulkCreate(contributions);
    console.log('✅ Seed contributions created successfully.');

    // Create demo loans
    const loans = [
      // Pending loan applications
      {
        user_id: createdUsers[2].id, // MEMBER001
        loan_type: 'cash',
        amount_requested: 500000,
        amount_approved: null,
        interest_rate: 0,
        repayment_period_months: 24,
        monthly_repayment: null,
        total_repayment: null,
        status: 'pending',
        application_date: new Date(),
        approval_date: null,
        disbursement_date: null,
        first_repayment_date: null,
        approved_by: null,
        disbursed_by: null,
        purpose: 'Medical equipment purchase',
        collateral_details: 'Vehicle registration documents',
        guarantor_name: 'Dr. Hassan Musa',
        guarantor_phone: '+2348023456790',
        guarantor_relationship: 'Spouse',
        notes: 'Urgent loan for hospital equipment upgrade'
      },
      {
        user_id: createdUsers[3].id, // MEMBER002
        loan_type: 'investment',
        amount_requested: 300000,
        amount_approved: null,
        interest_rate: 0,
        repayment_period_months: 18,
        monthly_repayment: null,
        total_repayment: null,
        status: 'pending',
        application_date: new Date(),
        approval_date: null,
        disbursement_date: null,
        first_repayment_date: null,
        approved_by: null,
        disbursed_by: null,
        purpose: 'Research equipment',
        collateral_details: 'Property documents',
        guarantor_name: 'Ayesha Ibrahim',
        guarantor_phone: '+2348023456792',
        guarantor_relationship: 'Sister',
        notes: 'Investment loan for laboratory equipment'
      },

      // Approved and active loans
      {
        user_id: createdUsers[4].id, // MEMBER003
        loan_type: 'cash',
        amount_requested: 400000,
        amount_approved: 400000,
        interest_rate: 0,
        repayment_period_months: 24,
        monthly_repayment: 16666.67,
        total_repayment: 400000,
        status: 'active',
        application_date: new Date(2024, 0, 15),
        approval_date: new Date(2024, 0, 20),
        disbursement_date: new Date(2024, 0, 25),
        first_repayment_date: new Date(2024, 1, 25),
        approved_by: createdUsers[9].id, // First chairman
        disbursed_by: createdUsers[7].id, // First treasurer
        purpose: 'Staff training and development',
        collateral_details: 'Bank statements and property documents',
        guarantor_name: 'Abdullahi Baba',
        guarantor_phone: '+2348023456794',
        guarantor_relationship: 'Father',
        notes: 'Approved loan for hospital staff training'
      },
      {
        user_id: createdUsers[5].id, // MEMBER004
        loan_type: 'investment',
        amount_requested: 600000,
        amount_approved: 550000,
        interest_rate: 0,
        repayment_period_months: 36,
        monthly_repayment: 15277.78,
        total_repayment: 550000,
        status: 'active',
        application_date: new Date(2024, 2, 10),
        approval_date: new Date(2024, 2, 18),
        disbursement_date: new Date(2024, 2, 25),
        first_repayment_date: new Date(2024, 3, 25),
        approved_by: createdUsers[9].id, // First chairman
        disbursed_by: createdUsers[7].id, // First treasurer
        purpose: 'Establishment of new surgical department',
        collateral_details: 'Medical equipment and property',
        guarantor_name: 'Bolanle Adeyemi',
        guarantor_phone: '+2348023456796',
        guarantor_relationship: 'Spouse',
        notes: 'Partial approval for department expansion'
      },

      // Completed loan
      {
        user_id: createdUsers[6].id, // MEMBER005
        loan_type: 'cash',
        amount_requested: 250000,
        amount_approved: 250000,
        interest_rate: 0,
        repayment_period_months: 12,
        monthly_repayment: 20833.33,
        total_repayment: 250000,
        status: 'completed',
        application_date: new Date(2023, 6, 15),
        approval_date: new Date(2023, 7, 1),
        disbursement_date: new Date(2023, 7, 10),
        first_repayment_date: new Date(2023, 8, 10),
        approved_by: createdUsers[9].id, // First chairman
        disbursed_by: createdUsers[7].id, // First treasurer
        purpose: 'Emergency medical supplies',
        collateral_details: 'Personal guarantee and medical license',
        guarantor_name: 'Ahmed Bello',
        guarantor_phone: '+2348023456798',
        guarantor_relationship: 'Brother',
        notes: 'Successfully repaid emergency loan'
      }
    ];

    await Loan.bulkCreate(loans);
    console.log('✅ Seed loans created successfully.');

    // Create demo expenses
    const expenses = [
      {
        description: 'Monthly office rent for cooperative headquarters',
        category: 'office_rent',
        amount: 150000,
        status: 'paid',
        expense_date: new Date(),
        payment_date: new Date(),
        recipient: 'ABC Properties Ltd',
        payment_method: 'bank_transfer',
        receipt_number: 'REC-2025-001',
        approved_by: createdUsers[7].id, // Treasurer
        approval_date: new Date(),
        paid_by: createdUsers[7].id, // Treasurer
        notes: 'October office rent payment',
        month: currentDate.getMonth() + 1,
        year: currentDate.getFullYear()
      },
      {
        description: 'Monthly utility bills (electricity, water, internet)',
        category: 'utilities',
        amount: 85000,
        status: 'paid',
        expense_date: new Date(),
        payment_date: new Date(),
        recipient: 'Various Utility Companies',
        payment_method: 'bank_transfer',
        receipt_number: 'REC-2025-002',
        approved_by: createdUsers[7].id, // Treasurer
        approval_date: new Date(),
        paid_by: createdUsers[7].id, // Treasurer
        notes: 'October utility payments',
        month: currentDate.getMonth() + 1,
        year: currentDate.getFullYear()
      },
      {
        description: 'Annual audit services fee',
        category: 'audit_fees',
        amount: 200000,
        status: 'approved',
        expense_date: new Date(),
        payment_date: null,
        recipient: 'XYZ Audit Services',
        payment_method: null,
        receipt_number: null,
        approved_by: createdUsers[9].id, // Chairman
        approval_date: new Date(),
        paid_by: null,
        notes: 'External audit for financial year 2024-2025',
        month: currentDate.getMonth() + 1,
        year: currentDate.getFullYear()
      },
      {
        description: 'Office supplies and stationary',
        category: 'office_supplies',
        amount: 45000,
        status: 'paid',
        expense_date: new Date(),
        payment_date: new Date(),
        recipient: 'Office Depot Nigeria',
        payment_method: 'cash',
        receipt_number: 'REC-2025-003',
        approved_by: createdUsers[0].id, // Admin
        approval_date: new Date(),
        paid_by: createdUsers[0].id, // Admin
        notes: 'Monthly office supplies',
        month: currentDate.getMonth() + 1,
        year: currentDate.getFullYear()
      },
      {
        description: 'IT equipment maintenance',
        category: 'maintenance',
        amount: 120000,
        status: 'pending',
        expense_date: new Date(),
        payment_date: null,
        recipient: 'TechCare Solutions',
        payment_method: null,
        receipt_number: null,
        approved_by: null,
        approval_date: null,
        paid_by: null,
        notes: 'Annual maintenance contract for computers and servers',
        month: currentDate.getMonth() + 1,
        year: currentDate.getFullYear()
      },
      {
        description: 'Staff training workshop on cooperative management',
        category: 'training',
        amount: 180000,
        status: 'approved',
        expense_date: new Date(),
        payment_date: null,
        recipient: 'Cooperative Training Institute',
        payment_method: null,
        receipt_number: null,
        approved_by: createdUsers[9].id, // Chairman
        approval_date: new Date(),
        paid_by: null,
        notes: 'Capacity building workshop for cooperative officers',
        month: currentDate.getMonth() + 1,
        year: currentDate.getFullYear()
      },
      {
        description: 'Marketing and awareness campaign materials',
        category: 'marketing',
        amount: 75000,
        status: 'paid',
        expense_date: new Date(),
        payment_date: new Date(),
        recipient: 'Creative Print Solutions',
        payment_method: 'bank_transfer',
        receipt_number: 'REC-2025-004',
        approved_by: createdUsers[0].id, // Admin
        approval_date: new Date(),
        paid_by: createdUsers[0].id, // Admin
        notes: 'Brochures and flyers for membership drive',
        month: currentDate.getMonth() + 1,
        year: currentDate.getFullYear()
      }
    ];

    await Expense.bulkCreate(expenses);
    console.log('✅ Seed expenses created successfully.');

    // Create default settings
    const defaultSettings = [
      {
        key: 'minimum_savings',
        value: '5000',
        category: 'contributions',
        description: 'Minimum required savings amount'
      },
      {
        key: 'minimum_investment',
        value: '0',
        category: 'contributions',
        description: 'Minimum required investment amount'
      },
      {
        key: 'registration_fee',
        value: '1500',
        category: 'contributions',
        description: 'Registration fee amount'
      },
      {
        key: 'cooperative_name',
        value: 'IMAN Cooperative',
        category: 'general',
        description: 'Name of the cooperative'
      }
    ];
    await Settings.bulkCreate(defaultSettings);
    console.log('✅ Default settings created successfully.');

    // Create test notifications for each user
    const testNotifications = [];
    for (let i = 0; i < createdUsers.length; i++) {
      testNotifications.push({
        user_id: createdUsers[i].id,
        type: 'welcome',
        title: 'Welcome to IMAN Cooperative!',
        message: `Hello ${createdUsers[i].role.charAt(0).toUpperCase() + createdUsers[i].role.slice(1)}! Thank you for joining IMAN Cooperative.`,
        is_read: false,
        created_at: new Date()
      });
    }
    await Notification.bulkCreate(testNotifications);
    console.log('✅ Test notifications created successfully.');

    // Create test complaints
    const testComplaints = [];
    for (let i = 0; i < 2; i++) {
      testComplaints.push({
        tracking_id: `CMP-${Date.now().toString(36).toUpperCase()}-${i}`,
        user_id: createdUsers[0].id,
        user_psn: createdApplications[0].psn,
        title: `Test Complaint ${i + 1}`,
        description: `This is a test complaint ${i + 1} for IMAN Cooperative.`,
        category: i === 0 ? 'technical' : 'service',
        priority: i === 0 ? 'medium' : 'low',
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date()
      });
    }
    await Complaint.bulkCreate(testComplaints);
    console.log('✅ Test complaints created successfully.');

    // Create test direct messages
    const testDirectMessages = [];
    for (let i = 0; i < 2; i++) {
      testDirectMessages.push({
        sender_id: createdUsers[0].id,
        recipient_id: createdUsers[2].id,
        subject: `Test Message ${i + 1}`,
        body: `This is a test direct message ${i + 1} from admin to member.`,
        status: 'sent',
        created_at: new Date(),
        updated_at: new Date()
      });
    }
    await DirectMessage.bulkCreate(testDirectMessages);
    console.log('✅ Test direct messages created successfully.');

    // Sync all other models to create their tables
    require('../models/MembershipApplication');
    require('../models/Contribution');
    require('../models/Loan');
    require('../models/Expense');
    require('../models/Settings');
    require('../models/Notification');
    require('../models/Complaint');
    require('../models/DirectMessage');
    require('../models/ActivityLog');

    console.log('✅ All database tables created successfully.');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await sequelize.close();
  }
};

// Run seeder if called directly
if (require.main === module) {
  seedUsers();
}

module.exports = seedUsers;
