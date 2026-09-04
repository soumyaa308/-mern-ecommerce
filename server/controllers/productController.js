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