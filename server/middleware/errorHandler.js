import { env } from "../config/env.js";

/**
 * Centralized error handler. Every thrown ApiError (or unexpected error)
 * ends up here and is converted into the standard error envelope:
 * { success: false, message, error }
 *
 * Stack traces are only included outside production.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";
  let errors = err.errors || [];

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid value for ${err.path}`;
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Validation failed";
    errors = Object.values(err.errors).map((e) => e.message);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0];
    message = field ? `${field} already exists` : "Duplicate field value";
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  }
  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
  }

  if (!env.isProd) {
    console.error(`[ERROR] ${req.method} ${req.originalUrl} -> ${statusCode}: ${message}`);
    if (statusCode === 500) console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    message,
    error: {
      ...(errors.length > 0 && { details: errors }),
      ...(!env.isProd && statusCode === 500 && { stack: err.stack }),
    },
  });
};

export default errorHandler;