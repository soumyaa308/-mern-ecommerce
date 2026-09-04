import ApiError from "../utils/ApiError.js";

/**
 * Catches any request that didn't match a route and forwards a 404
 * ApiError into the centralized error handler, instead of Express's
 * default HTML error page.
 */
const notFound = (req, res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

export default notFound;