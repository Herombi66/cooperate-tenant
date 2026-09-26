-- Create system_backups table for tracking system data backups
CREATE TABLE IF NOT EXISTS system_backups (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    filepath VARCHAR(500) NOT NULL,
    format VARCHAR(20) NOT NULL DEFAULT 'json',
    file_size BIGINT NOT NULL DEFAULT 0,
    total_records INTEGER NOT NULL DEFAULT 0,
    table_counts JSONB,
    status VARCHAR(30) NOT NULL DEFAULT 'completed',
    error_message TEXT,
    notes TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_system_backups_created_at ON system_backups(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_backups_status ON system_backups(status);
