import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import Post from "../post/post.model";
import { IComment } from "./comment.interface";
import Comment from "./comment.model";
import { User } from "../user/user.model";

const createCommentIntoDB = async (payload: IComment) => {
  const post = await Post.findById(payload.postId);

  if (!post) {
    throw new AppError(httpStatus.NOT_FOUND, "Post not found");
  }
  const user = await User.findById(payload.userId);

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  const comment = await Comment.create(payload);

  if (user && post) {
    // Add the upvote
    await Post.findByIdAndUpdate(
      payload.postId,
      { $addToSet: { comments: comment?._id } },
      { new: true }
    );
  }

  return await Comment.find();
};

const getAllCommentFromDB = async (postId: string) => {
  const result = await Comment.find({ postId })
    .populate("userId")
    .sort({ createdAt: -1 });

  return result;
};

const updateCommentIntoDB = async (payload: IComment) => {
  const result = await Comment.findByIdAndUpdate(
    payload._id,
    { $set: payload }, // Use $set to specify the fields to update
    {
      new: true, // Return the updated document
      runValidators: true, // Ensure validation rules are followed
    }
  );

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Comment not found");
  }

  return result;
};
const deleteCommentIntoDB = async (commentId: string) => {
  const result = await Comment.findByIdAndDelete(commentId);
  console.log({ result });

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Comment not found");
  }

  return result;
};

export const CommentServices = {
  createCommentIntoDB,
  getAllCommentFromDB,
  updateCommentIntoDB,
  deleteCommentIntoDB,
};
