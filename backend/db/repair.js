const { sequelize } = require('./connection');

/**
 * Repairs the database schema by ensuring critical columns exist.
 * This runs after migrations to catch any edge cases or failures.
 */
async function repairDatabase() {
  const logs = [];
  const log = (msg) => {
    console.log(msg);
    logs.push(msg);
  };
  
  log('🔧 Starting database repair check...');

  try {
    // 1. Ensure payslip_url exists in loans table
    const [results] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'loans' AND column_name = 'payslip_url';
    `);

    if (results.length === 0) {
      log('⚠️ Column payslip_url missing in loans table. Adding it manually...');
      await sequelize.query(`
        ALTER TABLE loans ADD COLUMN IF NOT EXISTS payslip_url VARCHAR(255);
      `);
      log('✅ Added payslip_url to loans table.');
    } else {
      log('✅ Column payslip_url already exists in loans table.');
    }

    // 2. Ensure guarantor_approved exists in loans table
    const [guarantorResults] = await sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'loans' AND column_name = 'guarantor_approved';
      `);
  
    if (guarantorResults.length === 0) {
        log('⚠️ Column guarantor_approved missing in loans table. Adding it manually...');
        await sequelize.query(`
          ALTER TABLE loans ADD COLUMN IF NOT EXISTS guarantor_approved BOOLEAN DEFAULT NULL;
        `);
        log('✅ Added guarantor_approved to loans table.');
    }

    // 3. Ensure guarantor_response_date exists in loans table
    const [guarantorDateResults] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'loans' AND column_name = 'guarantor_response_date';
    `);

    if (guarantorDateResults.length === 0) {
      log('⚠️ Column guarantor_response_date missing in loans table. Adding it manually...');
      await sequelize.query(`
        ALTER TABLE loans ADD COLUMN IF NOT EXISTS guarantor_response_date TIMESTAMP WITH TIME ZONE;
      `);
      log('✅ Added guarantor_response_date to loans table.');
    }

    // 4. Ensure guarantor_response_notes exists in loans table
    const [guarantorNotesResults] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'loans' AND column_name = 'guarantor_response_notes';
    `);

    if (guarantorNotesResults.length === 0) {
      log('⚠️ Column guarantor_response_notes missing in loans table. Adding it manually...');
      await sequelize.query(`
        ALTER TABLE loans ADD COLUMN IF NOT EXISTS guarantor_response_notes TEXT;
      `);
      log('✅ Added guarantor_response_notes to loans table.');
    }

    // 5. Ensure critical columns are NULLABLE (to allow reversals)
    const nullableColumns = [
        'amount_approved', 
        'monthly_repayment', 
        'total_repayment', 
        'approved_by', 
        'approval_date',
        'disbursed_by',
        'disbursement_date',
        'first_repayment_date'
    ];

    for (const col of nullableColumns) {
        const [colInfo] = await sequelize.query(`
            SELECT is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'loans' AND column_name = '${col}';
        `);
        
        if (colInfo.length > 0 && colInfo[0].is_nullable === 'NO') {
            log(`⚠️ Column ${col} is NOT NULL. Fixing to allow NULL...`);
            await sequelize.query(`
                ALTER TABLE loans ALTER COLUMN ${col} DROP NOT NULL;
            `);
            log(`✅ Column ${col} is now NULLABLE.`);
        }
    }

    // 6. Ensure user_psn exists in layyah_applications and complaints tables
    const tablesToUpdate = [
      { table: 'layyah_applications', column: 'user_psn', type: 'VARCHAR(255)' },
      { table: 'complaints', column: 'user_psn', type: 'VARCHAR(50)' }
    ];

    for (const update of tablesToUpdate) {
      const [results] = await sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = '${update.table}' AND column_name = '${update.column}';
      `);

      if (results.length === 0) {
        log(`⚠️ Column ${update.column} missing in ${update.table} table. Adding it manually...`);
        await sequelize.query(`
          ALTER TABLE ${update.table} ADD COLUMN IF NOT EXISTS ${update.column} ${update.type};
        `);
        log(`✅ Added ${update.column} to ${update.table} table.`);
      } else {
        log(`✅ Column ${update.column} already exists in ${update.table} table.`);
      }
    }

    // 6c. Ensure direct_messages attachment columns exist
    const dmColumns = [
      { column: 'attachment_url', type: 'VARCHAR(255)' },
      { column: 'attachment_name', type: 'VARCHAR(255)' },
      { column: 'attachment_mime', type: 'VARCHAR(100)' },
      { column: 'attachment_size', type: 'INTEGER' }
    ];
    for (const c of dmColumns) {
      try {
        const [colRows] = await sequelize.query(`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'direct_messages' AND column_name = '${c.column}';
        `);
        if (colRows.length === 0) {
          log(`⚠️ Column ${c.column} missing in direct_messages table. Adding it manually...`);
          await sequelize.query(`
            ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS ${c.column} ${c.type};
          `);
          log(`✅ Added ${c.column} to direct_messages table.`);
        }
      } catch (e) {}
    }

    // 6b. Recompute layyah group_member_count to reflect approved members (excluding leader)
    try {
      await sequelize.query(`
        UPDATE layyah_applications g
        SET group_member_count = COALESCE((
          SELECT COUNT(*)
          FROM layyah_applications m
          WHERE m.group_id = g.id
            AND m.kind = 'individual'
            AND m.status = 'approved'
        ), 0)
        WHERE g.kind = 'group';
      `);
      log('✅ Recomputed Layyah group_member_count values.');
    } catch (e) {
      log('⚠️ Could not recompute Layyah group_member_count values, continuing...');
    }

    try {
      await sequelize.query(
        `UPDATE layyah_applications SET group_member_count = 0 WHERE kind = 'group' AND group_member_count IS NULL;`
      );
      log('✅ Ensured Layyah group_member_count defaults to 0 for groups.');
    } catch (e) {
      log('⚠️ Could not ensure Layyah group_member_count defaults, continuing...');
    }

    // 6d. Revert invalid layyah disbursed statuses where no disbursement loan exists
    try {
      const dialect = sequelize.getDialect && sequelize.getDialect();
      if (dialect === 'mysql') {
        await sequelize.query(`
          UPDATE layyah_applications a
          SET status = 'approved'
          WHERE a.status = 'disbursed'
            AND a.kind = 'individual'
            AND a.group_id IS NULL
            AND NOT EXISTS (
              SELECT 1
              FROM loans l
              WHERE l.purpose = CONCAT('Layyah disbursement for application #', a.id)
            );
        `);
      } else {
        await sequelize.query(`
          UPDATE layyah_applications a
          SET status = 'approved'
          WHERE a.status = 'disbursed'
            AND a.kind = 'individual'
            AND a.group_id IS NULL
            AND NOT EXISTS (
              SELECT 1
              FROM loans l
              WHERE l.purpose = ('Layyah disbursement for application #' || a.id)
            );
        `);
      }
      log('✅ Reverted invalid Layyah disbursed statuses with no disbursement loan.');
    } catch (e) {
      log('⚠️ Could not revert invalid Layyah disbursed statuses, continuing...');
    }

    // 7. Fix ENUMs (Add missing values)
    log('🔄 Checking ENUM types for missing values...');
    
    // Fix enum_loans_status
    const loanStatuses = ['active', 'disbursed', 'defaulted', 'completed', 'awaiting_admin_review'];
    for (const status of loanStatuses) {
        try {
             await sequelize.query(`ALTER TYPE "enum_loans_status" ADD VALUE IF NOT EXISTS '${status}';`);
        } catch (e) {
             // Ignore errors (e.g. type doesn't exist or already has value)
        }
    }

    // Fix enum_membership_applications_status
    const memberStatuses = ['under_review', 'approved', 'rejected', 'pending'];
    for (const status of memberStatuses) {
         try {
             await sequelize.query(`ALTER TYPE "enum_membership_applications_status" ADD VALUE IF NOT EXISTS '${status}';`);
         } catch (e) { }
    }

    // Fix enum_layyah_applications_status
    const layyahStatuses = ['pending', 'under_review', 'approved', 'rejected', 'disbursed'];
    for (const status of layyahStatuses) {
         try {
             await sequelize.query(`ALTER TYPE "enum_layyah_applications_status" ADD VALUE IF NOT EXISTS '${status}';`);
         } catch (e) { }
    }

    try {
      if (sequelize.getDialect && sequelize.getDialect() === 'postgres') {
        const [enumTypeRows] = await sequelize.query(`
          SELECT t.typname AS enum_type
          FROM pg_type t
          JOIN pg_attribute a ON a.atttypid = t.oid
          JOIN pg_class c ON c.oid = a.attrelid
          WHERE c.relname = 'layyah_applications'
            AND a.attname = 'status'
            AND t.typtype = 'e'
          LIMIT 1;
        `);
        const enumType = enumTypeRows?.[0]?.enum_type;
        if (enumType) {
          for (const status of layyahStatuses) {
            try {
              await sequelize.query(`ALTER TYPE "${enumType}" ADD VALUE IF NOT EXISTS '${status}';`);
            } catch (e) { }
          }
        }
      }
    } catch (e) { }

    // Fix enum_loan_agreements_status
    const agreementStatuses = ['accepted', 'rejected', 'pending'];
    for (const status of agreementStatuses) {
         try {
             await sequelize.query(`ALTER TYPE "enum_loan_agreements_status" ADD VALUE IF NOT EXISTS '${status}';`);
         } catch (e) { }
    }
    
    log('✅ ENUM types checked/updated.');

    // 8b. Ensure duplicate-detection supporting indexes exist for layyah_applications
    try {
      await sequelize.query(`
        ALTER TABLE layyah_applications
          ADD COLUMN IF NOT EXISTS applied_amount DECIMAL(12,2);
      `);
      await sequelize.query(`
        ALTER TABLE layyah_applications
          ADD COLUMN IF NOT EXISTS amount_version INTEGER NOT NULL DEFAULT 1;
      `);
      await sequelize.query(`
        ALTER TABLE layyah_applications
          ADD COLUMN IF NOT EXISTS group_role VARCHAR(20) DEFAULT 'member';
      `);
      try {
        await sequelize.query(`
          ALTER TABLE layyah_applications
            DROP CONSTRAINT IF EXISTS layyah_applications_status_check;
        `);
        await sequelize.query(`
          ALTER TABLE layyah_applications
            ADD CONSTRAINT layyah_applications_status_check
            CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'disbursed'));
        `);
      } catch (e) {
        log('⚠️ Could not ensure layyah_applications status constraint, continuing...');
      }
      await sequelize.query(`
        UPDATE layyah_applications
        SET applied_amount = COALESCE(applied_amount, price_max)
        WHERE applied_amount IS NULL;
      `);
      await sequelize.query(`
        UPDATE layyah_applications
        SET group_role = COALESCE(group_role, 'member')
        WHERE group_role IS NULL;
      `);
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_layyah_user_kind_created_at
        ON layyah_applications(user_id, kind, created_at);
      `);
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_layyah_user_kind_animal_created_at
        ON layyah_applications(user_id, kind, animal_category, created_at);
      `);
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_layyah_applied_amount
        ON layyah_applications(applied_amount);
      `);
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_layyah_user_created_at
        ON layyah_applications(user_id, created_at DESC);
      `);
      log('✅ Ensured Layyah duplicate-detection indexes exist.');
    } catch (e) {
      log('⚠️ Could not ensure Layyah duplicate-detection indexes, continuing...');
    }

    try {
      await sequelize.query(`
        ALTER TABLE membership_applications
          DROP CONSTRAINT IF EXISTS membership_applications_status_check;
      `);
      await sequelize.query(`
        ALTER TABLE membership_applications
          ADD CONSTRAINT membership_applications_status_check
          CHECK (status IN ('pending', 'under_review', 'approved', 'rejected'));
      `);
    } catch (e) {
      log('⚠️ Could not ensure membership_applications status constraint, continuing...');
    }

    try {
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_membership_applications_psn_application_date
        ON membership_applications(psn, application_date DESC);
      `);
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_membership_applications_email_application_date
        ON membership_applications(email, application_date DESC);
      `);
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_membership_applications_status_application_date
        ON membership_applications(status, application_date DESC);
      `);
      log('✅ Ensured membership_applications duplicate-detection indexes exist.');
    } catch (e) {
      log('⚠️ Could not ensure membership_applications duplicate-detection indexes, continuing...');
    }

    // 8. Ensure can_liquidate_loans exists in users table
    const [liquidationPermResults] = await sequelize.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'can_liquidate_loans';
    `);

    if (liquidationPermResults.length === 0) {
      log('⚠️ Column can_liquidate_loans missing in users table. Adding it manually...');
      await sequelize.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS can_liquidate_loans BOOLEAN NOT NULL DEFAULT FALSE;
      `);
      log('✅ Added can_liquidate_loans to users table.');
    } else {
      log('✅ Column can_liquidate_loans already exists in users table.');
    }

    await sequelize.query(`
      UPDATE users
      SET can_liquidate_loans = TRUE
      WHERE role IN ('admin', 'super_admin', 'treasurer', 'chairman')
        AND can_liquidate_loans IS DISTINCT FROM TRUE;
    `);
    log('✅ Ensured can_liquidate_loans enabled for admin/super_admin/treasurer/chairman.');

    // 8b. Ensure can_create_animal_requests exists in users table
    const [animalReqPermResults] = await sequelize.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'can_create_animal_requests';
    `);

    if (animalReqPermResults.length === 0) {
      log('⚠️ Column can_create_animal_requests missing in users table. Adding it manually...');
      await sequelize.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS can_create_animal_requests BOOLEAN NOT NULL DEFAULT FALSE;
      `);
      log('✅ Added can_create_animal_requests to users table.');
    } else {
      log('✅ Column can_create_animal_requests already exists in users table.');
    }

    await sequelize.query(`
      UPDATE users
      SET can_create_animal_requests = TRUE
      WHERE role IN ('admin', 'super_admin')
        AND can_create_animal_requests IS DISTINCT FROM TRUE;
    `);
    log('✅ Ensured can_create_animal_requests enabled for admin/super_admin.');

    // 8c. Ensure animal_acquisition_requests table exists
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS animal_acquisition_requests (
        id SERIAL PRIMARY KEY,
        member_user_id INTEGER NOT NULL REFERENCES users(id),
        created_by INTEGER NOT NULL REFERENCES users(id),
        animal_category VARCHAR(40) NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        delivery_start_date DATE,
        delivery_end_date DATE,
        reason_html TEXT,
        reason_text TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
        rejection_reason TEXT,
        submitted_at TIMESTAMP WITH TIME ZONE,
        approved_by INTEGER REFERENCES users(id),
        approved_at TIMESTAMP WITH TIME ZONE,
        rejected_by INTEGER REFERENCES users(id),
        rejected_at TIMESTAMP WITH TIME ZONE,
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_animal_acq_req_member_user_id
      ON animal_acquisition_requests(member_user_id);
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_animal_acq_req_created_by
      ON animal_acquisition_requests(created_by);
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_animal_acq_req_status
      ON animal_acquisition_requests(status);
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_animal_acq_req_created_at
      ON animal_acquisition_requests(created_at);
    `);

    const [animalReqConstraints] = await sequelize.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'animal_acquisition_requests'
        AND constraint_type = 'CHECK';
    `);

    const constraintNames = new Set((animalReqConstraints || []).map((r) => r.constraint_name));
    if (!constraintNames.has('check_animal_acq_req_delivery_range')) {
      await sequelize.query(`
        ALTER TABLE animal_acquisition_requests
        ADD CONSTRAINT check_animal_acq_req_delivery_range
        CHECK (delivery_start_date <= delivery_end_date);
      `);
    }
    if (!constraintNames.has('check_animal_acq_req_quantity_positive')) {
      await sequelize.query(`
        ALTER TABLE animal_acquisition_requests
        ADD CONSTRAINT check_animal_acq_req_quantity_positive
        CHECK (quantity > 0);
      `);
    }
    log('✅ Ensured animal_acquisition_requests table exists.');

    // 9. Ensure contribution_amount_commitment exists in membership_applications
    const [commitmentResults] = await sequelize.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'membership_applications' AND column_name = 'contribution_amount_commitment';
    `);

    if (commitmentResults.length === 0) {
      log('⚠️ Column contribution_amount_commitment missing in membership_applications table. Adding it manually...');
      await sequelize.query(`
        ALTER TABLE membership_applications
        ADD COLUMN IF NOT EXISTS contribution_amount_commitment DECIMAL(15,2) NOT NULL DEFAULT 0;
      `);
      log('✅ Added contribution_amount_commitment to membership_applications table.');
    } else {
      log('✅ Column contribution_amount_commitment already exists in membership_applications table.');
    }

    // 10. Ensure contribution_increase_requests table exists
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS contribution_increase_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        membership_application_id INTEGER NOT NULL REFERENCES membership_applications(id) ON DELETE CASCADE,
        current_amount DECIMAL(15,2) NOT NULL,
        requested_amount DECIMAL(15,2) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        member_note TEXT NULL,
        review_comment TEXT NULL,
        supporting_document_url TEXT NULL,
        supporting_document_name TEXT NULL,
        supporting_document_mime VARCHAR(120) NULL,
        supporting_document_size INTEGER NULL,
        requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        reviewed_by INTEGER NULL REFERENCES users(id),
        reviewed_at TIMESTAMP WITH TIME ZONE NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    await sequelize.query(`
      ALTER TABLE contribution_increase_requests
      ADD COLUMN IF NOT EXISTS supporting_document_url TEXT NULL;
    `);
    await sequelize.query(`
      ALTER TABLE contribution_increase_requests
      ADD COLUMN IF NOT EXISTS supporting_document_name TEXT NULL;
    `);
    await sequelize.query(`
      ALTER TABLE contribution_increase_requests
      ADD COLUMN IF NOT EXISTS supporting_document_mime VARCHAR(120) NULL;
    `);
    await sequelize.query(`
      ALTER TABLE contribution_increase_requests
      ADD COLUMN IF NOT EXISTS supporting_document_size INTEGER NULL;
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_contrib_increase_requests_status
      ON contribution_increase_requests(status);
    `);
    await sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uniq_contrib_increase_pending_per_membership
      ON contribution_increase_requests (membership_application_id)
      WHERE status = 'PENDING';
    `);
    log('✅ Ensured contribution_increase_requests table exists.');

    // 11. Ensure bulk upload tracking tables exist (upload_batches, upload_record_errors)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS upload_batches (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'PROCESSING',
        original_filename VARCHAR(255) NULL,
        stored_filename VARCHAR(255) NULL,
        total_records INTEGER NOT NULL DEFAULT 0,
        success_count INTEGER NOT NULL DEFAULT 0,
        failure_count INTEGER NOT NULL DEFAULT 0,
        created_by INTEGER NULL REFERENCES users(id),
        metadata JSONB NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMP WITH TIME ZONE NULL
      );
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS upload_record_errors (
        id SERIAL PRIMARY KEY,
        batch_id INTEGER NOT NULL REFERENCES upload_batches(id) ON DELETE CASCADE,
        row_number INTEGER NULL,
        record_key VARCHAR(255) NULL,
        error_code VARCHAR(80) NOT NULL,
        message TEXT NOT NULL,
        fields JSONB NULL,
        raw_record JSONB NULL,
        corrected_record JSONB NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'FAILED',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        resolved_at TIMESTAMP WITH TIME ZONE NULL
      );
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS upload_batch_backups (
        id SERIAL PRIMARY KEY,
        batch_id INTEGER NOT NULL REFERENCES upload_batches(id) ON DELETE CASCADE,
        resource_type VARCHAR(50) NOT NULL,
        resource_id INTEGER NOT NULL,
        previous_state JSONB NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_upload_batches_type ON upload_batches(type);
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_upload_batches_status ON upload_batches(status);
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_upload_batches_created_by ON upload_batches(created_by);
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_upload_record_errors_batch_id ON upload_record_errors(batch_id);
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_upload_record_errors_status ON upload_record_errors(status);
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_upload_batch_backups_batch_id ON upload_batch_backups(batch_id);
    `);
    log('✅ Ensured bulk upload tracking tables exist.');

    // 12. Ensure upload_batch_id exists in loan_repayments for rollback/audit
    const [loanRepaymentBatchResults] = await sequelize.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'loan_repayments' AND column_name = 'upload_batch_id';
    `);

    if (loanRepaymentBatchResults.length === 0) {
      log('⚠️ Column upload_batch_id missing in loan_repayments table. Adding it manually...');
      await sequelize.query(`
        ALTER TABLE loan_repayments
        ADD COLUMN IF NOT EXISTS upload_batch_id INTEGER NULL REFERENCES upload_batches(id) ON DELETE SET NULL;
      `);
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_loan_repayments_upload_batch_id ON loan_repayments(upload_batch_id);
      `);
      log('✅ Added upload_batch_id to loan_repayments table.');
    } else {
      log('✅ Column upload_batch_id already exists in loan_repayments table.');
    }

    // 13. Ensure loan_liquidations table exists (for contribution-based loan liquidation audit + receipts)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS loan_liquidations (
        id SERIAL PRIMARY KEY,
        loan_id INTEGER NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
        member_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        member_psn VARCHAR(80) NULL,
        member_name TEXT NULL,
        admin_user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
        admin_role VARCHAR(40) NULL,
        admin_name TEXT NULL,
        loan_repayment_id INTEGER NULL REFERENCES loan_repayments(id) ON DELETE SET NULL,
        contribution_id INTEGER NULL REFERENCES contributions(id) ON DELETE SET NULL,
        amount DECIMAL(15,2) NOT NULL,
        loan_balance_before DECIMAL(15,2) NOT NULL,
        loan_balance_after DECIMAL(15,2) NOT NULL,
        contribution_balance_before DECIMAL(15,2) NOT NULL,
        contribution_balance_after DECIMAL(15,2) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_loan_liquidations_loan_id ON loan_liquidations(loan_id);
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_loan_liquidations_member_user_id ON loan_liquidations(member_user_id);
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_loan_liquidations_admin_user_id ON loan_liquidations(admin_user_id);
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_loan_liquidations_created_at ON loan_liquidations(created_at DESC);
    `);

    log('✅ Database repair check completed.');
    return { success: true, logs };
  } catch (error) {
    console.error('❌ Database repair failed:', error);
    logs.push(`❌ Database repair failed: ${error.message}`);
    return { success: false, logs, error: error.message };
  }
}

module.exports = repairDatabase;
