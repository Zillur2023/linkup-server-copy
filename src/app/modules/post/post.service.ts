import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import { User } from "../user/user.model";
import { IPost } from "./post.interface";
import Post from "./post.model";
import mongoose from "mongoose";
import { getSocketId, io } from "../../socket.io";

const createPostIntoDB = async (payload: IPost) => {
  const user = await User.findById(payload.author);

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }
  const result = await Post.create(payload);

  return result;
};

const deleteUnassociatedPosts = async () => {
  try {
    // Step 1: Get all user IDs and all post IDs
    const allUserIds = await User.find({ isDeleted: false })
      .select("_id")
      .lean(); // Get all user IDs
    const allPostIds = await Post.find().select("_id author").lean(); // Get all post IDs with their authors

    // Extract user IDs from the array of user objects
    const userIds = allUserIds.map((user) => user._id.toString()); // Convert ObjectId to string for comparison

    // Step 2: Filter posts that do not have an associated user ID
    const postIdsToDelete = allPostIds
      .filter((post) => !userIds.includes(String(post?.author))) // Keep posts without a valid user
      .map((post) => post._id); // Get the IDs of those posts

    // Step 3: Delete the unassociated posts
    if (postIdsToDelete.length > 0) {
      await Post.deleteMany({ _id: { $in: postIdsToDelete } });
    } else {
    }
  } catch (error) {
    console.error("Error deleting unassociated posts:", error);
  }
};

const getAllPostFromDB = async (
  postId?: string,
  userId?: string,
  searchQuery?: string,
  sortBy?:
    | "highestLikes"
    | "lowestLikes"
    | "highestDislikes"
    | "lowestDislikes",
  isPremium?: boolean // New parameter to specify premium filter
) => {
  await deleteUnassociatedPosts(); // Delete posts without associated users

  let result;

  const pipeline: any[] = [];

  // if (!isPremium) {
  //   pipeline.push({ $match: { isPremium: { $ne: true } } });
  // }
  if (!postId && !isPremium) {
    pipeline.push({ $match: { isPremium: { $ne: true } } });
  }

  if (postId) {
    // If postId is provided, fetch the specific post
    pipeline.push({ $match: { _id: new mongoose.Types.ObjectId(postId) } });
  } else if (userId) {
    // If userId is provided, fetch posts by that user
    pipeline.push({ $match: { author: new mongoose.Types.ObjectId(userId) } });
  } else {
    // If searchTerm is provided, search by title (case-insensitive)
    if (searchQuery) {
      pipeline.push({
        $match: {
          $or: [
            // { "author.name": { $regex: searchQuery, $options: "i" } },
            { title: { $regex: searchQuery, $options: "i" } },
            { content: { $regex: searchQuery, $options: "i" } },
          ],
        },
      });
    }
  }

  // Lookup stages for author and comments
  pipeline.push(
    {
      $lookup: {
        from: "users",
        localField: "author",
        foreignField: "_id",
        as: "author",
      },
    },
    {
      $unwind: {
        path: "$author",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "users", // Collection name for likes
        localField: "likes",
        foreignField: "_id",
        as: "likes",
      },
    },
    {
      $lookup: {
        from: "users", // Collection name for dislikes
        localField: "dislikes",
        foreignField: "_id",
        as: "dislikes",
      },
    },
    {
      $lookup: {
        from: "comments",
        localField: "comments",
        foreignField: "_id",
        as: "comments",
      },
    }
  );

  // Execute the aggregation pipeline to get all posts
  result = await Post.aggregate(pipeline).exec();

  // Sorting based on likes and dislikes after fetching
  if (sortBy) {
    result.sort((a, b) => {
      const likeCountA = a.likes ? a.likes.length : 0;
      const likeCountB = b.likes ? b.likes.length : 0;
      const dislikeCountA = a.dislikes ? a.dislikes.length : 0;
      const dislikeCountB = b.dislikes ? b.dislikes.length : 0;

      switch (sortBy) {
        case "highestLikes":
          return likeCountB - likeCountA; // Sort descending
        case "lowestLikes":
          return likeCountA - likeCountB; // Sort ascending
        case "highestDislikes":
          return dislikeCountB - dislikeCountA; // Sort descending
        case "lowestDislikes":
          return dislikeCountA - dislikeCountB; // Sort ascending
        default:
          return 0;
      }
    });
  }
  //  else {
  //   // Default sort by highest likes if no sort option is provided
  //   result.sort((a, b) => {
  //     const likeCountA = a.likes ? a.likes.length : 0;
  //     const likeCountB = b.likes ? b.likes.length : 0;
  //     return likeCountB - likeCountA; // Sort by likes descending
  //   });
  // }

  return result;
};

export const updateLikesIntoDB = async (
  postId: string,
  likes: string[],
  dislikes: string[]
) => {
  console.log({ postId, likes });
  const updatePostLikes = await Post.findByIdAndUpdate(postId, {
    $set: { likes: likes, dislikes: dislikes },
  });

  return updatePostLikes;
};

export const updateDislikesIntoDB = async (
  postId: string,
  dislikes: string[]
) => {
  console.log({ postId, dislikes });
  const updatePostDislikes = await Post.findByIdAndUpdate(postId, {
    $set: { dislikes: dislikes },
  });

  return updatePostDislikes;
};

