const router = require("express").Router();
const auth = require("../middlewares/auth");
const validateObjectId = require("../middlewares/validateObjectId");
const {
  addComment,
  getComments,
  editComment,
  deleteComment,
} = require("../controllers/comment.controller");

router.put("/new-comment/:videoId", auth, validateObjectId("videoId"), addComment);
router.get("/getcomments/:videoId", validateObjectId("videoId"), getComments);
router.put("/editcomment/:commentId", auth, validateObjectId("commentId"), editComment);
router.delete("/deletecomment/:commentId", auth, validateObjectId("commentId"), deleteComment);

module.exports = router;
