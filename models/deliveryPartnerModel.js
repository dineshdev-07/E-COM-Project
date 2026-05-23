import mongoose from "mongoose";

const deliveryPartnerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    message: { type: String, required: true },
    images: [{ type: String }],
    phone: { type: String, default: "" },
    vehicle: { type: String, default: "" },
    area: { type: String, default: "" },
    district: { type: String, default: "" },

    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "suspended"],
      default: "pending",
    },
    adminReply: { type: String, default: "" },

    isAvailable: { type: Boolean, default: true },
    totalDeliveries: { type: Number, default: 0 },
    rating: { type: Number, default: 5.0 },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] },
    },
    locationUpdatedAt: { type: Date },
  },
  { timestamps: true },
);

deliveryPartnerSchema.index({ location: "2dsphere" });

const DeliveryPartner = mongoose.model(
  "DeliveryPartner",
  deliveryPartnerSchema,
);
export default DeliveryPartner;
