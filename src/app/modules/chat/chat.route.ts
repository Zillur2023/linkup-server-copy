import { Router } from "express";
import { ChatControllers } from "./chat.controller";

const router = Router();

router.post("/createChat", ChatControllers.createChat);

router.get("/getChatbyUserId", ChatControllers.getChatByUserId);

export const ChatRouters = router;
