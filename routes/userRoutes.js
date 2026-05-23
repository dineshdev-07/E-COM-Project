import express from "express";
import User from "../models/userModel.js";
import {
  sendOTP,
  registerUser,
  loginUser,
  logoutUser,
  resetPassword,
  getUserProfile,
  upgradeToPlus,
  addAddress,
  updateAddress,
} from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/send-otp", sendOTP);
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.post("/reset-password", resetPassword);

router.get("/profile", protect, getUserProfile);
router.put("/upgrade-plus", protect, upgradeToPlus);

router.post("/address", protect, addAddress);
router.put("/address/:id", protect, updateAddress);

router.delete("/address/:id", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });
    user.addresses = user.addresses.filter(
      (addr) => addr._id.toString() !== req.params.id,
    );
    await user.save();
    res.json(user.addresses);
  } catch {
    res.status(500).json({ message: "Failed to delete address" });
  }
});

export default router;
