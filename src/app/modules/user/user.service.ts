import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import { User } from "./user.model";
import { IUser } from "./user.interface";
import mongoose, { ObjectId, Types } from "mongoose";
import { getSocketId, io } from "../../socket.io";

const createUserIntoDB = async (
  payload: Pick<IUser, "name" | "email" | "password">
) => {
  // const createUserIntoDB = async (payload: IUser) => {

  // checking if the user is exist
  const isUserExist = await User.findOne({ email: payload.email });

  if (isUserExist) {
    throw new AppError(
      httpStatus.ALREADY_REPORTED,
      "This user is already exist!"
    );
  }
  const result = await User.create(payload);

  return result;
};

const getAllUserFromDB = async (searchQuery?: string, userId?: string) => {
  const matchStage: any = { isDeleted: { $ne: true } };

  // Apply search term filter if provided
  if (searchQuery) {
    matchStage.name = { $regex: searchQuery, $options: "i" };
  }

  // Exclude the requesting user from the results if `userId` is provided
  if (userId) {
    matchStage._id = { $ne: userId };
  }

  const result = await User.aggregate([
    { $match: matchStage },
    {
      $lookup: {
        from: "users",
        localField: "followers",
        foreignField: "_id",
        as: "followers",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "following",
        foreignField: "_id",
        as: "following",
      },
    },
    {
      $project: {
        password: 0, // Exclude sensitive fields if necessary
      },
    },
  ]).exec();

  return result;
};

const getUserByEmailFromDB = async (email: string) => {
  const result = await User.findOne({ email });
  return result;
};
const getUserByIdFromDB = async (id: string) => {
  const userId = new mongoose.Types.ObjectId(id);
  const result = await User.findById(userId)
    // .populate("chats")
    // .populate({
    //   path: "chats",
    //   populate: [
    //     { path: "_id" },
    //     // { path: "senderId", select: "name profileImage" },
    //     // { path: "senderId", select: "name profileImage" },
    //     // { path: "receiverId", select: "name profileImage" },
    //   ],
    // })
    .populate("friendRequestsSent")
    .populate("friendRequestsReceived")
    .populate("friends");

  return result;
};

const updateUserIntoDB = async (payload: IUser) => {
  const user = await User.findByIdAndUpdate(payload._id, payload, {
    new: true,
    runValidators: true,
  });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  return user;
};

const updateUserFollowersIntoDB = async (
  id: string,
  payload: Record<string, unknown>
) => {
  const userId = new mongoose.Types.ObjectId(id as string);
  const followerId = new mongoose.Types.ObjectId(payload.followers as string);

  const user = await User.findById(userId);
  const followerUser = await User.findById(followerId);

  if (!user) throw new AppError(httpStatus.NOT_FOUND, "User not found");
  if (!followerUser)
    throw new AppError(httpStatus.NOT_FOUND, "Follow User not found");

  if (!user.followers.some((id) => id.equals(followerId))) {
    user.followers.push(followerId);
    // followerUser.following = followerUser.following.filter(
    //   (followingId) => !followingId.equals(userId)
    // );
    followerUser.following.push(userId);

    await user.save();
    await followerUser.save();
  }
};

