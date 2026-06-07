-- Add Under Review workflow support for layyah_applications
-- Notes:
-- - Production deployments typically use Postgres.
-- - Local/test environments may rely on Sequelize sync for SQLite.

-- Expand allowed status values
ALTER TABLE layyah_applications
  DROP CONSTRAINT IF EXISTS layyah_applications_status_check;

ALTER TABLE layyah_applications
  ADD CONSTRAINT layyah_applications_status_check
  CHECK (status IN ('pending', 'under_review', 'approved', 'rejected'));

-- Indexes to support duplicate detection queries (user + kind + recency)
CREATE INDEX IF NOT EXISTS idx_layyah_user_kind_created_at
  ON layyah_applications(user_id, kind, created_at);

CREATE INDEX IF NOT EXISTS idx_layyah_user_kind_animal_created_at
  ON layyah_applications(user_id, kind, animal_category, created_at);
