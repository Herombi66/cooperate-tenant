ALTER TABLE layyah_applications
  ADD COLUMN IF NOT EXISTS applied_amount DECIMAL(12, 2);

ALTER TABLE layyah_applications
  ADD COLUMN IF NOT EXISTS amount_version INTEGER NOT NULL DEFAULT 1;

UPDATE layyah_applications
SET applied_amount = COALESCE(applied_amount, price_max)
WHERE applied_amount IS NULL;

CREATE INDEX IF NOT EXISTS idx_layyah_applied_amount
  ON layyah_applications(applied_amount);

CREATE INDEX IF NOT EXISTS idx_layyah_user_created_at
  ON layyah_applications(user_id, created_at DESC);
