// controllers/medicalFile.controller.js
const path    = require('path');
const fs      = require('fs');
const crypto  = require('crypto');
const { v4: uuidv4 } = require('uuid');
const multer  = require('multer');

const asyncWrapper = require('../middlewares/async_wrappers');
const appError     = require('../utils/appError');

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────

const UPLOAD_DIR = path.join(__dirname, '../private_uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const MAX_FILE_SIZE      = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.docx'];
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];
const BLOCKED_EXTENSIONS = ['.exe', '.php', '.js', '.bat', '.sh', '.py', '.rb', '.ts'];

// ─────────────────────────────────────────────
// ENCRYPTION  (AES-256-CBC)
// ─────────────────────────────────────────────

function getEncryptionKey() {
  const key = process.env.FILE_ENCRYPTION_KEY;
  if (!key || key.length < 32)
    throw new Error('FILE_ENCRYPTION_KEY must be at least 32 characters in .env');
  return Buffer.from(key.slice(0, 32));
}

function encryptBuffer(buffer) {
  const key = getEncryptionKey();
  const iv  = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  return Buffer.concat([iv, encrypted]); // [16 bytes IV | encrypted data]
}

function decryptBuffer(encryptedBuffer) {
  const key       = getEncryptionKey();
  const iv        = encryptedBuffer.slice(0, 16);
  const encrypted = encryptedBuffer.slice(16);
  const decipher  = crypto.createDecipheriv('aes-256-cbc', key, iv);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

function hashBuffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

// ─────────────────────────────────────────────
// MULTER
// ─────────────────────────────────────────────

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (BLOCKED_EXTENSIONS.includes(ext)) return cb(new Error(`Blocked extension: ${ext}`));
    if (!ALLOWED_EXTENSIONS.includes(ext)) return cb(new Error(`Extension not allowed: ${ext}`));
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) return cb(new Error(`MIME type not allowed: ${file.mimetype}`));
    cb(null, true);
  }
}).single('file');

function runMulter(req, res) {
  return new Promise((resolve, reject) =>
    upload(req, res, (err) => (err ? reject(err) : resolve()))
  );
}

// ─────────────────────────────────────────────
// ROLE HELPERS
// JWT payload: { sub: "1", email: "...", role: "doctor" }
// ─────────────────────────────────────────────

const isAdmin   = (role) => role?.toLowerCase() === 'admin';
const isDoctor  = (role) => role?.toLowerCase() === 'doctor';
const isPatient = (role) => role?.toLowerCase() === 'patient';

// ─────────────────────────────────────────────
// UPLOAD   POST /api/files/upload
// Doctor or Admin only
// form-data: file, patient_id, file_type?, appointment_id?, record_id?
// ─────────────────────────────────────────────

exports.uploadFile = asyncWrapper(async (req, res, next) => {
  try { await runMulter(req, res); }
  catch (err) { return next(appError.create(err.message, 400)); }

  if (!req.file) return next(appError.create('No file provided', 400));

  const requester = req.user;
  if (!requester) return next(appError.create('Unauthorized', 401));

  if (!isDoctor(requester.role) && !isAdmin(requester.role))
    return next(appError.create('Only doctors or admins can upload files', 403));

  // Use sub directly — no User.findByPk needed
  const uploaderId = Number(requester.sub);

  const { patient_id, file_type, appointment_id, record_id } = req.body;
  if (!patient_id) return next(appError.create('patient_id is required', 400));

  const patientId = Number(patient_id);
  if (!patientId || isNaN(patientId))
    return next(appError.create('patient_id must be a valid number', 400));

  // Hash original → encrypt → write to disk
  const originalBuffer  = req.file.buffer;
  const hash            = hashBuffer(originalBuffer);
  const encryptedBuffer = encryptBuffer(originalBuffer);

  const ext        = path.extname(req.file.originalname).toLowerCase();
  const storedName = `${uuidv4()}${ext}.enc`;
  fs.writeFileSync(path.join(UPLOAD_DIR, storedName), encryptedBuffer);

  const { MedicalFile } = req.app.locals.models;

  const fileRecord = await MedicalFile.create({
    uploaded_by:    uploaderId,
    patient_id:     patientId,
    appointment_id: appointment_id ? Number(appointment_id) : null,
    record_id:      record_id      ? Number(record_id)      : null,
    file_type:      file_type || 'other',
    original_name:  req.file.originalname,
    stored_name:    storedName,
    mime_type:      req.file.mimetype,
    size_bytes:     req.file.size,
    hash_sha256:    hash,
    is_encrypted:   true
  });

  return res.status(201).json({
    status: 'success',
    message: 'File uploaded and encrypted successfully',
    data: {
      id:            fileRecord.id,
      original_name: fileRecord.original_name,
      file_type:     fileRecord.file_type,
      patient_id:    fileRecord.patient_id,
      uploaded_by:   fileRecord.uploaded_by,
      hash_sha256:   fileRecord.hash_sha256,
      created_at:    fileRecord.created_at
    }
  });
});

