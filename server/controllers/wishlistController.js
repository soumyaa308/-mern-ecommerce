import Wishlist from "../models/Wishlist.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

const getOrCreateWishlist = async (userId) => {
  let wishlist = await Wishlist.findOne({ user: userId });
  if (!wishlist) {
    wishlist = await Wishlist.create({ user: userId, products: [] });
  }
  return wishlist;
};

// @route  GET /api/wishlist
export const getWishlist = asyncHandler(async (req, res) => {
  const wishlist = await getOrCreateWishlist(req.user._id);
  await wishlist.populate("products", "name slug price discountPrice images stock rating");
  new ApiResponse(200, "Wishlist fetched", { wishlist }).send(res);
});

// @route  POST /api/wishlist/:productId
export const addToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const wishlist = await getOrCreateWishlist(req.user._id);

  if (!wishlist.products.some((p) => p.toString() === productId)) {
    wishlist.products.push(productId);
    await wishlist.save();
  }

  await wishlist.populate("products", "name slug price discountPrice images stock rating");
  new ApiResponse(200, "Added to wishlist", { wishlist }).send(res);
});

// @route  DELETE /api/wishlist/:productId
export const removeFromWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const wishlist = await getOrCreateWishlist(req.user._id);

  wishlist.products = wishlist.products.filter((p) => p.toString() !== productId);
  await wishlist.save();

  await wishlist.populate("products", "name slug price discountPrice images stock rating");
  new ApiResponse(200, "Removed from wishlist", { wishlist }).send(res);
});