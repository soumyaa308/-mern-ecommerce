# Rewrite-Server.ps1 - run this from inside your server\ folder
# Wipes and recreates every core server file with verified-correct content
# Does NOT touch .env

New-Item -ItemType Directory -Force -Path "config" | Out-Null
@'
import mongoose from "mongoose";

/**
 * Connects to MongoDB using the MONGO_URI env variable.
 * Exits the process on failure so the app never runs against a broken DB.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`[DB] MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);

    mongoose.connection.on("error", (err) => {
      console.error(`[DB] Connection error: ${err.message}`);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("[DB] MongoDB disconnected");
    });
  } catch (error) {
    console.error(`[DB] Failed to connect: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
'@ | Out-File -FilePath "config\db.js" -Encoding ascii -NoNewline

New-Item -ItemType Directory -Force -Path "config" | Out-Null
@'
import dotenv from "dotenv";
dotenv.config();

/**
 * Single source of truth for environment variables.
 * Fails fast at boot if a required variable is missing, instead of
 * surfacing a confusing error later (e.g. mid-request JWT signing).
 */
const required = ["MONGO_URI", "JWT_SECRET", "JWT_REFRESH_SECRET"];

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`[ENV] Missing required environment variables: ${missing.join(", ")}`);
  console.error("[ENV] Copy .env.example to .env and fill in the values.");
  process.exit(1);
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: process.env.PORT || 5000,
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",

  mongoUri: process.env.MONGO_URI,

  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "15m",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
  },

  email: {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_FROM || "MERN Shop <no-reply@mernshop.com>",
  },

  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX) || 200,
  },

  isProd: (process.env.NODE_ENV || "development") === "production",
};
'@ | Out-File -FilePath "config\env.js" -Encoding ascii -NoNewline

New-Item -ItemType Directory -Force -Path "config" | Out-Null
@'
import Razorpay from "razorpay";
import { env } from "./env.js";

/**
 * Shared Razorpay SDK instance. The Razorpay constructor throws
 * immediately if key_id/key_secret are empty strings, which would crash
 * the entire server on startup even for people who haven't set up
 * payments yet — so we pass harmless placeholders here, and instead
 * check env.razorpay.keyId/keySecret explicitly inside paymentController
 * before actually calling this instance, giving a clear error at the
 * moment payment is attempted rather than at server boot.
 */
const razorpay = new Razorpay({
  key_id: env.razorpay.keyId || "not_configured",
  key_secret: env.razorpay.keySecret || "not_configured",
});

export default razorpay;
'@ | Out-File -FilePath "config\razorpay.js" -Encoding ascii -NoNewline

New-Item -ItemType Directory -Force -Path "middleware" | Out-Null
@'
import { verifyAccessToken } from "../utils/generateToken.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import User from "../models/User.js";

/**
 * Verifies the JWT access token from the Authorization header and attaches
 * the authenticated user to req.user. Any route using this must be called
 * before route handlers that expect req.user to exist.
 */
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  if (!token) {
    throw ApiError.unauthorized("Not authorized, no token provided");
  }

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch {
    throw ApiError.unauthorized("Not authorized, invalid or expired token");
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    throw ApiError.unauthorized("Not authorized, user no longer exists");
  }
  if (!user.isActive) {
    throw ApiError.forbidden("This account has been deactivated");
  }

  req.user = user;
  next();
});

/**
 * Restricts access to specific roles. Must run after `protect`.
 * Usage: router.get("/admin-only", protect, authorize("admin"), handler)
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw ApiError.unauthorized("Not authorized");
    }
    if (!roles.includes(req.user.role)) {
      throw ApiError.forbidden(`Role '${req.user.role}' is not permitted to access this resource`);
    }
    next();
  };
};
'@ | Out-File -FilePath "middleware\auth.js" -Encoding ascii -NoNewline

New-Item -ItemType Directory -Force -Path "middleware" | Out-Null
@'
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
'@ | Out-File -FilePath "middleware\notFound.js" -Encoding ascii -NoNewline

New-Item -ItemType Directory -Force -Path "middleware" | Out-Null
@'
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
'@ | Out-File -FilePath "middleware\errorHandler.js" -Encoding ascii -NoNewline

New-Item -ItemType Directory -Force -Path "middleware" | Out-Null
@'
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
'@ | Out-File -FilePath "middleware\validateRequest.js" -Encoding ascii -NoNewline

New-Item -ItemType Directory -Force -Path "utils" | Out-Null
@'
/**
 * Custom error class used everywhere in the app instead of throwing plain
 * Error objects. Carries an HTTP status code so the centralized error
 * handler can respond correctly without guessing.
 */
class ApiError extends Error {
  constructor(statusCode, message = "Something went wrong", errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.success = false;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = "Bad request", errors = []) {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = "Unauthorized") {
    return new ApiError(401, message);
  }

  static forbidden(message = "Forbidden") {
    return new ApiError(403, message);
  }

  static notFound(message = "Resource not found") {
    return new ApiError(404, message);
  }

  static conflict(message = "Conflict") {
    return new ApiError(409, message);
  }

  static internal(message = "Internal server error") {
    return new ApiError(500, message);
  }
}

export default ApiError;
'@ | Out-File -FilePath "utils\ApiError.js" -Encoding ascii -NoNewline

New-Item -ItemType Directory -Force -Path "utils" | Out-Null
@'
/**
 * Ensures every successful API response follows the same envelope:
 * { success, message, data }
 */
class ApiResponse {
  constructor(statusCode, message = "Operation successful", data = {}) {
    this.statusCode = statusCode;
    this.success = statusCode < 400;
    this.message = message;
    this.data = data;
  }

