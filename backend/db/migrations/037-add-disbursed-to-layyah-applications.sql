ALTER TABLE layyah_applications
  DROP CONSTRAINT IF EXISTS layyah_applications_status_check;

ALTER TABLE layyah_applications
  ADD CONSTRAINT layyah_applications_status_check
  CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'disbursed'));
