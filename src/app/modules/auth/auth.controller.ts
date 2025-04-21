import httpStatus from "http-status";
import config from "../../config";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { AuthServices } from "./auth.service";
import AppError from "../../errors/AppError";

const loginUser = catchAsync(async (req, res) => {
  const result = await AuthServices.loginUser(req.body);
  const { user, refreshToken, accessToken } = result;

  // res.cookie("accessToken", accessToken, {
  //   // secure: config.NODE_ENV === 'production',
  //   httpOnly: true,
  //   sameSite: "strict",
  //   // maxAge: 1000 * 60 * 60 * 24 * 365,
  // });
  // res.cookie("refreshToken", refreshToken, {
  //   // secure: config.NODE_ENV === 'production',
  //   httpOnly: true,
  //   sameSite: "strict",
  //   // maxAge: 1000 * 60 * 60 * 24 * 365,
  // });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `${user?.email} is logged in succesfully!`,
    // data: {
    //   token:accessToken,
    // },
    data: { refreshToken, accessToken },
  });
});

const changePassword = catchAsync(async (req, res) => {
  // const { ...passwordData } = req.body;

  const result = await AuthServices.changePassword(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Password is changed succesfully!",
    data: result,
  });
});

const refreshToken = catchAsync(async (req, res) => {
  const { refreshToken } = req.cookies;

  const result = await AuthServices.refreshToken(refreshToken);
  const { accessToken } = result; // Assuming refreshToken method returns an object with the access token

  // Set the updated access token in the cookies
  // res.cookie('accessToken', accessToken, {
  //     secure: config.NODE_ENV === 'production',
  //     httpOnly: true,
  //     sameSite: true,
  //     maxAge: 1000 * 60 * 60 * 24 * 365,
  // });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Access token is retrieved succesfully!",
    data: result,
  });
});

const forgetPassword = catchAsync(async (req, res) => {
  // const {email} = req.body;
  const result = await AuthServices.forgetPassword(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message:
      "Reset link is generated succesfully! ---> Check your email and reset password",
    data: result,
  });
});

const resetPassword = catchAsync(async (req, res) => {
  // const token = req.headers.authorization;
  // if (!token) {
  //   throw new AppError(httpStatus.BAD_REQUEST, 'Something went wrong !');
  // }

  const result = await AuthServices.resetPassword(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Password reset succesfully!",
    data: result,
  });
});

export const AuthControllers = {
  loginUser,
  changePassword,
  refreshToken,
  forgetPassword,
  resetPassword,
};
