const Video = require("../models/Video");
const User = require("../models/User");
const { uploadFromRequest, deleteFile } = require("../services/cloudinary.service");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const parseTags = require("../utils/parseTags");
const MSG = require("../constants/messages");

// ─── Controllers ──────────────────────────────────────────────────────────────

const MOOD_OPTIONS = new Set([
  "happy",
  "chill",
  "focus",
  "energetic",
  "sad",
  "romantic",
  "motivational",
]);

function escapeRegex(input) {
  return String(input).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeMood(value) {
  return String(value || "").trim().toLowerCase();
}

const MOOD_FALLBACKS = {
  happy: ["energetic", "motivational", "chill"],
  chill: ["focus", "happy", "romantic"],
  focus: ["chill", "motivational", "news"],
  energetic: ["happy", "sports", "motivational"],
  sad: ["chill", "romantic", "focus"],
  romantic: ["chill", "sad", "happy"],
  motivational: ["energetic", "focus", "happy"],
};

function daysSince(dateValue) {
  const now = Date.now();
  const ts = new Date(dateValue).getTime();
  if (!Number.isFinite(ts)) return 365;
  return Math.max(0, (now - ts) / (1000 * 60 * 60 * 24));
}

function recencyScore(dateValue) {
  // Smooth decay: newest videos get closer to 100, older videos taper down.
  const days = daysSince(dateValue);
  return 100 / (1 + days / 7);
}

function popularityScore(video) {
  const views = Number(video?.views || 0);
  const likes = Number(video?.likes || 0);
  return Math.log10(views + 1) * 12 + Math.log10(likes + 1) * 16;
}

function computeMoodScore(video) {
  const recency = recencyScore(video.createdAt);
  const popularity = popularityScore(video);
  return popularity * 0.7 + recency * 0.3;
}

function reasonForVideo(video, usedFallback) {
  const views = Number(video?.views || 0);
  const likes = Number(video?.likes || 0);
  if (usedFallback) return "Mood fallback match";
  if (views >= 10000) return "Popular in this mood";
  if (likes >= 500) return "Highly liked in this mood";
  if (daysSince(video?.createdAt) <= 7) return "Recently uploaded";
  return "Recommended for this mood";
}

function diversifyByChannel(videos) {
  // Soft diversity: avoid same-channel adjacency by keeping one channel cooldown.
  const pending = [...videos];
  const output = [];
  let lastChannel = "";

  while (pending.length) {
    let pickIdx = pending.findIndex((item) => String(item?.user?._id || item?.user || "") !== lastChannel);
    if (pickIdx < 0) pickIdx = 0;
    const picked = pending.splice(pickIdx, 1)[0];
    output.push(picked);
    lastChannel = String(picked?.user?._id || picked?.user || "");
  }

  return output;
}

const getAllVideos = asyncHandler(async (req, res) => {
  const videos = await Video.find().populate("user", "channelName logoUrl").sort({ createdAt: -1 });
  return res.status(200).json({ success: true, data: videos });
});

const searchVideos = asyncHandler(async (req, res) => {
  const q = String(req.query.q || req.params.q || "").trim();

  if (!q) {
    return res.status(200).json({ success: true, data: [] });
  }

  const titleRegex = new RegExp(escapeRegex(q), "i");
  const videos = await Video.find({ title: titleRegex })
    .populate("user", "channelName logoUrl")
    .sort({ createdAt: -1 })
    .limit(100);

  return res.status(200).json({ success: true, data: videos });
});

const getMyVideos = asyncHandler(async (req, res) => {
  const videos = await Video.find({ user: req.user._id })
    .populate("user", "channelName logoUrl")
    .sort({ createdAt: -1 });
  return res.status(200).json({ success: true, data: videos });
});

const getVideosByUser = asyncHandler(async (req, res) => {
  const channel = await User.findById(req.params.userId).select("channelName logoUrl subscribers");
  if (!channel) {
    throw new ApiError(404, "User not found");
  }

  const videos = await Video.find({ user: req.params.userId })
    .populate("user", "channelName logoUrl subscribers")
    .sort({ createdAt: -1 });

  return res.status(200).json({
    success: true,
    data: videos,
    channel,
  });
});

const getVideoById = asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.videoId).populate(
    "user",
    "channelName logoUrl subscribers"
  );
  if (!video) throw new ApiError(404, MSG.VIDEO_NOT_FOUND);
  return res.status(200).json({ success: true, data: video });
});

