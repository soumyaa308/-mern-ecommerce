import Review from "../models/Review.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

/**
 * Recomputes a product's average rating and review count from scratch.
 * Called after any review is created, edited, or deleted so the product
 * document always reflects the true current state.
 */
const recalculateProductRating = async (productId) => {
  const stats = await Review.aggregate([
    { $match: { product: productId } },
    { $group: { _id: "$product", avgRating: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);

  const rating = stats[0]?.avgRating || 0;
  const numReviews = stats[0]?.count || 0;

  await Product.findByIdAndUpdate(productId, {
    rating: Math.round(rating * 10) / 10, // round to 1 decimal
    numReviews,
  });
};

// Confirms the user has a non-cancelled order containing this product
const hasPurchased = async (userId, productId) => {
  const order = await Order.findOne({
    user: userId,
    orderStatus: { $ne: "Cancelled" },
    "items.product": productId,
  });
  return Boolean(order);
};

// @route  GET /api/reviews/product/:productId
export const getProductReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ product: req.params.productId })
    .populate("user", "name")
    .sort({ createdAt: -1 });

  // Rating distribution: how many 5-star, 4-star, etc.
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  new ApiResponse(200, "Reviews fetched", { reviews, distribution, total: reviews.length }).send(res);
});

// @route  POST /api/reviews/product/:productId
export const createReview = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { rating, comment } = req.body;

  const product = await Product.findById(productId);
  if (!product) {
    throw ApiError.notFound("Product not found");
  }

  const purchased = await hasPurchased(req.user._id, productId);
  if (!purchased) {
    throw ApiError.forbidden("You can only review products you have purchased");
  }

  const existing = await Review.findOne({ product: productId, user: req.user._id });
  if (existing) {
    throw ApiError.conflict("You have already reviewed this product");
  }

  const review = await Review.create({
    product: productId,
    user: req.user._id,
    rating,
    comment,
  });
  await review.populate("user", "name");

  await recalculateProductRating(productId);

  new ApiResponse(201, "Review submitted", { review }).send(res);
});

// @route  PUT /api/reviews/:id
export const updateReview = asyncHandler(async (req, res) => {
  const review = await Review.findOne({ _id: req.params.id, user: req.user._id });
  if (!review) {
    throw ApiError.notFound("Review not found");
  }

  const { rating, comment } = req.body;
  if (rating) review.rating = rating;
  if (comment) review.comment = comment;
  await review.save();
  await review.populate("user", "name");

  await recalculateProductRating(review.product);

  new ApiResponse(200, "Review updated", { review }).send(res);
});

// @route  DELETE /api/reviews/:id
export const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!review) {
    throw ApiError.notFound("Review not found");
  }

  await recalculateProductRating(review.product);

  new ApiResponse(200, "Review deleted", {}).send(res);
});