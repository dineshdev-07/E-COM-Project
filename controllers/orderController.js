import asyncHandler from "express-async-handler";
import crypto from "crypto";
import Order from "../models/orderModel.js";
import Product from "../models/Product.js";
import User from "../models/userModel.js";

import DashboardStats from "../models/dashboardStatsModel.js";


import { sendOrderSuccessEmail } from "../utils/sendDeliveryEmail.js";

const updateLoyaltyStreak = async (userId, orderAmount) => {
  const user = await User.findById(userId);
  if (!user || orderAmount < 500) return;

  const now = new Date();
  const lastReward = user.lastStreakRewardDate;

  if (!lastReward) {
    user.streaks = 1;
    user.loyaltyPoints = 5;
  } else {
    const diffInDays = (now - new Date(lastReward)) / (1000 * 60 * 60 * 24);

    if (diffInDays <= 14) {
      user.streaks += 1;
      user.loyaltyPoints += 5;
    } else {
      user.streaks = 1;
      user.loyaltyPoints = 5;
    }
  }

  user.lastStreakRewardDate = now;

  if (user.streaks >= 4 && !user.isPlusMember) {
    user.isPlusMember = true;
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + 1);
    user.plusExpiryDate = expiry;
  }

  if (user.plusExpiryDate && user.plusExpiryDate < new Date()) {
    user.isPlusMember = false;
    user.plusExpiryDate = null;
  }

  await user.save();
};
export const createOrder = asyncHandler(async (req, res) => {
  const { orderItems, totalPrice, paymentMethod, isPaid, shippingAddress } =
    req.body;

  if (!orderItems || orderItems.length === 0) {
    res.status(400);
    throw new Error("No order items");
  }

  const order = new Order({
    user: req.user._id,
    orderItems,
    shippingAddress,
    totalPrice,
    paymentMethod,
    isPaid,
    paidAt: isPaid ? new Date() : null,
    orderStatus: "Placed",
  });

  await order.save();

  res.status(201).json(order);
  // Background Tasks
  setImmediate(async () => {
    try {
      const user = await User.findById(req.user._id).select("name email");

      if (user?.email) {
        sendOrderSuccessEmail({
          to: user.email,
          name: user.name,
          order,
        }).catch(console.error);
      }

      if (isPaid) {
        await Promise.all(
          orderItems.map((item) =>
            Product.findByIdAndUpdate(item.product, {
              $inc: {
                quantity: -item.qty,
                salesCount: item.qty,
              },
            }),
          ),
        );
      }
    } catch (err) {
      console.error("BACKGROUND ERROR:", err);
    }
  });
});

export const markAsDelivered = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) throw new Error("Order not found");

  if (order.isDelivered) {
    return res.status(400).json({ message: "Order already delivered" });
  }

  order.isDelivered = true;
  order.deliveredAt = Date.now();
  order.orderStatus = "Delivered";

  if (!order.isPaid) {
    order.isPaid = true;
    order.paidAt = Date.now();
    let stats = await DashboardStats.findOne();
    if (!stats) stats = await DashboardStats.create({});

    stats.netRevenue += order.totalPrice;
    stats.paidOrders += 1;
    stats.codOrders += 1;

    await stats.save();
  }

  await updateLoyaltyStreak(order.user, order.totalPrice);

  await order.save();

  res.json(order);
});

export const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order || order.user.toString() !== req.user._id.toString())
    throw new Error("Order not found or unauthorized");

  if (order.isDelivered)
    throw new Error("Delivered orders cannot be cancelled");

  const stats = await DashboardStats.findOne();

  order.isCancelled = true;
  order.cancelledAt = Date.now();
  order.orderStatus = "Cancelled";

  if (order.isPaid && !order.isRefunded) {
    for (const item of order.orderItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { quantity: item.qty, salesCount: -item.qty },
      });
    }
  }

  stats.cancelledOrders += 1;
  await stats.save();
  await order.save();

  res.json({ message: "Order cancelled successfully" });
});

export const adminCancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new Error("Order not found");

  if (order.isCancelled) {
    return res.status(400).json({ message: "Order already cancelled" });
  }

  order.isCancelled = true;
  order.cancelledAt = Date.now();
  order.orderStatus = "Cancelled";

  if (order.isPaid && !order.isRefunded) {
    for (const item of order.orderItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { quantity: item.qty, salesCount: -item.qty },
      });
    }
  }

  const stats = await DashboardStats.findOne();
  stats.cancelledOrders += 1;
  await stats.save();
  await order.save();

  res.json({ message: "Order cancelled by admin successfully" });
});

