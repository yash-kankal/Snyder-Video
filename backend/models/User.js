const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    channelName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      default: "",
    },
    password: {
      type: String,
      required: true,
    },
    logoUrl: {
      type: String,
      default: "",
    },
    logoId: {
      type: String,
      default: "",
    },
    subscribers: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Kept original field name for frontend compatibility.
    // TODO Phase 2: rename to subscribedChannels with a migration.
    subscribedChannenls: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    subscribedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
