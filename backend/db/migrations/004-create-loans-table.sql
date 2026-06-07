-- Migration: Create loans table
CREATE TABLE IF NOT EXISTS loans (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    loan_type VARCHAR(20) NOT NULL,
    amount_requested DECIMAL(15, 2) NOT NULL,
    amount_approved DECIMAL(15, 2),
    interest_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
    repayment_period_months INTEGER NOT NULL,
    monthly_repayment DECIMAL(15, 2),
    total_repayment DECIMAL(15, 2),
    status VARCHAR(50) DEFAULT 'pending',
    application_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approval_date TIMESTAMP NULL,
    disbursement_date TIMESTAMP NULL,
    first_repayment_date TIMESTAMP NULL,
    approved_by INTEGER REFERENCES users(id),
    disbursed_by INTEGER REFERENCES users(id),
    purpose TEXT,
    collateral_details TEXT,
    guarantor_name VARCHAR(255),
    guarantor_phone VARCHAR(20),
    guarantor_relationship VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_loans_user_id ON loans(user_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_loans_loan_type ON loans(loan_type);
CREATE INDEX IF NOT EXISTS idx_loans_application_date ON loans(application_date);
CREATE INDEX IF NOT EXISTS idx_loans_approved_by ON loans(approved_by);
