import mongoose from "mongoose";

const homeProductSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product", 
    required: true,
  }
});

export default mongoose.model("HomeProduct", homeProductSchema);
