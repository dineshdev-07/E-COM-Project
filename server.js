import dotenv from "dotenv";
dotenv.config();
import express from "express";
import paymentRoutes from "./routes/paymentRoutes.js";
import mongoose from "mongoose";
import cors from "cors";
import productRoutes from "./routes/productRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import adRoutes from "./routes/adRoutes.js";
import offerRoutes from "./routes/offerRoutes.js";
import path from "path";
import { fileURLToPath } from "url";
import homeProductRoutes from "./routes/homeProductRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";
import connectDB from "./config/db.js";
import sellerRequestRoutes from "./routes/sellerRequestRoutes.js";
import deliveryPartnerRoutes from "./routes/deliveryPartnerRoutes.js";

import cookieParser from "cookie-parser";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use("/uploads", express.static(path.join(__dirname, "/uploads")));

app.use(
  cors({
    origin: "https://ecommerce-frontend-fawn-three.vercel.app",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.options("*", cors());
app.use(cookieParser());
app.use(express.json());

connectDB();

app.get("/", (req, res) => res.send("API is running"));

app.get("/test-db", async (req, res) => {
  res.json({ mongoStatus: mongoose.connection.readyState });
});

app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/home-products", homeProductRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/ads", adRoutes);
app.use("/api/offers", offerRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/seller-requests", sellerRequestRoutes);
app.use("/api/delivery-partners", deliveryPartnerRoutes);

app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR:", err);
  res.status(500).json({ message: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
