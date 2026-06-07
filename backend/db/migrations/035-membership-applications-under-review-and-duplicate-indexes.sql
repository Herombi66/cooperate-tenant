ALTER TABLE membership_applications
  DROP CONSTRAINT IF EXISTS membership_applications_status_check;

ALTER TABLE membership_applications
  ADD CONSTRAINT membership_applications_status_check
  CHECK (status IN ('pending', 'under_review', 'approved', 'rejected'));

CREATE INDEX IF NOT EXISTS idx_membership_applications_psn_application_date
  ON membership_applications(psn, application_date DESC);

CREATE INDEX IF NOT EXISTS idx_membership_applications_email_application_date
  ON membership_applications(email, application_date DESC);

CREATE INDEX IF NOT EXISTS idx_membership_applications_status_application_date
  ON membership_applications(status, application_date DESC);