const getVideosByMood = asyncHandler(async (req, res) => {
  const mood = normalizeMood(req.params.mood || req.query.mood);
  if (!mood || !MOOD_OPTIONS.has(mood)) {
    throw new ApiError(400, "Invalid mood value");
  }
  const limit = Math.max(1, Math.min(50, Number(req.query.limit || 20)));

  const moodFilter =
    mood === "chill"
      ? { $or: [{ mood: "chill" }, { mood: { $exists: false } }, { mood: "" }] }
      : { mood };

  let baseVideos = await Video.find(moodFilter).populate("user", "channelName logoUrl");
  let usedFallback = false;

  if (baseVideos.length < 4) {
    const fallbackMoods = (MOOD_FALLBACKS[mood] || []).filter((item) => MOOD_OPTIONS.has(item));
    if (fallbackMoods.length) {
      const fallbackVideos = await Video.find({ mood: { $in: fallbackMoods } }).populate(
        "user",
        "channelName logoUrl"
      );
      const mergedById = new Map();
      [...baseVideos, ...fallbackVideos].forEach((video) => mergedById.set(String(video._id), video));
      baseVideos = Array.from(mergedById.values());
      usedFallback = true;
    }
  }

  const scored = baseVideos
    .map((video) => {
      const score = computeMoodScore(video);
      return {
        ...video.toObject(),
        score: Number(score.toFixed(4)),
        reason: reasonForVideo(video, usedFallback),
      };
    })
    .sort((a, b) => b.score - a.score);

  const diversified = diversifyByChannel(scored).slice(0, limit);
  const current = diversified[0] || null;
  const queue = current ? diversified.slice(1) : diversified;

  return res.status(200).json({
    success: true,
    mood,
    meta: {
      total: diversified.length,
      usedFallback,
      limit,
      scoring: "score = 0.7*popularity + 0.3*recency",
    },
    current,
    queue,
    data: diversified,
  });
});

const uploadVideo = asyncHandler(async (req, res) => {
  const { title, description, category, tags } = req.body;
  const mood = normalizeMood(req.body?.mood || "chill");

  if (!title) throw new ApiError(400, "Title is required");
  if (!req.files || !req.files.video) throw new ApiError(400, "Video file is required");
  if (!MOOD_OPTIONS.has(mood)) throw new ApiError(400, "Invalid mood value");

  const rawVideo = req.files.video;
  const videoFile = Array.isArray(rawVideo) ? rawVideo[0] : rawVideo;
  if (!videoFile) throw new ApiError(400, "Video file is required");
  if (videoFile.size === 0) throw new ApiError(400, "Video file is empty");

  let videoResult;
  try {
    videoResult = await uploadFromRequest(videoFile, {
      folder: "videos",
      resource_type: "video",
    });
  } catch (err) {
    throw new ApiError(400, String(err.message || "Video upload failed"));
  }

  let thumbnailUrl = "";
  let thumbnailId = "";

  if (req.files.thumbnail) {
    const rawThumb = req.files.thumbnail;
    const thumbFile = Array.isArray(rawThumb) ? rawThumb[0] : rawThumb;
    if (thumbFile && thumbFile.size > 0) {
      try {
        const thumbResult = await uploadFromRequest(thumbFile, {
          folder: "thumbnails",
          resource_type: "image",
        });
        thumbnailUrl = thumbResult.secure_url;
        thumbnailId = thumbResult.public_id;
      } catch {
        // Keep thumbnail optional; do not fail entire upload.
        thumbnailUrl = "";
        thumbnailId = "";
      }
    }
  }

  const newVideo = await Video.create({
    title,
    description: description || "",
    category: category || "",
    mood,
    tags: parseTags(tags),
    videoUrl: videoResult.secure_url,
    videoId: videoResult.public_id,
    thumbnailUrl,
    thumbnailId,
    user: req.user._id,
  });

  return res.status(201).json({
    success: true,
    message: MSG.VIDEO_UPLOAD_SUCCESS,
    data: newVideo,
  });
});

const updateVideo = asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.videoId);
  if (!video) throw new ApiError(404, MSG.VIDEO_NOT_FOUND);

  if (video.user.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to update this video");
  }

  const { title, description, category, tags } = req.body;
  const mood = req.body?.mood;

  if (title !== undefined) video.title = title;
  if (description !== undefined) video.description = description;
  if (category !== undefined) video.category = category;
  if (tags !== undefined) video.tags = parseTags(tags);
  if (mood !== undefined) {
    const normalizedMood = normalizeMood(mood);
    if (!MOOD_OPTIONS.has(normalizedMood)) {
      throw new ApiError(400, "Invalid mood value");
    }
    video.mood = normalizedMood;
  }

  // Replace thumbnail if provided
  if (req.files && req.files.thumbnail) {
    if (video.thumbnailId) {
      await deleteFile(video.thumbnailId).catch(() => null); // best-effort cleanup
    }
    const thumbResult = await uploadFromRequest(req.files.thumbnail, {
      folder: "thumbnails",
      resource_type: "image",
    });
    video.thumbnailUrl = thumbResult.secure_url;
    video.thumbnailId = thumbResult.public_id;
  }

  await video.save();

  return res.status(200).json({
    success: true,
    message: MSG.VIDEO_UPDATED,
    data: video,
  });
});

