import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {

    const token = generateTokenAndSetCookie(req, res, user._id);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin || false,
      token,
      isPlusMember: user.isPlusMember || false,
      plusExpiryDate: user.plusExpiryDate || null,
      loyaltyPoints: user.loyaltyPoints || 0,
      firstOrderCompleted: user.firstOrderCompleted || false,
      streaks: user.streaks || 0,
    });

  } else {
    res.status(401).json({ message: "Invalid email or password" });
  }
};
