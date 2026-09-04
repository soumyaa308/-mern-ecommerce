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