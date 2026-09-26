ALTER TABLE animal_acquisition_requests
ADD COLUMN IF NOT EXISTS applied_amount DECIMAL(12, 2);

ALTER TABLE animal_acquisition_requests
ADD COLUMN IF NOT EXISTS layyah_application_id INTEGER REFERENCES layyah_applications(id);

CREATE INDEX IF NOT EXISTS idx_animal_acq_req_applied_amount
ON animal_acquisition_requests(applied_amount);

CREATE INDEX IF NOT EXISTS idx_animal_acq_req_layyah_app_id
ON animal_acquisition_requests(layyah_application_id);
