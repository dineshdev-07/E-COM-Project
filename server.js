import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";

import connectDB from "./config/db.js";

import paymentRoutes from "./routes/paymentRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import adRoutes from "./routes/adRoutes.js";
import offerRoutes from "./routes/offerRoutes.js";
import homeProductRoutes from "./routes/homeProductRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";
import sellerRequestRoutes from "./routes/sellerRequestRoutes.js";
import deliveryPartnerRoutes from "./routes/deliveryPartnerRoutes.js";

const app = express();

app.use((req, res, next) => {
  console.log("METHOD:", req.method);
  console.log("ORIGIN:", req.headers.origin);
  console.log("URL:", req.originalUrl);
  next();
});
app.set("trust proxy", 1);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const allowedOrigins = [
  "https://ecommerce-frontend-fawn-three.vercel.app",
  "https://ecommerce-frontend-fawn-theta.vercel.app",
  "http://localhost:5173",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (
        allowedOrigins.includes(origin) ||
        /^https:\/\/ecommerce-frontend-.*\.vercel\.app$/.test(origin)
      ) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  })
);

// Handle preflight requests explicitly
app.options(/.*/, (req, res) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin);
  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS"
  );
  res.sendStatus(204);
});


app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is running",
  });
});

app.get("/test-db", (req, res) => {
  res.json({
    mongoStatus: mongoose.connection.readyState,
  });
});

// Routes
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

// 404 Handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR:", err);

  res.status(err.status || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal Server Error"
        : err.message,
  });
});

const PORT = process.env.PORT || 5000;

try {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
} catch (error) {
  console.error("Failed to start server:", error);
  process.exit(1);
}
