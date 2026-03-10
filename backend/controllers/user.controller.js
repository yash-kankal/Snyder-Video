const bcrypt = require("bcrypt");
const validator = require("validator");
const User = require("../models/User");
const Comment = require("../models/Comment");
const { generateToken } = require("../services/token.service");
const { uploadFromRequest, deleteFile } = require("../services/cloudinary.service");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const MSG = require("../constants/messages");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildSafeUser(user) {
  return {
    _id: user._id,
    channelName: user.channelName,
    email: user.email,
    phone: user.phone,
    subscribers: user.subscribers,
    logoUrl: user.logoUrl,
    logoId: user.logoId,
    subscribedBy: user.subscribedBy,
    subscribedChannenls: user.subscribedChannenls,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

// ─── Controllers ──────────────────────────────────────────────────────────────

const signup = asyncHandler(async (req, res) => {
  const { channelName, email, phone, password } = req.body;

  if (!channelName || !email || !password) {
    throw new ApiError(400, "channelName, email, and password are required");
  }
  if (!validator.isEmail(email)) {
    throw new ApiError(400, "Invalid email format");
  }
  if (password.length < 6) {
    throw new ApiError(400, "Password must be at least 6 characters");
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) throw new ApiError(409, MSG.USER_ALREADY_EXISTS);

  let logoUrl = "";
  let logoId = "";

  if (req.files && req.files.logoUrl) {
    const logoFile = req.files.logoUrl;
    const result = await uploadFromRequest(logoFile, { folder: "user-logos" });
    logoUrl = result.secure_url;
    logoId = result.public_id;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = await User.create({
    channelName,
    email: email.toLowerCase(),
    phone: phone || "",
    password: hashedPassword,
    logoUrl,
    logoId,
  });

  return res.status(201).json({
    success: true,
    message: MSG.USER_SIGNUP_SUCCESS,
    data: buildSafeUser(newUser),
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }
  if (!validator.isEmail(email)) {
    throw new ApiError(400, "Invalid email format");
  }

  const findUser = await User.findOne({ email: email.toLowerCase() });
  if (!findUser) throw new ApiError(404, MSG.USER_NOT_FOUND);

  const isMatch = await bcrypt.compare(password, findUser.password);
  if (!isMatch) throw new ApiError(401, "Invalid credentials");

  const token = generateToken({ _id: findUser._id, email: findUser.email });

  return res.status(200).json({
    success: true,
    message: MSG.USER_LOGIN_SUCCESS,
    token,
    user: buildSafeUser(findUser),
  });
});

const subscribe = asyncHandler(async (req, res) => {
  const currentUserId = req.user._id;
  const targetUserId = req.params.userId;

  if (currentUserId.toString() === targetUserId) {
    throw new ApiError(400, MSG.SELF_SUBSCRIBE);
  }

  const targetUser = await User.findById(targetUserId);
  if (!targetUser) throw new ApiError(404, MSG.USER_NOT_FOUND);

  const currentUser = await User.findById(currentUserId);
  if (!currentUser) throw new ApiError(404, MSG.USER_NOT_FOUND);

  const alreadySubscribed = currentUser.subscribedChannenls.some(
    (id) => id.toString() === targetUserId
  );
  if (alreadySubscribed) {
    return res.status(200).json({ success: true, message: "Already subscribed" });
  }

  await User.updateOne(
    { _id: currentUserId },
    { $addToSet: { subscribedChannenls: targetUserId } }
  );

  await User.updateOne(
    { _id: targetUserId },
    {
      $inc: { subscribers: 1 },
      $addToSet: { subscribedBy: currentUserId },
    }
  );

  return res.status(200).json({ success: true, message: MSG.USER_SUBSCRIBED });
});

const unsubscribe = asyncHandler(async (req, res) => {
  const currentUserId = req.user._id;
  const targetUserId = req.params.userId;

  if (currentUserId.toString() === targetUserId) {
    throw new ApiError(400, "You cannot unsubscribe from yourself");
  }

  const targetUser = await User.findById(targetUserId);
  if (!targetUser) throw new ApiError(404, MSG.USER_NOT_FOUND);

  const currentUser = await User.findById(currentUserId);
  if (!currentUser) throw new ApiError(404, MSG.USER_NOT_FOUND);

  const isSubscribed = currentUser.subscribedChannenls.some(
    (id) => id.toString() === targetUserId
  );
  if (!isSubscribed) {
    throw new ApiError(400, MSG.NOT_SUBSCRIBED);
  }

  await User.updateOne(
    { _id: currentUserId },
    { $pull: { subscribedChannenls: targetUserId } }
  );

  await User.updateOne(
    { _id: targetUserId },
    {
      $inc: { subscribers: -1 },
      $pull: { subscribedBy: currentUserId },
    }
  );

  // Ensure subscribers never goes below 0
  await User.updateOne(
    { _id: targetUserId, subscribers: { $lt: 0 } },
    { $set: { subscribers: 0 } }
  );

  return res.status(200).json({ success: true, message: MSG.USER_UNSUBSCRIBED });
});

const getMySubscriptions = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate(
    "subscribedChannenls",
    "channelName logoUrl subscribers"
  );
  if (!user) throw new ApiError(404, MSG.USER_NOT_FOUND);

  return res.status(200).json({
    success: true,
    data: user.subscribedChannenls || [],
  });
});

const updateChannelName = asyncHandler(async (req, res) => {
  const channelName = String(req.body?.channelName || "").trim();
  if (!channelName) {
    throw new ApiError(400, "Channel name is required");
  }
  if (channelName.length < 2 || channelName.length > 60) {
    throw new ApiError(400, "Channel name must be between 2 and 60 characters");
  }

  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, MSG.USER_NOT_FOUND);

  user.channelName = channelName;
  await user.save();
  await Comment.updateMany({ userId: user._id }, { $set: { channelName } });

  return res.status(200).json({
    success: true,
    message: "Channel name updated successfully",
    data: buildSafeUser(user),
  });
});

const updateProfileLogo = asyncHandler(async (req, res) => {
  if (!req.files || !req.files.logoUrl) {
    throw new ApiError(400, "Profile image is required");
  }

  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, MSG.USER_NOT_FOUND);

  if (user.logoId) {
    await deleteFile(user.logoId).catch(() => null);
  }

  const result = await uploadFromRequest(req.files.logoUrl, { folder: "user-logos" });
  user.logoUrl = result.secure_url;
  user.logoId = result.public_id;
  await user.save();

  return res.status(200).json({
    success: true,
    message: "Profile picture updated successfully",
    data: buildSafeUser(user),
  });
});

module.exports = {
  signup,
  login,
  subscribe,
  unsubscribe,
  getMySubscriptions,
  updateChannelName,
  updateProfileLogo,
};
