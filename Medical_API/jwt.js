const jwt = require("jsonwebtoken");

const token = jwt.sign(
  {
    sub: "3",
    email: "test@mail.com",
    role: "doctor"
  },
  "supersecret",
  { expiresIn: "1h" }
);

console.log(token);