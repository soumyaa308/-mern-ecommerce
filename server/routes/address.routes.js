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