import Cart from "../models/Cart.js";
import ApiError from "./ApiError.js";
import { validateAndCalculateDiscount } from "../controllers/couponController.js";

const TAX_RATE = 0.18; // 18% GST
const FREE_SHIPPING_THRESHOLD = 999;
const FLAT_SHIPPING = 79;

/**
 * Loads the user's cart, validates stock, and computes subtotal/shipping/
 * tax/discount/total. Used by both the Razorpay order-creation endpoint
 * (so the payment amount matches exactly what checkout will charge) and
 * placeOrder itself, so the two can never calculate different totals.
 */
export const calculateCartTotals = async (userId, couponCode) => {
  const cart = await Cart.findOne({ user: userId }).populate("items.product");
  if (!cart || cart.items.length === 0) {
    throw ApiError.badRequest("Your cart is empty");
  }

  for (const item of cart.items) {
    if (!item.product || item.product.stock < item.quantity) {
      throw ApiError.badRequest(`${item.product?.name || "A product"} in your cart no longer has enough stock`);
    }
  }

  const orderItems = cart.items.map((item) => ({
    product: item.product._id,
    name: item.product.name,
    image: item.product.images?.[0]?.url || "",
    price: item.product.discountPrice || item.product.price,
    quantity: item.quantity,
    size: item.size,
    color: item.color,
  }));

  const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING;
  const tax = Math.round(subtotal * TAX_RATE);

  let discount = 0;
  let appliedCoupon = null;
  if (couponCode) {
    const result = await validateAndCalculateDiscount(couponCode, subtotal);
    discount = result.discount;
    appliedCoupon = result.coupon;
  }

  const total = subtotal + shipping + tax - discount;

  return { cart, orderItems, subtotal, shipping, tax, discount, total, appliedCoupon };
};