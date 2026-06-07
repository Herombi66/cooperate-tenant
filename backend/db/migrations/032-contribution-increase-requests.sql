ALTER TABLE membership_applications
ADD COLUMN IF NOT EXISTS contribution_amount_commitment DECIMAL(15,2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS contribution_increase_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  membership_application_id INTEGER NOT NULL REFERENCES membership_applications(id) ON DELETE CASCADE,
  current_amount DECIMAL(15,2) NOT NULL,
  requested_amount DECIMAL(15,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  member_note TEXT NULL,
  review_comment TEXT NULL,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  reviewed_by INTEGER NULL REFERENCES users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contrib_increase_requests_status ON contribution_increase_requests(status);
CREATE INDEX IF NOT EXISTS idx_contrib_increase_requests_user_id ON contribution_increase_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_contrib_increase_requests_membership_application_id ON contribution_increase_requests(membership_application_id);
