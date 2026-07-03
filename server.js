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

const app = express();

// Request logging middleware
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

// --- CORS CONFIGURATION START ---
// Parse FRONTEND_URL from .env (comma-separated list) and trim whitespace
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map((url) => url.trim())
  : [];

// Automatically include localhost for local development testing
if (!allowedOrigins.includes("http://localhost:5173")) {
  allowedOrigins.push("http://localhost:5173");
}

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, or Postman)
    if (!origin) return callback(null, true);

    // Normalize incoming origin by removing http:// or https://
    const cleanOrigin = origin.replace(/^https?:\/\//, "");

    // Check if the clean origin matches any clean allowed origin
    const isAllowed = allowedOrigins.some((allowed) => {
      const cleanAllowed = allowed.replace(/^https?:\/\//, "");
      return cleanAllowed === cleanOrigin;
    });

    // Match wildcard Vercel preview branch deployments
    const isVercelPreview =
      /^https:\/\/ecommerce-frontend-.*\.vercel\.app$/.test(origin);

    if (isAllowed || isVercelPreview) {
      return callback(null, true);
    }

    // Safely reject unauthorized origins without throwing a server crash error
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
  ],
  optionsSuccessStatus: 204, // Responds to OPTIONS preflight with a 204 status
};

// Apply CORS options globally
app.use(cors(corsOptions));
// Handle preflight requests natively for all application endpoints
app.options("*", cors(corsOptions));
// --- CORS CONFIGURATION END ---

app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Health checks
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
