-- Migration: Add soft delete support to users table
-- Add deleted_at column for soft delete functionality

ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL DEFAULT NULL;

-- Add index on deleted_at for better performance
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);

-- Add phone and facility_name columns if they don't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20) NULL DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS facility_name VARCHAR(255) NULL DEFAULT NULL;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_facility_name ON users(facility_name);