  send(res) {
    return res.status(this.statusCode).json({
      success: this.success,
      message: this.message,
      data: this.data,
    });
  }
}

export default ApiResponse;
'@ | Out-File -FilePath "utils\ApiResponse.js" -Encoding ascii -NoNewline

New-Item -ItemType Directory -Force -Path "utils" | Out-Null
@'
/**
 * Wraps an async route handler and forwards any rejected promise to
 * Express's error-handling middleware via next(err), so controllers
 * never need repetitive try/catch blocks.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
'@ | Out-File -FilePath "utils\asyncHandler.js" -Encoding ascii -NoNewline

New-Item -ItemType Directory -Force -Path "utils" | Out-Null
@'
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

/**
 * Short-lived access token, sent to the client and stored in memory/localStorage.
 * Used to authenticate individual API requests via the Authorization header.
 */
export const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
};

/**
 * Long-lived refresh token, stored in an httpOnly cookie (never accessible
 * to JS on the client). Used to silently obtain new access tokens.
 */
export const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, env.jwtRefreshSecret, { expiresIn: env.jwtRefreshExpiresIn });
};

export const verifyAccessToken = (token) => jwt.verify(token, env.jwtSecret);
export const verifyRefreshToken = (token) => jwt.verify(token, env.jwtRefreshSecret);

/**
 * Sets the refresh token as an httpOnly, secure (in prod) cookie.
 */
export const setRefreshTokenCookie = (res, token) => {
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/api/auth",
  });
};
'@ | Out-File -FilePath "utils\generateToken.js" -Encoding ascii -NoNewline

New-Item -ItemType Directory -Force -Path "utils" | Out-Null
@'
import nodemailer from "nodemailer";
import { env } from "../config/env.js";

/**
 * Sends an email via nodemailer if SMTP credentials are configured.
 * If not configured (common during local dev), logs the email to the
 * console instead of throwing, so features like "forgot password" stay
 * testable without a real mail server.
 */
