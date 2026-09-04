import mongoose from "mongoose";
import Order from "../models/Order.js";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import Address from "../models/Address.js";
import Coupon from "../models/Coupon.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { calculateCartTotals } from "../utils/calculateCartTotals.js";
import { verifyRazorpaySignature } from "./paymentController.js";

const CANCELLABLE_STATUSES = ["Pending", "Confirmed"];

// @route  POST /api/orders
// body: { addressId, paymentMethod, couponCode, paymentDetails }
export const placeOrder = asyncHandler(async (req, res) => {
  const { addressId, paymentMethod = "cod", couponCode, paymentDetails } = req.body;

  const address = await Address.findOne({ _id: addressId, user: req.user._id });
  if (!address) {
    throw ApiError.badRequest("Please select a valid shipping address");
  }

  // If paying by card/UPI, verify the Razorpay payment signature BEFORE
  // touching stock or creating anything ??? an unverified payment must
  // never result in a real order.
  let paymentStatus = "pending";
  if (paymentMethod === "razorpay") {
    if (!paymentDetails?.razorpay_order_id || !paymentDetails?.razorpay_payment_id || !paymentDetails?.razorpay_signature) {
      throw ApiError.badRequest("Missing payment verification details");
    }
    const isValid = verifyRazorpaySignature(paymentDetails);
    if (!isValid) {
      throw ApiError.badRequest("Payment verification failed ??? signature mismatch");
    }
    paymentStatus = "paid";
  }

  const { orderItems, subtotal, shipping, tax, discount, total, appliedCoupon } = await calculateCartTotals(
    req.user._id,
    couponCode
  );

  const session = await mongoose.startSession();
  let order;

  try {
    await session.withTransaction(async () => {
      const cart = await Cart.findOne({ user: req.user._id }).session(session);

      // Decrement stock for each product
      for (const item of orderItems) {
        const updated = await Product.findOneAndUpdate(
          { _id: item.product, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } },
          { new: true, session }
        );
        if (!updated) {
          throw ApiError.badRequest(`${item.name} no longer has enough stock`);
        }
      }

      const created = await Order.create(
        [
          {
            user: req.user._id,
            items: orderItems,
            shippingAddress: {
              fullName: address.fullName,
              phone: address.phone,
              addressLine1: address.addressLine1,
              addressLine2: address.addressLine2,
              city: address.city,
              state: address.state,
              postalCode: address.postalCode,
              country: address.country,
            },
            paymentMethod,
            paymentStatus,
            orderStatus: "Pending",
            subtotal,
            tax,
            shipping,
            discount,
            total,
            statusHistory: [{ status: "Pending" }],
          },
        ],
        { session }
      );
      order = created[0];

      cart.items = [];
      await cart.save({ session });

      if (appliedCoupon) {
        await Coupon.findByIdAndUpdate(appliedCoupon._id, { $inc: { usedCount: 1 } }, { session });
      }
    });
  } finally {
    session.endSession();
  }

  new ApiResponse(201, "Order placed successfully", { order }).send(res);
});

// @route  GET /api/orders/my-orders
export const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  new ApiResponse(200, "Orders fetched", { orders }).send(res);
});

// @route  GET /api/orders/:id
export const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    throw ApiError.notFound("Order not found");
  }
  // Customers may only view their own orders; admins may view any
  if (order.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    throw ApiError.forbidden("You do not have access to this order");
  }
  new ApiResponse(200, "Order fetched", { order }).send(res);
});

// @route  PUT /api/orders/:id/cancel
export const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
  if (!order) {
    throw ApiError.notFound("Order not found");
  }
  if (!CANCELLABLE_STATUSES.includes(order.orderStatus)) {
    throw ApiError.badRequest(`Order cannot be cancelled once it is ${order.orderStatus}`);
  }

  // Restore stock
  await Promise.all(
    order.items.map((item) => Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } }))
  );

  order.orderStatus = "Cancelled";
  order.statusHistory.push({ status: "Cancelled" });
  await order.save();

  new ApiResponse(200, "Order cancelled", { order }).send(res);
});

// --- Admin ---

// @route  GET /api/orders  (admin)
export const getAllOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find().populate("user", "name email").sort({ createdAt: -1 });
  new ApiResponse(200, "All orders fetched", { orders }).send(res);
});

// @route  PUT /api/orders/:id/status  (admin)
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) {
    throw ApiError.notFound("Order not found");
  }

  order.orderStatus = status;
  order.statusHistory.push({ status });
  if (status === "Delivered") {
    order.paymentStatus = "paid";
  }
  await order.save();

  new ApiResponse(200, "Order status updated", { order }).send(res);
});