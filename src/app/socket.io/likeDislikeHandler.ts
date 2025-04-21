import { Server, Socket } from "socket.io";
import Post from "../modules/post/post.model";

export const likeDislikeHandler = (io: Server, socket: Socket) => {
  socket.on("update-like-dislike", async ({ postId, likes, dislikes }) => {
    try {
      // Update DB
      const updatePost = await Post.findByIdAndUpdate(
        postId,
        {
          $set: { likes, dislikes },
        },
        { new: true }
      );

      // Broadcast to all clients (or just to others if you prefer)
      io.emit("updated-like-dislike", updatePost);
    } catch (error) {
      console.error("Error updating likes/dislikes:", error);
    }
  });
};
