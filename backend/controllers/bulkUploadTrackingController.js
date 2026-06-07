const { sequelize } = require('../db/connection');
const { UploadBatch, UploadRecordError, ActivityLog, MembershipApplication, User } = require('../models');
const { Op, Transaction } = require('sequelize');
const XLSX = require('xlsx');
let PDFDocument;
try {
  PDFDocument = require('pdfkit');
} catch {}

const requireStaff = (user) => {
  const role = String(user?.role || '').toLowerCase().trim();
  const allowedRoles = ['admin', 'super_admin', 'chairman', 'treasurer', 'secretary', 'manager', 'operator', 'viewer', 'state_auditor'];
  return allowedRoles.includes(role);
};

const listBatches = async (req, res) => {
  try {
    if (!requireStaff(req.user)) return res.status(403).json({ success: false, message: 'Access denied' });

    const { type, status, q, created_by, date_from, date_to, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const likeOp = sequelize.getDialect() === 'postgres' ? Op.iLike : Op.like;

    const where = {};
    if (type) where.type = type;
    if (status) where.status = status.toString().toUpperCase();
    if (created_by) where.created_by = parseInt(created_by);
    if (date_from || date_to) {
      where.created_at = {};
      if (date_from) where.created_at[Op.gte] = new Date(date_from);
      if (date_to) where.created_at[Op.lte] = new Date(date_to);
    }

    const query = q ? q.toString().trim() : '';
    if (query) {
      const idVal = parseInt(query);
      where[Op.or] = [
        ...(Number.isFinite(idVal) ? [{ id: idVal }] : []),
        { type: { [likeOp]: `%${query}%` } },
        { original_filename: { [likeOp]: `%${query}%` } },
        { '$createdBy.membershipApplication.name$': { [likeOp]: `%${query}%` } },
        { '$createdBy.membershipApplication.psn$': { [likeOp]: `%${query}%` } },
        { '$createdBy.membershipApplication.email$': { [likeOp]: `%${query}%` } }
      ];
    }

    const { count, rows } = await UploadBatch.findAndCountAll({
      where,
      order: [['created_at', 'DESC'], ['id', 'DESC']],
      include: [{
        model: User,
        as: 'createdBy',
        attributes: ['id', 'role'],
        required: false,
        include: [{
          model: MembershipApplication,
          as: 'membershipApplication',
          attributes: ['name', 'psn', 'email'],
          required: false
        }]
      }],
      limit: parseInt(limit),
      offset,
      subQuery: false
    });

    res.json({
      success: true,
      batches: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('List upload batches error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getBatchReport = async (req, res) => {
  try {
    if (!requireStaff(req.user)) return res.status(403).json({ success: false, message: 'Access denied' });
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid batch id' });

    const batch = await UploadBatch.findByPk(id, {
      include: [{
        model: UploadRecordError,
        as: 'errors',
        required: false
      }, {
        model: User,
        as: 'createdBy',
        attributes: ['id', 'role'],
        required: false,
        include: [{
          model: MembershipApplication,
          as: 'membershipApplication',
          attributes: ['name', 'psn', 'email'],
          required: false
        }]
      }]
    });
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });

    const createdAt = batch.created_at ? new Date(batch.created_at).getTime() : null;
    const completedAt = batch.completed_at ? new Date(batch.completed_at).getTime() : null;
    const durationMs = createdAt && completedAt ? Math.max(0, completedAt - createdAt) : null;

    const remediationForError = (err) => {
      const steps = [];
      const suggestion = err?.fields?.suggestion ? String(err.fields.suggestion) : '';
      if (suggestion) steps.push(suggestion);

      const code = String(err?.error_code || '').toUpperCase();
      if (code === 'MISSING_FIELDS') {
        steps.push('Ensure required columns are present and not empty, then re-upload.');
      } else if (code === 'INVALID_DATE') {
        steps.push('Use the required date format and ensure the spreadsheet cell is stored as text if needed.');
      } else if (code === 'INVALID_AMOUNT') {
        steps.push('Enter a positive numeric amount (no letters).');
      } else if (code === 'DUPLICATE_IN_FILE') {
        steps.push('Remove duplicate rows before uploading.');
      } else if (code === 'DUPLICATE_IN_SYSTEM') {
        steps.push('Verify the repayment/contribution is not already recorded; adjust date/period or amount if needed.');
      } else if (code === 'UNKNOWN_CONTRIBUTOR' || code === 'MEMBER_NOT_FOUND') {
        steps.push('Confirm PSN/Contributor_ID exists and is spelled correctly.');
      } else if (code === 'AMOUNT_EXCEEDS_BALANCE') {
        steps.push('Use an amount less than or equal to the remaining loan balance.');
      }

      steps.push('After correcting, re-upload the file or use the error correction tool (if enabled) and reprocess failed rows.');
      return Array.from(new Set(steps.filter(Boolean)));
    };

    const errors = Array.isArray(batch.errors) ? batch.errors : [];
    const failureRows = errors.map((e) => ({
      id: e.id,
      row_number: e.row_number,
      record_key: e.record_key,
      error_code: e.error_code,
      message: e.message,
      fields: e.fields || null,
      status: e.status,
      remediation: remediationForError(e)
    }));

    res.json({
      success: true,
      report: {
        batch: {
          id: batch.id,
          type: batch.type,
          status: batch.status,
          original_filename: batch.original_filename,
          total_records: batch.total_records,
          success_count: batch.success_count,
          failure_count: batch.failure_count,
          created_at: batch.created_at,
          completed_at: batch.completed_at,
          duration_ms: durationMs,
          created_by: batch.createdBy ? {
            id: batch.createdBy.id,
            role: batch.createdBy.role,
            name: batch.createdBy.membershipApplication?.name || null,
            psn: batch.createdBy.membershipApplication?.psn || null,
            email: batch.createdBy.membershipApplication?.email || null
          } : null,
          metadata: batch.metadata || null
        },
        summary: {
          processed: (batch.success_count || 0) + (batch.failure_count || 0),
          remaining: Math.max(0, (batch.total_records || 0) - ((batch.success_count || 0) + (batch.failure_count || 0)))
        },
        failed_records: failureRows
      }
    });
  } catch (error) {
    console.error('Get upload batch report error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const downloadBatchReportCsv = async (req, res) => {
  try {
    if (!requireStaff(req.user)) return res.status(403).json({ success: false, message: 'Access denied' });
    const batchId = parseInt(req.params.id);
    if (isNaN(batchId)) return res.status(400).json({ success: false, message: 'Invalid batch id' });

    const batch = await UploadBatch.findByPk(batchId);
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });

    const errors = await UploadRecordError.findAll({
      where: { batch_id: batchId },
      order: [['id', 'ASC']]
    });

    await ActivityLog.logActivity(
      { id: req.user.id, role: req.user.role, name: req.user?.membershipApplication?.name || null },
      'download_bulk_upload_report_csv',
      'upload_batch',
      batchId,
      `Downloaded bulk upload report CSV for batch #${batchId}`,
      { batch_id: batchId },
      req
    );

    const exportDate = new Date().toISOString().slice(0, 10);
    const filename = `upload_${batchId}_report_${exportDate}.csv`;

    const escapeCsv = (v) => {
      const s = v == null ? '' : String(v);
      if (s.includes('"') || s.includes(',') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    const lines = [];
    lines.push(['batch_id', 'type', 'status', 'original_filename', 'total_records', 'success_count', 'failure_count', 'created_at', 'completed_at'].map(escapeCsv).join(','));
    lines.push([
      batch.id,
      batch.type,
      batch.status,
      batch.original_filename || '',
      batch.total_records || 0,
      batch.success_count || 0,
      batch.failure_count || 0,
      batch.created_at ? new Date(batch.created_at).toISOString() : '',
      batch.completed_at ? new Date(batch.completed_at).toISOString() : ''
    ].map(escapeCsv).join(','));

    lines.push('');
    lines.push(['error_id', 'row_number', 'record_key', 'error_code', 'message', 'suggestion', 'fields', 'status'].map(escapeCsv).join(','));

    for (const e of errors) {
      const suggestion = e.fields?.suggestion ? String(e.fields.suggestion) : '';
      const fields = e.fields ? JSON.stringify(e.fields) : '';
      lines.push([
        e.id,
        e.row_number ?? '',
        e.record_key || '',
        e.error_code,
        e.message,
        suggestion,
        fields,
        e.status
      ].map(escapeCsv).join(','));
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(lines.join('\n'));
  } catch (error) {
    console.error('Download batch report CSV error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const downloadBatchReportPdf = async (req, res) => {
  try {
    if (!requireStaff(req.user)) return res.status(403).json({ success: false, message: 'Access denied' });
    const batchId = parseInt(req.params.id);
    if (isNaN(batchId)) return res.status(400).json({ success: false, message: 'Invalid batch id' });
    if (!PDFDocument) return res.status(500).json({ success: false, message: 'PDF export is not available on this server' });

    const batch = await UploadBatch.findByPk(batchId);
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });

    const errors = await UploadRecordError.findAll({
      where: { batch_id: batchId },
      order: [['id', 'ASC']],
      limit: 500
    });

    const exportDate = new Date().toISOString().slice(0, 10);
    const filename = `upload_${batchId}_report_${exportDate}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ size: 'A4', margin: 36 });
    doc.pipe(res);

    doc.fontSize(16).text('Bulk Upload Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#444').text(`Batch #${batch.id} · Type: ${batch.type} · Status: ${batch.status}`);
    doc.text(`File: ${batch.original_filename || '—'}`);
    doc.text(`Created: ${batch.created_at ? new Date(batch.created_at).toLocaleString() : '—'}`);
    doc.text(`Completed: ${batch.completed_at ? new Date(batch.completed_at).toLocaleString() : '—'}`);
    doc.moveDown(0.6);

    doc.fillColor('#000');
    doc.fontSize(11).text(`Total Records: ${batch.total_records || 0}`);
    doc.text(`Successful: ${batch.success_count || 0}`);
    doc.text(`Failed: ${batch.failure_count || 0}`);
    doc.moveDown(0.8);

    doc.fontSize(12).text('Failed Records (first 500)', { underline: true });
    doc.moveDown(0.4);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colRow = 52;
    const colCode = 110;
    const colMsg = pageWidth - colRow - colCode;
    const startX = doc.page.margins.left;

    const drawHeader = () => {
      const y = doc.y;
      doc.fontSize(10).fillColor('#000');
      doc.text('Row', startX, y, { width: colRow });
      doc.text('Code', startX + colRow, y, { width: colCode });
      doc.text('Message / Suggestion', startX + colRow + colCode, y, { width: colMsg });
      doc.moveDown(0.3);
      doc.strokeColor('#cccccc').moveTo(startX, doc.y).lineTo(startX + pageWidth, doc.y).stroke();
      doc.moveDown(0.3);
    };

    drawHeader();

    for (const e of errors) {
      const msg = `${e.message}${e.fields?.suggestion ? `\nSuggestion: ${String(e.fields.suggestion)}` : ''}`;
      const rowText = e.row_number != null ? String(e.row_number) : '';
      const codeText = String(e.error_code || '');

      const height = Math.max(
        doc.heightOfString(rowText, { width: colRow }),
        doc.heightOfString(codeText, { width: colCode }),
        doc.heightOfString(msg, { width: colMsg })
      ) + 6;

      if (doc.y + height > doc.page.height - doc.page.margins.bottom - 24) {
        doc.addPage();
        drawHeader();
      }

      const y = doc.y;
      doc.fontSize(9).fillColor('#111');
      doc.text(rowText, startX, y, { width: colRow });
      doc.text(codeText, startX + colRow, y, { width: colCode });
      doc.text(msg, startX + colRow + colCode, y, { width: colMsg });
      doc.y = y + height;
      doc.strokeColor('#eeeeee').moveTo(startX, doc.y).lineTo(startX + pageWidth, doc.y).stroke();
      doc.moveDown(0.1);
    }

    await ActivityLog.logActivity(
      { id: req.user.id, role: req.user.role, name: req.user?.membershipApplication?.name || null },
      'download_bulk_upload_report_pdf',
      'upload_batch',
      batchId,
      `Downloaded bulk upload report PDF for batch #${batchId}`,
      { batch_id: batchId },
      req
    );

    doc.end();
  } catch (error) {
    console.error('Download batch report PDF error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getMetrics = async (req, res) => {
  try {
    if (!requireStaff(req.user)) return res.status(403).json({ success: false, message: 'Access denied' });
    const { type, date_from, date_to } = req.query;
    const where = {};
    if (type) where.type = type;
    if (date_from || date_to) {
      where.created_at = {};
      if (date_from) where.created_at[Op.gte] = new Date(date_from);
      if (date_to) where.created_at[Op.lte] = new Date(date_to);
    }

    const batches = await UploadBatch.findAll({ where, order: [['id', 'DESC']], limit: 500 });
    const totals = batches.reduce(
      (acc, b) => {
        acc.batches += 1;
        acc.total_records += b.total_records || 0;
        acc.success_count += b.success_count || 0;
        acc.failure_count += b.failure_count || 0;
        const start = b.created_at ? new Date(b.created_at).getTime() : null;
        const end = b.completed_at ? new Date(b.completed_at).getTime() : null;
        if (start && end) acc.durations.push(Math.max(0, end - start));
        return acc;
      },
      { batches: 0, total_records: 0, success_count: 0, failure_count: 0, durations: [] }
    );

    const avgDurationMs =
      totals.durations.length > 0
        ? Math.round(totals.durations.reduce((a, b) => a + b, 0) / totals.durations.length)
        : 0;

    res.json({
      success: true,
      metrics: {
        batches: totals.batches,
        total_records: totals.total_records,
        success_count: totals.success_count,
        failure_count: totals.failure_count,
        success_rate: totals.total_records > 0 ? totals.success_count / totals.total_records : 0,
        average_duration_ms: avgDurationMs
      }
    });
  } catch (error) {
    console.error('Get bulk upload metrics error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const streamBatch = async (req, res) => {
  try {
    if (!requireStaff(req.user)) return res.status(403).json({ success: false, message: 'Access denied' });
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid batch id' });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    let closed = false;
    req.on('close', () => {
      closed = true;
    });

    const send = (data) => {
      if (closed) return;
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    send({ type: 'connected', batch_id: id });

    const interval = setInterval(async () => {
      if (closed) return;
      try {
        const batch = await UploadBatch.findByPk(id);
        if (!batch) {
          send({ type: 'error', message: 'Batch not found' });
          clearInterval(interval);
          res.end();
          return;
        }
        send({ type: 'batch', batch });
        if (batch.status !== 'PROCESSING') {
          clearInterval(interval);
          res.end();
        }
      } catch (e) {
        send({ type: 'error', message: 'Failed to fetch batch status' });
      }
    }, 1000);
  } catch (error) {
    console.error('Stream batch error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getBatchById = async (req, res) => {
  try {
    if (!requireStaff(req.user)) return res.status(403).json({ success: false, message: 'Access denied' });
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid batch id' });

    const batch = await UploadBatch.findByPk(id, {
      include: [{
        model: UploadRecordError,
        as: 'errors',
        required: false
      }]
    });
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });
    res.json({ success: true, batch });
  } catch (error) {
    console.error('Get upload batch error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const listBatchErrors = async (req, res) => {
  try {
    if (!requireStaff(req.user)) return res.status(403).json({ success: false, message: 'Access denied' });
    const batchId = parseInt(req.params.id);
    if (isNaN(batchId)) return res.status(400).json({ success: false, message: 'Invalid batch id' });

    const { status, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where = { batch_id: batchId };
    if (status) where.status = status.toString().toUpperCase();

    const { count, rows } = await UploadRecordError.findAndCountAll({
      where,
      order: [['id', 'ASC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      errors: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('List batch errors error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const downloadBatchErrorsCsv = async (req, res) => {
  try {
    if (!requireStaff(req.user)) return res.status(403).json({ success: false, message: 'Access denied' });
    const batchId = parseInt(req.params.id);
    if (isNaN(batchId)) return res.status(400).json({ success: false, message: 'Invalid batch id' });

    const batch = await UploadBatch.findByPk(batchId);
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });

    const errors = await UploadRecordError.findAll({
      where: { batch_id: batchId },
      order: [['id', 'ASC']]
    });

    await ActivityLog.logActivity(
      { id: req.user.id, role: req.user.role, name: req.user?.membershipApplication?.name || null },
      'download_bulk_upload_errors_csv',
      'upload_batch',
      batchId,
      `Downloaded bulk upload errors CSV for batch #${batchId}`,
      { batch_id: batchId },
      req
    );

    const header = ['error_id', 'row_number', 'record_key', 'error_code', 'message', 'fields', 'status'].join(',');
    const rows = errors.map(e => {
      const fields = e.fields ? JSON.stringify(e.fields).replace(/"/g, '""') : '';
      const msg = (e.message || '').replace(/"/g, '""');
      const key = (e.record_key || '').replace(/"/g, '""');
      return [
        e.id,
        e.row_number ?? '',
        `"${key}"`,
        e.error_code,
        `"${msg}"`,
        `"${fields}"`,
        e.status
      ].join(',');
    });

    const csv = [header, ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=upload_${batchId}_errors.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Download batch errors CSV error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const downloadBatchErrorsXlsx = async (req, res) => {
  try {
    if (!requireStaff(req.user)) return res.status(403).json({ success: false, message: 'Access denied' });
    const batchId = parseInt(req.params.id);
    if (isNaN(batchId)) return res.status(400).json({ success: false, message: 'Invalid batch id' });

    const batch = await UploadBatch.findByPk(batchId);
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });

    const errors = await UploadRecordError.findAll({
      where: { batch_id: batchId, status: 'FAILED' },
      order: [['id', 'ASC']]
    });

    await ActivityLog.logActivity(
      { id: req.user.id, role: req.user.role, name: req.user?.membershipApplication?.name || null },
      'download_bulk_upload_failed_xlsx',
      'upload_batch',
      batchId,
      `Downloaded bulk upload failed-records XLSX for batch #${batchId}`,
      { batch_id: batchId },
      req
    );

    const rows = errors.map((e) => {
      const raw = e.raw_record && typeof e.raw_record === 'object' ? e.raw_record : {};
      const fields = e.fields && typeof e.fields === 'object' ? e.fields : null;
      return {
        row_number: e.row_number ?? null,
        record_key: e.record_key ?? null,
        error_code: e.error_code,
        error_message: e.message,
        error_fields: fields ? JSON.stringify(fields) : null,
        ...raw
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows, { skipHeader: false });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Failed Records');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=upload_${batchId}_failed_records.xlsx`);
    res.send(buffer);
  } catch (error) {
    console.error('Download batch errors XLSX error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const updateErrorCorrection = async (req, res) => {
  try {
    const allowedRoles = ['admin', 'super_admin', 'chairman', 'treasurer'];
    if (!allowedRoles.includes(req.user?.role)) return res.status(403).json({ success: false, message: 'Access denied' });

    const batchId = parseInt(req.params.id);
    const errorId = parseInt(req.params.errorId);
    if (isNaN(batchId) || isNaN(errorId)) return res.status(400).json({ success: false, message: 'Invalid id' });

    const correctedRecord = req.body?.corrected_record;
    if (!correctedRecord || typeof correctedRecord !== 'object') {
      return res.status(400).json({ success: false, message: 'corrected_record must be an object' });
    }

    const errorRow = await UploadRecordError.findOne({ where: { id: errorId, batch_id: batchId } });
    if (!errorRow) return res.status(404).json({ success: false, message: 'Error record not found' });

    await errorRow.update({ corrected_record: correctedRecord, status: 'FAILED', resolved_at: null });

    await ActivityLog.logActivity(
      { id: req.user.id, role: req.user.role, name: req.user?.membershipApplication?.name || null },
      'correct_bulk_upload_record',
      'upload_record_error',
      errorRow.id,
      `Corrected upload error record #${errorRow.id} for batch #${batchId}`,
      { batch_id: batchId, error_id: errorRow.id },
      req
    );

    res.json({ success: true, error: errorRow });
  } catch (error) {
    console.error('Update error correction error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const reprocessFailed = async (req, res) => {
  try {
    const allowedRoles = ['admin', 'super_admin', 'chairman', 'treasurer'];
    if (!allowedRoles.includes(req.user?.role)) return res.status(403).json({ success: false, message: 'Access denied' });

    const batchId = parseInt(req.params.id);
    if (isNaN(batchId)) return res.status(400).json({ success: false, message: 'Invalid batch id' });

    const batch = await UploadBatch.findByPk(batchId);
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });

    const errors = await UploadRecordError.findAll({
      where: { batch_id: batchId, status: 'FAILED' },
      order: [['id', 'ASC']]
    });

    if (errors.length === 0) {
      return res.json({ success: true, message: 'No failed records to reprocess', reprocessed: 0, resolved: 0, still_failed: 0 });
    }

    let resolved = 0;
    let stillFailed = 0;
    let ignored = 0;

    if (batch.type === 'members_import') {
      const memberController = require('./memberController');
      const createMemberAccount = memberController.createMemberAccount || null;
      if (!createMemberAccount) {
        return res.status(500).json({ success: false, message: 'Reprocess handler is not available' });
      }

      await sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED }, async (transaction) => {
        for (const errRow of errors) {
          const record = errRow.corrected_record || errRow.raw_record;
          if (!record || typeof record !== 'object') {
            stillFailed += 1;
            continue;
          }

          const normalized = {
            psn: (record.psn || '').toString().trim(),
            name: (record.name || '').toString().trim(),
            email: (record.email || '').toString().trim().toLowerCase(),
            phone: record.phone ? record.phone.toString().trim() : null,
            facility_name: record.facility_name ? record.facility_name.toString().trim() : null,
            next_of_kin_name: record.next_of_kin_name ? record.next_of_kin_name.toString().trim() : null,
            next_of_kin_phone: record.next_of_kin_phone ? record.next_of_kin_phone.toString().trim() : null,
            savings: parseFloat(record.savings || 0) || 0,
            investment: parseFloat(record.investment || 0) || 0,
            target_saving: parseFloat(record.target_saving || 0) || 0,
            target_period: parseInt(record.target_period || 12, 10) || 12
          };

          if (!normalized.psn || !normalized.name || !normalized.email) {
            stillFailed += 1;
            continue;
          }

          const existing = await MembershipApplication.findOne({
            where: { [Op.or]: [{ psn: normalized.psn }, { email: normalized.email }] },
            transaction
          });
          if (existing) {
            await errRow.update({ status: 'IGNORED', resolved_at: new Date() }, { transaction });
            ignored += 1;
            continue;
          }

          try {
            const application = await MembershipApplication.create({
              psn: normalized.psn,
              name: normalized.name,
              email: normalized.email,
              phone: normalized.phone,
              facility_name: normalized.facility_name,
              next_of_kin_name: normalized.next_of_kin_name,
              next_of_kin_phone: normalized.next_of_kin_phone,
              savings: normalized.savings,
              investment: normalized.investment,
              target_saving: normalized.target_saving,
              target_period: normalized.target_period,
              status: 'approved',
              application_date: new Date(),
              reviewed_by: req.user?.id || null,
              review_date: new Date()
            }, { transaction });

            await createMemberAccount(application.id, null, process.env.NODE_ENV !== 'test');

            await errRow.update({ status: 'RESOLVED', resolved_at: new Date() }, { transaction });
            resolved += 1;
          } catch (e) {
            stillFailed += 1;
            await errRow.update({ message: e.message || errRow.message }, { transaction });
          }
        }
      });
    } else if (batch.type === 'contributions_import') {
      const contributionController = require('./contributionController');
      const handler = contributionController.reprocessContributionUploadRecord || null;
      if (!handler) return res.status(500).json({ success: false, message: 'Reprocess handler is not available' });

      for (const errRow of errors) {
        const record = errRow.corrected_record || errRow.raw_record;
        if (!record || typeof record !== 'object') {
          stillFailed += 1;
          continue;
        }

        try {
          await sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED }, async (transaction) => {
            const result = await handler(record, req.user?.id || null, transaction);
            if (!result?.success) throw new Error(result?.error || 'Failed to process corrected row');
            await errRow.update({ status: 'RESOLVED', resolved_at: new Date() }, { transaction });
          });
          resolved += 1;
        } catch (e) {
          stillFailed += 1;
          await errRow.update({ message: e?.message || errRow.message }, {});
        }
      }

      const remainingFailed = await UploadRecordError.count({ where: { batch_id: batchId, status: 'FAILED' } });
      const batchFresh = await UploadBatch.findByPk(batchId);
      if (batchFresh) {
        const newSuccess = Number(batchFresh.success_count || 0) + resolved;
        const newFailure = remainingFailed;
        await batchFresh.update({
          success_count: newSuccess,
          failure_count: newFailure,
          status: remainingFailed === 0 ? 'COMPLETED' : 'FAILED',
          completed_at: remainingFailed === 0 ? new Date() : batchFresh.completed_at
        });
      }
    } else {
      return res.status(400).json({ success: false, message: `Reprocess is not supported for batch type '${batch.type}'` });
    }

    await ActivityLog.logActivity(
      { id: req.user.id, role: req.user.role, name: req.user?.membershipApplication?.name || null },
      'reprocess_bulk_upload_failed_records',
      'upload_batch',
      batchId,
      `Reprocessed failed records for upload batch #${batchId}`,
      { batch_id: batchId, resolved, ignored, still_failed: stillFailed },
      req
    );

    res.json({
      success: true,
      message: 'Reprocess completed',
      reprocessed: errors.length,
      resolved,
      ignored,
      still_failed: stillFailed
    });
  } catch (error) {
    console.error('Reprocess failed records error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = {
  listBatches,
  getBatchById,
  listBatchErrors,
  downloadBatchErrorsCsv,
  downloadBatchErrorsXlsx,
  getBatchReport,
  downloadBatchReportCsv,
  downloadBatchReportPdf,
  getMetrics,
  streamBatch,
  updateErrorCorrection,
  reprocessFailed
};
