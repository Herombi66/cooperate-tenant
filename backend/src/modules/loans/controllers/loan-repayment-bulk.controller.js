const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const XLSX = require('xlsx');
const { Op, Transaction } = require('sequelize');
const { UploadBatch, UploadBatchBackup, UploadRecordError, LoanRepayment, Loan, User, MembershipApplication, ActivityLog, sequelize } = require('../../../../models');
const emailService = process.env.NODE_ENV === 'test'
  ? { sendEmail: async () => {} }
  : require('../../../../services/emailService');

const UPLOAD_TYPE = 'loan_repayments_import';

const normalizeRole = (role) => String(role || '').toLowerCase().trim();

const canView = (user) => {
  const role = normalizeRole(user?.role);
  return ['admin', 'super_admin', 'chairman', 'treasurer', 'secretary', 'admin', 'manager', 'operator', 'viewer'].includes(role);
};

const canUpload = (user) => {
  const role = normalizeRole(user?.role);
  return ['admin', 'super_admin', 'chairman', 'treasurer', 'secretary', 'admin', 'manager', 'operator'].includes(role);
};

const canApprove = (user) => {
  const role = normalizeRole(user?.role);
  return ['admin', 'super_admin', 'chairman', 'treasurer', 'admin', 'manager'].includes(role);
};

const canRollback = (user) => {
  const role = normalizeRole(user?.role);
  return ['admin', 'super_admin', 'admin'].includes(role);
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `loan-repayments-${uniqueSuffix}${path.extname(file.originalname).toLowerCase()}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = ['.xlsx', '.xls'];
    if (allowed.includes(ext)) return cb(null, true);
    cb(new Error('Invalid file type. Only .xlsx and .xls are allowed.'));
  }
});

const cleanUpTemp = (filePath) => {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {}
};

const normalizeKey = (key) => String(key || '').toLowerCase().trim().replace(/\s+/g, '_');

const pick = (row, keys) => {
  for (const k of keys) {
    const normalized = normalizeKey(k);
    const candidates = [k, normalized];
    for (const c of candidates) {
      if (row[c] !== undefined && row[c] !== null && String(row[c]).trim() !== '') return row[c];
    }
  }
  return undefined;
};

const parseDateDdMmYyyy = (raw) => {
  const value = String(raw || '').trim();
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    return { ok: false, value, error: 'Date must be in DD/MM/YYYY format (e.g., 05/03/2026).' };
  }
  const [dd, mm, yyyy] = value.split('/').map((v) => parseInt(v, 10));
  if (!yyyy || !mm || !dd) return { ok: false, value, error: 'Invalid date.' };
  const date = new Date(Date.UTC(yyyy, mm - 1, dd));
  const isValid = date.getUTCFullYear() === yyyy && date.getUTCMonth() === mm - 1 && date.getUTCDate() === dd;
  if (!isValid) return { ok: false, value, error: 'Invalid date.' };
  const iso = `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  return { ok: true, iso };
};

const normalizePaymentMethod = (raw) => {
  if (!raw) return 'bank_transfer';
  const v = String(raw).toLowerCase().trim();
  if (v.includes('transfer')) return 'bank_transfer';
  if (v.includes('salary')) return 'salary_deduction';
  if (v.includes('mobile')) return 'mobile_money';
  if (v.includes('cash')) return 'cash';
  if (v.includes('cheque') || v.includes('check')) return 'cheque';
  if (v.includes('contribution')) return 'contribution_deduction';
  return 'bank_transfer';
};

const getLoanRemainingBalance = async (loanId, transaction) => {
  const loan = await Loan.findByPk(loanId, { transaction });
  if (!loan) return { totalRepayment: 0, totalPaid: 0, remaining: 0 };
  const totalPaidRaw = await LoanRepayment.sum('repayment_amount', {
    where: { loan_id: loanId, status: 'verified' },
    transaction
  });
  const totalPaid = parseFloat(totalPaidRaw || 0);
  const totalRepayment = parseFloat(loan.total_repayment || loan.amount_approved || loan.amount_requested || 0);
  const remaining = Math.max(0, totalRepayment - totalPaid);
  return { totalRepayment, totalPaid, remaining };
};