// ─────────────────────────────────────────────
// LIST   GET /api/files
// Admin  → all files
// Doctor → files they uploaded
// Patient → their own files only
// ─────────────────────────────────────────────

exports.getAllFiles = asyncWrapper(async (req, res, next) => {
  const requester = req.user;
  if (!requester) return next(appError.create('Unauthorized', 401));

  const requesterId = Number(requester.sub);
  const role        = requester.role?.toLowerCase();

  const { MedicalFile } = req.app.locals.models;

  let where = {};
  if      (isAdmin(role))   where = {};
  else if (isDoctor(role))  where = { uploaded_by: requesterId };
  else if (isPatient(role)) where = { patient_id:  requesterId };
  else return next(appError.create('Forbidden', 403));

  const files = await MedicalFile.findAll({
    where,
    attributes: { exclude: ['stored_name'] }, // never expose disk path
    order: [['created_at', 'DESC']]
  });

  return res.status(200).json({
    status: 'success',
    results: files.length,
    data: files
  });
});

// ─────────────────────────────────────────────
// GET METADATA   GET /api/files/:id
// ─────────────────────────────────────────────

exports.getFile = asyncWrapper(async (req, res, next) => {
  const requester = req.user;
  if (!requester) return next(appError.create('Unauthorized', 401));

  const requesterId = Number(requester.sub);
  const role        = requester.role?.toLowerCase();

  const { MedicalFile } = req.app.locals.models;

  const file = await MedicalFile.findByPk(req.params.id, {
    attributes: { exclude: ['stored_name'] }
  });
  if (!file) return next(appError.create('File not found', 404));

  const canAccess =
    isAdmin(role) ||
    (isDoctor(role)  && file.uploaded_by === requesterId) ||
    (isPatient(role) && file.patient_id  === requesterId);

  if (!canAccess) return next(appError.create('Forbidden', 403));

  return res.status(200).json({ status: 'success', data: file });
});

// ─────────────────────────────────────────────
// DOWNLOAD   GET /api/files/:id/download
// Decrypt → verify SHA-256 integrity → stream to client
// ─────────────────────────────────────────────

exports.downloadFile = asyncWrapper(async (req, res, next) => {
  const requester = req.user;
  if (!requester) return next(appError.create('Unauthorized', 401));

  const requesterId = Number(requester.sub);
  const role        = requester.role?.toLowerCase();

  const { MedicalFile } = req.app.locals.models;

  const file = await MedicalFile.findByPk(req.params.id);
  if (!file) return next(appError.create('File not found', 404));

  const canAccess =
    isAdmin(role) ||
    (isDoctor(role)  && file.uploaded_by === requesterId) ||
    (isPatient(role) && file.patient_id  === requesterId);

  if (!canAccess) return next(appError.create('Forbidden', 403));

  const filePath = path.join(UPLOAD_DIR, file.stored_name);
  if (!fs.existsSync(filePath))
    return next(appError.create('File not found on disk', 404));

  // Decrypt
  let decryptedBuffer;
  try {
    decryptedBuffer = decryptBuffer(fs.readFileSync(filePath));
  } catch (e) {
    return next(appError.create('Failed to decrypt file', 500));
  }

  // Integrity check — hash of decrypted file must match stored hash
  if (hashBuffer(decryptedBuffer) !== file.hash_sha256)
    return next(appError.create('Integrity check failed: file may be tampered', 500));

  res.setHeader('Content-Type', file.mime_type);
  res.setHeader('Content-Disposition', `attachment; filename="${file.original_name}"`);
  res.setHeader('Content-Length', decryptedBuffer.length);
  return res.send(decryptedBuffer);
});

// ─────────────────────────────────────────────
// DELETE   DELETE /api/files/:id   (admin only)
// ─────────────────────────────────────────────

exports.deleteFile = asyncWrapper(async (req, res, next) => {
  const requester = req.user;
  if (!requester) return next(appError.create('Unauthorized', 401));

  if (!isAdmin(requester.role))
    return next(appError.create('Only admin can delete files', 403));

  const { MedicalFile } = req.app.locals.models;

  const file = await MedicalFile.findByPk(req.params.id);
  if (!file) return next(appError.create('File not found', 404));

  const filePath = path.join(UPLOAD_DIR, file.stored_name);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  await file.destroy();

  return res.status(200).json({ status: 'success', message: 'File deleted successfully' });
});