const updateFollowAndUnfollowIntoDB = async (
  targetUserId: string,
  currentUser: IUser
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const targetUser = await User.findById(targetUserId).session(session);
    const loggedInUser = await User.findById(currentUser?._id).session(session);

    if (!loggedInUser)
      throw new AppError(httpStatus.NOT_FOUND, "Current user not found");
    if (!targetUser)
      throw new AppError(httpStatus.NOT_FOUND, "Target user not found");

    const isFollowing = loggedInUser.following.some((id) =>
      id.equals(targetUserId)
    );

    if (!isFollowing) {
      await User.findByIdAndUpdate(
        loggedInUser._id,
        { $addToSet: { following: targetUserId } },
        { session }
      );

      await User.findByIdAndUpdate(
        targetUserId,
        { $addToSet: { followers: loggedInUser._id } },
        { session }
      );
    } else {
      await User.findByIdAndUpdate(
        loggedInUser._id,
        { $pull: { following: targetUserId } },
        { session }
      );

      await User.findByIdAndUpdate(
        targetUserId,
        { $pull: { followers: loggedInUser._id } },
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

export const sendFriendRequestIntoDB = async (
  senderId: Types.ObjectId | string,
  receiverId: Types.ObjectId | string
): Promise<void> => {
  try {
    // Convert senderId and receiverId to ObjectId
    const senderObjectId = new mongoose.Types.ObjectId(senderId);
    const receiverObjectId = new mongoose.Types.ObjectId(receiverId);

    // Check if both sender and receiver exist in the database
    const [senderExist, receiverExist] = await Promise.all([
      User.exists({ _id: senderObjectId }),
      User.exists({ _id: receiverObjectId }),
    ]);

    if (!senderExist)
      throw new AppError(httpStatus.NOT_FOUND, "Sender not found");
    if (!receiverExist)
      throw new AppError(httpStatus.NOT_FOUND, "Receiver not found");

    // Ensure sender and receiver are not the same person
    if (senderObjectId.equals(receiverObjectId)) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "You cannot send a request to yourself."
      );
    }

    // Fetch sender and receiver to check their current state
    const [sender, receiver] = await Promise.all([
      User.findById(senderObjectId)
        .populate("friendRequestsSent")
        .populate("friendRequestsReceived")
        .populate("friends"),
      User.findById(receiverObjectId)
        .populate("friendRequestsSent")
        .populate("friendRequestsReceived")
        .populate("friends"),
    ]);

    if (!sender || !receiver) {
      throw new AppError(httpStatus.NOT_FOUND, "User data not found");
    }

    // Check if sender and receiver are already friends
    if (sender.friends.some((id) => id.equals(receiverObjectId))) {
      throw new AppError(httpStatus.BAD_REQUEST, "You are already friends");
    }

    // Check if sender has already sent a request
    if (sender.friendRequestsSent.some((id) => id.equals(receiverObjectId))) {
      throw new AppError(httpStatus.BAD_REQUEST, "Friend request already sent");
    }

    // Use $push to add the friend request to the sender and receiver
    await Promise.all([
      User.findByIdAndUpdate(senderObjectId, {
        $push: { friendRequestsSent: receiverObjectId }, // Add receiver to sender's sent requests
      }),
      User.findByIdAndUpdate(receiverObjectId, {
        $push: { friendRequestsReceived: senderObjectId }, // Add sender to receiver's received requests
      }),
    ]);

    const [updatedSender, updatedReceiver] = await Promise.all([
      User.findById(senderObjectId)
        .populate("friendRequestsSent")
        .populate("friendRequestsReceived")
        .populate("friends"),
      User.findById(receiverObjectId)
        .populate("friendRequestsSent")
        .populate("friendRequestsReceived")
        .populate("friends"),
    ]);

    const senderSocketId = getSocketId(senderId as string);
    const receiverSocketId = getSocketId(receiverId as string);

    io.to(senderSocketId).emit("friendRequestSent", updatedSender);
    io.to(receiverSocketId).emit("friendRequestReceived", updatedReceiver);
  } catch (error) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Something went wrong"
    );
  }
};

