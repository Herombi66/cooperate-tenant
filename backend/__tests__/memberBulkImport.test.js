const request = require('supertest');
const app = require('../app');
const { sequelize, User, MembershipApplication } = require('../models');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

jest.mock('../services/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true, messageId: 'mock-id' })
}));

describe('Admin Member Bulk Import Functionality', () => {
  let adminToken;
  let adminUser;

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
    process.env.NODE_ENV = 'test';

    // Ensure clean state
    await sequelize.sync({ force: true });
    
    const suffix = Date.now();
    // Create Admin
    const adminApp = await MembershipApplication.create({
      name: `Admin Member Bulk Test ${suffix}`,
      psn: `ADM_MBULK_${suffix}`,
      email: `adm_mbulk_${suffix}@test.com`,
      phone: `0800${suffix.toString().slice(-7)}`,
      facility_name: 'Test Facility',
      next_of_kin_name: 'Admin NOK',
      next_of_kin_phone: '08000000000',
      status: 'approved'
    });
    
    adminUser = await User.create({
      membership_application_id: adminApp.id,
      role: 'admin',
      status: 'active',
      password_hash: 'hashed_password_123'
    });
    
    adminToken = jwt.sign({ id: adminUser.id, role: adminUser.role }, process.env.JWT_SECRET);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('fails when no file is uploaded', async () => {
    const res = await request(app)
      .post('/applications/admin/bulk-import')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/No file uploaded/);
  });

  test('fails when file type is invalid', async () => {
    const filePath = path.join(__dirname, 'test_invalid.txt');
    fs.writeFileSync(filePath, 'Invalid content');

    const res = await request(app)
      .post('/applications/admin/bulk-import')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', filePath);

    fs.unlinkSync(filePath);

    if (res.status === 500) {
      console.log('Invalid File Test Error:', JSON.stringify(res.body, null, 2));
    }
    
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('successfully imports members via CSV', async () => {
    const suffix = Date.now();
    const csvContent = `Name,PSN,Email,Phone,Facility_Name,Next_Of_Kin_Name,Next_Of_Kin_Phone,Savings,Investment,Target_Saving,Target_Period
Test Member 1,PSN_IMP_1_${suffix},test1_${suffix}@example.com,08012345678,Facility A,NOK 1,08000000001,5000,5000,2000,12
Test Member 2,PSN_IMP_2_${suffix},test2_${suffix}@example.com,08087654321,Facility B,NOK 2,08000000002,10000,10000,5000,12`;
    
    const filePath = path.join(__dirname, 'test_members.csv');
    fs.writeFileSync(filePath, csvContent);

    const res = await request(app)
      .post('/applications/admin/bulk-import')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', filePath);

    fs.unlinkSync(filePath);

    if (res.status !== 200) {
      console.log('Import Response:', JSON.stringify(res.body, null, 2));
    }

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.imported).toBe(2);
    expect(res.body.users).toHaveLength(2);

    // Verify DB
    const member1 = await MembershipApplication.findOne({
      where: { psn: `PSN_IMP_1_${suffix}` }
    });
    expect(member1).toBeTruthy();
    expect(member1.status).toBe('approved');
    
    const user1 = await User.findOne({
      where: { membership_application_id: member1.id }
    });
    expect(user1).toBeTruthy();
  }, 30000); // Increase timeout to 30s

  test('handles validation errors (missing fields) gracefully', async () => {
    const csvContent = `Name,PSN,Email
Test Incomplete,,incomplete@example.com`; // Missing PSN
    
    const filePath = path.join(__dirname, 'test_incomplete.csv');
    fs.writeFileSync(filePath, csvContent);

    const res = await request(app)
      .post('/applications/admin/bulk-import')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', filePath);

    fs.unlinkSync(filePath);

    // Should fail because no valid members found
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/No valid applications found/);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  test('skips duplicates and imports valid members', async () => {
    const suffix = Date.now();
    // Create an existing member first
    await MembershipApplication.create({
      name: 'Existing Member',
      psn: `EXISTING_PSN_${suffix}`,
      email: `existing_${suffix}@example.com`,
      phone: '08000000000',
      facility_name: 'Existing Facility',
      next_of_kin_name: 'Existing NOK',
      next_of_kin_phone: '08000000000',
      status: 'approved'
    });

    const csvContent = `Name,PSN,Email,Phone,Facility_Name,Next_Of_Kin_Name,Next_Of_Kin_Phone,Savings,Investment,Target_Saving,Target_Period
Existing Member,EXISTING_PSN_${suffix},existing_${suffix}@example.com,08000000000,Fac,NOK,0800,0,0,0,12
New Member,NEW_PSN_${suffix},new_${suffix}@example.com,08011111111,Fac,NOK,0800,0,0,0,12`;
    
    const filePath = path.join(__dirname, 'test_duplicate.csv');
    fs.writeFileSync(filePath, csvContent);

    const res = await request(app)
      .post('/applications/admin/bulk-import')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', filePath);

    fs.unlinkSync(filePath);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.imported).toBe(1); // Only the new member
    // Check logs (optional, but duplicates are skipped silently or logged)
  });

  test('successfully imports members from Excel file', async () => {
    const XLSX = require('xlsx');
    
    // Create a worksheet
    const data = [
      {
        PSN: 'EXCEL_TEST_001',
        Name: 'Excel User',
        Email: 'excel.user@example.com',
        Phone: '08099998888',
        Facility: 'Excel Hospital',
        'Next Of Kin Name': 'Excel NOK',
        'Next Of Kin Phone': '08077776666',
        Savings: 5000,
        Investment: 10000
      }
    ];
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Members");
    
    const filePath = path.join(__dirname, 'test_import.xlsx');
    XLSX.writeFile(wb, filePath);

    const res = await request(app)
       .post('/applications/admin/bulk-import')
       .set('Authorization', `Bearer ${adminToken}`)
       .attach('file', filePath);
 
     // Clean up
     if (fs.existsSync(filePath)) {
       fs.unlinkSync(filePath);
     }
 
     expect(res.status).toBe(200);
     expect(res.body.success).toBe(true);
     expect(res.body.imported).toBe(1);
     
     // Verify user was created
     const application = await MembershipApplication.findOne({ where: { email: 'excel.user@example.com' } });
     expect(application).not.toBeNull();
     expect(application.psn).toBe('EXCEL_TEST_001');

     const createdUser = await User.findOne({ where: { membership_application_id: application.id } });
    expect(createdUser).not.toBeNull();
  });

  test('successfully imports members with numeric PSN (Excel)', async () => {
    const XLSX = require('xlsx');
    
    // Create a worksheet with numeric PSN
    const data = [
      {
        PSN: 123456, // Numeric PSN
        Name: 'Numeric PSN User',
        Email: 'numeric.psn@example.com',
        Phone: '08011223344',
        Facility: 'Numeric Hospital',
        'Next Of Kin Name': 'Numeric NOK',
        'Next Of Kin Phone': '08055667788',
        Savings: 5000,
        Investment: 10000
      }
    ];
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Members");
    
    const filePath = path.join(__dirname, 'test_numeric_psn.xlsx');
    XLSX.writeFile(wb, filePath);

    const res = await request(app)
      .post('/applications/admin/bulk-import')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', filePath);

    // Clean up
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.imported).toBe(1);
    
    // Verify user was created with string PSN
    const application = await MembershipApplication.findOne({ where: { email: 'numeric.psn@example.com' } });
    expect(application).not.toBeNull();
    expect(application.psn).toBe('123456'); // Should be string
  });

  test('successfully imports members with formatted numbers (e.g., 5,000)', async () => {
    const csvContent = `Name,PSN,Email,Phone,Savings,Investment
Comma User,COMMA_001,comma@example.com,08099999999,"5,000","10,000"`;

    const filePath = path.join(__dirname, 'test_comma.csv');
    fs.writeFileSync(filePath, csvContent);

    const res = await request(app)
      .post('/applications/admin/bulk-import')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', filePath);

    fs.unlinkSync(filePath);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    
    const appDB = await MembershipApplication.findOne({ where: { psn: 'COMMA_001' } });
    expect(appDB.savings).toBe(5000); // Should be number, not string
    expect(appDB.investment).toBe(10000);
  });

  test('fails when data type mismatch occurs', async () => {
    const csvContent = `Name,PSN,Email,Phone,Savings,Investment
Invalid Data Type,INV_DATA,invalid_dt@example.com,NOT_A_NUMBER,NOT_A_NUMBER,NOT_A_NUMBER`;
    
    const filePath = path.join(__dirname, 'test_datatype.csv');
    fs.writeFileSync(filePath, csvContent);

    const res = await request(app)
      .post('/applications/admin/bulk-import')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', filePath);

    fs.unlinkSync(filePath);

    // Depending on validation strictness, this might be 400 or skipped row
    // If strict, it returns 400. If loose, it skips.
    // Assuming strict validation or it catches the error.
    // If our code catches parsing errors or DB validation errors for all rows:
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
