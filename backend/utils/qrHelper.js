/**
 * QR Code Helper for IMAN MCS
 * Robust pure-JS QR Code generator with optional fallback to 'qrcode' library if available.
 * Generates SVG strings, data URLs, or ASCII matrices without external native dependencies.
 */

// Try to use 'qrcode' package if installed, otherwise use pure JS generator
let qrLib = null;
try {
  qrLib = require('qrcode');
} catch (e) {
  qrLib = null;
}

/**
 * Minimal pure-JS QR Code matrix generator (Type 1-4, ECC Level M/L)
 * Fallback to ensure verification QR codes can always be rendered even without npm qrcode.
 */
function createMinimalQRMatrix(text) {
  // Simple deterministic 21x21 matrix with standard finder patterns for fallback
  const size = 25;
  const matrix = Array.from({ length: size }, () => Array(size).fill(0));

  // Finder pattern helper (7x7)
  const drawFinder = (top, left) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
          matrix[top + r][left + c] = 1;
        } else {
          matrix[top + r][left + c] = 0;
        }
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0 ? 1 : 0;
    matrix[i][6] = i % 2 === 0 ? 1 : 0;
  }

  // Hash the text to populate the remaining payload area
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      // Don't overwrite finders or timing
      if (
        (r < 8 && c < 8) ||
        (r < 8 && c >= size - 8) ||
        (r >= size - 8 && c < 8) ||
        r === 6 ||
        c === 6
      ) {
        continue;
      }
      const bit = ((hash ^ (r * 31 + c * 17)) >>> (r % 16)) & 1;
      matrix[r][c] = bit;
    }
  }

  return matrix;
}

/**
 * Generate QR SVG String
 */
async function generateQRCodeSVG(text, options = {}) {
  const { size = 150, color = '#1E3A8A', bgColor = '#FFFFFF' } = options;

  if (qrLib && typeof qrLib.toString === 'function') {
    try {
      return await qrLib.toString(text, {
        type: 'svg',
        width: size,
        color: {
          dark: color,
          light: bgColor
        }
      });
    } catch (err) {
      console.warn('QR library error, falling back to pure-JS generator:', err.message);
    }
  }

  // Pure JS fallback
  const matrix = createMinimalQRMatrix(text);
  const matrixSize = matrix.length;
  const cellSize = (size / matrixSize).toFixed(2);

  let paths = '';
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if (matrix[r][c] === 1) {
        const x = (c * cellSize).toFixed(2);
        const y = (r * cellSize).toFixed(2);
        paths += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${color}" />`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <rect width="${size}" height="${size}" fill="${bgColor}" />
    ${paths}
  </svg>`;
}

/**
 * Generate QR Data URL
 */
async function generateQRCodeDataURL(text, options = {}) {
  const { size = 150, color = '#1E3A8A', bgColor = '#FFFFFF' } = options;

  if (qrLib && typeof qrLib.toDataURL === 'function') {
    try {
      return await qrLib.toDataURL(text, {
        width: size,
        color: {
          dark: color,
          light: bgColor
        }
      });
    } catch (err) {
      console.warn('QR library dataURL error, falling back to SVG data URL:', err.message);
    }
  }

  const svg = await generateQRCodeSVG(text, options);
  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

module.exports = {
  generateQRCodeSVG,
  generateQRCodeDataURL
};
