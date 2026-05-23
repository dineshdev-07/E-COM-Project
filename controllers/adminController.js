import Order from "../models/orderModel.js";
import User from "../models/userModel.js";
import Product from "../models/Product.js";

export const getAdminDashboard = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();

    const paidOrders = await Order.countDocuments({ isPaid: true });

    const codOrders = await Order.countDocuments({
      paymentMethod: "COD",
    });

    const cancelledOrders = await Order.countDocuments({
      isCancelled: true,
    });

    const totalRevenue = await Order.aggregate([
      { $match: { isPaid: true } },
      { $group: { _id: null, total: { $sum: "$totalPrice" } } },
    ]);

    const usersCount = await User.countDocuments();

    const productsCount = await Product.countDocuments();

    const lowStockProducts = await Product.find({
      quantity: { $lte: 20 },
    })
      .sort({ quantity: 1 })
      .lean();
    console.log("RAW PRODUCTS FROM DB:", lowStockProducts);

    res.json({
      totalOrders,
      paidOrders,
      codOrders,
      cancelledOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      usersCount,
      productsCount,
      lowStockProducts,
    });
  } catch (error) {
    res.status(500).json({ message: "Dashboard fetch failed" });
  }
};
