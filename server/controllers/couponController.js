import Coupon from "../models/Coupon.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

/**
 * Shared validation logic ??? used by both the customer-facing "apply"
 * endpoint and internally by the order controller when actually placing
 * the order, so a coupon can never be exploited by calling /apply once
 * to see the discount and then placing an order with stale/invalid data.
 */
export const validateAndCalculateDiscount = async (code, subtotal) => {
  const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });

  if (!coupon) {
    throw ApiError.badRequest("Invalid coupon code");
  }
  if (coupon.expiryDate < new Date()) {
    throw ApiError.badRequest("This coupon has expired");
  }
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    throw ApiError.badRequest("This coupon has reached its usage limit");
  }
  if (subtotal < coupon.minOrderValue) {
    throw ApiError.badRequest(`This coupon requires a minimum order of ???${coupon.minOrderValue}`);
  }

  let discount =
    coupon.discountType === "percentage" ? (subtotal * coupon.discountValue) / 100 : coupon.discountValue;

  if (coupon.maxDiscount !== null) {
    discount = Math.min(discount, coupon.maxDiscount);
  }
  discount = Math.min(discount, subtotal); // never discount more than the order is worth

  return { coupon, discount: Math.round(discount) };
};

// @route  POST /api/coupons/apply
// body: { code, subtotal }
export const applyCoupon = asyncHandler(async (req, res) => {
  const { code, subtotal } = req.body;
  if (!code || subtotal === undefined) {
    throw ApiError.badRequest("Coupon code and subtotal are required");
  }

  const { discount } = await validateAndCalculateDiscount(code, subtotal);

  new ApiResponse(200, "Coupon applied", { code: code.toUpperCase(), discount }).send(res);
});

// --- Admin ---

// @route  GET /api/coupons
export const getCoupons = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 });
  new ApiResponse(200, "Coupons fetched", { coupons }).send(res);
});

// @route  POST /api/coupons
export const createCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.create(req.body);
  new ApiResponse(201, "Coupon created", { coupon }).send(res);
});

// @route  PUT /api/coupons/:id
export const updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!coupon) {
    throw ApiError.notFound("Coupon not found");
  }
  new ApiResponse(200, "Coupon updated", { coupon }).send(res);
});

// @route  DELETE /api/coupons/:id
export const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) {
    throw ApiError.notFound("Coupon not found");
  }
  new ApiResponse(200, "Coupon deleted", {}).send(res);
});