import { model, Schema } from "mongoose";
import { IComment } from "./comment.interface";

const CommentSchema = new Schema<IComment>(
  {
    postId: { type: Schema.Types.ObjectId, ref: "Post", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true },
  },
  { timestamps: true }
);

const Comment = model<IComment>("Comment", CommentSchema);

export default Comment;
