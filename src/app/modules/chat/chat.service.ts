import { Types } from "mongoose";
import { Chat, Message } from "./chat.model";
import { User } from "../user/user.model";
import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import { getSocketId, io } from "../../socket.io";

interface ICreateChatIntoDB {
  senderId: string;
  receiverId: string;
  text?: string;
  imageUrl?: string;
  videoUrl?: string;
  isSeen: boolean;
}

const getChat = async (currentUserId: string) => {
  if (!currentUserId) return [];

  const currentUserChat = await Chat.find({
    $or: [{ senderId: currentUserId }, { receiverId: currentUserId }],
  })
    .sort({ updatedAt: -1 })
    .populate({
      path: "messages",
      populate: { path: "senderId", model: "User" },
    })
    .populate("senderId")
    .populate("receiverId");

  return currentUserChat.map((chat) => ({
    _id: chat._id,
    senderId: chat.senderId,
    receiverId: chat.receiverId,
    lastMsg: chat.messages.at(-1), // cleaner!
  }));
};

export const createChatIntoDB = async (
  payload: ICreateChatIntoDB
): Promise<void> => {
  try {
    const { senderId, receiverId, text, imageUrl, videoUrl, isSeen } = payload;

    // 1. Validate sender and receiver
    // const [senderExists, receiverExists] = await Promise.all([
    //   User.exists({ senderId }),
    //   User.exists({ receiverId }),
    // ]);

    // if (!senderExists) {
    //   throw new AppError(httpStatus.NOT_FOUND, "Sender not found");
    // }
    // if (!receiverExists) {
    //   throw new AppError(httpStatus.NOT_FOUND, "Receiver not found");
    // }

    // if (senderId?.toString() === receiverId?.toString()) {
    //   throw new AppError(
    //     httpStatus.BAD_REQUEST,
    //     "You cannot send a message to yourself."
    //   );
    // }

    // 2. Check if chat already exists between these two users
    let chat = await Chat.findOne({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    })
      .sort({ updatedAt: -1 })
      .populate("messages");

    // 3. If chat does not exist, create it
    if (!chat) {
      chat = await Chat.create({ senderId, receiverId });
    }

    // 4. Create the message
    const createMessage = await Message.create({
      text,
      imageUrl,
      videoUrl,
      isSeen,
      senderId, // <- cleaned up naming
    });
    console.log({ createMessage });

    // 5. Update the chat with the new message
    Promise.all([chat.messages.push(createMessage?._id), await chat.save()]);

    const newMessage = await Chat.findById(chat?._id)
      // .sort({ updatedAt: -1 })
      // .populate("messages")
      .populate({
        path: "messages",
        populate: { path: "senderId", model: "User" },
      })
      .populate("senderId")
      .populate("receiverId");

    Promise.all([
      User.findByIdAndUpdate(senderId.toString(), {
        $push: { chats: chat?._id },
      }),
      User.findByIdAndUpdate(receiverId.toString(), {
        $push: { chats: chat?._id },
      }),
    ]);

    const senderSocketId = getSocketId(senderId);
    const receiverSocketId = getSocketId(receiverId);

    io.to(senderSocketId).emit("newMessage", newMessage);
    io.to(receiverSocketId).emit("newMessage", newMessage);

    const chatSender = await getChat(senderId);

    console.log({ chatSender });

    io.to(senderSocketId).emit("chat", chatSender);
    io.to(receiverSocketId).emit("chat", chatSender);
  } catch (error) {
    console.error("Error creating chat:", error);
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Something went wrong"
    );
  }
};

const getChatbyUserIdFromDB = async (senderId: string, receiverId?: string) => {
  try {
    // Validate senderId
    if (!Types.ObjectId.isValid(senderId)) {
      throw new Error("Invalid senderId");
    }

    const populateOptions = [
      { path: "senderId" },
      { path: "receiverId" },
      {
        path: "messages",
        options: { sort: { createdAt: -1 }, limit: 1 },
      },
    ];

    // === Case 1: Only senderId (get all chats for this user) ===
    if (!receiverId) {
      const chats = await Chat.find({
        $or: [{ senderId }, { receiverId: senderId }],
      })
        .sort({ updatedAt: -1 })
        .sort({ updatedAt: -1 })
        .populate({
          path: "messages",
          populate: { path: "senderId", model: "User" },
        })
        .populate("senderId")
        .populate("receiverId");

      return chats.map((chat) => ({
        _id: chat._id,
        senderId: chat.senderId,
        receiverId: chat.receiverId,
        lastMsg: chat.messages.at(-1),
      }));
    }

    // === Case 2: senderId and receiverId are provided (get specific chat) ===
    if (senderId && receiverId) {
      if (!Types.ObjectId.isValid(receiverId)) {
        throw new Error("Invalid receiverId");
      }

      const chat = await Chat.findOne({
        $or: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId },
        ],
      })
        .sort({ updatedAt: -1 })
        .populate({
          path: "messages",
          populate: { path: "senderId", model: "User" },
        })
        .populate("senderId")
        .populate("receiverId");

      return [chat];
    }

    // Optional: fallback
    throw new Error("Invalid parameters provided.");
  } catch (error) {
    console.error("Error in getChatbyUserIdFromDB:", error);
    throw error;
  }
};

export const ChatServices = {
  createChatIntoDB,
  getChatbyUserIdFromDB,
};
