const cloudinary = require("cloudinary").v2;

function configureCloudinary() {
  cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET,
  });
  console.log("[Cloudinary] Configured successfully");
}

module.exports = { cloudinary, configureCloudinary };
