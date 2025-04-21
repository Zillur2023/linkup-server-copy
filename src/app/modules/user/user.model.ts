import { Schema, model } from "mongoose";
// import { TUser, UserModel } from "./user.interface";
import config from "../../config";
import bcrypt from "bcrypt";
import { IUser, IUserModel } from "./user.interface";

export const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    needsPasswordChange: { type: Boolean, default: true },
    passwordChangedAt: { type: Date },
    bio: { type: String },
    profileImage: { type: [String] },
    coverImage: { type: [String] },
    chats: [{ type: Schema.Types.ObjectId, ref: "Chat", default: [] }],
    followers: [{ type: Schema.Types.ObjectId, ref: "User", default: [] }],
    following: [{ type: Schema.Types.ObjectId, ref: "User", default: [] }],
    friendRequestsSent: [
      { type: Schema.Types.ObjectId, ref: "User", default: [] },
    ],
    friendRequestsReceived: [
      { type: Schema.Types.ObjectId, ref: "User", default: [] },
    ],
    friends: [{ type: Schema.Types.ObjectId, ref: "User", default: [] }],
    isVerified: { type: Boolean, default: false },
    role: {
      type: String,
      enum: ["admin", "user"],
      required: true,
      default: "user",
    },
    gender: { type: String, enum: ["Male", "Female", "Other"] },
    dateOfBirth: { type: String },
    location: { type: String },
    website: { type: String },
    phone: { type: String },
    // joinedAt: { type: String, required: true },
    joinedAt: { type: String },
    lastActiveAt: { type: String },
    status: { type: String, enum: ["in-progress", "blocked"] },
    paymentStatus: { type: String, enum: ["Pending", "Paid", "Failed"] },
    transactionId: { type: String },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true } // Automatically adds `createdAt` and `updatedAt`
);

userSchema.pre("save", async function (next) {
  const user = this; // doc
  // hashing password and save into DB
  user.password = await bcrypt.hash(
    user.password as string,
    Number(config.bcrypt_salt_rounds)
  );
  next();
});

// set '' after saving password
userSchema.post("save", function (doc, next) {
  doc.password = "";
  next();
});

userSchema.statics.isPasswordMatched = async function (
  plainTextPassword,
  hashedPassword
) {
  return await bcrypt.compare(plainTextPassword, hashedPassword);
};

userSchema.statics.isJWTIssuedBeforePasswordChanged = function (
  passwordChangedTimestamp: Date,
  jwtIssuedTimestamp: number
) {
  const passwordChangedTime =
    new Date(passwordChangedTimestamp).getTime() / 1000;
  return passwordChangedTime > jwtIssuedTimestamp;
};

export const User = model<IUser, IUserModel>("User", userSchema);
