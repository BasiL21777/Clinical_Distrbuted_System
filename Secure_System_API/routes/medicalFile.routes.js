const express = require("express");
const router = express.Router();
const requiresAuth = require('../middlewares/requireAuth');
const {
  uploadFile,
  getAllFiles,
  getFile,
  downloadFile,
  deleteFile
} = require("../controllers/medicalFile.controller");

// All routes require a valid JWT
router.use(requiresAuth());

// ─────────────────────────────────────────────
// POST   /api/files/upload
// Doctor or Admin uploads a file for a patient
// Body (multipart/form-data):
//   file          — the file itself
//   patient_id    — required
//   file_type     — optional (lab_result | prescription | xray | scan | report | other)
//   appointment_id — optional
//   record_id      — optional
// ─────────────────────────────────────────────
router.post("/upload", uploadFile);

// ─────────────────────────────────────────────
// GET    /api/files
// Admin  → all files
// Doctor → files they uploaded
// Patient → their own files only
// ─────────────────────────────────────────────
router.get("/", getAllFiles);

// ─────────────────────────────────────────────
// GET    /api/files/:id
// Returns file metadata (no binary content)
// Same access rules as above
// ─────────────────────────────────────────────
router.get("/:id", getFile);

// ─────────────────────────────────────────────
// GET    /api/files/:id/download
// Decrypts file, verifies SHA-256 integrity, streams to client
// Same access rules as above
// ─────────────────────────────────────────────
router.get("/:id/download", downloadFile);

// ─────────────────────────────────────────────
// DELETE /api/files/:id
// Admin only — removes DB record + encrypted file from disk
// ─────────────────────────────────────────────
router.delete("/:id", deleteFile);

module.exports = router;
