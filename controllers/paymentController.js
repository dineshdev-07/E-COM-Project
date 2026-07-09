import dotenv from "dotenv";
dotenv.config();
import Product from "../models/Product.js";
import Razorpay from "razorpay";
import crypto from "crypto";
import Order from "../models/orderModel.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});
export const createPayment = async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    const options = {
      amount: Math.round(amount * 100),
      currency: "INR",
    };

    const order = await razorpay.orders.create(options);

    res.json({
      ...order,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("PAYMENT ERROR:", error);
    res.status(500).json({ message: "Payment initialization failed" });
  }
};

export const verifyPayment = async (req, res) => {
  console.log("VERIFY PAYMENT HIT");
  console.log(req.body);

  try {
    console.log("Order ID:", orderId);
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: "Missing payment details" });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      const order = await Order.findById(orderId);
      console.log(order);

      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      order.isPaid = true;
      order.paidAt = new Date();
      order.orderStatus = "Placed";

      order.paymentResult = {
        id: razorpay_payment_id,
        orderId: razorpay_order_id,
        status: "Paid",
        update_time: new Date(),
      };

      await order.save();

      for (const item of order.orderItems) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: {
            quantity: -item.qty,
            salesCount: item.qty,
          },
        });
      }

      // ==========================

      return res.status(200).json({
        message: "Payment verified successfully",
      });
    } else {
      return res.status(400).json({ message: "Invalid signature" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Payment verification failed" });
  }
};
