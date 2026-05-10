const asyncWrapper = require("../middelwares/async_wrappers");
const appError = require("../utils/appError");
const { Op } = require("sequelize");

// ── Helpers ───────────────────────────────────────────────────────────────────
const isAdmin   = (role) => role?.toLowerCase() === "admin";
const isDoctor  = (role) => role?.toLowerCase() === "doctor";
const isPatient = (role) => role?.toLowerCase() === "patient";

// Safe user attributes — matches auth service users table
const USER_ATTRS = ["id", "full_name", "email", "role"];

// ── GET ALL APPOINTMENTS ──────────────────────────────────────────────────────
exports.getAllAppointments = asyncWrapper(async (req, res, next) => {
  const requester = req.user;
  const { User, Appointment } = req.app.locals.models;

  if (!requester) return next(appError.create("Unauthorized", 401));

  const currentUser = await User.findByPk(Number(requester.sub));
  if (!currentUser) return next(appError.create("User not found", 404));

  let where = {};
  if (!isAdmin(requester.role)) {
    where = {
      [Op.or]: [
        { patient_id: currentUser.id },
        { doctor_id: currentUser.id }
      ]
    };
  }

  const appointments = await Appointment.findAll({
    where,
    include: [
      { model: User, as: "patient", attributes: USER_ATTRS },
      { model: User, as: "doctor",  attributes: USER_ATTRS }
    ],
    order: [["appointment_date", "ASC"]]
  });

  return res.status(200).json({
    status: "success",
    requester: { id: currentUser.id, email: currentUser.email, role: currentUser.role },
    results: appointments.length,
    data: appointments
  });
});

// ── GET APPOINTMENT BY ID ─────────────────────────────────────────────────────
exports.getAppointment = asyncWrapper(async (req, res, next) => {
  const { User, Appointment } = req.app.locals.models;
  const requester = req.user;

  if (!requester) return next(appError.create("Unauthorized", 401));

  const currentUser = await User.findByPk(Number(requester.sub));
  if (!currentUser) return next(appError.create("User not found", 404));

  const appointment = await Appointment.findByPk(req.params.id, {
    include: [
      { model: User, as: "patient", attributes: USER_ATTRS },
      { model: User, as: "doctor",  attributes: USER_ATTRS }
    ]
  });

  if (!appointment) return next(appError.create("Appointment not found", 404));

  const isOwner =
    appointment.patient_id === currentUser.id ||
    appointment.doctor_id  === currentUser.id;

  if (!isAdmin(requester.role) && !isOwner) {
    return next(appError.create("Forbidden", 403));
  }

  return res.status(200).json({ status: "success", data: appointment });
});

// ── CREATE APPOINTMENT ────────────────────────────────────────────────────────
exports.createAppointment = asyncWrapper(async (req, res, next) => {
  const requester = req.user;
  const { User, Appointment } = req.app.locals.models;

  if (!requester) return next(appError.create("Unauthorized", 401));

  const currentUser = await User.findByPk(Number(requester.sub));
  if (!currentUser) return next(appError.create("User not found", 404));

  if (!isPatient(requester.role) && !isAdmin(requester.role)) {
    return next(appError.create("Only patients or admins can create appointments", 403));
  }

  if (!req.body.doctor_id || !req.body.appointment_date || !req.body.reason) {
    return next(appError.create("doctor_id, appointment_date, and reason are required", 400));
  }

  const doctor = await User.findByPk(req.body.doctor_id);
  if (!doctor) return next(appError.create("Doctor not found", 404));
  if (!isDoctor(doctor.role)) return next(appError.create("Selected user is not a doctor", 400));

  let patientId = currentUser.id;

  if (isAdmin(requester.role) && req.body.patient_id) {
    const patient = await User.findByPk(req.body.patient_id);
    if (!patient) return next(appError.create("Patient not found", 404));
    if (!isPatient(patient.role)) return next(appError.create("Selected user is not a patient", 400));
    patientId = patient.id;
  }

  const appointment = await Appointment.create({
    patient_id:       patientId,
    doctor_id:        doctor.id,
    appointment_date: req.body.appointment_date,
    reason:           req.body.reason,
    note:             req.body.note   || null,
    status:           req.body.status || "scheduled"
  });

  const created = await Appointment.findByPk(appointment.id, {
    include: [
      { model: User, as: "patient", attributes: USER_ATTRS },
      { model: User, as: "doctor",  attributes: USER_ATTRS }
    ]
  });

  return res.status(201).json({
    status: "success",
    message: "Appointment created successfully",
    data: created
  });
});

// ── UPDATE APPOINTMENT ────────────────────────────────────────────────────────
exports.updateAppointment = asyncWrapper(async (req, res, next) => {
  const { User, Appointment } = req.app.locals.models;
  const requester = req.user;

  if (!requester) return next(appError.create("Unauthorized", 401));

  const currentUser = await User.findByPk(Number(requester.sub));
  if (!currentUser) return next(appError.create("User not found", 404));

  const appointment = await Appointment.findByPk(req.params.id);
  if (!appointment) return next(appError.create("Appointment not found", 404));

  const isDoctorOwner =
    isDoctor(requester.role) && appointment.doctor_id === currentUser.id;

  if (!isAdmin(requester.role) && !isDoctorOwner) {
    return next(appError.create("Forbidden", 403));
  }

  await appointment.update(req.body);

  return res.status(200).json({ status: "success", data: appointment });
});

// ── DELETE APPOINTMENT ────────────────────────────────────────────────────────
exports.deleteAppointment = asyncWrapper(async (req, res, next) => {
  const { Appointment } = req.app.locals.models;
  const requester = req.user;

  if (!requester) return next(appError.create("Unauthorized", 401));
  if (!isAdmin(requester.role)) {
    return next(appError.create("Only admin can delete appointments", 403));
  }

  const appointment = await Appointment.findByPk(req.params.id);
  if (!appointment) return next(appError.create("Appointment not found", 404));

  await appointment.destroy();

  return res.status(200).json({ status: "success", message: "Appointment deleted successfully" });
});