const sendEmail = async ({ to, subject, html }) => {
  if (!env.email.host || !env.email.user || !env.email.password) {
    console.log("\n[EMAIL - DEV MODE, not actually sent]");
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${html}\n`);
    return { devMode: true };
  }

  const transporter = nodemailer.createTransport({
    host: env.email.host,
    port: env.email.port,
    secure: Number(env.email.port) === 465,
    auth: {
      user: env.email.user,
      pass: env.email.password,
    },
  });

  return transporter.sendMail({
    from: env.email.from,
    to,
    subject,
    html,
  });
};

export default sendEmail;
'@ | Out-File -FilePath "utils\sendEmail.js" -Encoding ascii -NoNewline

New-Item -ItemType Directory -Force -Path "utils" | Out-Null
@'
import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import Product from "../models/Product.js";
import User from "../models/User.js";

const sampleProducts = [
  {
    name: "Classic Cotton T-Shirt",
    description: "A soft, breathable 100% cotton t-shirt, perfect for everyday wear. Pre-shrunk fabric holds its shape wash after wash.",
    price: 999,
    discountPrice: 799,
    category: "clothing",
    brand: "Everwear",
    sku: "TSHIRT-001",
    stock: 150,
    images: [{ url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600" }],
    sizes: ["S", "M", "L", "XL"],
    colors: ["Black", "White", "Navy"],
    rating: 4.5,
    numReviews: 128,
    isFeatured: true,
  },
  {
    name: "Running Sneakers Pro",
    description: "Lightweight running shoes with responsive cushioning and breathable mesh upper for all-day comfort on any run.",
    price: 3499,
    category: "footwear",
    brand: "Stride",
    sku: "SHOE-002",
    stock: 80,
    images: [{ url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600" }],
    sizes: ["7", "8", "9", "10", "11"],
    colors: ["Black", "Red"],
    rating: 4.7,
    numReviews: 342,
    isFeatured: true,
  },
  {
    name: "Wireless Noise-Cancelling Headphones",
    description: "Over-ear Bluetooth headphones with active noise cancellation, 30-hour battery life, and premium sound quality.",
    price: 6999,
    discountPrice: 5999,
    category: "electronics",
    brand: "SoundCore",
    sku: "AUDIO-003",
    stock: 45,
    images: [{ url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600" }],
    colors: ["Black", "Silver"],
    rating: 4.6,
    numReviews: 210,
    isFeatured: true,
  },
  {
    name: "Minimalist Leather Backpack",
    description: "Durable full-grain leather backpack with padded laptop compartment, ideal for work or travel.",
    price: 4499,
    category: "accessories",
    brand: "Urbancraft",
    sku: "BAG-004",
    stock: 60,
    images: [{ url: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600" }],
    colors: ["Brown", "Black"],
    rating: 4.3,
    numReviews: 76,
    isFeatured: false,
  },
  {
    name: "Stainless Steel Water Bottle",
    description: "Double-wall vacuum insulated bottle keeps drinks cold for 24 hours or hot for 12. Leak-proof lid included.",
    price: 799,
    category: "accessories",
    brand: "HydroLife",
    sku: "BOTTLE-005",
    stock: 200,
    images: [{ url: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600" }],
    colors: ["Blue", "Black", "Pink"],
    rating: 4.8,
    numReviews: 450,
    isFeatured: true,
  },
  {
    name: "Smart Fitness Watch",
    description: "Track heart rate, sleep, and workouts with this waterproof smartwatch featuring a 7-day battery life.",
    price: 7999,
    discountPrice: 6499,
    category: "electronics",
    brand: "PulseTech",
    sku: "WATCH-006",
    stock: 35,
    images: [{ url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600" }],
    colors: ["Black", "Rose Gold"],
    rating: 4.4,
    numReviews: 189,
    isFeatured: false,
  },
  {
    name: "Denim Slim Fit Jeans",
    description: "Classic five-pocket slim fit jeans made from stretch denim for a comfortable, tailored look.",
    price: 2199,
    category: "clothing",
    brand: "Everwear",
    sku: "JEANS-007",
    stock: 100,
    images: [{ url: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=600" }],
    sizes: ["30", "32", "34", "36"],
    colors: ["Blue", "Black"],
    rating: 4.2,
    numReviews: 95,
    isFeatured: false,
  },
  {
    name: "Ceramic Pour-Over Coffee Set",
    description: "Hand-glazed ceramic pour-over coffee dripper with matching mug — brew café-quality coffee at home.",
    price: 1799,
    category: "home",
    brand: "Brewly",
    sku: "COFFEE-008",
    stock: 70,
    images: [{ url: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600" }],
    colors: ["White", "Terracotta"],
    rating: 4.9,
    numReviews: 62,
    isFeatured: true,
  },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("[SEED] Connected to MongoDB");

    await Product.deleteMany({});
    console.log("[SEED] Cleared existing products");

    await Product.create(sampleProducts);
    console.log(`[SEED] Inserted ${sampleProducts.length} products`);

    const adminExists = await User.findOne({ email: "admin@mernshop.com" });
    if (!adminExists) {
      await User.create({
        name: "Admin User",
        email: "admin@mernshop.com",
        password: "admin123",
        role: "admin",
      });
      console.log("[SEED] Created admin user (admin@mernshop.com / admin123)");
    } else {
      console.log("[SEED] Admin user already exists, skipped");
    }

    console.log("[SEED] Done.");
    process.exit(0);
  } catch (error) {
    console.error("[SEED] Failed:", error.message);
    process.exit(1);
  }
};

seed();
'@ | Out-File -FilePath "utils\seeder.js" -Encoding ascii -NoNewline

New-Item -ItemType Directory -Force -Path "utils" | Out-Null
@'
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
'@ | Out-File -FilePath "utils\calculateCartTotals.js" -Encoding ascii -NoNewline

New-Item -ItemType Directory -Force -Path "models" | Out-Null
@'
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // never returned by default queries
    },
    role: {
      type: String,
      enum: ["customer", "admin"],
      default: "customer",
    },
    avatar: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },
    phone: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  { timestamps: true }
);

// Hash password before saving, only if it was modified
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Instance method: compare plaintext password against the stored hash
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Instance method: generate a password-reset token and store its hash
userSchema.methods.generatePasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
  this.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 minutes

  return resetToken; // the unhashed token is emailed to the user
};

const User = mongoose.model("User", userSchema);

export default User;
'@ | Out-File -FilePath "models\User.js" -Encoding ascii -NoNewline

New-Item -ItemType Directory -Force -Path "models" | Out-Null
@'
import mongoose from "mongoose";
import slugify from "slugify";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxlength: [120, "Name cannot exceed 120 characters"],
    },
    slug: {
      type: String,
      unique: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    discountPrice: {
      type: Number,
      default: null,
      min: [0, "Discount price cannot be negative"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
      lowercase: true,
      index: true,
    },
    brand: {
      type: String,
      trim: true,
      default: "Generic",
    },
    sku: {
      type: String,
      unique: true,
      sparse: true,
    },
    stock: {
      type: Number,
      required: true,
      min: [0, "Stock cannot be negative"],
      default: 0,
    },
    images: [
      {
        url: { type: String, required: true },
        publicId: { type: String, default: "" },
      },
    ],
    sizes: [{ type: String }],
    colors: [{ type: String }],
    specifications: {
      type: Map,
      of: String,
      default: {},
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    numReviews: {
      type: Number,
      default: 0,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

productSchema.index({ name: "text", description: "text" });
productSchema.index({ price: 1 });
productSchema.index({ rating: -1 });

// Auto-generate a unique slug from the name whenever it changes
productSchema.pre("validate", async function (next) {
  if (!this.isModified("name")) return next();

  let baseSlug = slugify(this.name, { lower: true, strict: true });
  let slug = baseSlug;
  let counter = 1;

  const Product = mongoose.model("Product");
  while (await Product.findOne({ slug, _id: { $ne: this._id } })) {
    slug = `${baseSlug}-${counter++}`;
  }
  this.slug = slug;
  next();
});

const Product = mongoose.model("Product", productSchema);

export default Product;
'@ | Out-File -FilePath "models\Product.js" -Encoding ascii -NoNewline

New-Item -ItemType Directory -Force -Path "models" | Out-Null
@'
import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, "Quantity must be at least 1"],
      default: 1,
    },
    size: { type: String, default: "" },
    color: { type: String, default: "" },
  },
  { _id: true }
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    items: [cartItemSchema],
  },
  { timestamps: true }
);

const Cart = mongoose.model("Cart", cartSchema);

export default Cart;
'@ | Out-File -FilePath "models\Cart.js" -Encoding ascii -NoNewline

New-Item -ItemType Directory -Force -Path "models" | Out-Null
@'
import mongoose from "mongoose";

const wishlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    products: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
  },
  { timestamps: true }
);

const Wishlist = mongoose.model("Wishlist", wishlistSchema);

export default Wishlist;
'@ | Out-File -FilePath "models\Wishlist.js" -Encoding ascii -NoNewline

New-Item -ItemType Directory -Force -Path "models" | Out-Null
@'
import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    addressLine1: { type: String, required: true, trim: true },
    addressLine2: { type: String, default: "", trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true, default: "India" },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Address = mongoose.model("Address", addressSchema);

export default Address;
'@ | Out-File -FilePath "models\Address.js" -Encoding ascii -NoNewline

New-Item -ItemType Directory -Force -Path "models" | Out-Null
@'
import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    image: { type: String, default: "" },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    size: { type: String, default: "" },
    color: { type: String, default: "" },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    items: {
      type: [orderItemSchema],
      validate: [(arr) => arr.length > 0, "Order must contain at least one item"],
    },
    shippingAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      addressLine1: { type: String, required: true },
      addressLine2: { type: String, default: "" },
      city: { type: String, required: true },
      state: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
    },
    paymentMethod: {
      type: String,
      enum: ["cod", "razorpay"],
      default: "cod",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    orderStatus: {
      type: String,
      enum: ["Pending", "Confirmed", "Processing", "Shipped", "Out for Delivery", "Delivered", "Cancelled"],
      default: "Pending",
    },
    subtotal: { type: Number, required: true },
    tax: { type: Number, required: true, default: 0 },
    shipping: { type: Number, required: true, default: 0 },
    discount: { type: Number, required: true, default: 0 },
    total: { type: Number, required: true },
    statusHistory: [
      {
        status: { type: String, required: true },
        changedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

orderSchema.index({ user: 1, createdAt: -1 });

const Order = mongoose.model("Order", orderSchema);

export default Order;
'@ | Out-File -FilePath "models\Order.js" -Encoding ascii -NoNewline

New-Item -ItemType Directory -Force -Path "models" | Out-Null
@'
import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

// One review per user per product
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

const Review = mongoose.model("Review", reviewSchema);

export default Review;
'@ | Out-File -FilePath "models\Review.js" -Encoding ascii -NoNewline

New-Item -ItemType Directory -Force -Path "models" | Out-Null
@'
import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    discountType: { type: String, enum: ["percentage", "fixed"], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    minOrderValue: { type: Number, default: 0 },
    maxDiscount: { type: Number, default: null }, // caps percentage discounts
    expiryDate: { type: Date, required: true },
    usageLimit: { type: Number, default: null }, // null = unlimited
    usedCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Coupon = mongoose.model("Coupon", couponSchema);

export default Coupon;
'@ | Out-File -FilePath "models\Coupon.js" -Encoding ascii -NoNewline

New-Item -ItemType Directory -Force -Path "controllers" | Out-Null
@'
import crypto from "crypto";
import { env } from "../config/env.js";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import sendEmail from "../utils/sendEmail.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  setRefreshTokenCookie,
} from "../utils/generateToken.js";

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  avatar: user.avatar,
  phone: user.phone,
  createdAt: user.createdAt,
});

// @route  POST /api/auth/register
export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw ApiError.conflict("An account with this email already exists");
  }

  const user = await User.create({ name, email, password });

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  setRefreshTokenCookie(res, refreshToken);

  new ApiResponse(201, "Account created successfully", {
    user: sanitizeUser(user),
    accessToken,
  }).send(res);
});

// @route  POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized("Invalid email or password");
  }
  if (!user.isActive) {
    throw ApiError.forbidden("This account has been deactivated");
  }

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  setRefreshTokenCookie(res, refreshToken);

  new ApiResponse(200, "Logged in successfully", {
    user: sanitizeUser(user),
    accessToken,
  }).send(res);
});

// @route  POST /api/auth/logout
export const logout = asyncHandler(async (req, res) => {
  res.clearCookie("refreshToken", { path: "/api/auth" });
  new ApiResponse(200, "Logged out successfully").send(res);
});

// @route  POST /api/auth/refresh
// Issues a new access token using the httpOnly refresh token cookie.
export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    throw ApiError.unauthorized("No refresh token provided");
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    throw ApiError.unauthorized("Invalid or expired refresh token");
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    throw ApiError.unauthorized("User no longer exists");
  }

  const accessToken = generateAccessToken(user._id);
  new ApiResponse(200, "Token refreshed", { accessToken }).send(res);
});

// @route  GET /api/auth/me
export const getMe = asyncHandler(async (req, res) => {
  new ApiResponse(200, "Current user fetched", { user: sanitizeUser(req.user) }).send(res);
});

// @route  POST /api/auth/forgot-password
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  // Respond the same way whether or not the user exists, to avoid
  // leaking which emails are registered.
  if (!user) {
    return new ApiResponse(200, "If that email exists, a reset link has been sent").send(res);
  }

  const resetToken = user.generatePasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${env.clientUrl}/reset-password/${resetToken}`;

  try {
    await sendEmail({
      to: user.email,
      subject: "Password Reset Request",
      html: `<p>You requested a password reset. Click the link below (valid for 30 minutes):</p>
             <a href="${resetUrl}">${resetUrl}</a>`,
    });
  } catch {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    throw ApiError.internal("Failed to send reset email, please try again later");
  }

  new ApiResponse(200, "If that email exists, a reset link has been sent").send(res);
});

