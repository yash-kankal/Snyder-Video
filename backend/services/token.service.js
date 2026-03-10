const jwt = require("jsonwebtoken");

function generateToken(payload) {
  return jwt.sign(payload, process.env.TOKEN_SECRET_KEY, { expiresIn: "7d" });
}

function verifyToken(token) {
  return jwt.verify(token, process.env.TOKEN_SECRET_KEY);
}

module.exports = { generateToken, verifyToken };
