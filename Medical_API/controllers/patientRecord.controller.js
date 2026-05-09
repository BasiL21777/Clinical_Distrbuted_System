const asyncWrapper = require("../middelwares/async_wrappers");
const appError = require("../utils/appError");
const { Op } = require("sequelize");

// ----------------------
// Helpers
// ----------------------
function isAdmin(role) {
  return role?.toLowerCase() === "admin";
}

function isDoctor(role) {
  return role?.toLowerCase() === "doctor";
}

function isPatient(role) {
  return role?.toLowerCase() === "patient";
}

// ----------------------
// GET ALL RECORDS
// ----------------------
exports.getAllRecords = asyncWrapper(async (req, res, next) => {
  const { User, PatientRecord } = req.app.locals.models;
  const requester = req.user;

  if (!requester) {
    return next(appError.create("Unauthorized", 401));
  }

  // 🔥 FIX: JWT sub = users.id (NOT auth_user_id)
  const currentUser = await User.findByPk(requester.sub);

  if (!currentUser) {
    return next(appError.create("User not found", 404));
  }

  let records;

  const role = requester.role?.toLowerCase();

  // ================= ADMIN =================
  if (role === "admin") {
    records = await PatientRecord.findAll({
      include: [
        { model: User, as: "patient" },
        { model: User, as: "doctor" }
      ]
    });
  }

  // ================= DOCTOR =================
  else if (role === "doctor") {
    records = await PatientRecord.findAll({
      where: {
        doctor_id: currentUser.id
      },
      include: [
        { model: User, as: "patient" },
        { model: User, as: "doctor" }
      ]
    });
  }

  // ================= PATIENT =================
  else {
    records = await PatientRecord.findAll({
      where: {
        patient_id: currentUser.id
      },
      include: [
        { model: User, as: "patient" },
        { model: User, as: "doctor" }
      ]
    });
  }

  return res.status(200).json({
    status: "success",
    results: records.length,
    data: records
  });
});


// ----------------------
// GET SINGLE RECORD
// ----------------------
exports.getRecord = asyncWrapper(async (req, res, next) => {
  const { User, PatientRecord } = req.app.locals.models;
  const requester = req.user;

  if (!requester) {
    return next(appError.create("Unauthorized", 401));
  }

  // 🔥 FIX: consistent identity (JWT sub = user.id)
  const currentUser = await User.findByPk(requester.sub);

  if (!currentUser) {
    return next(appError.create("User not found", 404));
  }

  const record = await PatientRecord.findByPk(req.params.id, {
    include: [
      { model: User, as: "patient" },
      { model: User, as: "doctor" }
    ]
  });

  if (!record) {
    return next(appError.create("Record not found", 404));
  }

  const role = requester.role?.toLowerCase();

  const isAdminUser = role === "admin";

  const isOwner =
    record.patient_id === currentUser.id ||
    record.doctor_id === currentUser.id;

  // 🔥 Authorization
  if (!isAdminUser && !isOwner) {
    return next(appError.create("Forbidden", 403));
  }

  return res.status(200).json({
    status: "success",
    data: record
  });
});


// ----------------------
// CREATE RECORD
// ----------------------
exports.createRecord = asyncWrapper(async (req, res, next) => {
  const { User, PatientRecord } = req.app.locals.models;
  const requester = req.user;

  if (!requester) {
    return next(appError.create("Unauthorized", 401));
  }

  // 🔥 FIX: JWT sub = DB id
  const currentUser = await User.findByPk(requester.sub);

  if (!currentUser) {
    return next(appError.create("User not found", 404));
  }

  const role = requester.role?.toLowerCase();

  // =========================
  // ONLY doctor or admin
  // =========================
  if (role !== "doctor" && role !== "admin") {
    return next(appError.create("Only doctors or admins can create records", 403));
  }

  // =========================
  // validate patient
  // =========================
  const patient = await User.findByPk(req.body.patient_id);

  if (!patient || patient.role?.toLowerCase() !== "patient") {
    return next(appError.create("Invalid patient", 400));
  }

  // =========================
  // determine doctor_id
  // =========================
  let doctorId;

  if (role === "admin") {
    // admin chooses doctor
    if (!req.body.doctor_id) {
      return next(appError.create("doctor_id is required for admin", 400));
    }

    const doctor = await User.findByPk(req.body.doctor_id);

    if (!doctor || doctor.role?.toLowerCase() !== "doctor") {
      return next(appError.create("Invalid doctor", 400));
    }

    doctorId = doctor.id;
  } else {
    // doctor creates for himself
    doctorId = currentUser.id;
  }

  // =========================
  // CREATE RECORD
  // =========================
  const record = await PatientRecord.create({
    patient_id: patient.id,
    doctor_id: doctorId,
    diagnosis: req.body.diagnosis,
    prescription: req.body.prescription,
    notes: req.body.notes,
    is_draft: req.body.is_draft ?? true
  });

  return res.status(201).json({
    status: "success",
    data: record
  });
});


// ----------------------
// UPDATE RECORD
// ----------------------
exports.updateRecord = asyncWrapper(async (req, res, next) => {
  const { User, PatientRecord } = req.app.locals.models;
  const requester = req.user;

  if (!requester) {
    return next(appError.create("Unauthorized", 401));
  }

  // 🔥 FIX: consistent identity
  const currentUser = await User.findByPk(requester.sub);

  if (!currentUser) {
    return next(appError.create("User not found", 404));
  }

  const record = await PatientRecord.findByPk(req.params.id);

  if (!record) {
    return next(appError.create("Record not found", 404));
  }

  const role = requester.role?.toLowerCase();
  const isAdminUser = role === "admin";

  const isDoctorOwner =
    role === "doctor" && record.doctor_id === currentUser.id;

  // =========================
  // AUTHORIZATION
  // =========================
  if (!isAdminUser && !isDoctorOwner) {
    return next(appError.create("Forbidden", 403));
  }

  // =========================
  // SAFE UPDATE (prevent role abuse)
  // =========================
  const allowedFields = {
    diagnosis: req.body.diagnosis,
    prescription: req.body.prescription,
    notes: req.body.notes,
    is_draft: req.body.is_draft
  };

  // remove undefined fields
  Object.keys(allowedFields).forEach(
    (key) => allowedFields[key] === undefined && delete allowedFields[key]
  );

  await record.update(allowedFields);

  return res.status(200).json({
    status: "success",
    data: record
  });
});


// ----------------------
// DELETE RECORD
// ----------------------
exports.deleteRecord = asyncWrapper(async (req, res, next) => {
  const { User, PatientRecord } = req.app.locals.models;
  const requester = req.user;

  if (!requester) {
    return next(appError.create("Unauthorized", 401));
  }

  // 🔥 FIX: consistent identity (JWT sub → DB id)
  const currentUser = await User.findByPk(requester.sub);

  if (!currentUser) {
    return next(appError.create("User not found", 404));
  }

  const record = await PatientRecord.findByPk(req.params.id);

  if (!record) {
    return next(appError.create("Record not found", 404));
  }

  const role = requester.role?.toLowerCase();

  // =========================
  // ONLY ADMIN CAN DELETE
  // =========================
  if (role !== "admin") {
    return next(appError.create("Only admin can delete records", 403));
  }

  await record.destroy();

  return res.status(200).json({
    status: "success",
    message: "Record deleted successfully"
  });
});