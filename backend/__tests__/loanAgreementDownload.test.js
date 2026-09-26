const { createPdfDocument, SimplePdfDocument, getPDFDocument } = require('../utils/pdfHelper');
const { downloadAgreement } = require('../controllers/loanController');
const { LoanAgreement, Loan, User, MembershipApplication } = require('../models');

describe('Loan Agreement Download & PDF Generation', () => {
  it('should generate a valid PDF buffer via SimplePdfDocument fallback', (done) => {
    const doc = new SimplePdfDocument({ size: 'A4', margin: 48 });
    doc.fontSize(18).fillColor('#1E3A8A').text('IMAN MULTIPURPOSE COOPERATIVE SOCIETY', { align: 'center' });
    doc.fontSize(14).fillColor('#047857').text('AGENT AGREEMENT (WAKALA)', { align: 'center' });
    doc.moveDown(0.5);
    doc.moveTo(48, doc.y).lineTo(547, doc.y).strokeColor('#E5E7EB').stroke();
    doc.moveDown(0.8);
    doc.fontSize(10).fillColor('#374151');
    doc.text('Agreement Reference ID: AG-00150');
    doc.text('Loan Application ID: #150');
    doc.text('Status: ACCEPTED');
    doc.moveDown(0.8);

    doc.rect(48, doc.y, 499, 65).fillAndStroke('#F3F4F6', '#D1D5DB');
    doc.fillColor('#1F2937').fontSize(10);
    doc.text('ELECTRONIC SIGNATURE & CERTIFICATION', 60, doc.y + 10, { bold: true });

    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => {
      const buf = Buffer.concat(chunks);
      expect(buf.length).toBeGreaterThan(500);
      expect(buf.slice(0, 5).toString()).toBe('%PDF-');
      expect(buf.toString('latin1')).toContain('%%EOF');
      done();
    });

    doc.end();
  });

  it('createPdfDocument should return a usable document instance with text and pipe methods', () => {
    const doc = createPdfDocument({ size: 'A4', margin: 48 });
    expect(typeof doc.text).toBe('function');
    expect(typeof doc.fontSize).toBe('function');
    expect(typeof doc.moveDown).toBe('function');
    expect(typeof doc.pipe).toBe('function');
    expect(typeof doc.end).toBe('function');
  });

  it('downloadAgreement should handle simulated agreement record without 500 PDF generator error', async () => {
    // Mock LoanAgreement.findByPk
    const originalFindByPk = LoanAgreement.findByPk;
    LoanAgreement.findByPk = jest.fn().mockResolvedValue({
      id: 150,
      loan_id: 88,
      user_id: 10,
      type: 'agent_agreement',
      status: 'accepted',
      version: '1.0',
      created_at: new Date('2026-09-19T10:00:00Z'),
      ip_address: '127.0.0.1',
      loan: {
        id: 88,
        loan_type: 'cash',
        amount_requested: 150000,
        amount_approved: 150000,
        repayment_period_months: 12,
        monthly_repayment: 12500,
        total_repayment: 150000
      },
      user: {
        id: 10,
        name: 'Ahmed Bello',
        email: 'ahmed@example.com',
        membershipApplication: {
          name: 'Ahmed Bello',
          psn: 'PSN-1002',
          email: 'ahmed@example.com',
          phone: '08012345678'
        }
      }
    });

    const headers = {};
    const req = {
      params: { id: '150' },
      user: { id: 1, role: 'admin' }
    };
    const { PassThrough } = require('stream');
    const res = new PassThrough();
    res.setHeader = jest.fn((k, v) => {
      headers[k] = v;
    });
    res.status = jest.fn().mockReturnThis();
    res.json = jest.fn().mockReturnThis();

    try {
      await downloadAgreement(req, res);

      expect(res.status).not.toHaveBeenCalledWith(500);
      expect(headers['Content-Type']).toBe('application/pdf');
      expect(headers['Content-Disposition']).toContain('agent_agreement_loan_88_150.pdf');
    } finally {
      LoanAgreement.findByPk = originalFindByPk;
    }
  });

  it('downloadAgreement should succeed with fallback PDF when PDFKit is simulated missing', async () => {
    // Intercept pdfHelper.getPDFDocument to return null
    const pdfHelper = require('../utils/pdfHelper');
    const originalGetPDF = pdfHelper.getPDFDocument;
    pdfHelper.getPDFDocument = jest.fn().mockReturnValue(null);

    const originalFindByPk = LoanAgreement.findByPk;
    LoanAgreement.findByPk = jest.fn().mockResolvedValue({
      id: 150,
      loan_id: 88,
      user_id: 10,
      type: 'murabaha_contract',
      status: 'accepted',
      version: '1.0',
      created_at: new Date('2026-09-19T10:00:00Z'),
      loan: {
        id: 88,
        loan_type: 'asset',
        amount_requested: 250000,
        amount_approved: 250000,
        repayment_period_months: 6,
        monthly_repayment: 45000,
        total_repayment: 270000
      },
      user: {
        id: 10,
        name: 'Fatima Garba',
        membershipApplication: {
          name: 'Fatima Garba',
          psn: 'PSN-2005'
        }
      }
    });

    const headers = {};
    const req = {
      params: { id: '150' },
      user: { id: 10, role: 'member' } // Borrower themselves
    };
    const { PassThrough } = require('stream');
    const res = new PassThrough();
    const chunks = [];
    res.on('data', (chunk) => chunks.push(chunk));
    res.setHeader = jest.fn((k, v) => {
      headers[k] = v;
    });
    res.status = jest.fn().mockReturnThis();
    res.json = jest.fn().mockReturnThis();

    try {
      await downloadAgreement(req, res);

      expect(res.status).not.toHaveBeenCalledWith(500);
      expect(headers['Content-Type']).toBe('application/pdf');
      expect(headers['Content-Disposition']).toContain('murabaha_contract_loan_88_150.pdf');
      const fullPdf = Buffer.concat(chunks);
      expect(fullPdf.length).toBeGreaterThan(500);
      expect(fullPdf.slice(0, 5).toString()).toBe('%PDF-');
    } finally {
      pdfHelper.getPDFDocument = originalGetPDF;
      LoanAgreement.findByPk = originalFindByPk;
    }
  });
});
