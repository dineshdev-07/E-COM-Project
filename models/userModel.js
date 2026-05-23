import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isAdmin: { type: Boolean, default: false },
    isPlusMember: { type: Boolean, default: false },
    loyaltyPoints: { type: Number, default: 0 },

    streaks: {
      type: Number,
      default: 0,
    },
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],

    lastOrderDate: { type: Date },
    lastStreakRewardDate: { type: Date },
    firstOrderCompleted: { type: Boolean, default: false },
    plusExpiryDate: { type: Date },
    addresses: [
      {
        label: { type: String },
        fullAddress: { type: String, required: true },
        district: { type: String, required: true },
        pinCode: { type: String, required: true },
        phone: { type: String, required: true },
      },
    ],
  },
  { timestamps: true },
);

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

const User = mongoose.model("User", userSchema);
export default User;
