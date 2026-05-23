import express from "express";
import asyncHandler from "express-async-handler";
import {
  protect,
  admin,
  protectOptional,
} from "../middleware/authMiddleware.js";
import {
  createProduct,
  getProducts,
  getProductById,
  getProductsByCategory,
  updateProduct,
  getSearchResults,
  getSuggestions,
} from "../controllers/productController.js";
import { uploadProduct } from "../middleware/upload.js";
import Product from "../models/Product.js";

const router = express.Router();

router.get("/suggestions", getSuggestions);
router.get("/", protectOptional, getProducts);
router.get("/search", getSearchResults);
router.get("/:id", protectOptional, getProductById);
router.get("/category/:category", protectOptional, getProductsByCategory);

router.post("/", protect, admin, uploadProduct.single("image"), createProduct);
router.delete("/:id", protect, admin, async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted successfully" });
});

router.put("/:id/view", async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: "Product not found" });

  product.views += 1;
  await product.save();
  res.json({ message: "View count updated" });
});

router.put("/:id/pin", protect, admin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    product.isPinned = !product.isPinned;
    await product.save();
    res.json({
      message: `Product ${product.isPinned ? "pinned" : "unpinned"}`,
      isPinned: product.isPinned,
    });
  } catch (err) {
    console.error("Pin toggle failed:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.get(
  "/query",
  asyncHandler(async (req, res) => {
    const search = req.query.q || "";
    const products = await Product.find({
      name: { $regex: search, $options: "i" },
    });
    res.json(products);
  }),
);

router.put("/update/:id", protect, admin, updateProduct);

export default router;
