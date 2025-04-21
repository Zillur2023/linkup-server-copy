import { Types } from "mongoose";

export interface IMessage {
  _id?: Types.ObjectId;
  text: string;
  imageUrl: string;
  videoUrl: string;
  isSeen: boolean;
  senderId: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IChat {
  _id?: Types.ObjectId;
  senderId: Types.ObjectId;
  receiverId: Types.ObjectId;
  messages: Types.ObjectId[];
  createdAt?: Date;
  updatedAt?: Date;
}
