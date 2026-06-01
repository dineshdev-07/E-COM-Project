import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import paymentRoutes from "./routes/paymentRoutes.js";
import mongoose from "mongoose";
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

app.set("trust proxy", 1);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use("/uploads", express.static(path.join(__dirname, "/uploads")));

const allowedOrigins = new Set([
  "https://ecommerce-frontend-fawn-three.vercel.app",
  "https://ecommerce-frontend-fawn-theta.vercel.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

const corsOptions = {
  origin(origin, callback) {
    const isVercelFrontend =
      /^https:\/\/ecommerce-frontend-fawn-[a-z0-9-]+\.vercel\.app$/.test(
        origin || "",
      );

    if (!origin || allowedOrigins.has(origin) || isVercelFrontend) {
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  credentials: true,
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("DB Connection Failed:", error);
    process.exit(1);
  }
};

startServer();

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API running",
  });
});

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
  console.error(err.stack);

  res.status(err.status || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal Server Error"
        : err.message,
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