export const acceptFriendRequestIntoDB = async (
  userId: Types.ObjectId | string,
  requesterId: Types.ObjectId | string
): Promise<void> => {
  try {
    const [userExist, requesterExist] = await Promise.all([
      User.exists({ _id: userId }),
      User.exists({ _id: requesterId }),
    ]);

    if (!userExist) throw new AppError(httpStatus.NOT_FOUND, "User not found");
    if (!requesterExist)
      throw new AppError(httpStatus.NOT_FOUND, "Requester not found");

    // Ensure the friend request exists before updating
    const user = await User.findById(userId, { friendRequestsReceived: 1 });

    if (!user?.friendRequestsReceived.some((id) => id.equals(requesterId))) {
      throw new AppError(httpStatus.BAD_REQUEST, "No friend request found");
    }

    await Promise.all([
      User.findByIdAndUpdate(userId, {
        $addToSet: { friends: requesterId },
        $pull: { friendRequestsReceived: requesterId },
      }),
      User.findByIdAndUpdate(requesterId, {
        $addToSet: { friends: userId },
        $pull: { friendRequestsSent: userId },
      }),
    ]);

    const [updatedUser, updatedRequester] = await Promise.all([
      User.findById(userId)
        .populate("friendRequestsSent")
        .populate("friendRequestsReceived")
        .populate("friends"),
      User.findById(requesterId)
        .populate("friendRequestsSent")
        .populate("friendRequestsReceived")
        .populate("friends"),
    ]);

    const userSocketId = getSocketId(userId as string);
    const requesterSocketId = getSocketId(requesterId as string);

    io.to(userSocketId).emit("userAcceptFriendRequest", updatedUser);
    io.to(requesterSocketId).emit(
      "userAcceptFriendRequestUpdateRequester",
      updatedRequester
    );
  } catch (error) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Something went wrong"
    );
  }
};

export const rejectFriendRequestIntoDB = async (
  userId: Types.ObjectId | string,
  requesterId: Types.ObjectId | string
): Promise<void> => {
  try {
    const [user, requester] = await Promise.all([
      User.exists({ _id: userId }),
      User.exists({ _id: requesterId }),
    ]);

    if (!user) throw new AppError(httpStatus.NOT_FOUND, "User not found");
    if (!requester)
      throw new AppError(httpStatus.NOT_FOUND, "Requester not found");

    await Promise.all([
      User.findByIdAndUpdate(userId, {
        $pull: { friendRequestsReceived: requesterId },
      }),
      User.findByIdAndUpdate(requesterId, {
        $pull: { friendRequestsSent: userId },
      }),
    ]);

    const [updatedUser, updatedRequester] = await Promise.all([
      User.findById(userId),
      User.findById(requesterId),
    ]);

    const userSocketId = getSocketId(userId as string);
    const requesterSocketId = getSocketId(requesterId as string);

    io.to(userSocketId).emit("userRejectFriendRequest", updatedUser);
    io.to(requesterSocketId).emit(
      "userRejectFriendRequestUpdateRequester",
      updatedRequester
    );
  } catch (error) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Something went wrong"
    );
  }
};

export const removeFriendFromDB = async (
  userId: Types.ObjectId | string,
  friendId: Types.ObjectId | string
): Promise<void> => {
  try {
    // Check if both users exist
    const [userExists, friendExists] = await Promise.all([
      User.exists({ _id: userId }),
      User.exists({ _id: friendId }),
    ]);

    if (!userExists) throw new AppError(httpStatus.NOT_FOUND, "User not found");
    if (!friendExists)
      throw new AppError(httpStatus.NOT_FOUND, "Friend not found");

    // Remove friendId from user's friends list & vice versa
    await Promise.all([
      User.findByIdAndUpdate(userId, { $pull: { friends: friendId } }),
      User.findByIdAndUpdate(friendId, { $pull: { friends: userId } }),
    ]);
  } catch (error) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Something went wrong"
    );
  }
};

const deleteUserFromDB = async (id: string) => {
  const result = await User.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true }
  );
};

export const UserServices = {
  createUserIntoDB,
  getAllUserFromDB,
  getUserByEmailFromDB,
  getUserByIdFromDB,
  updateUserIntoDB,
  updateUserFollowersIntoDB,
  updateFollowAndUnfollowIntoDB,
  sendFriendRequestIntoDB,
  acceptFriendRequestIntoDB,
  rejectFriendRequestIntoDB,
  removeFriendFromDB,
  deleteUserFromDB,
};
