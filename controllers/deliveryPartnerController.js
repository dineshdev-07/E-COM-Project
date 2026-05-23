import bcrypt from "bcryptjs";
import fs from "fs";
import DeliveryPartner from "../models/deliveryPartnerModel.js";
import Order from "../models/orderModel.js";
import cloudinary from "../utils/cloudinary.js";
import {
  sendDeliveryEmail,
  sendOtpEmail,
  sendOrderSuccessEmail,
} from "../utils/sendDeliveryEmail.js";
const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const registerDeliveryPartner = async (req, res) => {
  try {
    const { message, phone, vehicle, area, district } = req.body;
    if (!message?.trim())
      return res.status(400).json({ message: "Message is required." });

    const existing = await DeliveryPartner.findOne({
      user: req.user._id,
      status: { $in: ["pending", "accepted"] },
    });
    if (existing)
      return res
        .status(400)
        .json({ message: "You already have an active application." });

    let imageUrls = [];
    if (req.files?.length > 0) {
      for (const file of req.files) {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: "delivery_partners",
        });
        imageUrls.push(result.secure_url);
        fs.unlink(file.path, (err) => {
          if (err) console.warn("Temp cleanup failed:", file.path);
        });
      }
    }

    const partner = await DeliveryPartner.create({
      user: req.user._id,
      message: message.trim(),
      phone: phone?.trim() || "",
      vehicle: vehicle?.trim() || "",
      area: area?.trim() || "",
      district: district?.trim() || "",
      images: imageUrls,
    });
    await partner.populate("user", "name email");
    res.status(201).json(partner);
  } catch (err) {
    console.error("registerDeliveryPartner:", err);
    res.status(500).json({ message: "Server error." });
  }
};

export const getMyPartnerProfile = async (req, res) => {
  try {
    const partner = await DeliveryPartner.findOne({
      user: req.user._id,
    }).populate("user", "name email");
    if (!partner)
      return res.status(404).json({ message: "No application found." });
    res.json(partner);
  } catch {
    res.status(500).json({ message: "Server error." });
  }
};

export const updateLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    if (latitude == null || longitude == null) {
      return res
        .status(400)
        .json({ message: "latitude and longitude are required." });
    }

    const partner = await DeliveryPartner.findOne({ user: req.user._id });
    if (!partner)
      return res.status(404).json({ message: "Partner not found." });

    partner.location = {
      type: "Point",
      coordinates: [parseFloat(longitude), parseFloat(latitude)],
    };
    partner.locationUpdatedAt = new Date();
    await partner.save();

    res.json({
      message: "Location updated.",
      locationUpdatedAt: partner.locationUpdatedAt,
    });
  } catch (err) {
    console.error("updateLocation:", err);
    res.status(500).json({ message: "Server error." });
  }
};

export const getMyAssignedOrders = async (req, res) => {
  try {
    const partner = await DeliveryPartner.findOne({ user: req.user._id });
    if (!partner || partner.status !== "accepted") {
      return res
        .status(403)
        .json({ message: "Not an active delivery partner." });
    }
    const orders = await Order.find({
      deliveryPartner: partner._id,
      isCancelled: false,
    })
      .populate("user", "name email")
      .sort({ assignedAt: -1 });
    res.json(orders);
  } catch {
    res.status(500).json({ message: "Server error." });
  }
};

