import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { ChatServices } from "./chat.service";

const createChat = catchAsync(async (req, res) => {
  const { senderId, receiverId, content } = req.body;
  const result = await ChatServices.createChatIntoDB(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Create chat successfully",
    data: result,
  });
});
const getChatByUserId = catchAsync(async (req, res) => {
  const {
    senderId,
    receiverId,
    skip = "0",
    limit = "10",
  } = req.query as {
    senderId: string;
    receiverId?: string;
    skip?: string;
    limit?: string;
  };

  const result = await ChatServices.getChatbyUserIdFromDB(
    senderId,
    receiverId,
    parseInt(skip),
    parseInt(limit)
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Get chat successfully",
    data: result,
  });
});

export const ChatControllers = {
  createChat,
  getChatByUserId,
};
