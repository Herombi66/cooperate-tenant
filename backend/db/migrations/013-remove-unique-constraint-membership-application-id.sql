-- Remove unique constraint from membership_application_id in users table
DO $$ 
BEGIN
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_membership_application_id_key;
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_membership_application_id_unique;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_membership_application_id ON users(membership_application_id);
