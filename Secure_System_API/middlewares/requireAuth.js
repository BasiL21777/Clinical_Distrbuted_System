// middlewares/requireAuth.js
require('dotenv').config();
const jwt = require('jsonwebtoken');

module.exports = function requiresAuth() {
  return (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header missing' });
    }

    const parts = authHeader.split(' ');

    if (parts[0].toLowerCase() !== 'bearer' || parts.length !== 2) {
      return res.status(401).json({ error: 'Invalid Authorization format' });
    }

    const token = parts[1];

    try {
      // Verify token signed by the Auth Docker service
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Expected JWT payload:
      // {
      //   sub: "1",          ← users.id  (DB primary key)
      //   email: "...",
      //   role: "doctor"     ← admin | doctor | patient
      // }

      req.user = decoded;
      next();

    } catch (err) {
      return res.status(401).json({
        error: 'Invalid or expired token',
        message: err.message
      });
    }
  };
};
