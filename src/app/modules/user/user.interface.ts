// import { Model, Types } from "mongoose";
import { Model } from "mongoose";
import { USER_ROLE } from "./user.constant";

import { Types } from "mongoose";

export interface IUser {
  _id?: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  needsPasswordChange: boolean;
  passwordChangedAt?: Date;
  bio?: string;
  profileImage?: string[];
  coverImage?: string[];
  chats?: Types.ObjectId[];
  followers: Types.ObjectId[]; // Array of ObjectIds referencing 'User'
  following: Types.ObjectId[]; // Array of ObjectIds referencing 'User'
  friendRequestsSent: Types.ObjectId[];
  friendRequestsReceived: Types.ObjectId[];
  friends: Types.ObjectId[];
  isVerified: boolean;
  role: "admin" | "user";
  gender?: "Male" | "Female" | "Other";
  dateOfBirth?: string;
  location?: string;
  website?: string;
  phone?: string;
  joinedAt?: string;
  lastActiveAt?: string;
  status: "in-progress" | "blocked";
  paymentStatus?: "Pending" | "Paid" | "Failed";
  transactionId?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserModel extends Model<IUser> {
  //instance methods for checking if passwords are matched
  isPasswordMatched(
    plainTextPassword: string,
    hashedPassword: string
  ): Promise<boolean>;
  isJWTIssuedBeforePasswordChanged(
    passwordChangedTimestamp: Date,
    jwtIssuedTimestamp: number
  ): boolean;
}
