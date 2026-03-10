const MSG = require("../constants/messages");

function notFound(req, res) {
  res.status(404).json({ success: false, message: MSG.NOT_FOUND });
}

module.exports = notFound;
