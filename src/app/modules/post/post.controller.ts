import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { PostServices } from "./post.service";

const createPost = catchAsync(async (req, res) => {
  const images =
    (req.files as Express.Multer.File[])?.map((file) => file.path) || [];
  const result = await PostServices.createPostIntoDB({
    ...JSON.parse(req.body.data),
    images,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Create post successfully",
    data: result,
  });
});
const getAllPost = catchAsync(async (req, res) => {
  // const { postId, userId } = req.params as {
  //   postId?: string;
  //   userId?: string;
  // };

  const { postId, userId, searchQuery, sortBy, isPremium } = req.query as {
    postId?: string;
    userId?: string;
    searchQuery?: string;
    sortBy?:
      | "highestLikes"
      | "lowestLikes"
      | "highestDislikes"
      | "lowestDislikes";
    isPremium?: boolean;
  };

  // Fetch posts from the database using the params and query parameters
  const result = await PostServices.getAllPostFromDB(
    postId,
    userId,
    searchQuery
  );

  // Send response back to the client
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Posts fetched successfully",
    data: result,
  });
});

const updateLikes = catchAsync(async (req, res) => {
  // const { userId, postId } = req.body;
  const { postId, likes, dislikes } = req.body;
  const result = await PostServices.updateLikesIntoDB(postId, likes, dislikes);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Likes update successfully",
    data: result,
  });
});
const updateDislikes = catchAsync(async (req, res) => {
  // const { userId, postId } = req.body;
  const { postId, dislikes } = req.body;
  const result = await PostServices.updateDislikesIntoDB(postId, dislikes);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Dislikes update successfully",
    data: result,
  });
});

const updatePost = catchAsync(async (req, res) => {
  // Parse `req.body.data` because it's a JSON string
  const parsedData = JSON.parse(req.body.data);

  // Extract images from req.files
  const uploadedImages =
    (req.files as Express.Multer.File[])?.map((file) => file.path) || [];

  // Merge existing images with newly uploaded images
  // const allImages = [...(parsedData.images || []), ...uploadedImages];
  const allImages = [
    ...(Array.isArray(parsedData.images)
      ? parsedData.images.filter(
          (image: any) => typeof image === "string" && image.trim() !== ""
        )
      : []),
    ...uploadedImages,
  ];

  // Update post in DB
  const result = await PostServices.updatePostIntoDB({
    ...parsedData,
    images: allImages, // Correct way to merge images
  });
  // const result = await PostServices.updatePostIntoDB(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Post update successfully",
    data: result,
  });
});
const updateComment = catchAsync(async (req, res) => {
  const { userId, postId } = req.body;
  const result = await PostServices.updateCommentIntoDB(userId, postId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Comment update successfully",
    data: result,
  });
});
const deletePost = catchAsync(async (req, res) => {
  const { postId } = req.params;
  const result = await PostServices.deletePostFromDB(postId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Post deleted successfully",
    data: result,
  });
});

const isAvailableForVerified = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await PostServices.isAvailableForVerifiedIntoDB(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Available for verified successfully",
    data: result,
  });
});

export const PostControllers = {
  createPost,
  getAllPost,
  updateLikes,
  updateDislikes,
  updatePost,
  updateComment,
  deletePost,
  isAvailableForVerified,
};
