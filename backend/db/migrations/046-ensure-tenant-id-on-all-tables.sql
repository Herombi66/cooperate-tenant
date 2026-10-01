-- Migration 046: Ensure tenant_id exists across broadcast_messages and all remaining tables

-- 1. Ensure broadcast_messages has tenant_id
ALTER TABLE broadcast_messages ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(100) DEFAULT 'default';
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_tenant_id ON broadcast_messages(tenant_id);

-- 2. Ensure contribution_increase_requests has tenant_id
ALTER TABLE contribution_increase_requests ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(100) DEFAULT 'default';
CREATE INDEX IF NOT EXISTS idx_contribution_increase_requests_tenant_id ON contribution_increase_requests(tenant_id);

-- 3. Ensure loan_liquidations has tenant_id
ALTER TABLE loan_liquidations ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(100) DEFAULT 'default';
CREATE INDEX IF NOT EXISTS idx_loan_liquidations_tenant_id ON loan_liquidations(tenant_id);

-- 4. Ensure upload_record_errors has tenant_id
ALTER TABLE upload_record_errors ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(100) DEFAULT 'default';
CREATE INDEX IF NOT EXISTS idx_upload_record_errors_tenant_id ON upload_record_errors(tenant_id);

-- 5. Ensure notifications has tenant_id & broadcast_id
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(100) DEFAULT 'default';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS broadcast_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_id ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_broadcast_id ON notifications(broadcast_id);
