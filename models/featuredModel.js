import mongoose from "mongoose";

const featuredSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model("Featured", featuredSchema);
