-- Migration 045: Ensure expenses table has all required columns and loan_agreements table exists

-- 1. Ensure loan_agreements table exists
CREATE TABLE IF NOT EXISTS loan_agreements (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(100) DEFAULT 'default',
  loan_id INTEGER NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  version VARCHAR(20) DEFAULT '1.0',
  ip_address VARCHAR(45),
  action_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  snapshot_data JSONB,
  signature_reference VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_loan_agreements_loan_id ON loan_agreements(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_agreements_user_id ON loan_agreements(user_id);
CREATE INDEX IF NOT EXISTS idx_loan_agreements_tenant_id ON loan_agreements(tenant_id);

-- 2. Ensure all columns on expenses table exist
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(100) DEFAULT 'default';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS recipient VARCHAR(255);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(100);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS approval_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS paid_by INTEGER REFERENCES users(id);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS month INTEGER;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS year INTEGER;

-- Relax title constraint if legacy table has NOT NULL title
DO $$
BEGIN
  BEGIN
    ALTER TABLE expenses ALTER COLUMN title DROP NOT NULL;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

-- Backfill month, year, description
UPDATE expenses
SET
  month = COALESCE(month, EXTRACT(MONTH FROM COALESCE(expense_date, created_at, CURRENT_DATE))::INTEGER, 1),
  year = COALESCE(year, EXTRACT(YEAR FROM COALESCE(expense_date, created_at, CURRENT_DATE))::INTEGER, 2026),
  description = COALESCE(description, title, 'Expense')
WHERE month IS NULL OR year IS NULL OR description IS NULL;

-- Default for month and year
ALTER TABLE expenses ALTER COLUMN month SET DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER;
ALTER TABLE expenses ALTER COLUMN year SET DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;

-- Indexes for expenses
CREATE INDEX IF NOT EXISTS idx_expenses_year_month ON expenses(year, month);
CREATE INDEX IF NOT EXISTS idx_expenses_tenant_id ON expenses(tenant_id);

-- 3. Ensure contribution_withdrawals columns
ALTER TABLE contribution_withdrawals ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(100) DEFAULT 'default';
ALTER TABLE contribution_withdrawals ADD COLUMN IF NOT EXISTS withdrawal_type VARCHAR(50) DEFAULT 'regular';
ALTER TABLE contribution_withdrawals ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
ALTER TABLE contribution_withdrawals ADD COLUMN IF NOT EXISTS reference VARCHAR(255);
ALTER TABLE contribution_withdrawals ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE contribution_withdrawals ADD COLUMN IF NOT EXISTS disbursed_by INTEGER REFERENCES users(id);
ALTER TABLE contribution_withdrawals ADD COLUMN IF NOT EXISTS disbursed_at TIMESTAMP WITH TIME ZONE;

-- 4. Ensure contributions columns
ALTER TABLE contributions ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'cash';

-- 5. Ensure loans columns
ALTER TABLE loans ADD COLUMN IF NOT EXISTS guarantor_psn VARCHAR(50);