// @route  PUT /api/auth/reset-password/:token
export const resetPassword = asyncHandler(async (req, res) => {
  const hashedToken = crypto.createHash("sha256").update(req.params.token).digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    throw ApiError.badRequest("Reset token is invalid or has expired");
  }

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  new ApiResponse(200, "Password reset successfully. Please log in.").send(res);
});

// @route  PUT /api/auth/change-password
// Requires `protect` middleware.
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select("+password");
  if (!(await user.comparePassword(currentPassword))) {
    throw ApiError.badRequest("Current password is incorrect");
  }

  user.password = newPassword;
  await user.save();

  new ApiResponse(200, "Password changed successfully").send(res);
});
'@ | Out-File -FilePath "controllers\authController.js" -Encoding ascii -NoNewline

New-Item -ItemType Directory -Force -Path "controllers" | Out-Null
@'
import Product from "../models/Product.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

// @route  GET /api/products
// Supports: ?search=&category=&brand=&minPrice=&maxPrice=&rating=&sort=&page=&limit=
export const getProducts = asyncHandler(async (req, res) => {
  const {
    search,
    category,
    brand,
    minPrice,
    maxPrice,
    rating,
    sort = "newest",
    page = 1,
    limit = 12,
  } = req.query;

  const filter = {};

  if (search) {
    filter.$text = { $search: search };
  }
  if (category) {
    filter.category = category.toLowerCase();
  }
  if (brand) {
    filter.brand = brand;
  }
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }
  if (rating) {
    filter.rating = { $gte: Number(rating) };
  }

  const sortMap = {
    "price-asc": { price: 1 },
    "price-desc": { price: -1 },
    newest: { createdAt: -1 },
    popular: { numReviews: -1 },
    rating: { rating: -1 },
  };
  const sortBy = sortMap[sort] || sortMap.newest;

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(50, Math.max(1, Number(limit)));
  const skip = (pageNum - 1) * limitNum;

  const [products, total] = await Promise.all([
    Product.find(filter).sort(sortBy).skip(skip).limit(limitNum),
    Product.countDocuments(filter),
  ]);

  new ApiResponse(200, "Products fetched", {
    products,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  }).send(res);
});

