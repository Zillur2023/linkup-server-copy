import { Router } from "express";
import { PostControllers } from "./post.controller";
import { multerUpload } from "../../config/multer.config";

const router = Router();

router.post(
  "/create",
  multerUpload.array("images"),
  PostControllers.createPost
);

// router.get("/all-post/:postId?/:userId?", PostControllers.getAllPost);
router.get("/all-post", PostControllers.getAllPost);

router.put("/likes", PostControllers.updateLikes);

router.put("/dislikes", PostControllers.updateDislikes);

router.put("/update", multerUpload.array("images"), PostControllers.updatePost);

router.put("/comment", PostControllers.updateComment);

router.delete("/delete/:postId", PostControllers.deletePost);

router.get("/isAvailable-verified/:id", PostControllers.isAvailableForVerified);

export const PostRouters = router;
