const Comment = require("../models/Comment");
const Video = require("../models/Video");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const MSG = require("../constants/messages");

// ─── Controllers ──────────────────────────────────────────────────────────────

const addComment = asyncHandler(async (req, res) => {
  const { comment } = req.body;
  const { videoId } = req.params;

  if (!comment || !comment.trim()) {
    throw new ApiError(400, "Comment text is required");
  }

  const video = await Video.findById(videoId);
  if (!video) throw new ApiError(404, MSG.VIDEO_NOT_FOUND);

  const user = await User.findById(req.user._id).select("channelName logoUrl");
  if (!user) throw new ApiError(404, MSG.USER_NOT_FOUND);

  const newComment = await Comment.create({
    comment: comment.trim(),
    videoId,
    userId: req.user._id,
    channelName: user.channelName,
    logoUrl: user.logoUrl,
  });

  return res.status(201).json({
    success: true,
    message: MSG.COMMENT_ADDED,
    data: newComment,
  });
});

const getComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const video = await Video.findById(videoId);
  if (!video) throw new ApiError(404, MSG.VIDEO_NOT_FOUND);

  const comments = await Comment.find({ videoId }).sort({ createdAt: -1 });

  return res.status(200).json({ success: true, data: comments });
});

const editComment = asyncHandler(async (req, res) => {
  const { comment } = req.body;
  const { commentId } = req.params;

  if (!comment || !comment.trim()) {
    throw new ApiError(400, "Comment text is required");
  }

  const existingComment = await Comment.findById(commentId);
  if (!existingComment) throw new ApiError(404, MSG.COMMENT_NOT_FOUND);

  if (existingComment.userId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to edit this comment");
  }

  existingComment.comment = comment.trim();
  await existingComment.save();

  return res.status(200).json({
    success: true,
    message: MSG.COMMENT_UPDATED,
    data: existingComment,
  });
});

const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  const existingComment = await Comment.findById(commentId);
  if (!existingComment) throw new ApiError(404, MSG.COMMENT_NOT_FOUND);

  if (existingComment.userId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to delete this comment");
  }

  await Comment.findByIdAndDelete(commentId);

  return res.status(200).json({ success: true, message: MSG.COMMENT_DELETED });
});

module.exports = { addComment, getComments, editComment, deleteComment };
