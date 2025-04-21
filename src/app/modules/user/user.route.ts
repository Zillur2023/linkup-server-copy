import { UserControllers } from "./user.controller";
import { multerUpload } from "../../config/multer.config";
import auth from "../../middlewares/auth";
import { USER_ROLE } from "./user.constant";
import { Router } from "express";

const router = Router();

router.post(
  "/create",
  multerUpload.single("profileImage"),
  UserControllers.createUser
);

router.get("/all-user/:userId?", UserControllers.getAllUser);

router.get("/:id", UserControllers.getUserById);

router.put(
  "/update",
  multerUpload.fields([
    { name: "profileImage", maxCount: 1 }, // Allows only 1 profile image
    { name: "coverImage", maxCount: 1 }, // Allows only 1 cover image
  ]),
  UserControllers.updateUser
);

router.put("/followers/:id", UserControllers.updateFollowers);

router.put(
  "/update-follow-unfollow/:id",
  UserControllers.updateFollowAndUnfollow
);

router.put("/sendFriendRequest", UserControllers.sendFriendRequest);

router.put("/acceptFriendRequest", UserControllers.acceptFriendRequest);

router.put("/rejectFriendRequest", UserControllers.rejectFriendRequest);

router.put("/removeFriend", UserControllers.removeFriend);

router.put("/delete/:id", UserControllers.deleteUser);

export const UserRouters = router;