const checkAndUpdateLoanStatus = async (loanId, transaction) => {
  const loan = await Loan.findByPk(loanId, { transaction });
  if (!loan) return false;

  const totalPaidRaw = await LoanRepayment.sum('repayment_amount', {
    where: { loan_id: loanId, status: 'verified' },
    transaction
  });

  const totalPaid = parseFloat(totalPaidRaw || 0);
  const targetAmount = parseFloat(loan.total_repayment || loan.amount_approved || loan.amount_requested || 0);

  if (targetAmount > 0 && totalPaid >= targetAmount && loan.status !== 'completed') {
    await loan.update({ status: 'completed' }, { transaction });
    await ActivityLog.create(
      {
        action: 'LOAN_COMPLETED',
        description: `Loan #${loan.id} automatically marked as completed after full repayment`,
        resource_type: 'Loan',
        resource_id: loan.id,
        metadata: { totalPaid, targetAmount }
      },
      { transaction }
    );
    return true;
  }

  return false;
};

const getLoanPaidAndTarget = async (loanId, transaction) => {
  const loan = await Loan.findByPk(loanId, { transaction });
  if (!loan) return { loan: null, totalPaid: 0, targetAmount: 0 };

  const totalPaidRaw = await LoanRepayment.sum('repayment_amount', {
    where: { loan_id: loanId, status: 'verified' },
    transaction
  });

  const totalPaid = parseFloat(totalPaidRaw || 0);
  const targetAmount = parseFloat(loan.total_repayment || loan.amount_approved || loan.amount_requested || 0);
  return { loan, totalPaid, targetAmount };
};

const recomputeLoanStatusAfterRollback = async (loanId, previousStatus, transaction) => {
  const { loan, totalPaid, targetAmount } = await getLoanPaidAndTarget(loanId, transaction);
  if (!loan) return;

  if (targetAmount > 0 && totalPaid >= targetAmount) {
    if (loan.status !== 'completed') {
      await loan.update({ status: 'completed' }, { transaction });
    }
    return;
  }

  if (loan.status === 'completed') {
    await loan.update({ status: previousStatus || 'disbursed' }, { transaction });
  }
};

