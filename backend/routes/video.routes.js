const router = require("express").Router();
const auth = require("../middlewares/auth");
const validateObjectId = require("../middlewares/validateObjectId");
const {
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
} = require("../controllers/video.controller");

// Public
router.get("/all-videos", getAllVideos);
router.get("/search", searchVideos);
router.get("/search/title", searchVideos);
router.get("/search/:q", searchVideos);
router.get("/search/title/:q", searchVideos);
router.get("/mood/:mood", getVideosByMood);
router.get("/channel/:userId", validateObjectId("userId"), getVideosByUser);

// Protected
router.get("/my-videos", auth, getMyVideos);
router.post("/uploadvideo", auth, uploadVideo);
router.put("/like/:videoId", auth, validateObjectId("videoId"), likeVideo);
router.put("/dislike/:videoId", auth, validateObjectId("videoId"), dislikeVideo);
router.put("/view/:videoId", auth, validateObjectId("videoId"), viewVideo);
router.put("/:videoId", auth, validateObjectId("videoId"), updateVideo);
router.delete("/delete/:videoId", auth, validateObjectId("videoId"), deleteVideo);
router.delete("/:videoId", auth, validateObjectId("videoId"), deleteVideo);

// Keep this dynamic route last to avoid shadowing static paths like /my-videos.
router.get("/:videoId", validateObjectId("videoId"), getVideoById);

module.exports = router;
