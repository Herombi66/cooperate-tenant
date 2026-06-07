-- Add can_liquidate_loans to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "can_liquidate_loans" BOOLEAN DEFAULT FALSE;

-- Create index for the new column
CREATE INDEX IF NOT EXISTS idx_users_can_liquidate_loans ON users(can_liquidate_loans);