const bulkUploadLoanRepayments = async (req, res) => {
  if (!canUpload(req.user)) return res.status(403).json({ success: false, message: 'Access denied' });
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

  const filePath = req.file.path;
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    const recent = await UploadBatch.findAll({
      where: {
        type: UPLOAD_TYPE,
        status: { [Op.in]: ['PROCESSING', 'COMPLETED'] }
      },
      order: [['id', 'DESC']],
      limit: 25
    });

    const existing = recent.find((b) => (b.metadata || {})?.file_hash === fileHash) || null;

    if (existing && existing.status === 'PROCESSING') {
      cleanUpTemp(filePath);
      return res.status(409).json({ success: false, message: 'An identical upload is already processing.', batch_id: existing.id });
    }

    const batch = await UploadBatch.create({
      type: UPLOAD_TYPE,
      status: 'PROCESSING',
      original_filename: req.file.originalname,
      stored_filename: req.file.filename,
      created_by: req.user?.id || null,
      metadata: {
        file_hash: fileHash,
        file_size: req.file.size,
        mimetype: req.file.mimetype,
        upload_path: req.file.path
      }
    });

    const sync = process.env.NODE_ENV === 'test' || String(req.query?.sync || '').toLowerCase() === 'true';
    if (!sync) {
      res.json({ success: true, batch_id: batch.id, type: batch.type, status: batch.status });
    }

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });

    const rows = rawRows.map((r) => {
      const out = {};
      for (const k of Object.keys(r)) out[normalizeKey(k)] = r[k];
      return out;
    });

    const isTransientDbError = (err) => {
      const code = err?.original?.code || err?.parent?.code || err?.code;
      const msg = String(err?.message || '').toLowerCase();
      return (
        code === '40001' ||
        code === '40P01' ||
        msg.includes('deadlock') ||
        msg.includes('could not serialize') ||
        msg.includes('timeout') ||
        msg.includes('econnreset')
      );
    };
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const withRetries = async (fn, attempts = 3) => {
      let last = null;
      for (let i = 0; i < attempts; i++) {
        try {
          return await fn();
        } catch (e) {
          last = e;
          if (!isTransientDbError(e) || i === attempts - 1) throw e;
          await sleep(150 * Math.pow(2, i));
        }
      }
      throw last;
    };

    const startedAt = Date.now();
    const prevalidate = String(req.query?.prevalidate || '').toLowerCase() === 'true';
    const errorsToCreate = [];
    const createdLoanIds = new Set();
    const seenInFile = new Set();
    let successCount = 0;
    let failureCount = 0;

    const addError = (rowNumber, recordKey, error_code, message, fields, raw_record) => {
      errorsToCreate.push({
        batch_id: batch.id,
        row_number: rowNumber,
        record_key: recordKey,
        error_code,
        message,
        fields: fields || null,
        raw_record: raw_record || null
      });
      failureCount += 1;
    };

    const flushErrors = async () => {
      if (errorsToCreate.length === 0) return;
      const chunk = errorsToCreate.splice(0, errorsToCreate.length);
      await UploadRecordError.bulkCreate(chunk);
    };

    const updateProgress = async (extraMetadata) => {
      await batch.update({
        total_records: rows.length,
        success_count: successCount,
        failure_count: failureCount,
        status: 'PROCESSING',
        metadata: {
          ...(batch.metadata || {}),
          ...(extraMetadata || {}),
          processed_rows: successCount + failureCount,
          duration_ms: Date.now() - startedAt
        }
      });
    };

    await updateProgress({ prevalidate });

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2;

      const loanIdVal = pick(row, ['loan_id', 'loanid', 'loan', 'loan_number', 'loan_no', 'loan id']);
      const contributorIdVal = pick(row, ['contributor_id', 'user_id', 'member_id', 'contributor id']);
      const psnVal = pick(row, ['psn', 'member_psn', 'member psn']);
      const amountVal = pick(row, ['repayment_amount', 'amount', 'repayment amount', 'repayment']);
      const dateVal = pick(row, ['repayment_date', 'date', 'repayment date']);
      const methodVal = pick(row, ['payment_method', 'method', 'payment method']);
      const notesVal = pick(row, ['notes', 'note']);

      const rawRecord = {
        loan_id: loanIdVal ?? null,
        contributor_id: contributorIdVal ?? null,
        psn: psnVal ?? null,
        repayment_amount: amountVal ?? null,
        repayment_date: dateVal ?? null,
        payment_method: methodVal ?? null,
        notes: notesVal ?? null
      };

      const recordKey = loanIdVal ? `loan:${String(loanIdVal).trim()}` : psnVal ? `psn:${String(psnVal).trim()}` : null;

      const missing = [];
      if (!loanIdVal && !psnVal && !contributorIdVal) missing.push('Loan_ID or PSN or Contributor_ID');
      if (!amountVal) missing.push('Repayment_Amount');
      if (!dateVal) missing.push('Repayment_Date');

      if (missing.length > 0) {
        addError(rowNumber, recordKey, 'MISSING_FIELDS', `Missing required field(s): ${missing.join(', ')}`, { column: missing.join(', '), suggestion: 'Fill the missing values and re-upload.' }, rawRecord);
        continue;
      }

      const amount = parseFloat(String(amountVal).replace(/,/g, '').trim());
      if (Number.isNaN(amount) || amount <= 0) {
        addError(rowNumber, recordKey, 'INVALID_AMOUNT', 'Repayment amount must be a positive number.', { column: 'Repayment_Amount', value: amountVal, suggestion: 'Enter a number greater than 0.' }, rawRecord);
        continue;
      }

      const parsedDate = parseDateDdMmYyyy(dateVal);
      if (!parsedDate.ok) {
        addError(rowNumber, recordKey, 'INVALID_DATE', parsedDate.error, { column: 'Repayment_Date', value: dateVal, suggestion: 'Use DD/MM/YYYY (e.g., 05/03/2026).' }, rawRecord);
        continue;
      }

      let loan = null;
      if (loanIdVal) {
        const id = parseInt(String(loanIdVal).trim(), 10);
        if (!Number.isFinite(id)) {
          addError(rowNumber, recordKey, 'INVALID_LOAN_ID', 'Loan_ID must be a valid number.', { column: 'Loan_ID', value: loanIdVal, suggestion: 'Enter a numeric Loan ID.' }, rawRecord);
          continue;
        }
        loan = await Loan.findByPk(id);
      } else {
        let user = null;
        if (contributorIdVal) {
          const uid = parseInt(String(contributorIdVal).trim(), 10);
          if (!Number.isFinite(uid)) {
            addError(rowNumber, recordKey, 'INVALID_CONTRIBUTOR_ID', 'Contributor_ID must be a valid number.', { column: 'Contributor_ID', value: contributorIdVal, suggestion: 'Enter a numeric Contributor_ID.' }, rawRecord);
            continue;
          }
          user = await User.findByPk(uid);
        } else if (psnVal) {
          user = await User.findOne({
            include: [{ model: MembershipApplication, as: 'membershipApplication', where: { psn: String(psnVal).trim() } }]
          });
        }

        if (!user) {
          addError(rowNumber, recordKey, 'UNKNOWN_CONTRIBUTOR', 'No contributor found for provided identifier.', { column: 'PSN/Contributor_ID', suggestion: 'Check PSN/Contributor_ID and ensure the member exists.' }, rawRecord);
          continue;
        }

        loan = await Loan.findOne({
          where: { user_id: user.id, status: { [Op.in]: ['disbursed', 'active', 'defaulted'] } },
          order: [['updated_at', 'DESC']]
        });
      }

      if (!loan) {
        addError(rowNumber, recordKey, 'LOAN_NOT_FOUND', 'No eligible loan found for provided identifier.', { column: 'Loan_ID/PSN/Contributor_ID', suggestion: 'Verify Loan_ID or ensure the member has a disbursed/active loan.' }, rawRecord);
        continue;
      }

      if (contributorIdVal) {
        const contributorId = parseInt(String(contributorIdVal).trim(), 10);
        if (Number.isFinite(contributorId) && contributorId !== loan.user_id) {
          addError(rowNumber, recordKey, 'CONTRIBUTOR_MISMATCH', 'Contributor_ID does not match the loan owner.', { column: 'Contributor_ID', suggestion: `Use Contributor_ID ${loan.user_id} for this loan or correct the Loan_ID.` }, rawRecord);
          continue;
        }
      }

      const duplicateKey = `${loan.id}|${parsedDate.iso}|${amount.toFixed(2)}`;
      if (seenInFile.has(duplicateKey)) {
        addError(rowNumber, `loan:${loan.id}`, 'DUPLICATE_IN_FILE', 'Duplicate repayment found within the same file (same loan, date, amount).', { column: 'Loan_ID/Repayment_Date/Repayment_Amount', suggestion: 'Remove duplicate rows before uploading.' }, rawRecord);
        continue;
      }
      seenInFile.add(duplicateKey);

      const existingRepayment = await LoanRepayment.findOne({
        where: {
          loan_id: loan.id,
          repayment_date: parsedDate.iso,
          repayment_amount: amount,
          status: { [Op.in]: ['pending', 'verified'] }
        }
      });

      if (existingRepayment) {
        addError(rowNumber, `loan:${loan.id}`, 'DUPLICATE_IN_SYSTEM', 'A repayment with the same loan, date and amount already exists.', { column: 'Loan_ID/Repayment_Date/Repayment_Amount', suggestion: 'Confirm this repayment is not already recorded, then adjust the date or amount if needed.' }, rawRecord);
        continue;
      }

      const balance = await getLoanRemainingBalance(loan.id);
      if (balance.totalRepayment > 0 && amount > balance.remaining + 0.01) {
        addError(rowNumber, `loan:${loan.id}`, 'AMOUNT_EXCEEDS_BALANCE', `Repayment amount exceeds remaining balance (Remaining: ${balance.remaining.toFixed(2)}).`, { column: 'Repayment_Amount', suggestion: 'Enter an amount less than or equal to the remaining balance.' }, rawRecord);
        continue;
      }

      if (prevalidate) {
        successCount += 1;
        continue;
      }

      await withRetries(async () => {
        await sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED }, async (transaction) => {
          await LoanRepayment.create(
            {
              loan_id: loan.id,
              user_id: loan.user_id,
              repayment_amount: amount,
              repayment_date: parsedDate.iso,
              payment_method: normalizePaymentMethod(methodVal),
              status: 'pending',
              recorded_by: req.user.id,
              notes: notesVal ? String(notesVal).trim() : 'Bulk upload',
              upload_batch_id: batch.id
            },
            { transaction }
          );
        });
      }, 3);

      createdLoanIds.add(loan.id);
      successCount += 1;

      if ((i + 1) % 25 === 0) {
        await flushErrors();
        await updateProgress({ loans_touched_count: createdLoanIds.size });
      }
    }

    await flushErrors();
    const status = successCount === 0 ? 'FAILED' : 'COMPLETED';
    await batch.update({
      total_records: rows.length,
      success_count: successCount,
      failure_count: failureCount,
      status,
      completed_at: new Date(),
      metadata: {
        ...(batch.metadata || {}),
        prevalidate,
        processed_rows: rows.length,
        loans_touched: Array.from(createdLoanIds),
        duration_ms: Date.now() - startedAt
      }
    });

    await ActivityLog.logActivity(
      { id: req.user?.id, role: req.user?.role, name: req.user?.membershipApplication?.name || null },
      'bulk_upload_loan_repayments',
      'upload_batch',
      batch.id,
      `Uploaded loan repayments in batch #${batch.id}`,
      { batch_id: batch.id, type: UPLOAD_TYPE },
      req
    );

    try {
      const admin = await User.findByPk(req.user.id, {
        include: [{ model: MembershipApplication, as: 'membershipApplication', attributes: ['email', 'name'] }],
        attributes: ['id']
      });
      const email = admin?.membershipApplication?.email;
      if (email) {
        await emailService.sendEmail({
          to: email,
          subject: `Bulk Loan Repayments Upload ${batch.status} (Batch #${batch.id})`,
          template: null,
          context: null,
          text: `Your bulk loan repayments upload has ${batch.status}.\n\nTotal: ${batch.total_records}\nSuccessful: ${batch.success_count}\nFailed: ${batch.failure_count}\n\nReview the report from /bulk-uploads/${batch.id}/report.pdf`
        });
      }
    } catch (e) {
      console.error('Bulk loan repayments upload email failed:', e?.message || e);
    }

    if (sync) {
      cleanUpTemp(filePath);
      return res.json({
        success: true,
        batch_id: batch.id,
        type: batch.type,
        status: batch.status,
        total_records: batch.total_records,
        success_count: batch.success_count,
        failure_count: batch.failure_count
      });
    }
    cleanUpTemp(filePath);
    return;
  } catch (error) {
    cleanUpTemp(filePath);
    console.error('Bulk upload loan repayments (v2) error:', error);
    if (res.headersSent) {
      try {
        const lastBatch = await UploadBatch.findOne({ where: { stored_filename: req.file?.filename || null }, order: [['id', 'DESC']] });
        if (lastBatch && lastBatch.status === 'PROCESSING') {
          await lastBatch.update({ status: 'FAILED', completed_at: new Date(), metadata: { ...(lastBatch.metadata || {}), fatal_error: error?.message || 'Unknown error' } });
        }
      } catch {}
      return;
    }
    return res.status(500).json({ success: false, message: 'Internal server error during bulk upload' });
  }
};

