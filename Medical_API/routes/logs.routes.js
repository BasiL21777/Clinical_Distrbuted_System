const express = require('express');
const router = express.Router();

const { getLogs } = require('../controllers/logs.controller');
const requiresAuth = require('../middelwares/requiresAuth');

// 🔐 protected
router.get('/', requiresAuth(), getLogs);

module.exports = router;