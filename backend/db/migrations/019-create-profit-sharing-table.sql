-- Create profit_sharing table
CREATE TABLE IF NOT EXISTS profit_sharing (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  period VARCHAR(10) NOT NULL, -- Format: YYYY-Q1/Q2/Q3/Q4 or YYYY-M01/M02/etc
  total_investment_pool DECIMAL(15,2) NOT NULL,
  total_profit DECIMAL(15,2) NOT NULL,
  member_investment DECIMAL(15,2) NOT NULL,
  share_percentage DECIMAL(5,2) NOT NULL,
  profit_amount DECIMAL(15,2) NOT NULL,
  status ENUM('calculated', 'approved', 'paid', 'cancelled') DEFAULT 'calculated',
  calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  approved_at DATETIME NULL,
  approved_by INTEGER NULL,
  paid_at DATETIME NULL,
  paid_by INTEGER NULL,
  notes TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  -- Foreign key constraints
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (paid_by) REFERENCES users(id) ON DELETE SET NULL,

  -- Index for performance
  INDEX idx_profit_sharing_user_id (user_id),
  INDEX idx_profit_sharing_period (period),
  INDEX idx_profit_sharing_status (status),
  INDEX idx_profit_sharing_created_at (created_at)
);

-- Add trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_profit_sharing_updated_at
  AFTER UPDATE ON profit_sharing
BEGIN
  UPDATE profit_sharing SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