const approveBatch = async (req, res) => {
  if (!canApprove(req.user)) return res.status(403).json({ success: false, message: 'Access denied' });
  const batchId = parseInt(req.params.id, 10);
  if (!Number.isFinite(batchId)) return res.status(400).json({ success: false, message: 'Invalid batch id' });

  const batch = await UploadBatch.findByPk(batchId);
  if (!batch || batch.type !== UPLOAD_TYPE) return res.status(404).json({ success: false, message: 'Batch not found' });

  try {
    let updatedCount = 0;
    const touchedLoanIds = new Set();

    await sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED }, async (transaction) => {
      const repayments = await LoanRepayment.findAll({
        where: { upload_batch_id: batchId, status: 'pending' },
        attributes: ['id', 'loan_id'],
        transaction
      });

      if (repayments.length === 0) {
        return;
      }

      const repaymentIds = repayments.map((r) => r.id);
      repayments.forEach((r) => touchedLoanIds.add(r.loan_id));

      const loanIds = Array.from(touchedLoanIds);
      if (loanIds.length > 0) {
        const existingBackups = await UploadBatchBackup.findAll({
          where: { batch_id: batchId, resource_type: 'loan', resource_id: { [Op.in]: loanIds } },
          attributes: ['resource_id'],
          transaction
        });
        const backedLoanIds = new Set(existingBackups.map((b) => b.resource_id));

        const loans = await Loan.findAll({
          where: { id: { [Op.in]: loanIds } },
          attributes: ['id', 'status'],
          transaction
        });

        const backupsToCreate = loans
          .filter((l) => !backedLoanIds.has(l.id))
          .map((l) => ({
            batch_id: batchId,
            resource_type: 'loan',
            resource_id: l.id,
            previous_state: { status: l.status }
          }));

        if (backupsToCreate.length > 0) {
          await UploadBatchBackup.bulkCreate(backupsToCreate, { transaction });
        }
      }

      const [count] = await LoanRepayment.update(
        { status: 'verified' },
        { where: { id: repaymentIds }, transaction }
      );
      updatedCount = count;

      for (const loanId of touchedLoanIds) {
        await checkAndUpdateLoanStatus(loanId, transaction);
      }

      await batch.update(
        {
          metadata: {
            ...(batch.metadata || {}),
            approved_at: new Date().toISOString(),
            approved_by: req.user?.id || null,
            approved_count: updatedCount
          }
        },
        { transaction }
      );
    });

    await ActivityLog.logActivity(
      { id: req.user?.id, role: req.user?.role, name: req.user?.membershipApplication?.name || null },
      'approve_bulk_loan_repayments',
      'upload_batch',
      batchId,
      `Approved loan repayment batch #${batchId}`,
      { batch_id: batchId, approved_count: updatedCount },
      req
    );

    return res.json({ success: true, batch_id: batchId, approved_count: updatedCount });
  } catch (error) {
    console.error('Approve loan repayment batch error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error while approving batch' });
  }
};