export const updateOrderToRefunded = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) throw new Error("Order not found");
  if (!order.isPaid) throw new Error("Only paid orders can be refunded");
  if (order.isRefunded) throw new Error("Order already refunded");

  order.isRefunded = true;
  order.refundedAt = Date.now();
  order.orderStatus = "Refunded";

  for (const item of order.orderItems) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { quantity: item.qty, salesCount: -item.qty },
    });
  }

  const stats = await DashboardStats.findOne();
  stats.netRevenue -= order.totalPrice;
  stats.refunded += order.totalPrice;
  await stats.save();
  await order.save();

  res.json(order);
});

export const getAdminDashboard = async (req, res) => {
  console.log("DASHBOARD API HIT");
  try {
    let stats = await DashboardStats.findOne();
    if (!stats) stats = await DashboardStats.create({});

    const usersCount = await User.countDocuments();
    const productsCount = await Product.countDocuments();
    const lowStockProducts = await Product.find({ quantity: { $lt: 20 } })
      .select("name quantity _id isActive")
      .sort({ quantity: 1 });
    console.log({
      totalRevenue: stats.netRevenue,
      totalOrders: stats.totalOrders,
    });
    res.json({
      totalRevenue: stats.netRevenue || 0,
      totalRefunded: stats.refunded || 0,
      paidOrders: stats.paidOrders || 0,
      cancelledOrders: stats.cancelledOrders || 0,
      totalOrders: stats.totalOrders || 0,
      codOrders: stats.codOrders || 0,
      usersCount: usersCount || 0,
      productsCount: productsCount || 0,
      lowStockProducts: lowStockProducts || [],
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).json({ message: "Dashboard error" });
  }
};

export const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({
    createdAt: -1,
  });
  console.log("MY ORDERS:", orders);
  res.json(orders);
});

export const getAllOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ isAdminArchived: { $ne: true } })
    .populate("user", "name email")
    .sort({ createdAt: -1 });

  const now = new Date();

  for (const order of orders) {
    if (
      order.orderStatus === "Placed" &&
      now - order.createdAt > 5 * 60 * 1000
    ) {
      order.orderStatus = "In Transit";
      await order.save();
    }
  }

  res.json(orders);
});
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "name email")
      .populate("orderItems.product", "name images price");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (
      !req.user.isAdmin &&
      order.user._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    res.json(order);
  } catch (error) {
    console.error("GET ORDER ERROR:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

export const resetOrders = asyncHandler(async (req, res) => {
  await Order.updateMany({}, { $set: { isAdminArchived: true } });
  res
    .status(200)
    .json({ message: "Admin dashboard cleared (User data preserved)" });
});

export const getSalesReport = asyncHandler(async (req, res) => {
  const stats = await Order.aggregate([
    {
      $group: {
        _id: null,
        grossRevenue: { $sum: "$totalPrice" },
        totalRevenue: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$isPaid", true] },
                  { $eq: ["$isCancelled", false] },
                  { $eq: ["$isRefunded", false] },
                ],
              },
              "$totalPrice",
              0,
            ],
          },
        },
        totalRefunded: {
          $sum: {
            $cond: [{ $eq: ["$isRefunded", true] }, "$totalPrice", 0],
          },
        },
        totalOrders: { $sum: 1 },
      },
    },
  ]);

  res.json(
    stats.length > 0
      ? stats[0]
      : { totalRevenue: 0, totalOrders: 0, totalRefunded: 0, grossRevenue: 0 },
  );
});

export const resetMonthlyData = async (req, res) => {
  try {
    const stats = await DashboardStats.findOne();
    if (!stats) return res.status(404).json({ message: "Stats not found" });

    stats.netRevenue = 0;
    stats.refunded = 0;
    stats.paidOrders = 0;
    stats.cancelledOrders = 0;
    stats.totalOrders = 0;
    stats.codOrders = 0;

    await stats.save();
    res.json({ message: "Dashboard stats reset successfully" });
  } catch (error) {
    res.status(500).json({ message: "Reset failed" });
  }
};

export const resetMonthlyStats = async (req, res) => {
  try {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    await Order.updateMany(
      { createdAt: { $gte: firstDay, $lte: lastDay } },
      { $set: { isCancelled: false, isRefunded: false } },
    );

    res.json({ message: "Current month stats reset successfully" });
  } catch (error) {
    console.error("Reset Monthly Stats Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

