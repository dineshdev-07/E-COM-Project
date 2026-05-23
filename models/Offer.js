import mongoose from "mongoose";

const offerSchema = new mongoose.Schema(
  {
    image: {
      type: String,
      required: true,
    },
    link: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

export default mongoose.model("Offer", offerSchema);
