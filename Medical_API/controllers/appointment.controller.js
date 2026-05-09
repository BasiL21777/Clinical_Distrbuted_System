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
// GET ALL APPOINTMENTS
// ----------------------
exports.getAllAppointments = asyncWrapper(async (req, res, next) => {
  const requester = req.user;
  const { User, Appointment } = req.app.locals.models;

  // =========================
  // AUTH CHECK
  // =========================
  if (!requester) {
    return next(appError.create("Unauthorized", 401));
  }

  // =========================
  // YOUR JWT CURRENTLY:
  // sub = DB user id
  // Example:
  // sub: "1"
  // =========================
  const currentUser = await User.findByPk(Number(requester.sub));

  if (!currentUser) {
    return next(appError.create("User not found", 404));
  }

  let appointments;

  // =========================
  // ADMIN → ALL appointments
  // =========================
  if (requester.role?.toLowerCase() === "admin") {
    appointments = await Appointment.findAll({
      include: [
        {
          model: User,
          as: "patient",
          attributes: ["id", "auth_user_id", "email", "role"]
        },
        {
          model: User,
          as: "doctor",
          attributes: ["id", "auth_user_id", "email", "role"]
        }
      ],
      order: [["appointment_date", "ASC"]]
    });
  }

  // =========================
  // DOCTOR / PATIENT → OWN appointments only
  // =========================
  else {
    appointments = await Appointment.findAll({
      where: {
        [Op.or]: [
          { patient_id: currentUser.id },
          { doctor_id: currentUser.id }
        ]
      },
      include: [
        {
          model: User,
          as: "patient",
          attributes: ["id", "auth_user_id", "email", "role"]
        },
        {
          model: User,
          as: "doctor",
          attributes: ["id", "auth_user_id", "email", "role"]
        }
      ],
      order: [["appointment_date", "ASC"]]
    });
  }

  return res.status(200).json({
    status: "success",
    requester: {
      id: currentUser.id,
      email: currentUser.email,
      role: currentUser.role
    },
    results: appointments.length,
    data: appointments
  });
});

// ----------------------
// GET APPOINTMENT BY ID
// ----------------------
exports.getAppointment = asyncWrapper(async (req, res, next) => {
  const { User, Appointment } = req.app.locals.models;
  const requester = req.user;

  if (!requester) {
    return next(appError.create("Unauthorized", 401));
  }

  // 🔥 IMPORTANT FIX: use DB id directly from JWT sub
  const currentUser = await User.findByPk(Number(requester.sub));

  if (!currentUser) {
    return next(appError.create("User not found", 404));
  }

  const appointment = await Appointment.findByPk(req.params.id, {
    include: [
      { model: User, as: "patient" },
      { model: User, as: "doctor" }
    ]
  });

  if (!appointment) {
    return next(appError.create("Appointment not found", 404));
  }

  const role = requester.role?.toLowerCase();
  const isAdminUser = role === "admin";

  const isOwner =
    appointment.patient_id === currentUser.id ||
    appointment.doctor_id === currentUser.id;

  if (!isAdminUser && !isOwner) {
    return next(appError.create("Forbidden", 403));
  }

  return res.status(200).json({
    status: "success",
    data: appointment
  });
});



