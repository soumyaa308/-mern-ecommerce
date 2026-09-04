import { validationResult } from "express-validator";
import ApiError from "../utils/ApiError.js";

/**
 * Runs after express-validator's chain of checks (e.g. registerValidator).
 * Collects any validation failures and throws a single 400 ApiError
 * instead of every controller needing to check validationResult itself.
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => e.msg);
    throw ApiError.badRequest("Validation failed", messages);
  }
  next();
};

export default validateRequest;