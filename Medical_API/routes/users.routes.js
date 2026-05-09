const express = require("express");
const router = express.Router();

const usersController = require("../controllers/users.controller");
const requiresAuth = require("../middelwares/requiresAuth");
const requireRole = require("../middelwares/requireRole");

// =======================
// GET ALL USERS
// =======================
router.get(
  "/",
  requiresAuth(),
  usersController.getAllUsers
);

router.get("/doctors", 
  requiresAuth(),
   usersController.getDoctors);

   
// =======================
// GET SINGLE USER
// =======================
router.get(
  "/:id",
  requiresAuth(),
  usersController.getUser
);

// =======================
// CREATE USER
// =======================
router.post(
  "/",
  // requiresAuth(),
  // requireRole(["admin"]),
  usersController.createUser
);

// =======================
// UPDATE USER
// =======================
router.put(
  "/:id",
  requiresAuth(),
  // requireRole(["admin"]),
  usersController.updateUser
);

// =======================
// DELETE USER
// =======================
router.delete(
  "/:id",
  requiresAuth(),
  // requireRole(["admin"]),
  usersController.deleteUser
);


module.exports = router;