const { Op } = require("sequelize");
const asyncWrapper = require("../middelwares/async_wrappers");
const appError = require("../utils/appError");
const userRoles = require("../utils/userRoles");
const { USE } = require("sequelize/lib/index-hints");

// Helper
function isAdmin(req) {
  return req?.user?.role === userRoles.ADMIN;
}

// GET ALL USERS
exports.getAllUsers = asyncWrapper(async (req, res) => {
  const User = req.app.locals.models.User;

  // JWT payload:
  // req.user = { sub: "1", email: "...", role: "admin" }

  if (!isAdmin(req)) {
    return res.status(403).json({
      status: "error",
      msg: "Forbidden",
      data: null
    });
  }

  const currentUserId = Number(req.user.sub);

  // Show:
  // 1) All non-admin users
  // 2) Current admin user only
  const users = await User.findAll({
    where: {
      [Op.or]: [
        { role: { [Op.ne]: "admin" } },
        { id: currentUserId }
      ]
    }
  });

  res.status(200).json({
    status: "success",
    results: users.length,
    data: users
  });
});

// GET SINGLE USER
exports.getUser = asyncWrapper(async (req, res, next) => {
  const User = req.app.locals.models.User;

  // URL example: /api/users/1
  const requestedId = String(req.params.id);

  // JWT example:
  // { sub: "1", email: "...", role: "admin" }
  const requesterId = String(req.user?.sub);
  const requesterRole = req.user?.role?.toLowerCase();

  // Find requested user by DB primary key (id column)
  const user = await User.findByPk(requestedId);

  if (!user) {
    return next(appError.create("User not found", 404));
  }

  // =========================
  // SELF ACCESS (sub == id)
  // =========================
  if (requesterId === requestedId) {
    return res.status(200).json({
      status: "success",
      data: user
    });
  }

  // =========================
  // ADMIN ACCESS
  // =========================
  if (requesterRole === "admin") {
    // Admin cannot view other admins
    if (user.role.toLowerCase() === "admin") {
      return next(
        appError.create("Forbidden: cannot access other admin accounts", 403)
      );
    }

    return res.status(200).json({
      status: "success",
      data: user
    });
  }

  // =========================
  // NON-ADMIN DENIED
  // =========================
  return next(appError.create("Forbidden", 403));
});

// CREATE USER
exports.createUser = asyncWrapper(async (req, res, next) => {
  const User = req.app.locals.models.User;
  if (req.body.role === "admin") {
    return next(appError.create("Forbidden: cannot create admin", 403));
  }

  const user = await User.create(req.body);

  res.status(201).json({
    status: "success",
    data: user
  });
});

// UPDATE USER
exports.updateUser = asyncWrapper(async (req, res, next) => {
  const User = req.app.locals.models.User;

  // URL user id
  const requestedId = String(req.params.id);

  // JWT payload
  const requesterId = String(req.user?.sub);
  const requesterRole = req.user?.role?.toLowerCase();

  // Find target user
  const user = await User.findByPk(requestedId);

  if (!user) {
    return next(appError.create("User not found", 404));
  }

  // Copy body to safely modify
  const updateData = { ...req.body };

  // =========================
  // SELF UPDATE
  // =========================
  if (requesterId === requestedId) {
    // User cannot change their own role
    delete updateData.role;

    await user.update(updateData);

    return res.status(200).json({
      status: "success",
      data: user
    });
  }

  // =========================
  // ADMIN UPDATE
  // =========================
  if (requesterRole === "admin") {
    // Admin cannot update other admins
    if (user.role.toLowerCase() === "admin") {
      return next(
        appError.create("Forbidden: cannot update other admin accounts", 403)
      );
    }

    // Admin CAN update role
    await user.update(updateData);

    return res.status(200).json({
      status: "success",
      data: user
    });
  }

  // =========================
  // FORBIDDEN
  // =========================
  return next(appError.create("Forbidden", 403));
});

// DELETE USER
exports.deleteUser = asyncWrapper(async (req, res, next) => {
  const User = req.app.locals.models.User;

  const requestedId = String(req.params.id);
  const requesterId = String(req.user?.sub);
  const requesterRole = req.user?.role?.toLowerCase();

  const user = await User.findByPk(requestedId);

  if (!user) {
    return next(appError.create("User not found", 404));
  }

  // =========================
  // NON-ADMIN → NO DELETE AT ALL
  // =========================
  if (requesterRole !== "admin") {
    return next(appError.create("Forbidden", 403));
  }

  // =========================
  // ADMIN RULES
  // =========================

  // Admin cannot delete himself
  if (user.auth_user_id === requesterId) {
    return next(appError.create("Admin cannot delete himself", 403));
  }

  // Admin cannot delete other admins
  if (user.role?.toLowerCase() === "admin") {
    return next(appError.create("Cannot delete other admin accounts", 403));
  }

  await user.destroy();

  return res.status(200).json({
    status: "success",
    message: "User deleted successfully"
  });
});

exports.getDoctors = asyncWrapper(async (req, res, next) => {
  const User = req.app.locals.models.User;

  const requesterRole = req.user?.role?.toLowerCase();

  // Block doctors
  if (requesterRole === "doctor") {
    return next(appError.create("Forbidden", 403));
  }

  const doctors = await User.findAll({
    where: {
      role: "doctor"
    },
    attributes: ["id", "email"]
  });

  return res.status(200).json({
    status: "success",
    results: doctors.length,
    data: doctors
  });
});