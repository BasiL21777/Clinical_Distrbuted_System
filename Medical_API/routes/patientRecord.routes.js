const express = require("express");
const router = express.Router();

const recordController = require("../controllers/patientRecord.controller");
const requiresAuth = require("../middelwares/requiresAuth");
const requireRole = require("../middelwares/requireRole");

// =======================
// GET ALL RECORDS
// Admin (later restrict)
// =======================
router.get(
  "/",
  requiresAuth(),
  // requireRole(["admin"]),
  recordController.getAllRecords
);

// =======================
// GET SINGLE RECORD
// Admin / Doctor owner / Patient owner
// =======================
router.get(
  "/:id",
  requiresAuth(),
  recordController.getRecord
);

// =======================
// CREATE RECORD
// Doctor or Admin
// =======================
router.post(
  "/",
  requiresAuth(),
  recordController.createRecord
);

// =======================
// UPDATE RECORD
// Doctor owner or Admin
// =======================
router.put(
  "/:id",
  requiresAuth(),
  recordController.updateRecord
);

// =======================
// DELETE RECORD
// Admin only
// =======================
router.delete(
  "/:id",
  requiresAuth(),
  recordController.deleteRecord
);

module.exports = router;