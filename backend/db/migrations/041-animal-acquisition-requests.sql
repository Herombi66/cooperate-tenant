ALTER TABLE users
ADD COLUMN IF NOT EXISTS can_create_animal_requests BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_users_can_create_animal_requests
ON users(can_create_animal_requests);

UPDATE users
SET can_create_animal_requests = TRUE
WHERE role IN ('admin', 'super_admin')
  AND can_create_animal_requests IS DISTINCT FROM TRUE;

CREATE TABLE IF NOT EXISTS animal_acquisition_requests (
  id SERIAL PRIMARY KEY,
  member_user_id INTEGER NOT NULL REFERENCES users(id),
  created_by INTEGER NOT NULL REFERENCES users(id),
  animal_category VARCHAR(40) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  delivery_start_date DATE,
  delivery_end_date DATE,
  reason_html TEXT,
  reason_text TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE,
  approved_by INTEGER REFERENCES users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_by INTEGER REFERENCES users(id),
  rejected_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_animal_acq_req_member_user_id
ON animal_acquisition_requests(member_user_id);

CREATE INDEX IF NOT EXISTS idx_animal_acq_req_created_by
ON animal_acquisition_requests(created_by);

CREATE INDEX IF NOT EXISTS idx_animal_acq_req_status
ON animal_acquisition_requests(status);

CREATE INDEX IF NOT EXISTS idx_animal_acq_req_created_at
ON animal_acquisition_requests(created_at);

ALTER TABLE animal_acquisition_requests
ADD CONSTRAINT check_animal_acq_req_delivery_range
CHECK (delivery_start_date <= delivery_end_date);

ALTER TABLE animal_acquisition_requests
ADD CONSTRAINT check_animal_acq_req_quantity_positive
CHECK (quantity > 0);
