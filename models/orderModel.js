import mongoose from "mongoose";

const orderSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderItems: [
      {
        name: String,
        qty: Number,
        image: String,
        price: Number,
        mrp: Number,

        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },

        offerDetails: {
          appliedLabel: { type: String, default: "" },
          baseDiscount: { type: Number, default: 0 },
          expiryDiscount: { type: Number, default: 0 },
          expiryDate: { type: Date, default: null },
          daysUntilExpiry: { type: Number, default: null },
          isNewUserOffer: { type: Boolean, default: false },
          newUserProductName: { type: String, default: "" },
          isLoyalOffer: { type: Boolean, default: false },
          loyalExtraPercent: { type: Number, default: 0 },
          loyalFactors: {
            expiryBonus: { type: Number, default: 0 },
            viewsBonus: { type: Number, default: 0 },
            salesBonus: { type: Number, default: 0 },
            stockBonus: { type: Number, default: 0 }, 
            viewsAtOrder: { type: Number, default: null },
            salesCountAtOrder: { type: Number, default: null },
            stockAtOrder: { type: Number, default: null },
          },
          isPlusOffer: { type: Boolean, default: false },
          plusExtraPercent: { type: Number, default: 0 },
          totalDiscountPercent: { type: Number, default: 0 },
          totalSavings: { type: Number, default: 0 },
        },
      },
    ],

    totalPrice: { type: Number, required: true },
    extraDiscount: { type: Number, default: 0 },

    isDelivered: { type: Boolean, default: false },
    deliveredAt: { type: Date },
    isPaid: { type: Boolean, default: false },
    paidAt: { type: Date },
    paymentMethod: { type: String },
    paymentResult: {
      razorpay_payment_id: String,
      razorpay_order_id: String,
      razorpay_signature: String,
    },
    orderStatus: {
      type: String,
      required: true,
      enum: [
        "Placed",
        "In Transit",
        "Out for Delivery",
        "Delivered",
        "Cancelled",
        "Refunded",
      ],
      default: "Placed",
    },
    deliveryPartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryPartner",
      default: null,
    },

    assignedAt: {
      type: Date,
      default: null,
    },

    deliveryOtp: {
      type: String,
    },

    deliveryOtpExpiresAt: {
      type: Date,
    },

    otpVerified: {
      type: Boolean,
      default: false,
    },
    isCancelled: { type: Boolean, default: false },
    cancelledAt: { type: Date },
    isRefunded: { type: Boolean, default: false },
    refundedAt: { type: Date },
    isAdminArchived: { type: Boolean, default: false },
    shippingAddress: {
      address: String,
      city: String,
      district: String,
      postalCode: String,
      country: String,
      phone: { type: String, required: true },
    },
  },
  { timestamps: true },
);

const Order = mongoose.model("Order", orderSchema);
export default Order;
