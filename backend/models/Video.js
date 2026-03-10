const mongoose = require("mongoose");

const MOOD_OPTIONS = [
  "happy",
  "chill",
  "focus",
  "energetic",
  "sad",
  "romantic",
  "motivational",
];

const videoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    category: {
      type: String,
      default: "",
      trim: true,
    },
    mood: {
      type: String,
      enum: MOOD_OPTIONS,
      default: "chill",
      index: true,
    },
    videoUrl: {
      type: String,
      required: true,
    },
    videoId: {
      type: String,
      required: true,
      index: true,
    },
    thumbnailUrl: {
      type: String,
      default: "",
    },
    thumbnailId: {
      type: String,
      default: "",
    },
    views: {
      type: Number,
      default: 0,
      min: 0,
    },
    likes: {
      type: Number,
      default: 0,
      min: 0,
    },
    dislikes: {
      type: Number,
      default: 0,
      min: 0,
    },
    likedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    dislikedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Video", videoSchema);
