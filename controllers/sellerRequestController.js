import SellerRequest from "../models/sellerRequestModel.js";
import cloudinary from "../utils/cloudinary.js";

export const createSellerRequest = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Message is required." });
    }

    const existing = await SellerRequest.findOne({
      user: req.user._id,
      status: { $in: ["pending", "accepted", "chatting"] },
    });

    if (existing) {
      return res.status(400).json({
        message:
          "You already have an active request. Please wait for a response.",
      });
    }

    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: "seller_requests",
        });
        imageUrls.push(result.secure_url);
      }
    }

    const request = await SellerRequest.create({
      user: req.user._id,
      message: message.trim(),
      images: imageUrls,
      status: "pending",
    });

    await request.populate("user", "name email");
    res.status(201).json(request);
  } catch (err) {
    console.error("createSellerRequest error:", err);
    res.status(500).json({ message: "Server error. Please try again." });
  }
};

export const getMySellerRequest = async (req, res) => {
  try {
    const request = await SellerRequest.findOne({ user: req.user._id })
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    if (!request) {
      return res.status(404).json({ message: "No request found." });
    }

    res.json(request);
  } catch (err) {
    console.error("getMySellerRequest error:", err);
    res.status(500).json({ message: "Server error." });
  }
};

export const getAllSellerRequests = async (req, res) => {
  try {
    const requests = await SellerRequest.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (err) {
    console.error("getAllSellerRequests error:", err);
    res.status(500).json({ message: "Server error." });
  }
};

export const acceptSellerRequest = async (req, res) => {
  try {
    const { adminReply } = req.body;

    const request = await SellerRequest.findById(req.params.id).populate(
      "user",
      "name email",
    );
    if (!request)
      return res.status(404).json({ message: "Request not found." });

    request.status = "accepted";
    request.adminReply =
      adminReply || "Your request has been accepted! Let's chat.";

    await request.save();
    res.json(request);
  } catch (err) {
    console.error("acceptSellerRequest error:", err);
    res.status(500).json({ message: "Server error." });
  }
};

export const declineSellerRequest = async (req, res) => {
  try {
    const { adminReply } = req.body;

    if (!adminReply || !adminReply.trim()) {
      return res
        .status(400)
        .json({ message: "A reply message is required when declining." });
    }

    const request = await SellerRequest.findById(req.params.id).populate(
      "user",
      "name email",
    );
    if (!request)
      return res.status(404).json({ message: "Request not found." });

    request.status = "declined";
    request.adminReply = adminReply.trim();

    await request.save();
    res.json(request);
  } catch (err) {
    console.error("declineSellerRequest error:", err);
    res.status(500).json({ message: "Server error." });
  }
};

export const sendChatMessage = async (req, res) => {
  try {
    const { message, sender } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Message cannot be empty." });
    }

    const validSender = sender === "admin" ? "admin" : "user";

    const request = await SellerRequest.findById(req.params.id).populate(
      "user",
      "name email",
    );
    if (!request)
      return res.status(404).json({ message: "Request not found." });

    if (request.status !== "accepted" && request.status !== "chatting") {
      return res
        .status(400)
        .json({ message: "Chat is not available for this request." });
    }

    if (request.status === "accepted") {
      request.status = "chatting";
    }

    request.chat.push({
      sender: validSender,
      message: message.trim(),
    });

    await request.save();
    res.json(request);
  } catch (err) {
    console.error("sendChatMessage error:", err);
    res.status(500).json({ message: "Server error." });
  }
};
