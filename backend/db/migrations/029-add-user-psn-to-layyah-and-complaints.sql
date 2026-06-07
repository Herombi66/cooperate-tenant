-- Add user_psn to layyah_applications and complaints tables
ALTER TABLE "layyah_applications" ADD COLUMN IF NOT EXISTS "user_psn" VARCHAR(50);
ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "user_psn" VARCHAR(50);

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_layyah_user_psn ON layyah_applications(user_psn);
CREATE INDEX IF NOT EXISTS idx_complaints_user_psn ON complaints(user_psn);
