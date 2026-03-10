const jwt = require("jsonwebtoken");
const MSG = require("../constants/messages");

function auth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: MSG.AUTH_MISSING });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET_KEY);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, message: MSG.AUTH_INVALID });
  }
}

module.exports = auth;
