CREATE TABLE IF NOT EXISTS "contribution_withdrawals" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "amount" DECIMAL(15, 2) NOT NULL CHECK ("amount" >= 0),
  "reason" TEXT,
  "year" INTEGER NOT NULL,
  "status" VARCHAR(255) DEFAULT 'pending' CHECK ("status" IN ('pending', 'approved', 'rejected', 'disbursed')),
  "approved_by" INTEGER REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "approved_at" TIMESTAMP WITH TIME ZONE,
  "rejection_reason" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS "contribution_withdrawals_user_id" ON "contribution_withdrawals" ("user_id");
CREATE INDEX IF NOT EXISTS "contribution_withdrawals_status" ON "contribution_withdrawals" ("status");
CREATE INDEX IF NOT EXISTS "contribution_withdrawals_year" ON "contribution_withdrawals" ("year");