export const generateDeliveryOtp = async (req, res) => {
  try {
    const partner = await DeliveryPartner.findOne({
      user: req.user._id,
    }).populate("user", "name email");
    if (!partner || partner.status !== "accepted") {
      return res
        .status(403)
        .json({ message: "Not an active delivery partner." });
    }

    const order = await Order.findById(req.params.orderId).populate(
      "user",
      "name email",
    );
    if (!order) return res.status(404).json({ message: "Order not found." });
    if (order.deliveryPartner?.toString() !== partner._id.toString()) {
      return res
        .status(403)
        .json({ message: "You are not assigned to this order." });
    }
    if (order.isDelivered)
      return res.status(400).json({ message: "Order already delivered." });

    const otp = generateOtp();
    const hashed = await bcrypt.hash(otp, 10);

    order.deliveryOtp = hashed;
    order.deliveryOtpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    order.orderStatus = "Out for Delivery";
    await order.save();
    try {
      if (order.user?.email) {
        await sendOtpEmail({
          to: order.user.email,
          name: order.user.name,
          otp,
          order,
          partnerName: partner.user?.name || "our agent",
        });
      }
    } catch (emailErr) {
      console.error("❌ OTP email failed:", emailErr.message);
    }

    res.json({ otp, expiresIn: "15 minutes", orderId: order._id });
  } catch (err) {
    console.error("generateDeliveryOtp:", err);
    res.status(500).json({ message: "Server error." });
  }
};
export const verifyDeliveryOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    if (!otp) return res.status(400).json({ message: "OTP is required." });

    const partner = await DeliveryPartner.findOne({ user: req.user._id });
    if (!partner || partner.status !== "accepted") {
      return res
        .status(403)
        .json({ message: "Not an active delivery partner." });
    }

    const order = await Order.findById(req.params.orderId).populate(
      "user",
      "name email",
    );
    if (!order) return res.status(404).json({ message: "Order not found." });
    if (order.deliveryPartner?.toString() !== partner._id.toString()) {
      return res
        .status(403)
        .json({ message: "You are not assigned to this order." });
    }
    if (order.isDelivered)
      return res.status(400).json({ message: "Order already delivered." });
    if (!order.deliveryOtp)
      return res.status(400).json({ message: "OTP not generated yet." });

    if (new Date() > order.deliveryOtpExpiresAt) {
      return res
        .status(400)
        .json({ message: "OTP expired. Please generate a new one." });
    }

    const isMatch = await bcrypt.compare(
      otp.toString().trim(),
      order.deliveryOtp,
    );
    if (!isMatch)
      return res
        .status(400)
        .json({ message: "Incorrect OTP. Please try again." });

    order.isDelivered = true;
    order.deliveredAt = new Date();
    order.orderStatus = "Delivered";
    order.otpVerified = true;
    order.deliveryOtp = null;
    order.deliveryOtpExpiresAt = null;
    if (!order.isPaid) {
      order.isPaid = true;
      order.paidAt = new Date();
    }
    await order.save();

    partner.totalDeliveries += 1;
    partner.isAvailable = true;
    await partner.save();
    try {
      if (order.user?.email) {
        await sendDeliveryEmail({
          to: order.user.email,
          name: order.user.name,
          order,
        });
      }
    } catch (emailErr) {
      console.error("❌ Delivery email (OTP path) failed:", emailErr.message);
    }

    res.json({ message: "OTP verified! Order delivered.", order });
  } catch (err) {
    console.error("verifyDeliveryOtp:", err);
    res.status(500).json({ message: "Server error." });
  }
};

export const getAllPartners = async (req, res) => {
  try {
    const partners = await DeliveryPartner.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });
    res.json(partners);
  } catch {
    res.status(500).json({ message: "Server error." });
  }
};

