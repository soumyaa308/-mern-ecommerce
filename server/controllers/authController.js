import crypto from "crypto";
import { env } from "../config/env.js";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import sendEmail from "../utils/sendEmail.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  setRefreshTokenCookie,
} from "../utils/generateToken.js";

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  avatar: user.avatar,
  phone: user.phone,
  createdAt: user.createdAt,
});

// @route  POST /api/auth/register
export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw ApiError.conflict("An account with this email already exists");
  }

  const user = await User.create({ name, email, password });

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  setRefreshTokenCookie(res, refreshToken);

  new ApiResponse(201, "Account created successfully", {
    user: sanitizeUser(user),
    accessToken,
  }).send(res);
});

// @route  POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized("Invalid email or password");
  }
  if (!user.isActive) {
    throw ApiError.forbidden("This account has been deactivated");
  }

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  setRefreshTokenCookie(res, refreshToken);

  new ApiResponse(200, "Logged in successfully", {
    user: sanitizeUser(user),
    accessToken,
  }).send(res);
});

// @route  POST /api/auth/logout
export const logout = asyncHandler(async (req, res) => {
  res.clearCookie("refreshToken", { path: "/api/auth" });
  new ApiResponse(200, "Logged out successfully").send(res);
});

// @route  POST /api/auth/refresh
// Issues a new access token using the httpOnly refresh token cookie.
export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    throw ApiError.unauthorized("No refresh token provided");
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    throw ApiError.unauthorized("Invalid or expired refresh token");
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    throw ApiError.unauthorized("User no longer exists");
  }

  const accessToken = generateAccessToken(user._id);
  new ApiResponse(200, "Token refreshed", { accessToken }).send(res);
});

// @route  GET /api/auth/me
export const getMe = asyncHandler(async (req, res) => {
  new ApiResponse(200, "Current user fetched", { user: sanitizeUser(req.user) }).send(res);
});

// @route  POST /api/auth/forgot-password
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  // Respond the same way whether or not the user exists, to avoid
  // leaking which emails are registered.
  if (!user) {
    return new ApiResponse(200, "If that email exists, a reset link has been sent").send(res);
  }

  const resetToken = user.generatePasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${env.clientUrl}/reset-password/${resetToken}`;

  try {
    await sendEmail({
      to: user.email,
      subject: "Password Reset Request",
      html: `<p>You requested a password reset. Click the link below (valid for 30 minutes):</p>
             <a href="${resetUrl}">${resetUrl}</a>`,
    });
  } catch {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    throw ApiError.internal("Failed to send reset email, please try again later");
  }

  new ApiResponse(200, "If that email exists, a reset link has been sent").send(res);
});

// @route  PUT /api/auth/reset-password/:token
export const resetPassword = asyncHandler(async (req, res) => {
  const hashedToken = crypto.createHash("sha256").update(req.params.token).digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    throw ApiError.badRequest("Reset token is invalid or has expired");
  }

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  new ApiResponse(200, "Password reset successfully. Please log in.").send(res);
});

// @route  PUT /api/auth/change-password
// Requires `protect` middleware.
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select("+password");
  if (!(await user.comparePassword(currentPassword))) {
    throw ApiError.badRequest("Current password is incorrect");
  }

  user.password = newPassword;
  await user.save();

  new ApiResponse(200, "Password changed successfully").send(res);
});