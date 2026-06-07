-- Migration: Create membership_applications table
CREATE TABLE IF NOT EXISTS membership_applications (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    psn VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    facility_name VARCHAR(255) NOT NULL,
    next_of_kin_name VARCHAR(255) NOT NULL,
    next_of_kin_phone VARCHAR(20) NOT NULL,
    savings DECIMAL(15, 2) NOT NULL DEFAULT 0,
    investment DECIMAL(15, 2) NOT NULL DEFAULT 0,
    target_saving DECIMAL(15, 2) DEFAULT 0,
    target_period INTEGER DEFAULT 12,
    status VARCHAR(20) DEFAULT 'pending',
    application_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_by INTEGER REFERENCES users(id),
    review_date TIMESTAMP NULL,
    review_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_membership_applications_psn ON membership_applications(psn);
CREATE INDEX IF NOT EXISTS idx_membership_applications_email ON membership_applications(email);
CREATE INDEX IF NOT EXISTS idx_membership_applications_status ON membership_applications(status);
CREATE INDEX IF NOT EXISTS idx_membership_applications_application_date ON membership_applications(application_date);
