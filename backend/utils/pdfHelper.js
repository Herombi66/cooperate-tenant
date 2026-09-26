const EventEmitter = require('events');

/**
 * Robust pure-JS PDF 1.4 Document generator that implements the common
 * PDFKit API subset. Used as a built-in fallback when `pdfkit` is not installed
 * on the host server, guaranteeing agreement downloads, receipts, and exports
 * never fail with HTTP 500.
 */
class SimplePdfDocument extends EventEmitter {
  constructor({ size = 'A4', margin = 48 } = {}) {
    super();
    this.pageWidth = 595.28; // Standard A4 width in points
    this.pageHeight = 841.89; // Standard A4 height in points
    this.margin = typeof margin === 'number' ? margin : 48;
    this.contentWidth = this.pageWidth - this.margin * 2;
    this.pages = [];
    this.currentPageOps = [];
    this.y = this.margin;
    this.x = this.margin;
    this.currentFontSize = 10;
    this.currentFont = '/F1'; // /F1 = Helvetica, /F2 = Helvetica-Bold
    this.fillColorRgb = '0 0 0';
    this.strokeColorRgb = '0 0 0';
    this._pipeStream = null;
    this._ended = false;
    this.page = {
      width: this.pageWidth,
      height: this.pageHeight,
      margins: {
        top: this.margin,
        bottom: this.margin,
        left: this.margin,
        right: this.margin
      }
    };
    this.addNewPage();
  }

  addNewPage() {
    this.currentPageOps = [];
    this.pages.push(this.currentPageOps);
    this.y = this.margin;
    this.x = this.margin;
  }

  addPage() {
    this.addNewPage();
    return this;
  }

  fontSize(size) {
    this.currentFontSize = Number(size) || 10;
    return this;
  }

  font(name) {
    const s = String(name || '').toLowerCase();
    if (s.includes('bold')) {
      this.currentFont = '/F2';
    } else {
      this.currentFont = '/F1';
    }
    return this;
  }

  fillColor(hex) {
    this.fillColorRgb = this.hexToPdfRgb(hex);
    return this;
  }

  strokeColor(hex) {
    this.strokeColorRgb = this.hexToPdfRgb(hex);
    return this;
  }

  hexToPdfRgb(hex) {
    if (!hex) return '0 0 0';
    let clean = String(hex).replace('#', '').trim();
    if (clean.length === 3) {
      clean = clean.split('').map((c) => c + c).join('');
    }
    if (clean.length === 6) {
      const r = (parseInt(clean.slice(0, 2), 16) / 255).toFixed(3);
      const g = (parseInt(clean.slice(2, 4), 16) / 255).toFixed(3);
      const b = (parseInt(clean.slice(4, 6), 16) / 255).toFixed(3);
      return `${r} ${g} ${b}`;
    }
    return '0 0 0';
  }

  escapeText(str) {
    if (str == null) return '';
    return String(str)
      .replace(/₦/g, 'NGN ')
      .replace(/[\r\n\t]/g, ' ')
      .replace(/[^\x20-\x7E]/g, ' ') // standard ASCII printable for Type 1 Helvetica
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');
  }

  moveDown(lines = 1) {
    this.y += this.currentFontSize * 1.35 * lines;
    if (this.y > this.pageHeight - this.margin - 40) {
      this.addNewPage();
    }
    return this;
  }

  moveTo(x, y) {
    this._tempX = x;
    this._tempY = y != null ? y : this.y;
    return this;
  }

  lineTo(x, y) {
    const x1 = this._tempX != null ? this._tempX : this.margin;
    const y1 = this._tempY != null ? this._tempY : this.y;
    const x2 = x;
    const y2 = y != null ? y : this.y;

    const pdfY1 = this.pageHeight - y1;
    const pdfY2 = this.pageHeight - y2;

    this.currentPageOps.push(`q ${this.strokeColorRgb} RG 1 w ${x1.toFixed(2)} ${pdfY1.toFixed(2)} m ${x2.toFixed(2)} ${pdfY2.toFixed(2)} l S Q`);
    return this;
  }

  stroke() {
    return this;
  }

  rect(x, y, width, height) {
    this._lastRect = { x, y: y != null ? y : this.y, width, height };
    return this;
  }

  fill(hex) {
    if (this._lastRect) {
      const fill = this.hexToPdfRgb(hex || this.fillColorRgb);
      const { x, y, width, height } = this._lastRect;
      const pdfY = this.pageHeight - y - height;
      this.currentPageOps.push(`q ${fill} rg ${x.toFixed(2)} ${pdfY.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re f Q`);
      this._lastRect = null;
    }
    return this;
  }

  fillAndStroke(fillHex, strokeHex) {
    if (this._lastRect) {
      const fill = this.hexToPdfRgb(fillHex);
      const stroke = this.hexToPdfRgb(strokeHex);
      const { x, y, width, height } = this._lastRect;
      const pdfY = this.pageHeight - y - height;
      this.currentPageOps.push(`q ${fill} rg ${stroke} RG 1 w ${x.toFixed(2)} ${pdfY.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re B Q`);
      this._lastRect = null;
    }
    return this;
  }

