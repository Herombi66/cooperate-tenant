-- Create profit_sharing table
CREATE TABLE IF NOT EXISTS profit_sharing (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  period VARCHAR(10) NOT NULL, -- Format: YYYY-Q1/Q2/Q3/Q4 or YYYY-M01/M02/etc
  total_investment_pool DECIMAL(15,2) NOT NULL,
  total_profit DECIMAL(15,2) NOT NULL,
  member_investment DECIMAL(15,2) NOT NULL,
  share_percentage DECIMAL(5,2) NOT NULL,
  profit_amount DECIMAL(15,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'calculated',
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP NULL,
  approved_by INTEGER NULL,
  paid_at TIMESTAMP NULL,
  paid_by INTEGER NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Foreign key constraints
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (paid_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_profit_sharing_user_id ON profit_sharing(user_id);
CREATE INDEX IF NOT EXISTS idx_profit_sharing_period ON profit_sharing(period);
CREATE INDEX IF NOT EXISTS idx_profit_sharing_status ON profit_sharing(status);
CREATE INDEX IF NOT EXISTS idx_profit_sharing_created_at ON profit_sharing(created_at);
