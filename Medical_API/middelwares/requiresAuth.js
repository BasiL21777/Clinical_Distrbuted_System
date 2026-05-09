require("dotenv").config();
const jwt = require("jsonwebtoken");

module.exports = function requiresAuth() {
  return (req, res, next) => {
    const authHeader = req.headers["authorization"];

    if (!authHeader) {
      return res.status(401).json({ error: "Authorization header missing" });
    }

    const parts = authHeader.split(" ");

    if (parts[0].toLowerCase() !== "bearer" || parts.length !== 2) {
      return res.status(401).json({ error: "Invalid Authorization format" });
    }

    const token = parts[1];

    try {
      // VERIFY TOKEN FROM AUTH DOCKER
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // expected payload example:
      // {
      //   id: 1,
      //   sub: "github_123",
      //   email: "user@gmail.com",
      //   role: "doctor"
      // }

      req.user = decoded;

      next();

    } catch (err) {
      return res.status(401).json({
        error: "Invalid or expired token",
        message: err.message
      });
    }
  };
};