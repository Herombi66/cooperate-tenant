-- Create settings table for system configuration
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    value JSONB,
    category VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings values
INSERT INTO settings (key, category, value, description) VALUES
-- General Settings
('cooperative_name', 'general', '"IMAN Multi-Purpose Cooperative Society"', 'Name of the cooperative organization'),
('registration_number', 'general', '"IMAN/COOP/2024/001"', 'Official registration number'),
('address', 'general', '"Gombe State, Nigeria"', 'Physical address of the cooperative'),
('contact_email', 'general', '"info@imancooperative.org"', 'Primary contact email address'),
('contact_phone', 'general', '"'+234-xxx-xxx-xxxx'"', 'Primary contact phone number'),

-- Contribution Settings
('minimum_savings', 'contributions', '1000', 'Minimum monthly savings amount (₦)'),
('minimum_investment', 'contributions', '5000', 'Minimum monthly investment amount (₦)'),
('minimum_target_savings', 'contributions', '2000', 'Minimum target savings amount (₦)'),
('registration_fee', 'contributions', '2000', 'One-time member registration fee (₦)'),
('monthly_admin_fee', 'contributions', '200', 'Monthly administrative service fee (₦)'),

-- Loan Settings
('max_cash_loan', 'loans', '100000', 'Maximum cash loan amount (₦)'),
('investment_loan_multiplier', 'loans', '3', 'Investment-to-loan multiplier (e.g., 3x investment = 3x loan)'),
('default_repayment_period', 'loans', '12', 'Default maximum repayment period (months)'),
('late_payment_fee', 'loans', '5', 'Late payment penalty percentage (%)'),

-- Profit Sharing Settings
('profit_sharing_frequency', 'profits', '"quarterly"', 'Frequency of profit distribution: monthly, quarterly, or annually'),
('reserve_fund_percentage', 'profits', '10', 'Main reserve fund percentage (%)'),
('education_fund_percentage', 'profits', '5', 'Education and training fund percentage (%)'),
('committee_bonus_percentage', 'profits', '5', 'Committee bonus percentage (%)'),
('bad_debt_reserve_percentage', 'profits', '3.5', 'Bad debt reserve percentage (%)'),
('general_reserve_percentage', 'profits', '2.8', 'General operations reserve percentage (%)'),

-- Notification Settings
('email_notifications', 'notifications', 'true', 'Enable email notifications'),
('sms_notifications', 'notifications', 'true', 'Enable SMS notifications'),
('reminder_days', 'notifications', '7', 'Days before due date to send reminders')

ON CONFLICT (key) DO NOTHING;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
CREATE INDEX IF NOT EXISTS idx_settings_category ON settings(category);
