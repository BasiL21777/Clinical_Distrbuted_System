// controllers/auth.controller.js

const jwt = require("jsonwebtoken");

exports.token = (req, res) => {
  try {
    const { sub, email, role } = req.body;

    // Basic validation
    if (!sub || !email || !role) {
      return res.status(400).json({
        message: "sub, email, and role are required"
      });
    }

    // Optional role validation
    const allowedRoles = ["doctor", "patient", "admin"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        message: "Invalid role. Allowed roles: doctor, patient, admin"
      });
    }

    const secret = process.env.JWT_SECRET || "your_jwt_secret_here";

    // Generate JWT
    const token = jwt.sign(
      {
        sub: String(sub),
        email,
        role
      },
      secret,
      {
        expiresIn: "1d"
      }
    );

    // Return token in response
    return res.status(200).json({
      message: "Token generated successfully",
      token: "Bearer " + token
    });

  } catch (error) {
    return res.status(500).json({
      message: "Failed to generate token",
      error: error.message
    });
  }
};