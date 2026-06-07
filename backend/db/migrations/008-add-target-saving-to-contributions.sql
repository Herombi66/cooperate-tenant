ALTER TABLE contributions ADD COLUMN target_saving DECIMAL(15,2) NOT NULL DEFAULT 0;
ALTER TABLE contributions ADD COLUMN payment_method TEXT DEFAULT 'cash';
