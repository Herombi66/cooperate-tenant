const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const PAYSLIPS_DIR = path.join(UPLOADS_DIR, 'payslips');

function ensureDirs() {
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  if (!fs.existsSync(PAYSLIPS_DIR)) fs.mkdirSync(PAYSLIPS_DIR, { recursive: true });
}

function getKey() {
  const keyHex = process.env.PAYSLIP_ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error('PAYSLIP_ENCRYPTION_KEY must be a 64-hex string (256-bit key)');
  }
  return Buffer.from(keyHex, 'hex');
}

function randomName(baseExt = '.enc') {
  const stamp = Date.now() + '-' + Math.round(Math.random() * 1e9);
  return `payslip-${stamp}${baseExt}`;
}

function storeEncrypted(sourceFilePath, originalMime, originalName) {
  ensureDirs();
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encName = randomName('.enc');
  const encPath = path.join(PAYSLIPS_DIR, encName);
  const metaPath = encPath + '.meta.json';

  const input = fs.readFileSync(sourceFilePath);
  const enc = Buffer.concat([cipher.update(input), cipher.final()]);
  const tag = cipher.getAuthTag();

  const output = Buffer.concat([iv, tag, enc]);
  fs.writeFileSync(encPath, output);

  const meta = {
    original_mime: originalMime,
    original_name: originalName,
    created_at: new Date().toISOString()
  };
  fs.writeFileSync(metaPath, JSON.stringify(meta));

  try { fs.unlinkSync(sourceFilePath); } catch {}

  return { encPath: `uploads/payslips/${encName}`, metaPath: `uploads/payslips/${encName}.meta.json` };
}

// Simple in-memory LRU cache for decrypted buffers
const cache = new Map();
const CACHE_LIMIT = 10;
function cacheSet(key, value) {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, value);
  if (cache.size > CACHE_LIMIT) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
}
function cacheGet(key) {
  if (!cache.has(key)) return null;
  const val = cache.get(key);
  cache.delete(key);
  cache.set(key, val);
  return val;
}

function decryptToBuffer(encAbsPath) {
  const cached = cacheGet(encAbsPath);
  if (cached) return cached;
  const key = getKey();
  const input = fs.readFileSync(encAbsPath);
  const iv = input.slice(0, 12);
  const tag = input.slice(12, 28);
  const data = input.slice(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  cacheSet(encAbsPath, dec);
  return dec;
}

function getMeta(encAbsPath) {
  const metaPath = encAbsPath + '.meta.json';
  if (!fs.existsSync(metaPath)) return null;
  const raw = fs.readFileSync(metaPath, 'utf8');
  try { return JSON.parse(raw); } catch { return null; }
}

module.exports = {
  storeEncrypted,
  decryptToBuffer,
  getMeta,
  ensureDirs
};