  text(str, xOrOptions, yOrOptions, options = {}) {
    let x = this.margin;
    let y = this.y;
    let opts = {};

    if (typeof xOrOptions === 'number') {
      x = xOrOptions;
      if (typeof yOrOptions === 'number') {
        y = yOrOptions;
        opts = options || {};
      } else if (typeof yOrOptions === 'object') {
        opts = yOrOptions || {};
      }
    } else if (typeof xOrOptions === 'object') {
      opts = xOrOptions || {};
    }

    const font = opts.bold ? '/F2' : this.currentFont;
    const fontSize = opts.size || this.currentFontSize;
    const cleanStr = this.escapeText(str);

    const approxCharWidth = fontSize * 0.52;
    const availableWidth = this.pageWidth - this.margin - x;
    const maxCharsPerLine = Math.max(10, Math.floor(availableWidth / approxCharWidth));

    const words = cleanStr.split(' ');
    const lines = [];
    let currentLine = '';

    for (const w of words) {
      if (!currentLine) {
        currentLine = w;
      } else if ((currentLine + ' ' + w).length <= maxCharsPerLine) {
        currentLine += ' ' + w;
      } else {
        lines.push(currentLine);
        currentLine = w;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }

    let currentY = y;
    for (const line of lines) {
      if (currentY > this.pageHeight - this.margin - 30) {
        this.addNewPage();
        currentY = this.margin;
      }

      let drawX = x;
      if (opts.align === 'center') {
        const textW = line.length * approxCharWidth;
        drawX = Math.max(this.margin, (this.pageWidth - textW) / 2);
      } else if (opts.align === 'right') {
        const textW = line.length * approxCharWidth;
        drawX = Math.max(this.margin, this.pageWidth - this.margin - textW);
      }

      const pdfY = this.pageHeight - currentY - fontSize;

      this.currentPageOps.push(
        `BT ${font} ${fontSize} Tf ${this.fillColorRgb} rg 1 0 0 1 ${drawX.toFixed(2)} ${pdfY.toFixed(2)} Tm (${line}) Tj ET`
      );

      if (opts.underline) {
        const textW = line.length * approxCharWidth;
        const linePdfY = pdfY - 2;
        this.currentPageOps.push(
          `q ${this.fillColorRgb} RG 0.8 w ${drawX.toFixed(2)} ${linePdfY.toFixed(2)} m ${(drawX + textW).toFixed(2)} ${linePdfY.toFixed(2)} l S Q`
        );
      }

      currentY += fontSize * 1.35;
    }

    if (typeof xOrOptions !== 'number' || typeof yOrOptions !== 'number') {
      this.y = currentY;
    }

    return this;
  }

  pipe(destStream) {
    this._pipeStream = destStream;
    return destStream;
  }

  buildBuffer() {
    const objects = [];
    const pageObjectIds = [];

    let nextId = 5;
    const pageCount = this.pages.length;
    for (let i = 0; i < pageCount; i++) {
      const pageId = nextId++;
      const contentId = nextId++;
      pageObjectIds.push({ pageId, contentId, ops: this.pages[i] });
    }

    objects.push({ id: 1, body: '<< /Type /Catalog /Pages 2 0 R >>' });
    const kidsStr = pageObjectIds.map((p) => `${p.pageId} 0 R`).join(' ');
    objects.push({ id: 2, body: `<< /Type /Pages /Kids [${kidsStr}] /Count ${pageCount} >>` });
    objects.push({ id: 3, body: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>' });
    objects.push({ id: 4, body: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>' });

    for (const p of pageObjectIds) {
      const streamText = p.ops.join('\n');
      const streamBuf = Buffer.from(streamText, 'latin1');
      objects.push({
        id: p.pageId,
        body: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.pageWidth} ${this.pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${p.contentId} 0 R >>`
      });
      objects.push({
        id: p.contentId,
        body: `<< /Length ${streamBuf.length} >>\nstream\n${streamText}\nendstream`
      });
    }

    objects.sort((a, b) => a.id - b.id);
    let out = '%PDF-1.4\n';
    const offsets = {};

    for (const obj of objects) {
      offsets[obj.id] = Buffer.byteLength(out, 'latin1');
      out += `${obj.id} 0 obj\n${obj.body}\nendobj\n`;
    }

    const startxref = Buffer.byteLength(out, 'latin1');
    const totalObjs = objects.length + 1;
    out += `xref\n0 ${totalObjs}\n0000000000 65535 f \n`;
    for (let i = 1; i < totalObjs; i++) {
      const off = String(offsets[i] || 0).padStart(10, '0');
      out += `${off} 00000 n \n`;
    }
    out += `trailer\n<< /Size ${totalObjs} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`;

    return Buffer.from(out, 'latin1');
  }

  end() {
    if (this._ended) return this;
    this._ended = true;

    const buffer = this.buildBuffer();
    this.emit('data', buffer);
    this.emit('end');

    if (this._pipeStream) {
      if (typeof this._pipeStream.write === 'function') {
        this._pipeStream.write(buffer);
        if (typeof this._pipeStream.end === 'function') {
          this._pipeStream.end();
        }
      } else if (typeof this._pipeStream.send === 'function' && !this._pipeStream.headersSent) {
        this._pipeStream.send(buffer);
      }
    }

    return this;
  }
}

/**
 * Safely require pdfkit if installed.
 */
function getPDFDocument() {
  try {
    return require('pdfkit');
  } catch {
    return null;
  }
}

/**
 * Creates a PDF document instance:
 * Uses PDFKit if installed; otherwise falls back to SimplePdfDocument.
 */
function createPdfDocument(options = {}) {
  const getFn = (module.exports && module.exports.getPDFDocument) || getPDFDocument;
  const PDFKit = getFn();
  if (PDFKit) {
    try {
      return new PDFKit(options);
    } catch (err) {
      console.warn('[PDFHelper] PDFKit initialization failed, using SimplePdfDocument fallback:', err.message);
    }
  }
  return new SimplePdfDocument(options);
}

module.exports = {
  SimplePdfDocument,
  getPDFDocument,
  createPdfDocument
};