// @route  GET /api/products/categories/list
export const getCategories = asyncHandler(async (req, res) => {
  const categories = await Product.distinct("category");
  new ApiResponse(200, "Categories fetched", { categories }).send(res);
});

// @route  GET /api/products/featured
export const getFeaturedProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ isFeatured: true }).limit(8);
  new ApiResponse(200, "Featured products fetched", { products }).send(res);
});

// @route  GET /api/products/:slug
export const getProductBySlug = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug });
  if (!product) {
    throw ApiError.notFound("Product not found");
  }
  new ApiResponse(200, "Product fetched", { product }).send(res);
});

// @route  POST /api/products  (admin)
export const createProduct = asyncHandler(async (req, res) => {
  const product = await Product.create(req.body);
  new ApiResponse(201, "Product created", { product }).send(res);
});

// @route  PUT /api/products/:id  (admin)
export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!product) {
    throw ApiError.notFound("Product not found");
  }
  new ApiResponse(200, "Product updated", { product }).send(res);
});

// @route  DELETE /api/products/:id  (admin)
export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) {
    throw ApiError.notFound("Product not found");
  }
  new ApiResponse(200, "Product deleted", {}).send(res);
});
'@ | Out-File -FilePath "controllers\productController.js" -Encoding ascii -NoNewline

New-Item -ItemType Directory -Force -Path "controllers" | Out-Null
@'
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }
  return cart;
};

const populateCart = (cart) => cart.populate("items.product", "name slug price discountPrice images stock");

// @route  GET /api/cart
export const getCart = asyncHandler(async (req, res) => {
  const cart = await populateCart(await getOrCreateCart(req.user._id));
  new ApiResponse(200, "Cart fetched", { cart }).send(res);
});

// @route  POST /api/cart/items
// body: { productId, quantity, size, color }
export const addItemToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1, size = "", color = "" } = req.body;

  const product = await Product.findById(productId);
  if (!product) {
    throw ApiError.notFound("Product not found");
  }

  const cart = await getOrCreateCart(req.user._id);

  const existingItem = cart.items.find(
    (item) => item.product.toString() === productId && item.size === size && item.color === color
  );

  const requestedQty = (existingItem?.quantity || 0) + Number(quantity);
  if (requestedQty > product.stock) {
    throw ApiError.badRequest(`Only ${product.stock} unit(s) of this product are in stock`);
  }

  if (existingItem) {
    existingItem.quantity = requestedQty;
  } else {
    cart.items.push({ product: productId, quantity: Number(quantity), size, color });
  }

  await cart.save();
  await populateCart(cart);

  new ApiResponse(200, "Item added to cart", { cart }).send(res);
});

// @route  PUT /api/cart/items/:itemId
// body: { quantity }
export const updateCartItem = asyncHandler(async (req, res) => {
  const { quantity } = req.body;
  if (!quantity || quantity < 1) {
    throw ApiError.badRequest("Quantity must be at least 1");
  }

  const cart = await getOrCreateCart(req.user._id);
  const item = cart.items.id(req.params.itemId);
  if (!item) {
    throw ApiError.notFound("Cart item not found");
  }

  const product = await Product.findById(item.product);
  if (!product) {
    throw ApiError.notFound("Product no longer exists");
  }
  if (quantity > product.stock) {
    throw ApiError.badRequest(`Only ${product.stock} unit(s) of this product are in stock`);
  }

  item.quantity = quantity;
  await cart.save();
  await populateCart(cart);

  new ApiResponse(200, "Cart item updated", { cart }).send(res);
});

// @route  DELETE /api/cart/items/:itemId
export const removeCartItem = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  const item = cart.items.id(req.params.itemId);
  if (!item) {
    throw ApiError.notFound("Cart item not found");
  }

  item.deleteOne();
  await cart.save();
  await populateCart(cart);

  new ApiResponse(200, "Item removed from cart", { cart }).send(res);
});

// @route  DELETE /api/cart
export const clearCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  cart.items = [];
  await cart.save();

  new ApiResponse(200, "Cart cleared", { cart }).send(res);
});
'@ | Out-File -FilePath "controllers\cartController.js" -Encoding ascii -NoNewline

New-Item -ItemType Directory -Force -Path "controllers" | Out-Null
@'
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
'@ | Out-File -FilePath "controllers\wishlistController.js" -Encoding ascii -NoNewline

