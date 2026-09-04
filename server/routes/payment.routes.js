import { Router } from "express";
import { createPaymentOrder } from "../controllers/paymentController.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.post("/create-order", protect, createPaymentOrder);

export default router;