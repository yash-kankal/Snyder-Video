const mongoose = require("mongoose");
const MSG = require("../constants/messages");

/**
 * Middleware factory — validates one or more named route params as Mongo ObjectIds.
 * Usage: router.get("/:videoId", validateObjectId("videoId"), handler)
 */
function validateObjectId(...paramNames) {
  return (req, res, next) => {
    for (const param of paramNames) {
      if (!mongoose.Types.ObjectId.isValid(req.params[param])) {
        return res.status(400).json({ success: false, message: MSG.INVALID_ID });
      }
    }
    next();
  };
}

module.exports = validateObjectId;
