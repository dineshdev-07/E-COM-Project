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
  generateMonthlyReportPDF,
} from "../controllers/orderController.js";
import { protect, admin } from "../middleware/authMiddleware.js";
import {verifyPayment} from "../controllers/paymentController.js"
import PDFDocument from "pdfkit";
import Order from "../models/orderModel.js";

const router = express.Router();

router.post("/", protect, createOrder);
router.get("/myorders", protect, getMyOrders);

router.get("/admin/sales", protect, admin, getSalesReport);
router.get("/admin/dashboard", protect, admin, getAdminDashboard);
router.get("/admin", protect, admin, getAllOrders);
router.get("/", protect, admin, getAllOrders);

router.post("/verify", verifyPayment);

router.delete("/reset", protect, admin, resetOrders);
router.put("/reset-monthly-data", protect, admin, resetMonthlyData);
router.put("/reset-monthly-stats", protect, admin, resetMonthlyStats);
router.get("/admin/monthly-report", protect, admin, generateMonthlyReportPDF);

router.put("/admin/:id/cancel", protect, admin, adminCancelOrder);
router.get("/admin/:id", protect, admin, getOrderById);

router.put("/:id/refund", protect, admin, updateOrderToRefunded);
router.put("/:id/deliver", protect, admin, markAsDelivered);
router.put("/:id/cancel", protect, cancelOrder);

router.get("/:id/invoice", protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("user");
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (
      !req.user.isAdmin &&
      order.user._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const brandColor = "#6FAF8E";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=FreshCart_Invoice_${order._id}.pdf`,
    );

    doc.pipe(res);

    doc.rect(0, 0, 600, 20).fill(brandColor);
    doc
      .fillColor(brandColor)
      .fontSize(26)
      .font("Helvetica-Bold")
      .text("FreshCart", 50, 50);
    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#555555")
      .text("Your One-Stop Digital Shop", 50, 80)
      .text("support@FreshCart.com", 50, 92);
    doc
      .fillColor("#333333")
      .fontSize(20)
      .text("INVOICE", 400, 50, { align: "right" });
    doc
      .fontSize(10)
      .fillColor(brandColor)
      .text(
        `Order ID: #${order._id.toString().toUpperCase().slice(-6)}`,
        400,
        75,
        { align: "right" },
      );
    doc
      .fillColor("#777777")
      .text(`Date: ${order.createdAt.toDateString()}`, 400, 88, {
        align: "right",
      });

    doc.rect(50, 120, 500, 1).fill("#eeeeee");
    let infoTop = 140;
    doc
      .fillColor(brandColor)
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("BILL TO", 50, infoTop);
    doc
      .fillColor("#1a1a1a")
      .font("Helvetica")
      .text(order.user.name, 50, infoTop + 15)
      .text(order.user.email, 50, infoTop + 27);
    doc
      .fillColor(brandColor)
      .font("Helvetica-Bold")
      .text("SHIP TO", 300, infoTop);
    const shipping = order.shippingAddress;
    doc
      .fillColor("#1a1a1a")
      .font("Helvetica")
      .text(
        shipping?.address || "Address details not provided",
        300,
        infoTop + 15,
      )
      .text(
        `${shipping?.city || ""}, ${shipping?.postalCode || ""}`,
        300,
        infoTop + 27,
      );

    const tableTop = 220;
    doc.rect(50, tableTop, 500, 25).fill(brandColor);
    doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(10);
    doc.text("Product Details", 60, tableTop + 8);
    doc.text("Qty", 300, tableTop + 8, { width: 40, align: "center" });
    doc.text("Unit Price", 370, tableTop + 8, { width: 80, align: "right" });
    doc.text("Amount", 470, tableTop + 8, { width: 70, align: "right" });

    let currentY = tableTop + 35;
    order.orderItems.forEach((item, index) => {
      if (index % 2 === 0) doc.rect(50, currentY - 5, 500, 25).fill("#fbfbfb");
      doc.font("Helvetica").fillColor("#444");
      doc.text(item.name, 60, currentY, { width: 230 });
      doc.text(item.qty.toString(), 300, currentY, {
        width: 40,
        align: "center",
      });
      doc.text(`${item.price.toFixed(2)}`, 370, currentY, {
        width: 80,
        align: "right",
      });
      doc.text(`${(item.qty * item.price).toFixed(2)}`, 470, currentY, {
        width: 70,
        align: "right",
      });
      currentY += 25;
    });

    currentY += 20;
    const summaryX = 350,
      valueX = 480;
    doc
      .moveTo(350, currentY)
      .lineTo(550, currentY)
      .strokeColor(brandColor)
      .lineWidth(1)
      .stroke();
    currentY += 15;

    doc.fillColor("#777777").fontSize(10).text("Subtotal:", summaryX, currentY);
    doc
      .fillColor("#1a1a1a")
      .text(
        `${(order.totalPrice - (order.shippingPrice || 0) + (order.discountPrice || 0)).toFixed(2)}`,
        valueX,
        currentY,
        { align: "right" },
      );
    currentY += 18;
    doc.fillColor("#777777").text("Delivery Fee:", summaryX, currentY);
    doc
      .fillColor("#1a1a1a")
      .text(`+ ${(order.shippingPrice || 0).toFixed(2)}`, valueX, currentY, {
        align: "right",
      });

    if (order.discountPrice > 0) {
      currentY += 18;
      doc.fillColor("#e63946").text("Discount:", summaryX, currentY);
      doc.text(`- ${order.discountPrice.toFixed(2)}`, valueX, currentY, {
        align: "right",
      });
    }
    if (order.isRefunded) {
      currentY += 18;
      doc
        .fillColor("#e63946")
        .font("Helvetica-Bold")
        .text("Refunded Amount:", summaryX, currentY);
      doc.text(`- ${order.totalPrice.toFixed(2)}`, valueX, currentY, {
        align: "right",
      });
    }

    currentY += 25;
    doc.rect(340, currentY - 5, 210, 30).fill("#f4f9f6");
    doc.fillColor(brandColor).font("Helvetica-Bold").fontSize(12);
    doc.text("TOTAL AMOUNT:", 350, currentY + 5);
    doc.text(`${order.totalPrice.toFixed(2)}`, valueX, currentY + 5, {
      align: "right",
    });

    const footerTop = 720;
    doc
      .fillColor(brandColor)
      .fontSize(8)
      .font("Helvetica-Bold")
      .text("PAYMENT STATUS", 50, footerTop - 15);
    doc.rect(50, footerTop, 80, 18).fill(order.isPaid ? brandColor : "#fee2e2");
    doc
      .fillColor(order.isPaid ? "#FFFFFF" : "#991b1b")
      .fontSize(9)
      .text(order.isPaid ? "PAID" : "UNPAID", 50, footerTop + 5, {
        width: 80,
        align: "center",
      });
    doc
      .fillColor("#aaaaaa")
      .font("Helvetica")
      .fontSize(8)
      .text("Thank you for shopping with FreshCart!", 50, footerTop + 50, {
        align: "center",
        width: 500,
      });

    doc.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/:id", protect, getOrderById);

export default router;
