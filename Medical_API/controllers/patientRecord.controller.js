const asyncWrapper = require("../middelwares/async_wrappers");
const appError = require("../utils/appError");

// ── Helpers ───────────────────────────────────────────────────────────────────
const isAdmin   = (role) => role?.toLowerCase() === "admin";
const isDoctor  = (role) => role?.toLowerCase() === "doctor";
const isPatient = (role) => role?.toLowerCase() === "patient";

// Safe user attributes — matches auth service users table
const USER_ATTRS = ["id", "full_name", "email", "role"];

// ── GET ALL RECORDS ───────────────────────────────────────────────────────────
exports.getAllRecords = asyncWrapper(async (req, res, next) => {
  const { User, PatientRecord } = req.app.locals.models;
  const requester = req.user;

  if (!requester) return next(appError.create("Unauthorized", 401));

  const currentUser = await User.findByPk(Number(requester.sub));
  if (!currentUser) return next(appError.create("User not found", 404));

  const role = requester.role?.toLowerCase();
  let where = {};

  if      (isDoctor(role))  where = { doctor_id:  currentUser.id };
  else if (isPatient(role)) where = { patient_id: currentUser.id };

  const records = await PatientRecord.findAll({
    where,
    include: [
      { model: User, as: "patient", attributes: USER_ATTRS },
      { model: User, as: "doctor",  attributes: USER_ATTRS }
    ]
  });

  return res.status(200).json({ status: "success", results: records.length, data: records });
});

// ── GET SINGLE RECORD ─────────────────────────────────────────────────────────
exports.getRecord = asyncWrapper(async (req, res, next) => {
  const { User, PatientRecord } = req.app.locals.models;
  const requester = req.user;

  if (!requester) return next(appError.create("Unauthorized", 401));

  const currentUser = await User.findByPk(Number(requester.sub));
  if (!currentUser) return next(appError.create("User not found", 404));

  const record = await PatientRecord.findByPk(req.params.id, {
    include: [
      { model: User, as: "patient", attributes: USER_ATTRS },
      { model: User, as: "doctor",  attributes: USER_ATTRS }
    ]
  });

  if (!record) return next(appError.create("Record not found", 404));

  const isOwner =
    record.patient_id === currentUser.id ||
    record.doctor_id  === currentUser.id;

  if (!isAdmin(requester.role) && !isOwner) {
    return next(appError.create("Forbidden", 403));
  }

  return res.status(200).json({ status: "success", data: record });
});

// ── CREATE RECORD ─────────────────────────────────────────────────────────────
exports.createRecord = asyncWrapper(async (req, res, next) => {
  const { User, PatientRecord } = req.app.locals.models;
  const requester = req.user;

  if (!requester) return next(appError.create("Unauthorized", 401));

  const currentUser = await User.findByPk(Number(requester.sub));
  if (!currentUser) return next(appError.create("User not found", 404));

  const role = requester.role?.toLowerCase();

  if (!isDoctor(role) && !isAdmin(role)) {
    return next(appError.create("Only doctors or admins can create records", 403));
  }

  const patient = await User.findByPk(req.body.patient_id);
  if (!patient || !isPatient(patient.role)) {
    return next(appError.create("Invalid patient", 400));
  }

  let doctorId = currentUser.id;

  if (isAdmin(role)) {
    if (!req.body.doctor_id) return next(appError.create("doctor_id is required for admin", 400));
    const doctor = await User.findByPk(req.body.doctor_id);
    if (!doctor || !isDoctor(doctor.role)) return next(appError.create("Invalid doctor", 400));
    doctorId = doctor.id;
  }

  const record = await PatientRecord.create({
    patient_id:   patient.id,
    doctor_id:    doctorId,
    diagnosis:    req.body.diagnosis,
    prescription: req.body.prescription,
    notes:        req.body.notes,
    is_draft:     req.body.is_draft ?? true
  });

  return res.status(201).json({ status: "success", data: record });
});

// ── UPDATE RECORD ─────────────────────────────────────────────────────────────
exports.updateRecord = asyncWrapper(async (req, res, next) => {
  const { User, PatientRecord } = req.app.locals.models;
  const requester = req.user;

  if (!requester) return next(appError.create("Unauthorized", 401));

  const currentUser = await User.findByPk(Number(requester.sub));
  if (!currentUser) return next(appError.create("User not found", 404));

  const record = await PatientRecord.findByPk(req.params.id);
  if (!record) return next(appError.create("Record not found", 404));

  const isDoctorOwner =
    isDoctor(requester.role) && record.doctor_id === currentUser.id;

  if (!isAdmin(requester.role) && !isDoctorOwner) {
    return next(appError.create("Forbidden", 403));
  }

  const allowedFields = {};
  ["diagnosis", "prescription", "notes", "is_draft"].forEach((key) => {
    if (req.body[key] !== undefined) allowedFields[key] = req.body[key];
  });

  await record.update(allowedFields);

  return res.status(200).json({ status: "success", data: record });
});

// ── DELETE RECORD ─────────────────────────────────────────────────────────────
exports.deleteRecord = asyncWrapper(async (req, res, next) => {
  const { PatientRecord } = req.app.locals.models;
  const requester = req.user;

  if (!requester) return next(appError.create("Unauthorized", 401));
  if (!isAdmin(requester.role)) {
    return next(appError.create("Only admin can delete records", 403));
  }

  const record = await PatientRecord.findByPk(req.params.id);
  if (!record) return next(appError.create("Record not found", 404));

  await record.destroy();

  return res.status(200).json({ status: "success", message: "Record deleted successfully" });
});