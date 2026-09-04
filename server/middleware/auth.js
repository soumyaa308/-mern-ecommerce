import { verifyAccessToken } from "../utils/generateToken.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import User from "../models/User.js";

/**
 * Verifies the JWT access token from the Authorization header and attaches
 * the authenticated user to req.user. Any route using this must be called
 * before route handlers that expect req.user to exist.
 */
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  if (!token) {
    throw ApiError.unauthorized("Not authorized, no token provided");
  }

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch {
    throw ApiError.unauthorized("Not authorized, invalid or expired token");
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    throw ApiError.unauthorized("Not authorized, user no longer exists");
  }
  if (!user.isActive) {
    throw ApiError.forbidden("This account has been deactivated");
  }

  req.user = user;
  next();
});

/**
 * Restricts access to specific roles. Must run after `protect`.
 * Usage: router.get("/admin-only", protect, authorize("admin"), handler)
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw ApiError.unauthorized("Not authorized");
    }
    if (!roles.includes(req.user.role)) {
      throw ApiError.forbidden(`Role '${req.user.role}' is not permitted to access this resource`);
    }
    next();
  };
};