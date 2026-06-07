const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const {
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
} = require('../controllers/bulkUploadTrackingController');

const router = express.Router();

router.use(authenticateToken);

router.get('/', listBatches);
router.get('/metrics', getMetrics);
router.get('/:id', getBatchById);
router.get('/:id/errors', listBatchErrors);
router.get('/:id/errors.csv', downloadBatchErrorsCsv);
router.get('/:id/errors.xlsx', downloadBatchErrorsXlsx);
router.get('/:id/report', getBatchReport);
router.get('/:id/report.csv', downloadBatchReportCsv);
router.get('/:id/report.pdf', downloadBatchReportPdf);
router.get('/:id/stream', streamBatch);
router.put('/:id/errors/:errorId', updateErrorCorrection);
router.post('/:id/reprocess-failed', reprocessFailed);

module.exports = router;
