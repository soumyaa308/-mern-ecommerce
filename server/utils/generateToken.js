import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

/**
 * Short-lived access token, sent to the client and stored in memory/localStorage.
 * Used to authenticate individual API requests via the Authorization header.
 */
export const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
};

/**
 * Long-lived refresh token, stored in an httpOnly cookie (never accessible
 * to JS on the client). Used to silently obtain new access tokens.
 */
export const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, env.jwtRefreshSecret, { expiresIn: env.jwtRefreshExpiresIn });
};

export const verifyAccessToken = (token) => jwt.verify(token, env.jwtSecret);
export const verifyRefreshToken = (token) => jwt.verify(token, env.jwtRefreshSecret);

/**
 * Sets the refresh token as an httpOnly, secure (in prod) cookie.
 */
export const setRefreshTokenCookie = (res, token) => {
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/api/auth",
  });
};