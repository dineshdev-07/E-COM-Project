import mongoose from "mongoose";

const monthlyReportSchema = new mongoose.Schema(
  {
    month: { type: String, required: true },
    year: { type: Number, required: true },
    totalRevenue: { type: Number, default: 0 },
    totalRefunded: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },
    paidOrders: { type: Number, default: 0 },
    cancelledOrders: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export default mongoose.model("MonthlyReport", monthlyReportSchema);
