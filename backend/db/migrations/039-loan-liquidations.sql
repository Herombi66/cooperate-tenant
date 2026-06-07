CREATE TABLE IF NOT EXISTS loan_liquidations (
  id SERIAL PRIMARY KEY,
  loan_id INTEGER NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  member_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_psn VARCHAR(80) NULL,
  member_name TEXT NULL,
  admin_user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
  admin_role VARCHAR(40) NULL,
  admin_name TEXT NULL,
  loan_repayment_id INTEGER NULL REFERENCES loan_repayments(id) ON DELETE SET NULL,
  contribution_id INTEGER NULL REFERENCES contributions(id) ON DELETE SET NULL,
  amount DECIMAL(15,2) NOT NULL,
  loan_balance_before DECIMAL(15,2) NOT NULL,
  loan_balance_after DECIMAL(15,2) NOT NULL,
  contribution_balance_before DECIMAL(15,2) NOT NULL,
  contribution_balance_after DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loan_liquidations_loan_id ON loan_liquidations(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_liquidations_member_user_id ON loan_liquidations(member_user_id);
CREATE INDEX IF NOT EXISTS idx_loan_liquidations_admin_user_id ON loan_liquidations(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_loan_liquidations_created_at ON loan_liquidations(created_at DESC);

