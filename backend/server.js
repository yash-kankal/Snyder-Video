require("dotenv").config();

const validateEnv = require("./config/env");
const connectDB = require("./config/db");
const { configureCloudinary } = require("./config/cloudinary");
const app = require("./app");

// Validate required env vars before anything else
validateEnv();

// Configure Cloudinary once at startup
configureCloudinary();

const PORT = process.env.PORT || 3000;

async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`[Server] Running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  });
}

start();
