ALTER TABLE contribution_increase_requests
ADD COLUMN IF NOT EXISTS supporting_document_url TEXT NULL;

ALTER TABLE contribution_increase_requests
ADD COLUMN IF NOT EXISTS supporting_document_name TEXT NULL;

ALTER TABLE contribution_increase_requests
ADD COLUMN IF NOT EXISTS supporting_document_mime VARCHAR(120) NULL;

ALTER TABLE contribution_increase_requests
ADD COLUMN IF NOT EXISTS supporting_document_size INTEGER NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_contrib_increase_pending_per_membership
ON contribution_increase_requests (membership_application_id)
WHERE status = 'PENDING';
