-- Migration: Add profile_image field to membership_applications table
ALTER TABLE membership_applications
ADD COLUMN profile_image VARCHAR(500) DEFAULT NULL;

-- Add index for profile_image if needed
CREATE INDEX idx_membership_applications_profile_image ON membership_applications(profile_image);