// ----------------------
// CREATE APPOINTMENT
// ----------------------
exports.createAppointment = asyncWrapper(async (req, res, next) => {
  const requester = req.user;
  const { User, Appointment } = req.app.locals.models;

  // =========================
  // AUTH CHECK
  // =========================
  if (!requester) {
    return next(appError.create("Unauthorized", 401));
  }

  // =========================
  // YOUR JWT sub = DB user id
  // Example:
  // sub = "1"
  // =========================
  const currentUser = await User.findByPk(Number(requester.sub));

  if (!currentUser) {
    return next(appError.create("User not found", 404));
  }

  // =========================
  // ONLY PATIENT OR ADMIN
  // =========================
  if (
    requester.role?.toLowerCase() !== "patient" &&
    requester.role?.toLowerCase() !== "admin"
  ) {
    return next(
      appError.create("Only patients or admins can create appointments", 403)
    );
  }

  // =========================
  // VALIDATE REQUIRED FIELDS
  // =========================
  if (!req.body.doctor_id || !req.body.appointment_date || !req.body.reason) {
    return next(
      appError.create(
        "doctor_id, appointment_date, and reason are required",
        400
      )
    );
  }

  // =========================
  // VALIDATE DOCTOR
  // =========================
  const doctor = await User.findByPk(req.body.doctor_id);

  if (!doctor) {
    return next(appError.create("Doctor not found", 404));
  }

  if (doctor.role?.toLowerCase() !== "doctor") {
    return next(appError.create("Selected user is not a doctor", 400));
  }

  // =========================
  // DETERMINE PATIENT
  // Patient → self only
  // Admin → any patient
  // =========================
  let patientId = currentUser.id;

  if (requester.role?.toLowerCase() === "patient") {
    if (currentUser.role?.toLowerCase() !== "patient") {
      return next(appError.create("Your account is not a patient", 403));
    }

    patientId = currentUser.id;
  }

  if (
    requester.role?.toLowerCase() === "admin" &&
    req.body.patient_id
  ) {
    const patient = await User.findByPk(req.body.patient_id);

    if (!patient) {
      return next(appError.create("Patient not found", 404));
    }

    if (patient.role?.toLowerCase() !== "patient") {
      return next(appError.create("Selected user is not a patient", 400));
    }

    patientId = patient.id;
  }

  // =========================
  // CREATE APPOINTMENT
  // =========================
  const appointment = await Appointment.create({
    patient_id: patientId,
    doctor_id: doctor.id,
    appointment_date: req.body.appointment_date,
    reason: req.body.reason,
    note: req.body.note || null,
    status: req.body.status || "scheduled"
  });

  // =========================
  // RETURN CREATED WITH DETAILS
  // =========================
  const createdAppointment = await Appointment.findByPk(appointment.id, {
    include: [
      {
        model: User,
        as: "patient",
        attributes: ["id", "email", "role"]
      },
      {
        model: User,
        as: "doctor",
        attributes: ["id", "email", "role"]
      }
    ]
  });

  return res.status(201).json({
    status: "success",
    message: "Appointment created successfully",
    data: createdAppointment
  });
});

// ----------------------
// UPDATE APPOINTMENT
// ----------------------
exports.updateAppointment = asyncWrapper(async (req, res, next) => {
  const { User, Appointment } = req.app.locals.models;
  const requester = req.user;

  if (!requester) {
    return next(appError.create("Unauthorized", 401));
  }

  // 🔥 Use DB identity (sub = user.id in your system)
  const currentUser = await User.findByPk(Number(requester.sub));

  if (!currentUser) {
    return next(appError.create("User not found", 404));
  }

  const appointment = await Appointment.findByPk(req.params.id);

  if (!appointment) {
    return next(appError.create("Appointment not found", 404));
  }

  const role = requester.role?.toLowerCase();

  const isAdminUser = role === "admin";
  const isDoctorUser = role === "doctor";

  // 🔥 Ownership rules
  const isDoctorOwner =
    isDoctorUser && appointment.doctor_id === currentUser.id;

  // Admin OR owning doctor only
  if (!isAdminUser && !isDoctorOwner) {
    return next(appError.create("Forbidden", 403));
  }

  await appointment.update(req.body);

  return res.status(200).json({
    status: "success",
    data: appointment
  });
});

// ----------------------
// DELETE APPOINTMENT
// ----------------------
exports.deleteAppointment = asyncWrapper(async (req, res, next) => {
  const { User, Appointment } = req.app.locals.models;
  const appointment = await Appointment.findByPk(req.params.id);

  if (!appointment) {
    return next(appError.create("Appointment not found", 404));
  }

  const requester = req.user;

  if (!requester) {
    return next(appError.create("Unauthorized", 401));
  }

  if (!isAdmin(requester.role)) {
    return next(appError.create("Only admin can delete appointments", 403));
  }

  await appointment.destroy();

  res.status(200).json({
    status: "success",
    message: "Appointment deleted successfully"
  });
});