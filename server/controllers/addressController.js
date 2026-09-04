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