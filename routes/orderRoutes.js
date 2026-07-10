import express from "express";
import {
  createOrder,
  getMyOrders,
  getAllOrders,
  markAsDelivered,
  getOrderById,
  cancelOrder,
  adminCancelOrder,
  getSalesReport,
  resetOrders,
  updateOrderToRefunded,
  getAdminDashboard,
  resetMonthlyData,
  resetMonthlyStats,
} from "../controllers/orderController.js";
import { protect, admin } from "../middleware/authMiddleware.js";
import { verifyPayment } from "../controllers/paymentController.js";

import Order from "../models/orderModel.js";

const router = express.Router();

router.post("/", protect, createOrder);
router.get("/myorders", protect, getMyOrders);

router.get("/admin/sales", protect, admin, getSalesReport);
router.get("/admin/dashboard", protect, admin, getAdminDashboard);
router.get("/admin", protect, admin, getAllOrders);
router.get("/", protect, admin, getAllOrders);

router.post("/verify", protect, verifyPayment);

router.delete("/reset", protect, admin, resetOrders);
router.put("/reset-monthly-data", protect, admin, resetMonthlyData);
router.put("/reset-monthly-stats", protect, admin, resetMonthlyStats);

router.put("/admin/:id/cancel", protect, admin, adminCancelOrder);
router.get("/admin/:id", protect, admin, getOrderById);

router.put("/:id/refund", protect, admin, updateOrderToRefunded);
router.put("/:id/deliver", protect, admin, markAsDelivered);
router.put("/:id/cancel", protect, cancelOrder);

router.get("/:id", protect, getOrderById);

export default router;