New-Item -ItemType Directory -Force -Path "controllers" | Out-Null
@'
import Address from "../models/Address.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

// @route  GET /api/addresses
export const getAddresses = asyncHandler(async (req, res) => {
  const addresses = await Address.find({ user: req.user._id }).sort({ isDefault: -1, createdAt: -1 });
  new ApiResponse(200, "Addresses fetched", { addresses }).send(res);
});

// @route  POST /api/addresses
export const createAddress = asyncHandler(async (req, res) => {
  const isFirstAddress = (await Address.countDocuments({ user: req.user._id })) === 0;

  if (req.body.isDefault || isFirstAddress) {
    await Address.updateMany({ user: req.user._id }, { isDefault: false });
  }

  const address = await Address.create({
    ...req.body,
    user: req.user._id,
    isDefault: req.body.isDefault || isFirstAddress,
  });

  new ApiResponse(201, "Address added", { address }).send(res);
});

// @route  PUT /api/addresses/:id
export const updateAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOne({ _id: req.params.id, user: req.user._id });
  if (!address) {
    throw ApiError.notFound("Address not found");
  }

  if (req.body.isDefault) {
    await Address.updateMany({ user: req.user._id }, { isDefault: false });
  }

  Object.assign(address, req.body);
  await address.save();

  new ApiResponse(200, "Address updated", { address }).send(res);
});

// @route  DELETE /api/addresses/:id
export const deleteAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!address) {
    throw ApiError.notFound("Address not found");
  }
  new ApiResponse(200, "Address deleted", {}).send(res);
});
'@ | Out-File -FilePath "controllers\addressController.js" -Encoding ascii -NoNewline

New-Item -ItemType Directory -Force -Path "controllers" | Out-Null
@'
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
  // touching stock or creating anything — an unverified payment must
  // never result in a real order.
  let paymentStatus = "pending";
  if (paymentMethod === "razorpay") {
    if (!paymentDetails?.razorpay_order_id || !paymentDetails?.razorpay_payment_id || !paymentDetails?.razorpay_signature) {
      throw ApiError.badRequest("Missing payment verification details");
    }
    const isValid = verifyRazorpaySignature(paymentDetails);
    if (!isValid) {
      throw ApiError.badRequest("Payment verification failed — signature mismatch");
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
'@ | Out-File -FilePath "controllers\orderController.js" -Encoding ascii -NoNewline

New-Item -ItemType Directory -Force -Path "controllers" | Out-Null
@'
import User from "../models/User.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

// @route  GET /api/admin/stats
export const getDashboardStats = asyncHandler(async (req, res) => {
  const [totalUsers, totalProducts, totalOrders, revenueAgg, recentOrders] = await Promise.all([
    User.countDocuments({ role: "customer" }),
    Product.countDocuments(),
    Order.countDocuments(),
    Order.aggregate([
      { $match: { orderStatus: { $ne: "Cancelled" } } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]),
    Order.find().sort({ createdAt: -1 }).limit(5).populate("user", "name email"),
  ]);

  new ApiResponse(200, "Dashboard stats fetched", {
    totalUsers,
    totalProducts,
    totalOrders,
    totalRevenue: revenueAgg[0]?.total || 0,
    recentOrders,
  }).send(res);
});

// @route  GET /api/admin/analytics/sales?days=30
export const getSalesAnalytics = asyncHandler(async (req, res) => {
  const days = Math.min(90, Number(req.query.days) || 30);
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const sales = await Order.aggregate([
    { $match: { createdAt: { $gte: since }, orderStatus: { $ne: "Cancelled" } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        revenue: { $sum: "$total" },
        orders: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  new ApiResponse(200, "Sales analytics fetched", { sales }).send(res);
});

// @route  GET /api/admin/users
export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  new ApiResponse(200, "Users fetched", { users }).send(res);
});

// @route  PUT /api/admin/users/:id/role
export const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!["customer", "admin"].includes(role)) {
    throw ApiError.badRequest("Invalid role");
  }

  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
  if (!user) {
    throw ApiError.notFound("User not found");
  }

  new ApiResponse(200, "User role updated", { user }).send(res);
});

// @route  PUT /api/admin/users/:id/status
export const updateUserStatus = asyncHandler(async (req, res) => {
  const { isActive } = req.body;

  const user = await User.findByIdAndUpdate(req.params.id, { isActive }, { new: true });
  if (!user) {
    throw ApiError.notFound("User not found");
  }

  new ApiResponse(200, "User status updated", { user }).send(res);
});
'@ | Out-File -FilePath "controllers\adminController.js" -Encoding ascii -NoNewline

New-Item -ItemType Directory -Force -Path "controllers" | Out-Null
@'
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
'@ | Out-File -FilePath "controllers\reviewController.js" -Encoding ascii -NoNewline

New-Item -ItemType Directory -Force -Path "controllers" | Out-Null
@'
import Coupon from "../models/Coupon.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

/**
 * Shared validation logic — used by both the customer-facing "apply"
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
    throw ApiError.badRequest(`This coupon requires a minimum order of ₹${coupon.minOrderValue}`);
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
'@ | Out-File -FilePath "controllers\couponController.js" -Encoding ascii -NoNewline

New-Item -ItemType Directory -Force -Path "controllers" | Out-Null
@'
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
    keyId: env.razorpay.keyId, // public key — safe to send to the client
  }).send(res);
});

/**
 * Verifies a Razorpay payment signature. Razorpay's checkout flow returns
 * razorpay_order_id, razorpay_payment_id, and razorpay_signature to the
 * client on success — but a malicious client could fabricate all three
 * fields, so the server re-derives the expected signature from the
 * order_id + payment_id using the secret key (which only the server
 * knows) and compares it byte-for-byte against what was provided.
 *
 * Exported (not a route) so orderController can call it directly before
 * committing an order — this is the actual point of truth, not a
 * separate /verify endpoint that could be skipped.
 */
export const verifyRazorpaySignature = ({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) => {
  const expectedSignature = crypto
    .createHmac("sha256", env.razorpay.keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  return expectedSignature === razorpay_signature;
};
'@ | Out-File -FilePath "controllers\paymentController.js" -Encoding ascii -NoNewline

New-Item -ItemType Directory -Force -Path "routes" | Out-Null
@'
import { Router } from "express";
import authRoutes from "./auth.routes.js";
import productRoutes from "./product.routes.js";
import cartRoutes from "./cart.routes.js";
import wishlistRoutes from "./wishlist.routes.js";
import addressRoutes from "./address.routes.js";
import orderRoutes from "./order.routes.js";
import adminRoutes from "./admin.routes.js";
import reviewRoutes from "./review.routes.js";
import couponRoutes from "./coupon.routes.js";
import paymentRoutes from "./payment.routes.js";

const router = Router();

router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is healthy",
    data: { timestamp: new Date().toISOString() },
  });
});

