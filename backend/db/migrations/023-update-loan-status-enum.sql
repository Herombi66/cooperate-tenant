-- Migration: Update loan status enum with new values
-- Note: PostgreSQL requires adding values to ENUM types one by one inside a transaction block is not necessary for ALTER TYPE

-- Add 'waiting_disbursement' if it doesn't exist (handled in 012, but safe to retry if 012 failed)
-- DO $$ BEGIN ALTER TYPE "enum_loans_status" ADD VALUE IF NOT EXISTS 'waiting_disbursement'; EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Add 'disbursed'
DO $$ BEGIN ALTER TYPE "enum_loans_status" ADD VALUE IF NOT EXISTS 'disbursed'; EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Add 'awaiting_admin_review'
DO $$ BEGIN ALTER TYPE "enum_loans_status" ADD VALUE IF NOT EXISTS 'awaiting_admin_review'; EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Add 'completed' for legacy support
DO $$ BEGIN ALTER TYPE "enum_loans_status" ADD VALUE IF NOT EXISTS 'completed'; EXCEPTION WHEN duplicate_object THEN null; END $$;
