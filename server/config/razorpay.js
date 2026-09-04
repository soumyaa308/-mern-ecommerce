import Razorpay from "razorpay";
import { env } from "./env.js";

/**
 * Shared Razorpay SDK instance. The Razorpay constructor throws
 * immediately if key_id/key_secret are empty strings, which would crash
 * the entire server on startup even for people who haven't set up
 * payments yet ??? so we pass harmless placeholders here, and instead
 * check env.razorpay.keyId/keySecret explicitly inside paymentController
 * before actually calling this instance, giving a clear error at the
 * moment payment is attempted rather than at server boot.
 */
const razorpay = new Razorpay({
  key_id: env.razorpay.keyId || "not_configured",
  key_secret: env.razorpay.keySecret || "not_configured",
});

export default razorpay;