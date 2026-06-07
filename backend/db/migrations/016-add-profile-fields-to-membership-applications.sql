-- Migration: Add profile fields to membership_applications table
ALTER TABLE membership_applications ADD COLUMN address TEXT DEFAULT NULL;
ALTER TABLE membership_applications ADD COLUMN date_of_birth DATE DEFAULT NULL;
ALTER TABLE membership_applications ADD COLUMN gender TEXT DEFAULT NULL;
ALTER TABLE membership_applications ADD COLUMN marital_status TEXT DEFAULT NULL;
ALTER TABLE membership_applications ADD COLUMN position VARCHAR(255) DEFAULT NULL;
ALTER TABLE membership_applications ADD COLUMN department VARCHAR(255) DEFAULT NULL;
ALTER TABLE membership_applications ADD COLUMN years_of_experience INTEGER DEFAULT NULL;
ALTER TABLE membership_applications ADD COLUMN employee_id VARCHAR(100) DEFAULT NULL;
ALTER TABLE membership_applications ADD COLUMN monthly_income DECIMAL(15, 2) DEFAULT NULL;

-- Add indexes for commonly queried fields
CREATE INDEX idx_membership_applications_gender ON membership_applications(gender);
CREATE INDEX idx_membership_applications_marital_status ON membership_applications(marital_status);
