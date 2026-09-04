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