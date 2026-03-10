const mongoose = require("mongoose");

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_CONNECT);
    console.log("[DB] MongoDB connected successfully");
  } catch (error) {
    console.error("[DB] MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

module.exports = connectDB;
