import crypto from "crypto";
import razorpay from "../config/razorpay.js";
import { env } from "../config/env.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { calculateCartTotals } from "../utils/calculateCartTotals.js";

// @route  POST /api/payments/create-order
// body: { couponCode? }
// Creates a Razorpay order for the user's CURRENT cart total (computed
// server-side, never trusting an amount sent from the client) and
// returns what the frontend needs to open the Razorpay checkout widget.
export const createPaymentOrder = asyncHandler(async (req, res) => {
  if (!env.razorpay.keyId || !env.razorpay.keySecret) {
    throw ApiError.internal("Payment gateway is not configured on the server yet");
  }

  const { couponCode } = req.body;
  const { total } = await calculateCartTotals(req.user._id, couponCode);

  if (total <= 0) {
    throw ApiError.badRequest("Order total must be greater than zero");
  }

  const razorpayOrder = await razorpay.orders.create({
    amount: Math.round(total * 100), // Razorpay expects the amount in paise
    currency: "INR",
    receipt: `receipt_${Date.now()}`,
  });

  new ApiResponse(200, "Payment order created", {
    razorpayOrderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    keyId: env.razorpay.keyId, // public key ??? safe to send to the client
  }).send(res);
});

/**
 * Verifies a Razorpay payment signature. Razorpay's checkout flow returns
 * razorpay_order_id, razorpay_payment_id, and razorpay_signature to the
 * client on success ??? but a malicious client could fabricate all three
 * fields, so the server re-derives the expected signature from the
 * order_id + payment_id using the secret key (which only the server
 * knows) and compares it byte-for-byte against what was provided.
 *
 * Exported (not a route) so orderController can call it directly before
 * committing an order ??? this is the actual point of truth, not a
 * separate /verify endpoint that could be skipped.
 */
export const verifyRazorpaySignature = ({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) => {
  const expectedSignature = crypto
    .createHmac("sha256", env.razorpay.keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  return expectedSignature === razorpay_signature;
};