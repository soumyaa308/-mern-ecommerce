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