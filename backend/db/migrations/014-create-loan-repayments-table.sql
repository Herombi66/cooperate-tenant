-- Create loan_repayments table for tracking loan repayments
CREATE TABLE IF NOT EXISTS loan_repayments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  loan_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL, -- Member who made the repayment
  repayment_amount DECIMAL(15, 2) NOT NULL,
  repayment_date DATE NOT NULL,
  payment_method VARCHAR(50) NOT NULL, -- 'cash', 'bank_transfer', 'salary_deduction', 'mobile_money', 'cheque'
  status VARCHAR(20) DEFAULT 'verified', -- 'pending', 'verified', 'rejected'
  recorded_by INTEGER NOT NULL, -- Admin/Treasurer who recorded the repayment
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_loan_repayments_loan_id ON loan_repayments(loan_id);
CREATE INDEX idx_loan_repayments_user_id ON loan_repayments(user_id);
CREATE INDEX idx_loan_repayments_status ON loan_repayments(status);
CREATE INDEX idx_loan_repayments_date ON loan_repayments(repayment_date);
