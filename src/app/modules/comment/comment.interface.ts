import { Types } from "mongoose";

export interface IComment {
  _id?: Types.ObjectId;
  postId: Types.ObjectId; // Reference to Post model
  userId: Types.ObjectId; // Reference to User model
  content: string; // The content of the comment
  createdAt?: Date; // Automatically managed by Mongoose
  updatedAt?: Date; // Automatically managed by Mongoose
}
