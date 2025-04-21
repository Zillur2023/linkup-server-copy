import { Schema, model } from "mongoose";
import { IChat, IMessage } from "./chat.interface";

const messageSchema = new Schema<IMessage>(
  {
    text: {
      type: String,
      default: "",
    },
    imageUrl: {
      type: String,
      default: "",
    },
    videoUrl: {
      type: String,
      default: "",
    },
    isSeen: { type: Boolean, default: false },
    senderId: {
      type: Schema.ObjectId,
      required: true,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

const chatSchema = new Schema<IChat>(
  {
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    receiverId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    messages: [
      {
        type: Schema.ObjectId,
        ref: "Message",
      },
    ],
  },
  { timestamps: true }
);

export const Message = model<IMessage>("Message", messageSchema);
export const Chat = model<IChat>("Chat", chatSchema);