const updatePostIntoDB = async (payload: IPost) => {
  const result = await Post.findByIdAndUpdate(payload._id, payload, {
    new: true,
    runValidators: true,
  });

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Post not found");
  }

  return result;
};

export const updateCommentIntoDB = async (userId: string, postId: string) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const postObjectId = new mongoose.Types.ObjectId(postId);

  // Find the user by its ID
  const user = await User.findById(userObjectId);

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }
  // Find the post by its ID
  const post = await Post.findById(postObjectId);

  if (!post) {
    throw new AppError(httpStatus.NOT_FOUND, "Post not found");
  }

  if (user && post) {
    // Add the like
    await Post.findByIdAndUpdate(
      postObjectId,
      { $addToSet: { comment: userObjectId } },
      { new: true }
    );
  }

  return Post.findById(postObjectId); // Return the updated post
};

const deletePostFromDB = async (postId: string) => {
  const result = await Post.findByIdAndDelete(postId);

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Post not found");
  }

  return result;
};

const isAvailableForVerifiedIntoDB = async (id: string) => {
  const user = await User.findById(id);

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }
  // Fetch posts by author ID that have likes
  const postsWithUserLiked = await Post.find(
    { author: id, likes: { $exists: true, $ne: [] } } // Ensuring posts have likes
  ).select("likes");

  // Flatten and filter the likes to check if the user has liked any post
  const userLikes = postsWithUserLiked
    .flatMap((post) => post.likes) // Flatten likes from all posts
    .filter((like) => !like?.equals(user._id)); // Filter for the user's likes

  return userLikes;
};

export const PostServices = {
  createPostIntoDB,
  getAllPostFromDB,
  updateLikesIntoDB,
  updateDislikesIntoDB,
  updatePostIntoDB,
  updateCommentIntoDB,
  deletePostFromDB,
  isAvailableForVerifiedIntoDB,
};

// export const updateLikesIntoDB = async (userId: string, postId: string) => {
//   const userObjectId = new mongoose.Types.ObjectId(userId);
//   const postObjectId = new mongoose.Types.ObjectId(postId);

//   // Find the user by its ID
//   const user = await User.findById(userId);

//   if (!user) {
//     throw new AppError(httpStatus.NOT_FOUND, "User not found");
//   }
//   // Find the post by its ID
//   const post = await Post.findById(postObjectId);

//   if (!post) {
//     throw new AppError(httpStatus.NOT_FOUND, "Post not found");
//   }

//   if (!post.likes) {
//     post.likes = [];
//   }
//   if (!post.dislikes) {
//     post.dislikes = [];
//   }

//   // Check if the user has already liked
//   const hasLiked = post.likes.some((likeId) => likeId.equals(userObjectId));

//   // Check if the user has already disliked (they should not be allowed to like if so)
//   const hasDisliked = post.dislikes.some((dislikeId) =>
//     dislikeId.equals(userObjectId)
//   );

//   if (hasDisliked) {
//     await Post.findByIdAndUpdate(
//       postObjectId,
//       { $pull: { dislikes: userObjectId } },
//       { new: true }
//     );
//   } else {
//     if (hasLiked) {
//       // If already liked, remove the like
//       await Post.findByIdAndUpdate(
//         postObjectId,
//         { $pull: { likes: userObjectId } },
//         { new: true }
//       );
//     } else {
//       // Add the like
//       await Post.findByIdAndUpdate(
//         postObjectId,
//         { $addToSet: { likes: userObjectId } },
//         { new: true }
//       );
//     }
//   }

//   const updatePost = Post.findById(postObjectId);

//   return updatePost; // Return the updated post
// };

// export const updateDislikesIntoDB = async (userId: string, postId: string) => {
//   const userObjectId = new mongoose.Types.ObjectId(userId);
//   const postObjectId = new mongoose.Types.ObjectId(postId);

//   // Find the user by its ID
//   const user = await User.findById(userId);

//   if (!user) {
//     throw new AppError(httpStatus.NOT_FOUND, "User not found");
//   }

//   // Find the post by its ID
//   const post = await Post.findById(postObjectId);

//   if (!post) {
//     throw new AppError(httpStatus.NOT_FOUND, "Post not found");
//   }

//   if (!post.likes) {
//     post.likes = [];
//   }
//   if (!post.dislikes) {
//     post.dislikes = [];
//   }

//   // Check if the user has already disliked
//   const hasDisliked = post.dislikes.some((dislikeId) =>
//     dislikeId.equals(userObjectId)
//   );

//   // Check if the user has already liked (they should not be allowed to dislike if so)
//   const hasLiked = post.likes.some((likeId) => likeId.equals(userObjectId));

//   if (hasLiked) {
//     // throw new AppError(httpStatus.FORBIDDEN, "You cannot dislike after likeing. Remove like first.");
//     await Post.findByIdAndUpdate(
//       postObjectId,
//       { $pull: { likes: userObjectId } },
//       { new: true }
//     );
//   } else {
//     if (hasDisliked) {
//       // If already disliked, remove the dislike
//       await Post.findByIdAndUpdate(
//         postObjectId,
//         { $pull: { dislikes: userObjectId } },
//         { new: true }
//       );
//     } else {
//       // Add the dislike
//       await Post.findByIdAndUpdate(
//         postObjectId,
//         { $addToSet: { dislikes: userObjectId } },
//         { new: true }
//       );
//     }
//   }

//   return Post.findById(postObjectId); // Return the updated post
// };