const rollbackBatch = async (req, res) => {
  if (!canRollback(req.user)) return res.status(403).json({ success: false, message: 'Access denied' });
  const batchId = parseInt(req.params.id, 10);
  if (!Number.isFinite(batchId)) return res.status(400).json({ success: false, message: 'Invalid batch id' });

  const batch = await UploadBatch.findByPk(batchId);
  if (!batch || batch.type !== UPLOAD_TYPE) return res.status(404).json({ success: false, message: 'Batch not found' });
  if (!canView(req.user)) return res.status(403).json({ success: false, message: 'Access denied' });

  try {
    let deletedCount = 0;
    let restoredLoans = 0;

    await sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED }, async (transaction) => {
      const verifiedCount = await LoanRepayment.count({
        where: { upload_batch_id: batchId, status: 'verified' },
        transaction
      });

      if (verifiedCount > 0) {
        throw new Error('Cannot rollback: batch contains verified repayments.');
      }

      const repayments = await LoanRepayment.findAll({
        where: { upload_batch_id: batchId },
        attributes: ['id', 'loan_id'],
        transaction
      });

      deletedCount = await LoanRepayment.destroy({ where: { upload_batch_id: batchId }, transaction });

      await batch.update(
        {
          metadata: {
            ...(batch.metadata || {}),
            rolled_back_at: new Date().toISOString(),
            rolled_back_by: req.user?.id || null,
            rolled_back_count: deletedCount,
            rolled_back_loans_restored: restoredLoans
          }
        },
        { transaction }
      );
    });

    await ActivityLog.logActivity(
      { id: req.user?.id, role: req.user?.role, name: req.user?.membershipApplication?.name || null },
      'rollback_bulk_loan_repayments',
      'upload_batch',
      batchId,
      `Rolled back loan repayment batch #${batchId}`,
      { batch_id: batchId, deleted_count: deletedCount },
      req
    );

    return res.json({ success: true, batch_id: batchId, deleted_count: deletedCount, loans_restored: restoredLoans });
  } catch (error) {
    const msg = error?.message || 'Internal server error while rolling back batch';
    const status = /Cannot rollback/i.test(msg) ? 400 : 500;
    console.error('Rollback loan repayment batch error:', error);
    return res.status(status).json({ success: false, message: msg });
  }
};

module.exports = {
  upload,
  bulkUploadLoanRepayments,
  approveBatch,
  rollbackBatch,
  UPLOAD_TYPE
};