const TN_PIN_RANGES = [
  [600001, 600119, "Chennai"],
  [600103, 600103, "Thiruvallur"],
  [601101, 601302, "Thiruvallur"],
  [602001, 602117, "Thiruvallur"],
  [600201, 600213, "Kanchipuram"],
  [631001, 631811, "Kanchipuram"],
  [603001, 603402, "Chengalpattu"],
  [632001, 632602, "Vellore"],
  [632401, 632519, "Ranipet"],
  [635601, 635901, "Tirupattur"],
  [635001, 635206, "Krishnagiri"],
  [604001, 604406, "Tiruvannamalai"],
  [606301, 606907, "Tiruvannamalai"],
  [605001, 605902, "Villupuram"],
  [606001, 606213, "Kallakurichi"],
  [607001, 608902, "Cuddalore"],
  [609001, 609809, "Nagapattinam"],
  [610001, 612902, "Tiruvarur"],
  [613001, 614904, "Thanjavur"],
  [636001, 636451, "Salem"],
  [636701, 636812, "Dharmapuri"],
  [637001, 637215, "Namakkal"],
  [638001, 638812, "Erode"],
  [639001, 639206, "Karur"],
  [641001, 641697, "Coimbatore"],
  [641601, 641699, "Tiruppur"],
  [643001, 643253, "Nilgiris"],
  [620001, 621113, "Tiruchirappalli"],
  [621101, 621220, "Perambalur"],
  [621701, 621806, "Ariyalur"],
  [622001, 622515, "Pudukkottai"],
  [623001, 623409, "Sivaganga"],
  [623501, 623806, "Ramanathapuram"],
  [624001, 624802, "Dindigul"],
  [625001, 625023, "Dindigul"],
  [625101, 625122, "Madurai"],
  [625201, 625234, "Madurai"],
  [625301, 625402, "Madurai"],
  [625501, 625582, "Theni"],
  [625601, 625704, "Madurai"],
  [626001, 626213, "Virudhunagar"],
  [627001, 627359, "Tirunelveli"],
  [627351, 628952, "Thoothukudi"],
  [627801, 627862, "Tenkasi"],
  [629001, 629901, "Kanniyakumari"],
];
const TN_ALIASES = {
  trichy: "Tiruchirappalli",
  tiruchirappalli: "Tiruchirappalli",
  tiruchirapalli: "Tiruchirappalli",
  tiruchi: "Tiruchirappalli",
  tuticorin: "Thoothukudi",
  thoothukudi: "Thoothukudi",
  kanyakumari: "Kanniyakumari",
  kanniyakumari: "Kanniyakumari",
  chennai: "Chennai",
  thiruvallur: "Thiruvallur",
  kanchipuram: "Kanchipuram",
  chengalpattu: "Chengalpattu",
  vellore: "Vellore",
  tirupattur: "Tirupattur",
  ranipet: "Ranipet",
  tiruvannamalai: "Tiruvannamalai",
  villupuram: "Villupuram",
  kallakurichi: "Kallakurichi",
  cuddalore: "Cuddalore",
  salem: "Salem",
  namakkal: "Namakkal",
  erode: "Erode",
  tiruppur: "Tiruppur",
  coimbatore: "Coimbatore",
  nilgiris: "Nilgiris",
  dharmapuri: "Dharmapuri",
  krishnagiri: "Krishnagiri",
  perambalur: "Perambalur",
  ariyalur: "Ariyalur",
  karur: "Karur",
  thanjavur: "Thanjavur",
  tiruvarur: "Tiruvarur",
  nagapattinam: "Nagapattinam",
  mayiladuthurai: "Mayiladuthurai",
  pudukkottai: "Pudukkottai",
  sivaganga: "Sivaganga",
  madurai: "Madurai",
  theni: "Theni",
  dindigul: "Dindigul",
  virudhunagar: "Virudhunagar",
  ramanathapuram: "Ramanathapuram",
  tirunelveli: "Tirunelveli",
  tenkasi: "Tenkasi",
};
const _norm = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z]/g, "");
const resolveDistrict = (input) => {
  if (!input) return null;
  const str = String(input).trim();
  if (/^\d{5,6}$/.test(str)) {
    const pin = parseInt(str, 10);
    for (const [s, e, d] of TN_PIN_RANGES) {
      if (pin >= s && pin <= e) return d;
    }
    return null;
  }
  const key = _norm(str);
  if (TN_ALIASES[key]) return TN_ALIASES[key];
  for (const [alias, district] of Object.entries(TN_ALIASES)) {
    if (key.startsWith(alias) || key.includes(alias)) return district;
  }
  return null;
};

export const getActivePartners = async (req, res) => {
  try {
    const { lat, lng, pincode, district } = req.query;

    const orderDistrict = district?.trim() || resolveDistrict(pincode);

    console.log(
      `[getActivePartners] pincode=${pincode} → district="${orderDistrict}"`,
    );

    let partners = await DeliveryPartner.find({ status: "accepted" }).populate(
      "user",
      "name email",
    );

    console.log(
      `[getActivePartners] total accepted partners: ${partners.length}`,
    );

    if (orderDistrict) {
      partners = partners.filter((p) => {
        if (p.district) {
          const match =
            p.district.toLowerCase() === orderDistrict.toLowerCase();
          console.log(
            `  ${match ? "SHOW" : "HIDE"}: ${p.user?.name} district="${p.district}"`,
          );
          return match;
        }
        if (p.area) {
          const partnerDistrict = resolveDistrict(p.area);
          const match =
            partnerDistrict?.toLowerCase() === orderDistrict.toLowerCase();
          console.log(
            `  ${match ? "SHOW" : "HIDE"}: ${p.user?.name} area="${p.area}" → "${partnerDistrict}" (fallback)`,
          );
          return match;
        }
        console.log(`  SKIP (no district/area): ${p.user?.name}`);
        return false;
      });
    } else {
      console.log(
        `[getActivePartners] pincode not resolved — showing ALL partners`,
      );
    }

    console.log(
      `[getActivePartners] filtered to ${partners.length} partners for district "${orderDistrict}"`,
    );

    if (lat && lng) {
      const refLat = parseFloat(lat);
      const refLng = parseFloat(lng);

      const withDistance = partners.map((p) => {
        const [pLng, pLat] = p.location?.coordinates || [0, 0];
        const hasLocation = pLng !== 0 || pLat !== 0;
        const distance = hasLocation
          ? haversineDistance(refLat, refLng, pLat, pLng)
          : 9999;
        return {
          ...p.toObject(),
          distanceKm: parseFloat(distance.toFixed(1)),
          hasLocation,
          matchDistrict: orderDistrict || null,
        };
      });

      withDistance.sort((a, b) => a.distanceKm - b.distanceKm);
      return res.json(withDistance);
    }

    res.json(
      partners.map((p) => ({
        ...p.toObject(),
        distanceKm: null,
        hasLocation: !!(
          p.location?.coordinates[0] || p.location?.coordinates[1]
        ),
        matchDistrict: orderDistrict || null,
      })),
    );
  } catch (err) {
    console.error("getActivePartners:", err);
    res.status(500).json({ message: "Server error." });
  }
};

