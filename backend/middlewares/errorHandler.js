const ApiError = require("../utils/ApiError");
const MSG = require("../constants/messages");

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Known operational error
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.errors.length > 0 && { errors: err.errors }),
    });
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ success: false, message: "Validation failed", errors });
  }

  // Mongoose cast error (bad ObjectId)
  if (err.name === "CastError") {
    return res.status(400).json({ success: false, message: MSG.INVALID_ID });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return res.status(401).json({ success: false, message: MSG.AUTH_INVALID });
  }

  // Unknown error – hide internals in production
  const isDev = process.env.NODE_ENV !== "production";
  return res.status(500).json({
    success: false,
    message: MSG.SERVER_ERROR,
    ...(isDev && { detail: err.message }),
  });
}

module.exports = errorHandler;
