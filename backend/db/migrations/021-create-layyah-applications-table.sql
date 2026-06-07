-- Create layyah_applications table
CREATE TABLE IF NOT EXISTS layyah_applications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    kind VARCHAR(20) NOT NULL DEFAULT 'individual' CHECK (kind IN ('individual', 'group')),
    animal_category VARCHAR(20) NOT NULL CHECK (animal_category IN ('ram', 'sheep', 'goat', 'cow')),
    quantity INTEGER NOT NULL DEFAULT 1,
    price_min DECIMAL(12, 2) NOT NULL,
    price_max DECIMAL(12, 2) NOT NULL,
    purpose TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    group_id INTEGER REFERENCES layyah_applications(id),
    group_leader_id INTEGER REFERENCES users(id),
    group_member_count INTEGER NOT NULL DEFAULT 0,
    applicant_name VARCHAR(255),
    notes TEXT,
    approved_by VARCHAR(255),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_layyah_user_id ON layyah_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_layyah_status ON layyah_applications(status);
CREATE INDEX IF NOT EXISTS idx_layyah_animal_category ON layyah_applications(animal_category);
CREATE INDEX IF NOT EXISTS idx_layyah_kind ON layyah_applications(kind);
CREATE INDEX IF NOT EXISTS idx_layyah_group_id ON layyah_applications(group_id);
CREATE INDEX IF NOT EXISTS idx_layyah_group_leader_id ON layyah_applications(group_leader_id);
CREATE INDEX IF NOT EXISTS idx_layyah_created_at ON layyah_applications(created_at);

-- Add constraints
ALTER TABLE layyah_applications ADD CONSTRAINT check_price_range CHECK (price_min <= price_max);
ALTER TABLE layyah_applications ADD CONSTRAINT check_quantity_positive CHECK (quantity > 0);
