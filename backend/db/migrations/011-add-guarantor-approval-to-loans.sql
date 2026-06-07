-- Migration: Add guarantor approval fields to loans table
ALTER TABLE loans
ADD COLUMN IF NOT EXISTS guarantor_psn VARCHAR(50) NULL,
ADD COLUMN IF NOT EXISTS guarantor_approved BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS guarantor_response_date TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS guarantor_response_notes TEXT NULL;

-- Add index for guarantor PSN for faster lookups
CREATE INDEX IF NOT EXISTS idx_loans_guarantor_psn ON loans(guarantor_psn);
CREATE INDEX IF NOT EXISTS idx_loans_guarantor_approved ON loans(guarantor_approved);
