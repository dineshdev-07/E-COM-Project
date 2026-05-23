import mongoose from "mongoose";

const productSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    brand: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    weight: String,
    unit: String,
    price: {
      type: Number,
      required: true,
    },
    discountedPrice: Number,
    quantity: {
      type: Number,
      required: true,
    },
    images: [String],
    views: {
      type: Number,
      default: 0,
    },
    salesCount: {
      type: Number,
      default: 0,
    },
    manufacturingDate: Date,
    expiryDate: Date,
    isActive: {
      type: Boolean,
      default: true,
    },
    isPinned: { type: Boolean, default: false },
    createdByAdmin: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

const Product = mongoose.model("Product", productSchema);

export default Product;
