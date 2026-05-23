import express from "express";
import HomeProduct from "../models/HomeProduct.js";
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const featured = await HomeProduct.find().populate("productId");
    console.log("Found in DB:", featured.length, "items");
    const validProducts = featured
      .filter((item) => item.productId !== null)
      .map((item) => item.productId);

    res.json(validProducts);
  } catch (err) {
    console.error("GET Error:", err);
    res.status(500).json([]);
  }
});

router.post("/", async (req, res) => {
  try {
    const { productId } = req.body;
    const exists = await HomeProduct.findOne({ productId });
    if (exists) return res.status(400).json({ message: "Already pinned" });

    const newHomeProd = new HomeProduct({ productId });
    await newHomeProd.save();
    res.status(201).json(newHomeProd);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
