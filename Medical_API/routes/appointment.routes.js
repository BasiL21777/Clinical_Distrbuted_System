const express = require("express");
const router = express.Router();

const appointmentController = require("../controllers/appointment.controller");
const requiresAuth = require("../middelwares/requiresAuth");
const requireRole = require("../middelwares/requireRole");
// const appointmentAccess = require("../middelwares/appointmentAccess");

// =======================
// GET ALL APPOINTMENTS
// Admin only (later enabled)
// =======================
router.get(
  "/",
  requiresAuth(),
  // requireRole(["admin"]),
  appointmentController.getAllAppointments
);

// =======================
// GET SINGLE APPOINTMENT
// Admin / Doctor owner / Patient owner
// =======================
router.get(
  "/:id",
  requiresAuth(),
  //appointmentAccess(),
  appointmentController.getAppointment
);

// =======================
// CREATE APPOINTMENT
// Patient or Admin
// =======================
router.post(
  "/",
  requiresAuth(),
  // requireRole(["patient", "admin"]),
  appointmentController.createAppointment
);

// =======================
// UPDATE APPOINTMENT
// Admin or Doctor owner
// =======================
router.put(
  "/:id",
  requiresAuth(),
  // appointmentAccess(),
  appointmentController.updateAppointment
);

// =======================
// DELETE APPOINTMENT
// Admin only (recommended)
// =======================
router.delete(
  "/:id",
  requiresAuth(),
  // requireRole(["admin"]),
  appointmentController.deleteAppointment
);

module.exports = router;