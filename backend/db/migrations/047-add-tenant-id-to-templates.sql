-- Migration 047: Add tenant_id to document_templates, document_template_versions, receipt_templates, receipt_template_versions, receipt_records

-- 1. Ensure document_templates has tenant_id
ALTER TABLE document_templates ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(100) DEFAULT 'default';
CREATE INDEX IF NOT EXISTS idx_document_templates_tenant_id ON document_templates(tenant_id);

-- 2. Ensure document_template_versions has tenant_id
ALTER TABLE document_template_versions ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(100) DEFAULT 'default';
CREATE INDEX IF NOT EXISTS idx_document_template_versions_tenant_id ON document_template_versions(tenant_id);

-- 3. Ensure receipt_templates has tenant_id
ALTER TABLE receipt_templates ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(100) DEFAULT 'default';
CREATE INDEX IF NOT EXISTS idx_receipt_templates_tenant_id ON receipt_templates(tenant_id);

-- 4. Ensure receipt_template_versions has tenant_id
ALTER TABLE receipt_template_versions ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(100) DEFAULT 'default';
CREATE INDEX IF NOT EXISTS idx_receipt_template_versions_tenant_id ON receipt_template_versions(tenant_id);

-- 5. Ensure receipt_records has tenant_id
ALTER TABLE receipt_records ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(100) DEFAULT 'default';
CREATE INDEX IF NOT EXISTS idx_receipt_records_tenant_id ON receipt_records(tenant_id);