const deleteVideo = asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.videoId);
  if (!video) throw new ApiError(404, MSG.VIDEO_NOT_FOUND);

  if (video.user.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to delete this video");
  }

  // Clean up Cloudinary assets (best-effort)
  if (video.videoId) {
    await deleteFile(video.videoId, { resource_type: "video" }).catch(() => null);
  }
  if (video.thumbnailId) {
    await deleteFile(video.thumbnailId).catch(() => null);
  }

  await Video.findByIdAndDelete(req.params.videoId);

  return res.status(200).json({ success: true, message: MSG.VIDEO_DELETED });
});

const likeVideo = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const videoId = req.params.videoId;

  const unlikeResult = await Video.updateOne(
    { _id: videoId, likedBy: userId },
    {
      $pull: { likedBy: userId },
      $inc: { likes: -1 },
    }
  );

  if (unlikeResult.modifiedCount > 0) {
    await Video.updateOne(
      { _id: videoId, likes: { $lt: 0 } },
      { $set: { likes: 0 } }
    );
    const video = await Video.findById(videoId);
    return res.status(200).json({ success: true, message: MSG.VIDEO_UNLIKED, data: video });
  }

  const likeResult = await Video.updateOne(
    { _id: videoId, likedBy: { $ne: userId } },
    {
      $addToSet: { likedBy: userId },
      $inc: { likes: 1 },
    }
  );

  if (likeResult.matchedCount === 0) {
    throw new ApiError(404, MSG.VIDEO_NOT_FOUND);
  }

  await Video.updateOne(
    { _id: videoId, dislikedBy: userId },
    {
      $pull: { dislikedBy: userId },
      $inc: { dislikes: -1 },
    }
  );

  await Video.updateOne(
    { _id: videoId, dislikes: { $lt: 0 } },
    { $set: { dislikes: 0 } }
  );

  const video = await Video.findById(videoId);
  return res.status(200).json({ success: true, message: MSG.VIDEO_LIKED, data: video });
});

const dislikeVideo = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const videoId = req.params.videoId;

  const undislikeResult = await Video.updateOne(
    { _id: videoId, dislikedBy: userId },
    {
      $pull: { dislikedBy: userId },
      $inc: { dislikes: -1 },
    }
  );

  if (undislikeResult.modifiedCount > 0) {
    await Video.updateOne(
      { _id: videoId, dislikes: { $lt: 0 } },
      { $set: { dislikes: 0 } }
    );
    const video = await Video.findById(videoId);
    return res.status(200).json({ success: true, message: MSG.VIDEO_UNDISLIKED, data: video });
  }

  const dislikeResult = await Video.updateOne(
    { _id: videoId, dislikedBy: { $ne: userId } },
    {
      $addToSet: { dislikedBy: userId },
      $inc: { dislikes: 1 },
    }
  );

  if (dislikeResult.matchedCount === 0) {
    throw new ApiError(404, MSG.VIDEO_NOT_FOUND);
  }

  await Video.updateOne(
    { _id: videoId, likedBy: userId },
    {
      $pull: { likedBy: userId },
      $inc: { likes: -1 },
    }
  );

  await Video.updateOne(
    { _id: videoId, likes: { $lt: 0 } },
    { $set: { likes: 0 } }
  );

  const video = await Video.findById(videoId);
  return res.status(200).json({ success: true, message: MSG.VIDEO_DISLIKED, data: video });
});

const viewVideo = asyncHandler(async (req, res) => {
  const video = await Video.findByIdAndUpdate(
    req.params.videoId,
    { $inc: { views: 1 } },
    { new: true }
  );
  if (!video) throw new ApiError(404, MSG.VIDEO_NOT_FOUND);

  return res.status(200).json({ success: true, message: MSG.VIDEO_VIEW_COUNTED, data: video });
});

module.exports = {
  getAllVideos,
  searchVideos,
  getMyVideos,
  getVideosByUser,
  getVideoById,
  getVideosByMood,
  uploadVideo,
  updateVideo,
  deleteVideo,
  likeVideo,
  dislikeVideo,
  viewVideo,
};