router.use("/auth", authRoutes);
router.use("/products", productRoutes);
router.use("/cart", cartRoutes);
router.use("/wishlist", wishlistRoutes);
router.use("/addresses", addressRoutes);
router.use("/orders", orderRoutes);
router.use("/admin", adminRoutes);
router.use("/reviews", reviewRoutes);
router.use("/coupons", couponRoutes);
router.use("/payments", paymentRoutes);

export default router;
'@ | Out-File -FilePath "routes\index.js" -Encoding ascii -NoNewline

New-Item -ItemType Directory -Force -Path "routes" | Out-Null
@'
import { Router } from "express";
import {
  register,
  login,
  logout,
  refresh,
  getMe,
  forgotPassword,
  resetPassword,
  changePassword,
} from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";
import validateRequest from "../middleware/validateRequest.js";
import {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  changePasswordValidator,
} from "../validators/authValidator.js";

const router = Router();

router.post("/register", registerValidator, validateRequest, register);
router.post("/login", loginValidator, validateRequest, login);
router.post("/logout", logout);
router.post("/refresh", refresh);
router.get("/me", protect, getMe);
router.post("/forgot-password", forgotPasswordValidator, validateRequest, forgotPassword);
router.put("/reset-password/:token", resetPasswordValidator, validateRequest, resetPassword);
router.put("/change-password", protect, changePasswordValidator, validateRequest, changePassword);

export default router;
'@ | Out-File -FilePath "routes\auth.routes.js" -Encoding ascii -NoNewline

New-Item -ItemType Directory -Force -Path "routes" | Out-Null
@'
import { Router } from "express";
import {
  getProducts,
  getFeaturedProducts,
  getCategories,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/productController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = Router();

router.get("/", getProducts);
router.get("/featured", getFeaturedProducts);
router.get("/categories/list", getCategories);
router.get("/:slug", getProductBySlug);

router.post("/", protect, authorize("admin"), createProduct);
router.put("/:id", protect, authorize("admin"), updateProduct);
router.delete("/:id", protect, authorize("admin"), deleteProduct);

export default router;
'@ | Out-File -FilePath "routes\product.routes.js" -Encoding ascii -NoNewline

New-Item -ItemType Directory -Force -Path "routes" | Out-Null
@'
import { Router } from "express";
import { getCart, addItemToCart, updateCartItem, removeCartItem, clearCart } from "../controllers/cartController.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.use(protect); // every cart route requires a logged-in user

router.get("/", getCart);
router.post("/items", addItemToCart);
router.put("/items/:itemId", updateCartItem);
router.delete("/items/:itemId", removeCartItem);
router.delete("/", clearCart);

export default router;
'@ | Out-File -FilePath "routes\cart.routes.js" -Encoding ascii -NoNewline

New-Item -ItemType Directory -Force -Path "routes" | Out-Null
@'
import { Router } from "express";
import { getWishlist, addToWishlist, removeFromWishlist } from "../controllers/wishlistController.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.use(protect);

router.get("/", getWishlist);
router.post("/:productId", addToWishlist);
router.delete("/:productId", removeFromWishlist);

export default router;
'@ | Out-File -FilePath "routes\wishlist.routes.js" -Encoding ascii -NoNewline

New-Item -ItemType Directory -Force -Path "routes" | Out-Null
@'
import { Router } from "express";
import { getAddresses, createAddress, updateAddress, deleteAddress } from "../controllers/addressController.js";
import { protect } from "../middleware/auth.js";
import validateRequest from "../middleware/validateRequest.js";
import { addressValidator } from "../validators/addressValidator.js";

const router = Router();

router.use(protect);

router.get("/", getAddresses);
router.post("/", addressValidator, validateRequest, createAddress);
router.put("/:id", addressValidator, validateRequest, updateAddress);
router.delete("/:id", deleteAddress);

export default router;
'@ | Out-File -FilePath "routes\address.routes.js" -Encoding ascii -NoNewline

New-Item -ItemType Directory -Force -Path "routes" | Out-Null
@'
import { Router } from "express";
import {
  placeOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
} from "../controllers/orderController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = Router();

router.use(protect);

router.post("/", placeOrder);
router.get("/my-orders", getMyOrders);
router.get("/:id", getOrderById);
router.put("/:id/cancel", cancelOrder);

// Admin
router.get("/", authorize("admin"), getAllOrders);
router.put("/:id/status", authorize("admin"), updateOrderStatus);

export default router;
'@ | Out-File -FilePath "routes\order.routes.js" -Encoding ascii -NoNewline

New-Item -ItemType Directory -Force -Path "routes" | Out-Null
@'
import { Router } from "express";
import {
  getDashboardStats,
  getSalesAnalytics,
  getAllUsers,
  updateUserRole,
  updateUserStatus,
} from "../controllers/adminController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = Router();

router.use(protect, authorize("admin"));

router.get("/stats", getDashboardStats);
router.get("/analytics/sales", getSalesAnalytics);
router.get("/users", getAllUsers);
router.put("/users/:id/role", updateUserRole);
router.put("/users/:id/status", updateUserStatus);

export default router;
'@ | Out-File -FilePath "routes\admin.routes.js" -Encoding ascii -NoNewline

New-Item -ItemType Directory -Force -Path "routes" | Out-Null
@'
import { Router } from "express";
import { getProductReviews, createReview, updateReview, deleteReview } from "../controllers/reviewController.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.get("/product/:productId", getProductReviews);
router.post("/product/:productId", protect, createReview);
router.put("/:id", protect, updateReview);
router.delete("/:id", protect, deleteReview);

export default router;
'@ | Out-File -FilePath "routes\review.routes.js" -Encoding ascii -NoNewline

New-Item -ItemType Directory -Force -Path "routes" | Out-Null
@'
import { Router } from "express";
import { applyCoupon, getCoupons, createCoupon, updateCoupon, deleteCoupon } from "../controllers/couponController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = Router();

router.post("/apply", protect, applyCoupon);

// Admin
router.get("/", protect, authorize("admin"), getCoupons);
router.post("/", protect, authorize("admin"), createCoupon);
router.put("/:id", protect, authorize("admin"), updateCoupon);
router.delete("/:id", protect, authorize("admin"), deleteCoupon);

export default router;
'@ | Out-File -FilePath "routes\coupon.routes.js" -Encoding ascii -NoNewline

New-Item -ItemType Directory -Force -Path "routes" | Out-Null
@'
import { Router } from "express";
import { createPaymentOrder } from "../controllers/paymentController.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.post("/create-order", protect, createPaymentOrder);

export default router;
'@ | Out-File -FilePath "routes\payment.routes.js" -Encoding ascii -NoNewline

New-Item -ItemType Directory -Force -Path "validators" | Out-Null
@'
import { body } from "express-validator";

export const registerValidator = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("A valid email is required").normalizeEmail(),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
];

