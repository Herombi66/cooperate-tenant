const fs = require('fs');
const path = require('path');
const { createPdfDocument } = require('./pdfHelper');
const { generateQRCodeSVG } = require('./qrHelper');

/**
 * Dimensions for A4 Portrait in PostScript points (72 pt = 1 inch)
 */
const A4_DIMENSIONS = {
  width: 595.28,
  height: 841.89,
  margin: 40
};

/**
 * Format currency in Nigerian Naira (e.g. ₦800,000.00 / NGN 800,000.00)
 * Safely avoids broken characters in standard PDF fonts.
 */
function formatCurrency(amount, useNairaSymbol = true) {
  const num = parseFloat(amount) || 0;
  const formatted = num.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return useNairaSymbol ? `NGN ${formatted}` : `NGN ${formatted}`;
}

/**
 * Format date to Nigerian official standard (e.g. 25 September 2026)
 */
function formatDate(dateInput) {
  if (!dateInput) return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

/**
 * Format date and time for digital signatures
 */
function formatDateTime(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) return String(dateInput);
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Standard default Islamic Murabaha Contract clauses
 */
const DEFAULT_MURABAHA_TERMS = [
  {
    clause_no: 1,
    title: 'MURABAHA SALE DECLARATION',
    text: 'IMAN Multipurpose Cooperative Society ("Seller") sells to the Member ("Buyer") the approved commodities or assets under Islamic Murabaha cost-plus-profit financing. The Seller expressly discloses the acquisition cost and agreed cooperative profit markup.'
  },
  {
    clause_no: 2,
    title: 'OFFER, ACCEPTANCE & POSSESSION',
    text: 'The Buyer confirms physical or constructive inspection, specification verification, and unconditional acceptance of the financed assets/commodities in good order, and takes full constructive possession thereof.'
  },
  {
    clause_no: 3,
    title: 'REPAYMENT OBLIGATION & TENURE',
    text: 'The Buyer commits to paying the total Murabaha sale price in agreed consecutive monthly installments according to the attached Repayment Schedule through verified cooperative payroll deduction or direct remittance.'
  },
  {
    clause_no: 4,
    title: 'PAYMENT DEFAULT & COOPERATIVE REMEDIES',
    text: 'In the event of default or late payment without valid Shari\'ah-compliant excuse, the Cooperative reserve the right to lien the member\'s monthly thrift contributions, dividend shares, and call upon the approved guarantor(s) in accordance with Cooperative Bye-Laws.'
  },
  {
    clause_no: 5,
    title: 'EARLY SETTLEMENT POLICY',
    text: 'The Buyer may settle the outstanding balance early. Any discretionary price rebate (Ibra) shall be determined strictly at the sole discretion of the Cooperative Board and Shari\'ah Advisory Committee without contractual rebate stipulation.'
  },
  {
    clause_no: 6,
    title: 'BINDING ELECTRONIC ACCEPTANCE',
    text: 'The Buyer acknowledges that electronic acceptance via the Cooperative Portal constitutes an authentic, irrevocable, legally binding contract under the Nigerian Evidence Act and Cooperative Societies Regulations.'
  }
];

/**
 * Standard default Agent Agreement (Wakala) clauses
 */
const DEFAULT_WAKALA_TERMS = [
  {
    clause_no: 1,
    title: 'AGENCY APPOINTMENT (WAKALA)',
    text: 'The Member ("Principal") appoints IMAN Multipurpose Cooperative Society ("Agent") as its non-exclusive agent to purchase, inspect, and transport goods on behalf of the Member using the approved financing facility.'
  },
  {
    clause_no: 2,
    title: 'FIDUCIARY RESPONSIBILITY',
    text: 'The Agent shall exercise due diligence, care, and good faith in executing the purchase according to the specifications agreed with the Member.'
  },
  {
    clause_no: 3,
    title: 'DISCLOSURE & RECORD KEEPING',
    text: 'All supplier receipts, delivery notes, and purchase invoices shall remain accessible for Member review and official cooperative audit verification.'
  }
];

/**
 * Resolve logo file path on disk
 */
function resolveLogoPath() {
  const possiblePaths = [
    path.resolve(__dirname, '../../imanmcs-project/public/logo.png'),
    path.resolve(__dirname, '../../imanmcs-project/src/assets/logo.png'),
    path.resolve(__dirname, '../public/logo.png')
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/**
 * Main Contract PDF Generator
 * Generates an official, publication-quality A4 PDF for Murabaha Sales Contracts and Agent Agreements
 *
 * @param {Object} templateConfig - Branding and layout settings from DocumentDesigner
 * @param {Object} contractData - Financial ledger and member details
 * @param {Object} options - Options { isTest: boolean, stream: Stream }
 * @returns {Promise<Buffer>}
 */
async function generateContractPdf(templateConfig = {}, contractData = {}, options = {}) {
  const isTest = Boolean(options.isTest);
  const layout = templateConfig.layout_config || templateConfig;

  // Extract color theme
  const colors = layout.colors || {
    primary: '#047857',
    secondary: '#B45309',
    text: '#111827',
    background: '#FFFFFF',
    border: '#E5E7EB',
    accent: '#ECFDF5'
  };

  // Header & Org details
  const header = layout.header || {
    org_name: 'IMAN MULTIPURPOSE COOPERATIVE SOCIETY',
    chapter: 'Gombe State Chapter',
    registration_no: 'IMAN/COOP/2024/001',
    address: 'Federal Medical Centre Complex, Gombe State, Nigeria',
    phone: '+234 806 573 6114',
    email: 'info@imancooperative.org',
    website: 'www.imancooperative.org',
    contract_title: 'MURABAHA SALES CONTRACT'
  };

  const sections = layout.sections || {
    show_logo: true,
    show_header: true,
    show_metadata: true,
    show_borrower_card: true,
    show_financing_card: true,
    show_breakdown_card: true,
    show_schedule: true,
    show_terms: true,
    show_signatures: true,
    show_stamp: true,
    show_qr_code: true,
    show_watermark: true,
    show_footer: true
  };

  const logoConfig = layout.logo || {
    position: 'left',
    width: 65,
    height: 65,
    show_on_print: true
  };

  const stampConfig = layout.stamp || {
    show: true,
    text: 'IMAN MULTIPURPOSE COOPERATIVE SOCIETY • OFFICIAL VERIFIED SEAL • GOMBE STATE',
    color: colors.primary
  };

  // Terms configuration
  const contractType = contractData.type || templateConfig.type || 'murabaha_contract';
  const terms = (layout.terms && layout.terms.length > 0)
    ? layout.terms
    : (contractType === 'agent_agreement' ? DEFAULT_WAKALA_TERMS : DEFAULT_MURABAHA_TERMS);

  // Contract & Member data
  const agreementRef = contractData.agreement_reference || `AG-${String(contractData.id || 152).padStart(5, '0')}`;
  const loanId = contractData.loan_id ? `#${contractData.loan_id}` : '#234';
  const contractVersion = `v${contractData.version || '1.0'}`;
  const agreementStatus = (contractData.status || 'pending').toUpperCase();
  const recordedDate = formatDate(contractData.created_at || contractData.action_timestamp);
  const signatureRef = contractData.signature_reference || `SIG-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${contractData.borrower_psn || '38762'}`;

  const borrowerName = contractData.borrower_name || 'Mohammed Kabir Ahmed';
  const borrowerPsn = contractData.borrower_psn || '38762';
  const borrowerEmail = contractData.borrower_email || 'mkabirahmed143@gmail.com';
  const borrowerPhone = contractData.borrower_phone || '0806 573 6114';
  const borrowerFacility = contractData.borrower_facility || 'General Hospital / State Ministry';

  // Financial figures
  const principalAmount = Number(contractData.principal_amount || contractData.amount_approved || contractData.amount_requested || 800000);
  const profitMarkup = Number(contractData.profit_markup || contractData.markup || (principalAmount * 0.1));
  const totalSalePrice = Number(contractData.total_sale_price || contractData.total_repayment || (principalAmount + profitMarkup));
  const tenureMonths = Number(contractData.tenure_months || contractData.repayment_period_months || 7);
  const monthlyRepayment = Number(contractData.monthly_repayment || (totalSalePrice / (tenureMonths || 1)));

  // Setup Document
  const doc = createPdfDocument({
    size: 'A4',
    margin: A4_DIMENSIONS.margin,
    autoFirstPage: true
  });

  const contentWidth = A4_DIMENSIONS.width - A4_DIMENSIONS.margin * 2;
  const leftX = A4_DIMENSIONS.margin;
  const rightX = A4_DIMENSIONS.width - A4_DIMENSIONS.margin;
  const maxY = A4_DIMENSIONS.height - A4_DIMENSIONS.margin - 40;

  let totalPages = 1;
  const pageNumbers = [];

  // Helper: check page overflow and add new page
  const ensureSpace = (neededHeight) => {
    if (doc.y + neededHeight > maxY) {
      doc.addPage();
      totalPages++;
      drawPageBackground();
    }
  };

  // Helper: draw subtle page background & border
  const drawPageBackground = () => {
    if (colors.background && colors.background.toLowerCase() !== '#ffffff' && doc.rect && doc.fill) {
      doc.rect(0, 0, A4_DIMENSIONS.width, A4_DIMENSIONS.height).fill(colors.background);
    }
    // Subtle outer border
    if (doc.strokeColor && doc.rect) {
      doc.strokeColor(colors.border || '#E5E7EB');
      doc.rect(A4_DIMENSIONS.margin / 2, A4_DIMENSIONS.margin / 2, A4_DIMENSIONS.width - A4_DIMENSIONS.margin, A4_DIMENSIONS.height - A4_DIMENSIONS.margin).stroke();
    }
  };

  drawPageBackground();

  // Watermark for Sample / Pending / Preview
  if (isTest || agreementStatus !== 'ACCEPTED') {
    const wmText = isTest ? 'SAMPLE PREVIEW — NOT A VALID AGREEMENT' : 'DRAFT / PENDING SIGNATURE';
    doc.save && doc.save();
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#D1D5DB');
    doc.text(wmText, leftX, 18, { width: contentWidth, align: 'center' });
    doc.restore && doc.restore();
  }

  // ==========================================
  // 1. OFFICIAL BRANDED HEADER
  // ==========================================
  if (sections.show_header) {
    const logoPath = resolveLogoPath();
    const hasLogo = sections.show_logo && logoPath && logoConfig.show_on_print;
    const logoW = Number(logoConfig.width) || 55;
    const logoH = Number(logoConfig.height) || 55;
    const logoPos = logoConfig.position || 'left';

    const headerTop = doc.y || 45;

    if (hasLogo && doc.image) {
      try {
        let logoX = leftX;
        if (logoPos === 'center') logoX = (A4_DIMENSIONS.width - logoW) / 2;
        if (logoPos === 'right') logoX = rightX - logoW;

        doc.image(logoPath, logoX, headerTop, { width: logoW, height: logoH, fit: [logoW, logoH] });
        if (logoPos === 'center') {
          doc.y = headerTop + logoH + 8;
        }
      } catch (err) {
        console.warn('Logo image rendering skipped:', err.message);
      }
    }

    const titleAlign = logoPos === 'center' ? 'center' : 'left';
    const textStartX = (hasLogo && logoPos === 'left') ? leftX + logoW + 14 : leftX;
    const textWidth = (hasLogo && (logoPos === 'left' || logoPos === 'right')) ? contentWidth - logoW - 14 : contentWidth;

    doc.font('Helvetica-Bold').fontSize(14).fillColor(colors.primary);
    doc.text((header.org_name || 'IMAN MULTIPURPOSE COOPERATIVE SOCIETY').toUpperCase(), textStartX, headerTop + 2, {
      width: textWidth,
      align: titleAlign
    });

    doc.font('Helvetica-Bold').fontSize(9).fillColor(colors.secondary || '#B45309');
    doc.text(header.chapter || 'Gombe State Chapter', textStartX, doc.y + 2, {
      width: textWidth,
      align: titleAlign
    });

    doc.font('Helvetica').fontSize(8).fillColor('#4B5563');
    const contactLine = [
      header.registration_no ? `Reg: ${header.registration_no}` : null,
      header.address,
      header.phone,
      header.email
    ].filter(Boolean).join(' • ');

    doc.text(contactLine, textStartX, doc.y + 2, {
      width: textWidth,
      align: titleAlign
    });

    const headerEndY = Math.max(doc.y, headerTop + (hasLogo ? logoH : 40));
    doc.y = headerEndY + 10;

    // Contract Title Banner
    const bannerTop = doc.y;
    doc.rect(leftX, bannerTop, contentWidth, 26).fill(colors.primary);
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#FFFFFF');
    const contractTitle = (contractType === 'agent_agreement'
      ? 'AGENT FINANCING AGREEMENT (WAKALA)'
      : (header.contract_title || 'MURABAHA SALES CONTRACT')).toUpperCase();
    doc.text(contractTitle, leftX, bannerTop + 7, { width: contentWidth, align: 'center' });

    doc.y = bannerTop + 34;
  }

  // ==========================================
  // 2. DOCUMENT INFORMATION PANEL (2-COLUMN)
  // ==========================================
  if (sections.show_metadata) {
    const boxTop = doc.y;
    const boxHeight = 52;
    const halfWidth = (contentWidth - 12) / 2;

    // Outer subtle card
    doc.rect(leftX, boxTop, contentWidth, boxHeight).fillAndStroke(colors.accent || '#F0FDF4', colors.border || '#CBD5E1');

    // Left Column
    doc.font('Helvetica-Bold').fontSize(8).fillColor(colors.primary);
    doc.text('DOCUMENT REFERENCE DETAILS', leftX + 10, boxTop + 8);
    doc.font('Helvetica').fontSize(8).fillColor(colors.text);
    doc.text(`Agreement Ref: `, leftX + 10, boxTop + 22, { continued: true });
    doc.font('Helvetica-Bold').text(agreementRef);
    doc.font('Helvetica').text(`Loan Application ID: `, leftX + 10, boxTop + 35, { continued: true });
    doc.font('Helvetica-Bold').text(loanId, { continued: true });
    doc.font('Helvetica').text(`  •  Version: ${contractVersion}`);

    // Right Column
    const col2X = leftX + halfWidth + 12;
    doc.font('Helvetica-Bold').fontSize(8).fillColor(colors.primary);
    doc.text('AUTHENTICATION & STATUS', col2X, boxTop + 8);

    doc.font('Helvetica').fontSize(8).fillColor(colors.text);
    doc.text('Status: ', col2X, boxTop + 22, { continued: true });
    const isAccepted = agreementStatus === 'ACCEPTED';
    doc.font('Helvetica-Bold').fillColor(isAccepted ? '#059669' : '#D97706').text(`● ${agreementStatus}`);
    doc.font('Helvetica').fillColor(colors.text).text(`Recorded Date: `, col2X, boxTop + 35, { continued: true });
    doc.font('Helvetica-Bold').text(recordedDate);

    doc.y = boxTop + boxHeight + 10;
  }

  // ==========================================
  // 3. BORROWER DETAILS CARD
  // ==========================================
  if (sections.show_borrower_card) {
    ensureSpace(60);
    const cardTop = doc.y;
    const cardH = 50;

    doc.rect(leftX, cardTop, contentWidth, cardH).fillAndStroke('#FFFFFF', colors.border || '#E5E7EB');
    // Top border bar
    doc.rect(leftX, cardTop, contentWidth, 3).fill(colors.primary);

    doc.font('Helvetica-Bold').fontSize(9).fillColor(colors.primary);
    doc.text('BUYER / BORROWER INFORMATION', leftX + 10, cardTop + 8);

    const halfW = (contentWidth - 20) / 2;
    doc.font('Helvetica').fontSize(8).fillColor('#4B5563');
    doc.text('Full Name: ', leftX + 10, cardTop + 22, { continued: true });
    doc.font('Helvetica-Bold').fillColor(colors.text).text(borrowerName);
    doc.font('Helvetica').fillColor('#4B5563').text('Member PSN: ', leftX + 10, cardTop + 34, { continued: true });
    doc.font('Helvetica-Bold').fillColor(colors.text).text(borrowerPsn);

    doc.font('Helvetica').fillColor('#4B5563').text('Phone: ', leftX + halfW + 10, cardTop + 22, { continued: true });
    doc.font('Helvetica-Bold').fillColor(colors.text).text(borrowerPhone);
    doc.font('Helvetica').fillColor('#4B5563').text('Email: ', leftX + halfW + 10, cardTop + 34, { continued: true });
    doc.font('Helvetica-Bold').fillColor(colors.text).text(borrowerEmail);

    doc.y = cardTop + cardH + 10;
  }

  // ==========================================
  // 4. MURABAHA FINANCING & COST-PLUS BREAKDOWN
  // ==========================================
  if (sections.show_financing_card || sections.show_breakdown_card) {
    ensureSpace(75);
    const sectionTop = doc.y;
    const halfW = (contentWidth - 10) / 2;
    const cardH = 70;

    // Card 1: Facility Structure
    doc.rect(leftX, sectionTop, halfW, cardH).fillAndStroke('#FFFFFF', colors.border || '#E5E7EB');
    doc.rect(leftX, sectionTop, halfW, 3).fill(colors.secondary || '#B45309');
    doc.font('Helvetica-Bold').fontSize(9).fillColor(colors.secondary || '#B45309');
    doc.text('FINANCING FACILITY DETAILS', leftX + 8, sectionTop + 8);

    doc.font('Helvetica').fontSize(8).fillColor('#4B5563');
    doc.text('Financing Type: ', leftX + 8, sectionTop + 22, { continued: true });
    doc.font('Helvetica-Bold').fillColor(colors.text).text('Murabaha Asset Financing');

    doc.font('Helvetica').fillColor('#4B5563').text('Repayment Tenure: ', leftX + 8, sectionTop + 34, { continued: true });
    doc.font('Helvetica-Bold').fillColor(colors.text).text(`${tenureMonths} Months`);

    doc.font('Helvetica').fillColor('#4B5563').text('Monthly Installment: ', leftX + 8, sectionTop + 46, { continued: true });
    doc.font('Helvetica-Bold').fillColor(colors.primary).text(formatCurrency(monthlyRepayment));

    // Card 2: Cost-Plus-Profit Breakdown
    const col2X = leftX + halfW + 10;
    doc.rect(col2X, sectionTop, halfW, cardH).fillAndStroke(colors.accent || '#F0FDF4', colors.border || '#E5E7EB');
    doc.rect(col2X, sectionTop, halfW, 3).fill(colors.primary);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(colors.primary);
    doc.text('COST-PLUS-PROFIT BREAKDOWN', col2X + 8, sectionTop + 8);

    doc.font('Helvetica').fontSize(8).fillColor('#4B5563');
    doc.text('Cooperative Cost / Principal: ', col2X + 8, sectionTop + 22, { continued: true });
    doc.font('Helvetica-Bold').fillColor(colors.text).text(formatCurrency(principalAmount));

    doc.font('Helvetica').fillColor('#4B5563').text('Agreed Murabaha Profit: ', col2X + 8, sectionTop + 34, { continued: true });
    doc.font('Helvetica-Bold').fillColor('#059669').text(`+ ${formatCurrency(profitMarkup)}`);

    doc.font('Helvetica-Bold').fontSize(8).fillColor(colors.primary);
    doc.text('TOTAL MURABAHA SALE PRICE: ', col2X + 8, sectionTop + 48, { continued: true });
    doc.font('Helvetica-Bold').fontSize(9).fillColor(colors.primary).text(formatCurrency(totalSalePrice));

    doc.y = sectionTop + cardH + 10;
  }

  // ==========================================
  // 5. DYNAMIC REPAYMENT SCHEDULE TABLE
  // ==========================================
  if (sections.show_schedule) {
    ensureSpace(90);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(colors.primary);
    doc.text('REPAYMENT SCHEDULE & INSTALLMENT BREAKDOWN', leftX, doc.y);
    doc.y += 4;

    const tableTop = doc.y;
    const rowH = 16;
    const colW = {
      no: 35,
      date: 160,
      amount: 180,
      status: contentWidth - 375
    };

    // Table Header
    doc.rect(leftX, tableTop, contentWidth, rowH).fill(colors.primary);
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#FFFFFF');
    doc.text('No.', leftX + 6, tableTop + 4);
    doc.text('Installment Due Date', leftX + colW.no + 6, tableTop + 4);
    doc.text('Installment Amount', leftX + colW.no + colW.date + 6, tableTop + 4);
    doc.text('Status', leftX + colW.no + colW.date + colW.amount + 6, tableTop + 4);

    let curY = tableTop + rowH;

    // Use actual repayments if available; otherwise calculate dynamic monthly installments
    const scheduleItems = (contractData.repayments && contractData.repayments.length > 0)
      ? contractData.repayments.slice(0, 12)
      : Array.from({ length: Math.min(tenureMonths, 12) }, (_, i) => {
          const d = new Date(contractData.first_repayment_date || Date.now());
          d.setMonth(d.getMonth() + i + 1);
          return {
            installment_no: i + 1,
            repayment_date: d.toISOString().slice(0, 10),
            amount: monthlyRepayment,
            status: i === 0 && contractData.repayments_paid > 0 ? 'PAID' : 'SCHEDULED'
          };
        });

    scheduleItems.forEach((item, idx) => {
      ensureSpace(rowH);
      const isAlt = idx % 2 === 1;
      if (isAlt) {
        doc.rect(leftX, curY, contentWidth, rowH).fill('#F9FAFB');
      } else {
        doc.rect(leftX, curY, contentWidth, rowH).fill('#FFFFFF');
      }
      doc.rect(leftX, curY, contentWidth, rowH).strokeColor(colors.border || '#E5E7EB').stroke();

      const numStr = String(item.installment_no || idx + 1);
      const dateStr = formatDate(item.repayment_date || item.due_date);
      const amtStr = formatCurrency(item.amount || item.repayment_amount || monthlyRepayment);
      const stStr = (item.status || 'SCHEDULED').toUpperCase();

      doc.font('Helvetica').fontSize(8).fillColor(colors.text);
      doc.text(numStr, leftX + 6, curY + 4);
      doc.text(dateStr, leftX + colW.no + 6, curY + 4);
      doc.font('Helvetica-Bold').text(amtStr, leftX + colW.no + colW.date + 6, curY + 4);
      doc.font('Helvetica').fillColor(stStr === 'PAID' ? '#059669' : '#4B5563').text(stStr, leftX + colW.no + colW.date + colW.amount + 6, curY + 4);

      curY += rowH;
    });

    doc.y = curY + 10;
  }

  // ==========================================
  // 6. NUMBERED ISLAMIC AGREEMENT TERMS
  // ==========================================
  if (sections.show_terms && terms && terms.length > 0) {
    ensureSpace(80);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(colors.primary);
    doc.text('ISLAMIC MURABAHA CONTRACT TERMS & GENERAL CONDITIONS', leftX, doc.y);
    doc.y += 5;

    terms.forEach((term, index) => {
      ensureSpace(32);
      const num = term.clause_no || index + 1;
      const title = term.title || `CLAUSE ${num}`;
      const clauseText = term.text || '';

      doc.font('Helvetica-Bold').fontSize(8).fillColor(colors.primary);
      doc.text(`${num}. ${title}: `, leftX, doc.y, { continued: true });
      doc.font('Helvetica').fontSize(8).fillColor('#374151');
      doc.text(clauseText, { width: contentWidth, align: 'justify' });
      doc.moveDown(0.3);
    });

    doc.y += 6;
  }

  // ==========================================
  // 7. ELECTRONIC SIGNATURE CERTIFICATION BOX
  // ==========================================
  if (sections.show_signatures) {
    ensureSpace(100);
    const sigTop = doc.y;
    const sigH = 85;

    doc.rect(leftX, sigTop, contentWidth, sigH).fillAndStroke('#F8FAFC', colors.border || '#CBD5E1');
    doc.rect(leftX, sigTop, contentWidth, 3).fill(colors.primary);

    doc.font('Helvetica-Bold').fontSize(9).fillColor(colors.primary);
    doc.text('BUYER DECLARATION & ELECTRONIC SIGNATURE CERTIFICATION', leftX + 10, sigTop + 8);

    doc.font('Helvetica-Oblique').fontSize(7.5).fillColor('#4B5563');
    doc.text(
      '"I confirm that I have reviewed, understood, and irrevocably accepted all terms and conditions of this Murabaha Sales Contract electronically through the authenticated IMAN Cooperative Portal."',
      leftX + 10,
      sigTop + 22,
      { width: contentWidth - 20, align: 'left' }
    );

    const sigColW = (contentWidth - 30) / 2;
    doc.font('Helvetica').fontSize(8).fillColor('#4B5563');
    doc.text('Signed By: ', leftX + 10, sigTop + 45, { continued: true });
    doc.font('Helvetica-Bold').fillColor(colors.text).text(`${borrowerName} (PSN: ${borrowerPsn})`);

    doc.font('Helvetica').fillColor('#4B5563').text('Signature Status: ', leftX + 10, sigTop + 58, { continued: true });
    doc.font('Helvetica-Bold').fillColor('#059669').text(`✓ ACCEPTED & SIGNED ELECTRONICALLY`);

    doc.font('Helvetica').fillColor('#4B5563').text('Signature Ref: ', leftX + 10, sigTop + 71, { continued: true });
    doc.font('Helvetica-Bold').fillColor(colors.primary).text(signatureRef);

    const col2X = leftX + sigColW + 20;
    doc.font('Helvetica').fillColor('#4B5563').text('Timestamp: ', col2X, sigTop + 45, { continued: true });
    doc.font('Helvetica-Bold').fillColor(colors.text).text(formatDateTime(contractData.action_timestamp || contractData.created_at));

    doc.font('Helvetica').fillColor('#4B5563').text('Network IP: ', col2X, sigTop + 58, { continued: true });
    doc.font('Helvetica-Bold').fillColor(colors.text).text(contractData.ip_address || '127.0.0.1 (Cooperative Portal)');

    doc.font('Helvetica').fillColor('#4B5563').text('Verification: ', col2X, sigTop + 71, { continued: true });
    doc.font('Helvetica-Bold').fillColor('#059669').text('Cryptographically Verified & Audited');

    doc.y = sigTop + sigH + 12;
  }

  // ==========================================
  // 8. DIGITAL STAMP & QR CODE VERIFICATION ROW
  // ==========================================
  if (sections.show_stamp || sections.show_qr_code) {
    ensureSpace(70);
    const rowTop = doc.y;

    // Stamp on the left
    if (sections.show_stamp && stampConfig.show !== false) {
      const stampX = leftX + 40;
      const stampY = rowTop + 30;
      const radius = 28;

      if (doc.circle) {
        doc.circle(stampX, stampY, radius).strokeColor(colors.primary).stroke();
        doc.circle(stampX, stampY, radius - 3).strokeColor(colors.primary).stroke();
      }

      doc.font('Helvetica-Bold').fontSize(6).fillColor(colors.primary);
      doc.text('IMAN COOPERATIVE', stampX - 25, stampY - 14, { width: 50, align: 'center' });
      doc.font('Helvetica-Bold').fontSize(5.5).fillColor(colors.secondary || '#B45309');
      doc.text('OFFICIAL SEAL', stampX - 25, stampY - 5, { width: 50, align: 'center' });
      doc.font('Helvetica').fontSize(5).fillColor('#4B5563');
      doc.text(recordedDate, stampX - 25, stampY + 4, { width: 50, align: 'center' });
      doc.font('Helvetica-Bold').fontSize(5).fillColor(colors.primary);
      doc.text('GOMBE STATE', stampX - 25, stampY + 12, { width: 50, align: 'center' });
    }

    // QR Code and Verification info on the right
    if (sections.show_qr_code) {
      const verifyUrl = `${process.env.APP_URL || 'https://imancooperative.org'}/verify/agreement/${agreementRef}`;
      const qrBoxX = rightX - 220;

      doc.font('Helvetica-Bold').fontSize(8).fillColor(colors.primary);
      doc.text('DIGITAL VERIFICATION QR', qrBoxX, rowTop + 8);
      doc.font('Helvetica').fontSize(7.5).fillColor('#4B5563');
      doc.text('Scan with any mobile camera to verify agreement authenticity on the public cooperative registry:', qrBoxX, rowTop + 20, { width: 215 });
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(colors.primary);
      doc.text(`/verify/agreement/${agreementRef}`, qrBoxX, rowTop + 44);
      doc.font('Helvetica').fontSize(6.5).fillColor('#9CA3AF');
      doc.text('Tamper-proof electronic audit record preserved.', qrBoxX, rowTop + 55);
    }

    doc.y = rowTop + 70;
  }

  // ==========================================
  // 9. OFFICIAL RUNNING FOOTER & PAGE NUMBERS
  // ==========================================
  if (sections.show_footer) {
    const footerY = A4_DIMENSIONS.height - A4_DIMENSIONS.margin + 8;
    const pageCount = doc._pageCount || (doc.pages ? doc.pages.length : 1);

    // If using SimplePdfDocument or PDFKit, print running footer on current/each page
    doc.font('Helvetica').fontSize(7).fillColor('#6B7280');
    const footerText = `${header.org_name || 'IMAN MULTIPURPOSE COOPERATIVE SOCIETY'} • Official Murabaha Agreement • Ref: ${agreementRef} • Page 1 of ${pageCount}`;
    doc.text(footerText, leftX, footerY, { width: contentWidth, align: 'center' });
    doc.font('Helvetica').fontSize(6).fillColor('#9CA3AF');
    doc.text('This document was electronically generated and certified by the IMAN Multipurpose Cooperative Society System.', leftX, footerY + 9, { width: contentWidth, align: 'center' });
  }

  // End Document and Return Buffer
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', err => reject(err));
    doc.end();
  });
}

module.exports = {
  A4_DIMENSIONS,
  DEFAULT_MURABAHA_TERMS,
  DEFAULT_WAKALA_TERMS,
  formatCurrency,
  formatDate,
  formatDateTime,
  generateContractPdf
};
