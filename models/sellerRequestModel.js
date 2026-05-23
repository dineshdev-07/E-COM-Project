import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
  {
    sender: { type: String, enum: ["user", "admin"], required: true },
    message: { type: String, required: true },
    readByAdmin: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const sellerRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    images: [{ type: String }],

    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "chatting"],
      default: "pending",
    },

    adminReply: { type: String, default: "" },

    chat: [chatMessageSchema],
  },
  { timestamps: true },
);

const SellerRequest = mongoose.model("SellerRequest", sellerRequestSchema);
export default SellerRequest;
