-- Migration: Add contribution column to membership_applications table
ALTER TABLE membership_applications ADD COLUMN contribution DECIMAL(15, 2) DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_membership_applications_contribution ON membership_applications(contribution);

