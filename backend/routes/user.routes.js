const router = require("express").Router();
const auth = require("../middlewares/auth");
const validateObjectId = require("../middlewares/validateObjectId");
const {
  signup,
  login,
  subscribe,
  unsubscribe,
  getMySubscriptions,
  updateChannelName,
  updateProfileLogo,
} = require("../controllers/user.controller");

// Public
router.post("/signup", signup);
router.post("/login", login);

// Protected
router.get("/subscriptions", auth, getMySubscriptions);
router.put("/channel-name", auth, updateChannelName);
router.put("/update-name", auth, updateChannelName);
router.put("/profile/name", auth, updateChannelName);
router.put("/logo", auth, updateProfileLogo);
router.put("/update-logo", auth, updateProfileLogo);
router.put("/profile/logo", auth, updateProfileLogo);
router.put("/subscribe/:userId", auth, validateObjectId("userId"), subscribe);
router.put("/unsubscribe/:userId", auth, validateObjectId("userId"), unsubscribe);

module.exports = router;