export const acceptPartner = async (req, res) => {
  try {
    const { adminReply } = req.body;
    const partner = await DeliveryPartner.findById(req.params.id).populate(
      "user",
      "name email",
    );
    if (!partner)
      return res.status(404).json({ message: "Partner not found." });
    partner.status = "accepted";
    partner.adminReply =
      adminReply || "Welcome to the FreshCart delivery team!";
    await partner.save();
    res.json(partner);
  } catch {
    res.status(500).json({ message: "Server error." });
  }
};

export const declinePartner = async (req, res) => {
  try {
    const { adminReply } = req.body;
    if (!adminReply?.trim())
      return res.status(400).json({ message: "Reply message required." });
    const partner = await DeliveryPartner.findById(req.params.id).populate(
      "user",
      "name email",
    );
    if (!partner)
      return res.status(404).json({ message: "Partner not found." });
    partner.status = "declined";
    partner.adminReply = adminReply.trim();
    await partner.save();
    res.json(partner);
  } catch {
    res.status(500).json({ message: "Server error." });
  }
};

export const assignPartnerToOrders = async (req, res) => {
  try {
    const { partnerId, orderIds } = req.body;
    if (!partnerId || !orderIds?.length) {
      return res
        .status(400)
        .json({ message: "partnerId and orderIds are required." });
    }

    const partner = await DeliveryPartner.findById(partnerId).populate(
      "user",
      "name email",
    );
    if (!partner || partner.status !== "accepted") {
      return res
        .status(404)
        .json({ message: "Active delivery partner not found." });
    }

    const results = await Promise.all(
      orderIds.map(async (orderId) => {
        const order = await Order.findById(orderId);
        if (!order || order.isDelivered || order.isCancelled) return null;
        order.deliveryPartner = partner._id;
        order.assignedAt = new Date();
        order.orderStatus = "Out for Delivery";
        await order.save();

        try {
          const populatedOrder = await Order.findById(orderId).populate(
            "user",
            "name email",
          );
          if (populatedOrder?.user?.email) {
            await sendOtpEmail({
              to: populatedOrder.user.email,
              name: populatedOrder.user.name,
              otp: null,
              order: populatedOrder,
              partnerName: partner.user?.name || "our delivery agent",
              isAssignedNotification: true,
            });
          }
        } catch (e) {
          console.error("❌ Assign notification email:", e.message);
        }

        return order._id;
      }),
    );

    const assigned = results.filter(Boolean);
    res.json({
      message: `${assigned.length} order(s) assigned to ${partner.user?.name}.`,
      assigned,
    });
  } catch (err) {
    console.error("assignPartnerToOrders:", err);
    res.status(500).json({ message: "Server error." });
  }
};

export const unassignPartnerFromOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found." });
    if (order.isDelivered)
      return res
        .status(400)
        .json({ message: "Cannot unassign a delivered order." });

    order.deliveryPartner = null;
    order.assignedAt = null;
    order.orderStatus = order.isPaid ? "Paid" : "Not Paid";
    order.deliveryOtp = null;
    order.deliveryOtpExpiresAt = null;
    await order.save();

    await order.populate("user", "name email");
    res.json(order);
  } catch (err) {
    console.error("unassignPartnerFromOrder:", err);
    res.status(500).json({ message: "Server error." });
  }
};

export const getPendingPartnerCount = async (req, res) => {
  try {
    const count = await DeliveryPartner.countDocuments({ status: "pending" });
    res.json({ count });
  } catch {
    res.status(500).json({ message: "Server error." });
  }
};
