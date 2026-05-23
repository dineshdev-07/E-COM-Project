import express from "express";
const router = express.Router();
import { protect } from "../middleware/authMiddleware.js";
import {
  addToCart,
  getCart,
  clearCart,
  removeItemFromCart,
  updateCartItem,
} from "../controllers/cartController.js";

router
  .route("/")
  .get(protect, getCart)
  .post(protect, addToCart)
  .delete(protect, clearCart);
router.route("/:id").delete(protect, removeItemFromCart);
router.route("/:id").put(protect, updateCartItem);

export default router;
