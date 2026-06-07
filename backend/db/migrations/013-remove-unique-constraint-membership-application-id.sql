-- Remove unique constraint from membership_application_id in users table
-- SQLite doesn't support dropping constraints directly, so we need to recreate the table

-- Create new table without unique constraint
CREATE TABLE users_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    membership_application_id INTEGER NOT NULL REFERENCES membership_applications(id),
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'member', 'treasurer', 'chairman') NOT NULL DEFAULT 'member',
    additional_role ENUM('admin', 'member', 'treasurer', 'chairman'),
    is_default_password BOOLEAN DEFAULT 0,
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    deleted_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Copy data from old table to new table
INSERT INTO users_new (id, membership_application_id, password_hash, role, additional_role, is_default_password, status, deleted_at, created_at, updated_at)
SELECT id, membership_application_id, password_hash, role, additional_role, is_default_password, status, deleted_at, created_at, updated_at
FROM users;

-- Drop old table
DROP TABLE users;

-- Rename new table to users
ALTER TABLE users_new RENAME TO users;

-- Create indexes
CREATE INDEX idx_users_membership_application_id ON users(membership_application_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_deleted_at ON users(deleted_at);
