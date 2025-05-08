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

export const createChatIntoDB = async (payload: ICreateChatIntoDB) => {
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

    // 1. Find or create chat (single query with upsert)
    const chat = await Chat.findOneAndUpdate(
      {
        $or: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId },
        ],
      },
      { $setOnInsert: { senderId, receiverId, messages: [] } },
      {
        upsert: true,
        new: true,
        // setDefaultsOnInsert: true,
      }
    );

    // 2. Create message and populate sender in one step
    const message = await Message.create({
      text,
      imageUrl,
      videoUrl,
      isSeen,
      senderId,
    });

    // 3. Update chat with new message and get the updated chat in one operation
    const updatedChat = await Chat.findByIdAndUpdate(
      { _id: chat._id },
      {
        $push: { messages: message._id },
        // $set: { updatedAt: new Date() },
      },
      { new: true } // Return the updated document
    );

    // Verify the message was added to the chat
    // if (!updatedChat.messages.includes(message._id)) {
    //   throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to add message to chat");
    // }

    // 4. Populate message with sender details (only necessary fields)
    const populatedMessage = await Message.populate(message, {
      path: "senderId",
      model: "User",
      select: "username profilePicture email", // Select only needed fields
    });

    // 5. Socket.io emissions (same as before)
    // const senderSocketId = getSocketId(senderId);
    const receiverSocketId = getSocketId(receiverId);

    // io.to(senderSocketId).emit("senderNewMessage", populatedMessage);
    io.to(receiverSocketId).emit("receiverNewMessage", populatedMessage);

    if (receiverSocketId) {
      const receiverChat = await getChat(receiverId);
      io.to(receiverSocketId).emit("chat", receiverChat);
    }

    // 6. Return the populated message
    return populatedMessage;
  } catch (error) {
    console.error("Error creating chat:", error);
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Something went wrong"
    );
  }
};

const getChatbyUserIdFromDB = async (
  senderId: string,
  receiverId?: string,
  skip = 0,
  limit = 10
) => {
  console.log({ senderId, receiverId, skip, limit });
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
        .populate({
          path: "messages",
          options: {
            sort: { createdAt: -1 },
            skip,
            limit,
          },
          populate: { path: "senderId", model: "User" },
        })
        .populate("senderId")
        .populate("receiverId");

      if (chat && chat.messages) {
        chat.messages = chat.messages.reverse(); // 👈 Fix: reverse so latest is bottom
      }

      console.log({ chat });

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
