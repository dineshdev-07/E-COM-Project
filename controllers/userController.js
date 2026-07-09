import User from "../models/userModel.js";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import brevoTransport from "nodemailer-brevo-transport";
import asyncHandler from "express-async-handler";


let otpStore = {};

const transporter = nodemailer.createTransport(
  new brevoTransport({
    apiKey: process.env.EMAIL_PASS,
  }),
);

const getAuthCookieOptions = (req, overrides = {}) => {
  const origin = req.get("origin") || "";
  const isHttpsRequest =
    req.secure ||
    req.get("x-forwarded-proto") === "https" ||
    origin.startsWith("https://");

  return {
    httpOnly: true,
    secure: isHttpsRequest,
    sameSite: isHttpsRequest ? "none" : "lax",
    ...overrides,
  };
};

const generateTokenAndSetCookie = (req, res, userId) => {
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });

  console.log("LOGIN API HIT");
console.log("TOKEN:", token);

  res.cookie(
    "token",
    token,
    getAuthCookieOptions(req, {
      maxAge: 30 * 24 * 60 * 60 * 1000,
    }),
  );

  return token;
};

export const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[email] = otp;

    console.log("Sending OTP to:", email);

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "🔐 FreshCart OTP Verification",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 400px; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px;">
          <h2 style="color: #16a34a; margin-top: 0;">
            FreshCart OTP Verification
          </h2>

          <p style="color: #4b5563;">
            Your verification code is:
          </p>

          <h1 style="
            letter-spacing: 6px;
            color: #111827;
            background: #f3f4f6;
            padding: 12px;
            text-align: center;
            border-radius: 8px;
            font-family: monospace;
          ">
            ${otp}
          </h1>

          <p style="color: #9ca3af; font-size: 12px;">
            This OTP is valid for 10 minutes.
          </p>
        </div>
      `,
    });

    console.log("OTP email sent successfully");

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.error("========== OTP ERROR ==========");
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to send OTP",
      error: error.message,
    });
  }
};

export const registerUser = async (req, res) => {
  try {
    console.log("REGISTER REQUEST:", req.body);

    const { name, email, password, otp } = req.body;

    console.log("Stored OTP:", otpStore[email]);
    console.log("Entered OTP:", otp);

    if (otpStore[email] !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    const userExists = await User.findOne({ email });

    console.log("User exists:", userExists);

    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = await User.create({
      name,
      email,
      password,
      loyaltyPoints: 0,
      isPlusMember: false,
      firstOrderCompleted: false,
    });

    console.log("Created User:", user);

    delete otpStore[email];
    generateTokenAndSetCookie(req, res, user._id);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    res.status(500).json({ message: "Registration failed" });
  }
};
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
  })
  } else {
    res.status(401).json({ message: "Invalid email or password" });
  }
};

export const logoutUser = (req, res) => {
  res.cookie(
    "token",
    "",
    getAuthCookieOptions(req, {
      expires: new Date(0),
    }),
  );
  res.status(200).json({ message: "Logged out successfully" });
};

export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!otpStore[email] || otpStore[email] !== otp)
      return res.status(400).json({ message: "Invalid OTP" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.password = newPassword;
    await user.save();
    delete otpStore[email];

    res.status(200).json({ message: "Password reset successful" });
  } catch {
    res.status(500).json({ message: "Reset failed" });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (
      user.isPlusMember &&
      user.plusExpiryDate &&
      new Date() > user.plusExpiryDate
    ) {
      user.isPlusMember = false;
      user.plusExpiryDate = null;
      await user.save();
    }

    res.json(user);
  } catch {
    res.status(500).json({ message: "Profile fetch failed" });
  }
};

export const upgradeToPlus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user)
      return res.status(404).json({ message: "User not found" });

    if (user.loyaltyPoints < 20) {
      return res.status(400).json({
        message: "You need at least 20 loyalty points to activate Plus.",
      });
    }

    if (user.isPlusMember) {
      return res.status(400).json({
        message: "Plus Membership is already active.",
      });
    }

    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);

    user.isPlusMember = true;
    user.plusExpiryDate = expiry;

    await user.save();

    res.json({
      message: "FreshCart Plus activated successfully.",
      isPlusMember: user.isPlusMember,
      plusExpiryDate: user.plusExpiryDate,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Upgrade failed",
    });
  }
};
export const addAddress = asyncHandler(async (req, res) => {
  try {
    console.log("===== ADD ADDRESS =====");
    console.log("req.user:", req.user);
    console.log("req.body:", req.body);

    const user = await User.findById(req.user?._id);

    console.log("user:", user);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { fullAddress, pinCode, phone, district } = req.body;

    user.addresses.push({
      fullAddress,
      pinCode,
      phone,
      district,
    });

    await user.save();

    return res.status(201).json(user.addresses);
  } catch (err) {
    console.error("ADD ADDRESS ERROR");
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
      stack: err.stack,
    });
  }
});

export const updateAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  console.log("📍 updateAddress id:", req.params.id, "body:", req.body);
  const address = user.addresses.id(req.params.id);
  if (!address) {
    console.log(
      "❌ not found. IDs:",
      user.addresses.map((a) => String(a._id)),
    );
    res.status(404);
    throw new Error("Address not found");
  }

  address.fullAddress = req.body.fullAddress ?? address.fullAddress;
  address.pinCode = req.body.pinCode ?? address.pinCode;
  address.phone = req.body.phone ?? address.phone;
  address.district = req.body.district ?? address.district;

  await user.save();
  res.json(user.addresses);
});
