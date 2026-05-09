const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controllors');
router.post("/token", authController.token);
module.exports = router;
