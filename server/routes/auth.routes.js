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