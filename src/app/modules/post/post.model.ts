import { model, Schema } from "mongoose";
import { IPost } from "./post.interface";

const PostSchema = new Schema<IPost>(
  {
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String },
    isPremium: { type: Boolean },
    // image: [{ type: File }],
    images: [{ type: String, default: [] }],
    likes: [{ type: Schema.Types.ObjectId, ref: "User", default: [] }],
    dislikes: [{ type: Schema.Types.ObjectId, ref: "User", default: [] }],
    comments: [{ type: Schema.Types.ObjectId, ref: "Comment", default: [] }],
  },
  { timestamps: true }
);

const Post = model<IPost>("Post", PostSchema);

export default Post;
