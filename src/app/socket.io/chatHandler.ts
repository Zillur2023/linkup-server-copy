import { Server, Socket } from "socket.io";
import { getSocketId } from ".";
import { Chat } from "../modules/chat/chat.model";

export const chatHandler = (io: Server, socket: Socket) => {
  socket.on("typing", ({ receiverId }: { receiverId: string }) => {
    const userId = socket.handshake.query.userId as string;
    if (userId && receiverId) {
      const receiverSocketId = getSocketId(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("userTyping", { senderId: userId });
      }
    }
  });

  socket.on("stopTyping", ({ receiverId }: { receiverId: string }) => {
    const userId = socket.handshake.query.userId as string;
    if (userId && receiverId) {
      const receiverSocketId = getSocketId(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("userStoppedTyping", { senderId: userId });
      }
    }
  });

  // if (senderId && receiverId) {
  socket.on("fetchMyChats", async ({ senderId, receiverId }) => {
    // console.log({ senderId, receiverId });
    const populateOptions = [
      { path: "senderId" },
      { path: "receiverId" },
      {
        path: "messages",
        options: { sort: { createdAt: -1 }, limit: 1 },
      },
    ];

    if (!receiverId) {
      // === Case 1: Only senderId (get all chats for this user) ===
      const chats = await Chat.find({
        $or: [{ senderId }, { receiverId: senderId }],
      })
        .sort({ updatedAt: -1 })
        .populate(populateOptions);

      const myRecentLastChats = chats.map((chat) => ({
        _id: chat._id,
        senderId: chat.senderId,
        receiverId: chat.receiverId,
        lastMsg: chat.messages[0] || null,
      }));

      io.emit("myRecentLastChats", myRecentLastChats);
    }

    if (senderId && receiverId) {
      // if (!Types.ObjectId.isValid(receiverId)) {
      //   throw new Error("Invalid receiverId");
      // }

      const myRecentChats = await Chat.findOne({
        $or: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId },
        ],
      }).populate({
        path: "messages",
        // options: { sort: { updatedAt: -1 } },
        populate: {
          path: "senderId",
          model: "User",
        },
      });
      // .populate([
      //   { path: "senderId" },
      //   { path: "receiverId" },
      //   {
      //     path: "messages",
      //     options: { sort: { createdAt: -1 } },
      //   },
      // ]);
      // console.log({ myRecentChats });
      io.emit("myRecentChats", myRecentChats);
    }
  });
};
