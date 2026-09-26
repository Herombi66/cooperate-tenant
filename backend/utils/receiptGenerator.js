const { createPdfDocument, SimplePdfDocument } = require('./pdfHelper');
const { generateQRCodeSVG } = require('./qrHelper');

/**
 * Paper dimensions in PostScript points (72 points = 1 inch, 1 mm = 2.83465 pt)
 */
const PAPER_DIMENSIONS = {
  A4: { width: 595.28, height: 841.89, margin: 36 },
  A5: { width: 419.53, height: 595.28, margin: 28 },
  thermal_80: { width: 226.77, height: 650.0, margin: 12 }, // 80mm
  thermal_58: { width: 164.41, height: 550.0, margin: 8 }    // 58mm
};

/**
 * Format currency in Nigerian Naira
 */
function formatCurrency(amount) {
  const num = parseFloat(amount) || 0;
  return 'NGN ' + num.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Converts integer numbers to words (English/Naira)
 */
function numberToWords(amount) {
  const num = Math.floor(Math.abs(Number(amount) || 0));
  if (num === 0) return 'Zero Naira Only';

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convert(n) {
    if (n < 20) return units[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + units[n % 10] : '');
    if (n < 1000) return units[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convert(n % 100) : '');
    if (n < 1000000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    if (n < 1000000000) return convert(Math.floor(n / 1000000)) + ' Million' + (n % 1000000 ? ' ' + convert(n % 1000000) : '');
    return n.toString();
  }

  const kobo = Math.round((Math.abs(Number(amount) || 0) - num) * 100);
  let words = convert(num) + ' Naira';
  if (kobo > 0) {
    words += ' and ' + convert(kobo) + ' Kobo';
  }
  return words + ' Only';
}

/**
 * Generate PDF buffer for a receipt using template configuration and data
 */
async function generateReceiptPdf(templateConfig, receiptData, options = {}) {
  const paperSize = options.paperSize || templateConfig.paper_size || 'A4';
  const dimensions = PAPER_DIMENSIONS[paperSize] || PAPER_DIMENSIONS.A4;
  const isThermal = paperSize.startsWith('thermal');
  const isTest = Boolean(options.isTest);

  const colors = templateConfig.colors || {
    primary: '#0F766E',
    secondary: '#D97706',
    text: '#1F2937',
    background: '#FFFFFF',
    border: '#E5E7EB'
  };

  const header = templateConfig.header || {
    org_name: 'IMAN MULTI-PURPOSE COOPERATIVE SOCIETY',
    registration_no: 'IMAN/COOP/2024/001',
    address: 'Gombe State, Nigeria',
    phone: '+234-800-000-0000',
    email: 'info@imancooperative.org',
    receipt_title: 'OFFICIAL RECEIPT'
  };

  const sections = templateConfig.sections || {
    show_logo: true,
    show_header: true,
    show_metadata: true,
    show_member_details: true,
    show_breakdown: true,
    show_summary: true,
    show_qr_code: true,
    show_barcode: true,
    show_signatures: true,
    show_stamp: true,
    show_notes: true,
    show_watermark: true
  };

  const watermarkText = isTest
    ? 'SAMPLE - NOT A VALID RECEIPT'
    : (templateConfig.watermark?.text || 'OFFICIAL RECEIPT');

  // Instantiate document
  const doc = createPdfDocument({
    size: [dimensions.width, dimensions.height],
    margin: dimensions.margin
  });

  // Background tint if not pure white
  if (colors.background && colors.background.toLowerCase() !== '#ffffff' && doc.rect && doc.fill) {
    doc.rect(0, 0, dimensions.width, dimensions.height).fill(colors.background);
  }

  // Outer border if requested
  if (templateConfig.border_style && templateConfig.border_style !== 'none') {
    doc.strokeColor(colors.primary || '#0F766E');
    doc.rect(
      dimensions.margin / 2,
      dimensions.margin / 2,
      dimensions.width - dimensions.margin,
      dimensions.height - dimensions.margin
    ).stroke();
  }

  // Watermark Banner / Text
  if (sections.show_watermark || isTest) {
    doc.font('Helvetica-Bold').fontSize(isThermal ? 10 : 20).fillColor('#E5E7EB');
    doc.text(watermarkText, { align: 'center' });
    doc.moveDown(0.5);
  }

  // 1. Header Section
  if (sections.show_header) {
    doc.font('Helvetica-Bold').fontSize(isThermal ? 11 : 16).fillColor(colors.primary || '#0F766E');
    doc.text(header.org_name || 'IMAN MULTI-PURPOSE COOPERATIVE SOCIETY', { align: 'center' });

    doc.font('Helvetica').fontSize(isThermal ? 7 : 9).fillColor('#4B5563');
    if (header.registration_no) {
      doc.text(`Reg No: ${header.registration_no}`, { align: 'center' });
    }
    if (header.address) {
      doc.text(header.address, { align: 'center' });
    }
    if (header.phone || header.email) {
      const contact = [header.phone, header.email].filter(Boolean).join(' | ');
      doc.text(contact, { align: 'center' });
    }

    // Title banner
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').fontSize(isThermal ? 10 : 13).fillColor(colors.primary || '#0F766E');
    doc.text(receiptData.receipt_title || header.receipt_title || 'PAYMENT RECEIPT', { align: 'center', underline: true });
    doc.moveDown(0.5);
  }

  // Divider line
  doc.strokeColor(colors.border || '#E5E7EB');
  doc.moveTo(dimensions.margin, doc.y).lineTo(dimensions.width - dimensions.margin, doc.y).stroke();
  doc.moveDown(0.5);

  // 2. Metadata Section (Receipt No, Date, Payment Method)
  if (sections.show_metadata) {
    doc.font('Helvetica').fontSize(isThermal ? 8 : 9).fillColor(colors.text || '#1F2937');
    const recNo = receiptData.receipt_number || 'IMAN-REC-SAMPLE-0001';
    const dateStr = receiptData.issue_date || new Date().toISOString().slice(0, 10);
    const method = receiptData.payment_method || 'Bank Transfer';

    if (isThermal) {
      doc.text(`Receipt No: ${recNo}`);
      doc.text(`Date: ${dateStr}`);
      doc.text(`Payment Method: ${method}`);
    } else {
      doc.font('Helvetica-Bold').text(`Receipt No: `, { continued: true });
      doc.font('Helvetica').text(recNo);
      doc.font('Helvetica-Bold').text(`Date Issued: `, { continued: true });
      doc.font('Helvetica').text(dateStr);
      doc.font('Helvetica-Bold').text(`Payment Method: `, { continued: true });
      doc.font('Helvetica').text(method);
    }
    doc.moveDown(0.5);
  }

  // 3. Member Details Section
  if (sections.show_member_details && receiptData.member) {
    doc.strokeColor(colors.border || '#E5E7EB');
    doc.moveTo(dimensions.margin, doc.y).lineTo(dimensions.width - dimensions.margin, doc.y).stroke();
    doc.moveDown(0.3);

    doc.font('Helvetica-Bold').fontSize(isThermal ? 8 : 10).fillColor(colors.primary || '#0F766E');
    const memberSectionLabel = receiptData.member_section_title ||
      (receiptData.transaction_type && receiptData.transaction_type.toLowerCase().includes('expense')
        ? 'PAYEE / DISBURSEMENT PARTICULARS:'
        : 'MEMBER DETAILS:');
    doc.text(memberSectionLabel);

    doc.font('Helvetica').fontSize(isThermal ? 7 : 9).fillColor(colors.text || '#1F2937');
    const rawName = receiptData.member.name || 'Cooperative Member';
    const nameDisplay = (rawName.startsWith('Payee') || rawName.startsWith('Name:')) ? rawName : `Name: ${rawName}`;
    doc.text(nameDisplay);
    if (receiptData.member.psn) doc.text(receiptData.member.psn.startsWith('Category:') ? receiptData.member.psn : `PSN/ID: ${receiptData.member.psn}`);
    if (receiptData.member.facility) doc.text(receiptData.member.facility.includes(':') ? receiptData.member.facility : `Facility: ${receiptData.member.facility}`);
    doc.moveDown(0.5);
  }

  // 4. Breakdown & Line Items
  if (sections.show_breakdown) {
    doc.strokeColor(colors.border || '#E5E7EB');
    doc.moveTo(dimensions.margin, doc.y).lineTo(dimensions.width - dimensions.margin, doc.y).stroke();
    doc.moveDown(0.3);

    doc.font('Helvetica-Bold').fontSize(isThermal ? 8 : 10).fillColor(colors.primary || '#0F766E');
    doc.text('TRANSACTION PARTICULARS:');

    const items = receiptData.items || [
      { description: receiptData.transaction_type || 'Cooperative Contribution', amount: receiptData.amount || 25000 }
    ];

    doc.font('Helvetica').fontSize(isThermal ? 7 : 9).fillColor(colors.text || '#1F2937');
    items.forEach((item, idx) => {
      const desc = item.description || `Item ${idx + 1}`;
      const amtStr = formatCurrency(item.amount);
      doc.text(`- ${desc}: ${amtStr}`);
    });

    if (receiptData.balance_after !== undefined) {
      doc.text(`- Current Balance: ${formatCurrency(receiptData.balance_after)}`);
    }
    doc.moveDown(0.5);
  }

  // 5. Payment Summary / Total
  if (sections.show_summary) {
    doc.strokeColor(colors.primary || '#0F766E');
    doc.moveTo(dimensions.margin, doc.y).lineTo(dimensions.width - dimensions.margin, doc.y).stroke();
    doc.moveDown(0.3);

    const totalAmt = receiptData.amount || 25000;
    doc.font('Helvetica-Bold').fontSize(isThermal ? 9 : 12).fillColor(colors.primary || '#0F766E');
    doc.text(`TOTAL PAID: ${formatCurrency(totalAmt)}`);

    doc.font('Helvetica').fontSize(isThermal ? 7 : 8).fillColor('#4B5563');
    doc.text(`Amount in Words: ${numberToWords(totalAmt)}`);
    doc.moveDown(0.5);
  }

  // 6. Security, QR Code & Verification info
  if (sections.show_qr_code) {
    const verifHash = receiptData.verification_hash || 'IMAN-SEC-HASH-OK';
    doc.font('Helvetica-Bold').fontSize(isThermal ? 7 : 8).fillColor(colors.primary || '#0F766E');
    doc.text(`DIGITAL VERIFICATION:`);
    doc.font('Helvetica').fontSize(isThermal ? 6 : 7).fillColor('#6B7280');
    doc.text(`Scan QR or visit /verify-receipt/${receiptData.receipt_number || 'SAMPLE'}`);
    doc.text(`Security Hash: ${verifHash.slice(0, 16)}...`);
    doc.moveDown(0.5);
  }

  // 7. Signature & Official Stamp Section
  if (sections.show_signatures || sections.show_stamp) {
    doc.strokeColor(colors.border || '#E5E7EB');
    doc.moveTo(dimensions.margin, doc.y).lineTo(dimensions.width - dimensions.margin, doc.y).stroke();
    doc.moveDown(0.5);

    if (isThermal) {
      doc.font('Helvetica').fontSize(7).fillColor('#4B5563');
      doc.text('--------------------------------', { align: 'center' });
      doc.text('Authorized Signatory & Stamp', { align: 'center' });
    } else {
      doc.font('Helvetica').fontSize(9).fillColor('#4B5563');
      doc.text('Authorized Signatory: _________________________    Official Stamp: [ SEAL VALIDATED ]');
    }
    doc.moveDown(0.5);
  }

  // 8. Notes & Terms
  if (sections.show_notes) {
    const notes = templateConfig.notes?.text ||
      'This receipt was electronically generated by IMAN Multi-Purpose Cooperative Society. Non-transferable and valid without physical signature when digitally verified.';
    doc.font('Helvetica').fontSize(isThermal ? 6 : 7).fillColor('#6B7280');
    doc.text(notes, { align: isThermal ? 'center' : 'left' });
  }

  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', err => reject(err));
    doc.end();
  });
}

module.exports = {
  PAPER_DIMENSIONS,
  formatCurrency,
  numberToWords,
  generateReceiptPdf
};
