ALTER TABLE "complaints" ADD COLUMN "internal_notes" TEXT;
COMMENT ON COLUMN "complaints"."internal_notes" IS 'Private notes for admin use only';
