import User from "../models/userModel.js";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import asyncHandler from "express-async-handler";

let otpStore = {};

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
  const { email } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[email] = otp;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT) || 465,
    secure: true, // true because we are using port 465
    dnsResolution: "ipv4first", // 👈 THIS FORCES NODE TO USE IPv4 AND FIXES ENETUNREACH ON RENDER
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: `"FreshCart 🥬" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "🔐 Verify Your FreshCart Account",

      html: `
  <div style="
    background:#F0FDF4;
    padding:40px 20px;
    font-family:Arial,sans-serif;
  ">

    <div style="
      max-width:520px;
      background:white;
      margin:auto;
      border-radius:24px;
      overflow:hidden;
      box-shadow:0 10px 30px rgba(0,0,0,0.08);
    ">

      <div style="
        background:linear-gradient(135deg,#22C55E,#16A34A);
        padding:40px 30px;
        text-align:center;
      ">

        <h1 style="
          color:white;
          margin:0;
          font-size:34px;
          font-weight:900;
        ">
          FreshCart 🥬
        </h1>

        <p style="
          color:rgba(255,255,255,0.9);
          margin-top:10px;
        ">
          Verify your account
        </p>

      </div>

      <div style="padding:35px;">

        <h2 style="
          margin-top:0;
          color:#222;
        ">
          Hello 👋
        </h2>

        <p style="
          color:#666;
          line-height:1.7;
          font-size:14px;
        ">
          Use this OTP to verify your FreshCart account.
        </p>

        <div style="
          background:#F0FDF4;
          border:2px dashed #22C55E;
          border-radius:20px;
          padding:30px;
          text-align:center;
          margin:30px 0;
        ">

          <p style="
            margin:0 0 10px;
            color:#666;
            font-size:12px;
            letter-spacing:2px;
            font-weight:700;
          ">
            YOUR OTP
          </p>

          <h1 style="
            letter-spacing:10px;
            color:#111827;
            font-family:monospace;
            font-size:34px;
          font-weight:900;
          ">
            ${otp}
          </h1>

        </div>

        <p style="
          color:#999;
          font-size:12px;
          text-align:center;
        ">
          OTP valid for 10 minutes
        </p>

      </div>

    </div>

  </div>
  `,
    });
    res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to send OTP" });
  }
};

export const registerUser = async (req, res) => {
  try {
    const { name, email, password, otp } = req.body;
    if (otpStore[email] !== otp)
      return res.status(400).json({ message: "Invalid OTP" });

    const userExists = await User.findOne({ email });
    if (userExists)
      return res.status(400).json({ message: "User already exists" });

    const user = await User.create({
      name,
      email,
      password,
      loyaltyPoints: 0,
      streaks: 0,
      isPlusMember: false,
      firstOrderCompleted: false,
    });

    delete otpStore[email];
    generateTokenAndSetCookie(req, res, user._id);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin || false,
      isPlusMember: false,
      plusExpiryDate: null,
      loyaltyPoints: 0,
      streaks: 0,
      firstOrderCompleted: false,
    });
  } catch (error) {
    res.status(500).json({ message: "Registration failed" });
  }
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    generateTokenAndSetCookie(req, res, user._id);
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin || false,
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
    if (!user) return res.status(404).json({ message: "User not found" });

    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + 1);
    user.isPlusMember = true;
    user.plusExpiryDate = expiry;
    await user.save();

    res.json({
      message: "Plus activated for 1 month",
      isPlusMember: user.isPlusMember,
      plusExpiryDate: user.plusExpiryDate,
    });
  } catch {
    res.status(500).json({ message: "Upgrade failed" });
  }
};

export const addAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (user.addresses.length >= 2) {
    res.status(400);
    throw new Error(
      "Maximum 2 addresses allowed. Please edit an existing one.",
    );
  }

  const { fullAddress, pinCode, phone, district } = req.body;

  if (!district?.trim()) {
    res.status(400);
    throw new Error("District is required");
  }

  user.addresses.push({
    fullAddress,
    pinCode,
    phone,
    district: district.trim(),
  });
  await user.save();
  res.status(201).json(user.addresses);
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
