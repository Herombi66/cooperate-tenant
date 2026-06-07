-- Add additional_role field to users table
ALTER TABLE users ADD COLUMN additional_role TEXT CHECK (additional_role IN ('admin', 'member', 'treasurer', 'chairman')) DEFAULT NULL;

-- Create index for better performance
CREATE INDEX idx_additional_role ON users(additional_role);
