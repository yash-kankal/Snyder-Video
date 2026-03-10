const REQUIRED_ENV_VARS = [
  "MONGO_CONNECT",
  "TOKEN_SECRET_KEY",
  "CLOUD_NAME",
  "API_KEY",
  "API_SECRET",
];

function validateEnv() {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(
      `[Startup] Missing required environment variables: ${missing.join(", ")}`
    );
    process.exit(1);
  }
}

module.exports = validateEnv;
