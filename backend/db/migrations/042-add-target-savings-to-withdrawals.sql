ALTER TABLE "contribution_withdrawals" ADD COLUMN IF NOT EXISTS "withdrawal_type" VARCHAR(50) DEFAULT 'regular';
ALTER TABLE "contribution_withdrawals" ADD COLUMN IF NOT EXISTS "payment_method" VARCHAR(50);
ALTER TABLE "contribution_withdrawals" ADD COLUMN IF NOT EXISTS "reference" VARCHAR(255);
ALTER TABLE "contribution_withdrawals" ADD COLUMN IF NOT EXISTS "disbursed_by" INTEGER REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "contribution_withdrawals" ADD COLUMN IF NOT EXISTS "disbursed_at" TIMESTAMP WITH TIME ZONE;
ALTER TABLE "contribution_withdrawals" ADD COLUMN IF NOT EXISTS "notes" TEXT;

CREATE INDEX IF NOT EXISTS "contribution_withdrawals_withdrawal_type" ON "contribution_withdrawals" ("withdrawal_type");
