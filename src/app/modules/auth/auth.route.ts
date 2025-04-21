import { Router } from "express";
import { AuthControllers } from "./auth.controller";

const router = Router();

router.post("/login", AuthControllers.loginUser);

router.post("/change-password", AuthControllers.changePassword);

router.post("/refresh-token", AuthControllers.refreshToken);

router.post("/forget-password", AuthControllers.forgetPassword);

router.post("/reset-password", AuthControllers.resetPassword);

export const AuthRouters = router;
