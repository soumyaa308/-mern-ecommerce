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