export const loginValidator = [
  body("email").isEmail().withMessage("A valid email is required").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];

export const forgotPasswordValidator = [
  body("email").isEmail().withMessage("A valid email is required").normalizeEmail(),
];

export const resetPasswordValidator = [
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
];

export const changePasswordValidator = [
  body("currentPassword").notEmpty().withMessage("Current password is required"),
  body("newPassword").isLength({ min: 6 }).withMessage("New password must be at least 6 characters"),
];
'@ | Out-File -FilePath "validators\authValidator.js" -Encoding ascii -NoNewline

New-Item -ItemType Directory -Force -Path "validators" | Out-Null
@'
import { body } from "express-validator";

const nameRegex = /^[A-Za-z\s.'-]+$/;
const phoneRegex = /^(?:\+91)?[6-9]\d{9}$/;
const pincodeRegex = /^[1-9][0-9]{5}$/;

export const addressValidator = [
  body("fullName")
    .trim()
    .notEmpty()
    .withMessage("Full name is required")
    .matches(nameRegex)
    .withMessage("Full name should only contain letters"),

  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required")
    .matches(phoneRegex)
    .withMessage("Enter a valid 10-digit Indian mobile number"),

  body("addressLine1").trim().notEmpty().withMessage("Address line 1 is required"),

  body("addressLine2").optional({ checkFalsy: true }).trim(),

  body("city")
    .trim()
    .notEmpty()
    .withMessage("City is required")
    .matches(nameRegex)
    .withMessage("City should only contain letters"),

  body("state")
    .trim()
    .notEmpty()
    .withMessage("State is required")
    .matches(nameRegex)
    .withMessage("State should only contain letters"),

  body("postalCode")
    .trim()
    .notEmpty()
    .withMessage("Postal code is required")
    .matches(pincodeRegex)
    .withMessage("Enter a valid 6-digit Indian PIN code"),

  body("country").trim().notEmpty().withMessage("Country is required"),
];
'@ | Out-File -FilePath "validators\addressValidator.js" -Encoding ascii -NoNewline

@'
import { env } from "./config/env.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import mongoSanitize from "express-mongo-sanitize";
import xssClean from "xss-clean";
import rateLimit from "express-rate-limit";

import connectDB from "./config/db.js";
import apiRouter from "./routes/index.js";
import notFound from "./middleware/notFound.js";
import errorHandler from "./middleware/errorHandler.js";

// Connect to MongoDB before accepting traffic
connectDB();

const app = express();

// --- Security middleware ---
app.use(helmet());
app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  })
);

const limiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
});
app.use("/api", limiter);

// --- Body parsing ---
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

// --- Sanitization against NoSQL injection & XSS ---
app.use(mongoSanitize());
app.use(xssClean());

// --- Logging ---
if (!env.isProd) {
  app.use(morgan("dev"));
}

// --- Routes ---
app.use("/api", apiRouter);

app.get("/", (req, res) => {
  res.send("MERN E-commerce API is running.");
});

// --- 404 + centralized error handler (must be last) ---
app.use(notFound);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`[SERVER] Running in ${env.nodeEnv} mode on port ${env.port}`);
});

export default app;
'@ | Out-File -FilePath "server.js" -Encoding ascii -NoNewline

Write-Host ""
Write-Host "All server files rewritten successfully." -ForegroundColor Green