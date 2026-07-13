import asyncHandler from "express-async-handler";
import Product from "../models/Product.js";
import User from "../models/userModel.js";
import cloudinary from "../utils/cloudinary.js";

const calculateSmartOffer = (product, user) => {
  const basePrice = product.discountedPrice || product.price;

  let discount = 0;
  let offerType = null;

  // 1. Expiry discount - available to EVERY user
  if (product.expiryDate) {
    const now = new Date();
    const expiry = new Date(product.expiryDate);

    const daysLeft = product.daysLeft;

    if (daysLeft > 0 && daysLeft <= 3) {
      discount = 30;
      offerType = "EXPIRY";
    } else if (daysLeft <= 7) {
      discount = 20;
      offerType = "EXPIRY";
    } else if (daysLeft <= 15) {
      discount = 10;
      offerType = "EXPIRY";
    }
  }

  // 2. New user discount
  if (user && !user.firstOrderCompleted) {
    const newUserDiscount = 20;

    // Only replace if higher
    if (newUserDiscount > discount) {
      discount = newUserDiscount;
      offerType = "NEW_USER";
    }
  }

  // 3. Loyalty discount
  if (user && user.loyaltyPoints >= 50) {
    let loyaltyDiscount = 5;

    if ((product.views || 0) < 50) {
      loyaltyDiscount = 10;
    }

    if ((product.salesCount || 0) < 20) {
      loyaltyDiscount = 15;
    }

    if ((product.quantity || 0) < 10) {
      loyaltyDiscount = 20;
    }

    // Only replace if higher
    if (loyaltyDiscount > discount) {
      discount = loyaltyDiscount;
      offerType = "LOYALTY";
    }
  }

  // Calculate final price
  const discountAmount = (basePrice * discount) / 100;
  const finalPrice = Math.round(basePrice - discountAmount);

  return {
    finalPrice,
    extraDiscountApplied: discount,
    offerType,
  };
};

export const getProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({});

  let user = null;
  if (req.user) {
    user = await User.findById(req.user._id);
  }

  const updatedProducts = products.map((product) => {
    const { finalPrice, extraDiscountApplied, offerType } = calculateSmartOffer(
      product,
      user,
    );

    return {
      ...product._doc,
      finalPrice,
      extraDiscountApplied,
      offerType,
    };
  });

  res.json(updatedProducts);
});

export const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  let user = null;
  if (req.user) {
    user = await User.findById(req.user._id);
  }

  const { finalPrice, extraDiscountApplied, offerType } = calculateSmartOffer(
    product,
    user,
  );

  res.json({
    ...product._doc,
    finalPrice,
    extraDiscountApplied,
    offerType,
  });
});

export const getProductsByCategory = asyncHandler(async (req, res) => {
  const category = req.params.category;

  const products = await Product.find({
    category: { $regex: new RegExp(`^${category}$`, "i") },
  });

  res.json(products);
});

export const createProduct = asyncHandler(async (req, res) => {
  const {
    name,
    brand,
    category,
    description,
    weight,
    unit,
    price,
    discountedPrice,
    manufacturingDate,
    expiryDate,
    quantity,
  } = req.body;

  if (!req.file) {
    res.status(400);
    throw new Error("Product image required");
  }

  const result = await cloudinary.uploader.upload(req.file.path, {
    folder: "products",
    public_id: `product-${Date.now()}`,
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  });

  const product = await Product.create({
    name,
    brand,
    category,
    description,
    weight,
    unit,
    price: Number(price),
    discountedPrice: discountedPrice ? Number(discountedPrice) : undefined,
    manufacturingDate: manufacturingDate || undefined,
    expiryDate: expiryDate || undefined,
    quantity: Number(quantity),
    images: [result.secure_url],
    createdByAdmin: true,
  });

  res.status(201).json(product);
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  const {
    name,
    brand,
    category,
    description,
    weight,
    unit,
    price,
    discountedPrice,
    manufacturingDate,
    expiryDate,
    quantity,
  } = req.body;

  if (req.file) {
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "products",
      public_id: `product-${Date.now()}`,
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
    });

    product.images = [result.secure_url];
  }

  product.name = name || product.name;
  product.brand = brand || product.brand;
  product.category = category || product.category;
  product.description = description || product.description;
  product.weight = weight || product.weight;
  product.unit = unit || product.unit;
  product.price = price ? Number(price) : product.price;
  product.discountedPrice = discountedPrice
    ? Number(discountedPrice)
    : product.discountedPrice;
  product.manufacturingDate = manufacturingDate || product.manufacturingDate;
  product.expiryDate = expiryDate || product.expiryDate;
  product.quantity = quantity ? Number(quantity) : product.quantity;

  await product.save();

  res.json(product);
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  await product.deleteOne();

  res.json({ message: "Deleted successfully" });
});

export const getSearchResults = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q || !q.trim()) return res.json([]);

  try {
    const words = q
      .trim()
      .split(/\s+/)
      .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

    const regexFilters = words.map((word) => ({
      name: { $regex: word, $options: "i" },
    }));

    const products = await Product.find({ $or: regexFilters }).select(
      "name images price discountedPrice extraDiscountApplied quantity brand",
    );

    const exactIndex = products.findIndex(
      (p) => p.name.toLowerCase() === q.trim().toLowerCase(),
    );
    if (exactIndex > 0) {
      const exactMatch = products.splice(exactIndex, 1);
      products.unshift(...exactMatch);
    }

    res.json(products);
  } catch (err) {
    console.error("Search API error:", err);
    res.status(500).json({ message: "Server error fetching search results" });
  }
});

export const getSuggestions = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q || !q.trim()) return res.json([]);

  try {
    const words = q
      .trim()
      .split(/\s+/)
      .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

    const regexFilters = words.map((word) => ({
      name: { $regex: word, $options: "i" },
    }));

    const products = await Product.find({ $and: regexFilters }).limit(10);

    res.json(products);
  } catch (err) {
    console.error("Suggestions API error:", err);
    res.status(500).json({ message: "Server error fetching suggestions" });
  }
});
