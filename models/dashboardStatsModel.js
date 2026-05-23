import mongoose from "mongoose";

const dashboardStatsSchema = mongoose.Schema(
  {
    netRevenue: { type: Number, default: 0 },
    refunded: { type: Number, default: 0 },
    paidOrders: { type: Number, default: 0 },
    cancelledOrders: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },
    codOrders: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const DashboardStats = mongoose.model("DashboardStats", dashboardStatsSchema);

export default DashboardStats;
