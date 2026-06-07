CREATE TABLE IF NOT EXISTS upload_batches (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PROCESSING',
  original_filename VARCHAR(255) NULL,
  stored_filename VARCHAR(255) NULL,
  total_records INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER NULL REFERENCES users(id),
  metadata JSONB NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE NULL
);

CREATE INDEX IF NOT EXISTS idx_upload_batches_type ON upload_batches(type);
CREATE INDEX IF NOT EXISTS idx_upload_batches_status ON upload_batches(status);
CREATE INDEX IF NOT EXISTS idx_upload_batches_created_by ON upload_batches(created_by);

CREATE TABLE IF NOT EXISTS upload_record_errors (
  id SERIAL PRIMARY KEY,
  batch_id INTEGER NOT NULL REFERENCES upload_batches(id) ON DELETE CASCADE,
  row_number INTEGER NULL,
  record_key VARCHAR(255) NULL,
  error_code VARCHAR(80) NOT NULL,
  message TEXT NOT NULL,
  fields JSONB NULL,
  raw_record JSONB NULL,
  corrected_record JSONB NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'FAILED',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE NULL
);

CREATE INDEX IF NOT EXISTS idx_upload_record_errors_batch_id ON upload_record_errors(batch_id);
CREATE INDEX IF NOT EXISTS idx_upload_record_errors_status ON upload_record_errors(status);
