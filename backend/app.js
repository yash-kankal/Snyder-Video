const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const fileUpload = require("express-fileupload");
const rateLimit = require("express-rate-limit");

const userRoutes = require("./routes/user.routes");
const videoRoutes = require("./routes/video.routes");
const commentRoutes = require("./routes/comment.routes");
const errorHandler = require("./middlewares/errorHandler");
const notFound = require("./middlewares/notFound");

const app = express();

// ─── Security headers ─────────────────────────────────────────────────────────
app.use(helmet());

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  return next();
});

// ─── Rate limiting (production only) ─────────────────────────────────────────
if (process.env.NODE_ENV === "production") {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many requests, please try again later." },
  });
  app.use(limiter);
}

// ─── Request logging ──────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── File uploads ─────────────────────────────────────────────────────────────
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
    limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
    abortOnLimit: true,
  })
);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.status(200).json({ success: true, message: "Server is healthy" });
});

// ─── API routes ───────────────────────────────────────────────────────────────
app.use("/user", userRoutes);
app.use("/video", videoRoutes);
app.use("/comment", commentRoutes);

// ─── 404 & error handling ─────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
