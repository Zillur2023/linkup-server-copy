import { Server, Socket } from "socket.io";
import Comment from "../modules/comment/comment.model";
import Post from "../modules/post/post.model";
import { IComment } from "../modules/comment/comment.interface";
import mongoose from "mongoose";

export const commentHandler = (io: Server, socket: Socket) => {
  socket.on("addComment", async (comment: IComment) => {
    try {
      const newComment = await Comment.create(comment);
      const updatedComment = await Post.findByIdAndUpdate(
        comment.postId,
        { $addToSet: { comments: newComment._id } },
        { new: true }
      );
      console.log({ comment });
      console.log({ newComment });
      console.log({ updatedComment });

      io.emit("addedComment", updatedComment);
    } catch (error) {
      console.error("Error adding comment:", error);
      socket.emit("commentError", {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to add comment",
      });
    }
  });
  socket.on("updateComment", async (updateData: Partial<IComment>) => {
    try {
      // Validate required fields
      if (!updateData._id) {
        throw new Error("Comment ID is required for update");
      }

      const updatedComment = await Comment.findByIdAndUpdate(
        updateData._id,
        { $set: updateData },
        {
          new: true,
          runValidators: true,
          lean: true, // Return plain JavaScript object instead of Mongoose document
        }
      ).exec();

      if (!updatedComment) {
        throw new Error("Comment not found");
      }

      io.emit("updatedComment", updatedComment);
    } catch (error) {
      console.error("Comment update error:", error);
      socket.emit("commentError", {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to update comment",
      });
    }
  });
  socket.on("deleteComment", async (commentId: string) => {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const deletedComment = await Comment.findByIdAndDelete(commentId, {
        session,
      });
      if (!deletedComment) throw new Error("Comment not found");

      const updatedPost = await Post.findByIdAndUpdate(
        deletedComment.postId,
        { $pull: { comments: commentId } },
        { new: true, session }
      ).lean(); // ← .lean() for better performance

      await session.commitTransaction();

      io.emit("deletedComment", {
        commentId,
        post: updatedPost, // Send full updated post if clients need it
      });
    } catch (error) {
      await session.abortTransaction();
      // Error handling...
    } finally {
      session.endSession();
    }
  });
};
