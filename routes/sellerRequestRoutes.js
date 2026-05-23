import express from "express";
import multer from "multer";
import path from "path";
import { protect, admin } from "../middleware/authMiddleware.js";

import {
  createSellerRequest,
  getMySellerRequest,
  getAllSellerRequests,
  acceptSellerRequest,
  declineSellerRequest,
  sendChatMessage,
} from "../controllers/sellerRequestController.js";

const router = express.Router();
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext && mime) cb(null, true);
  else cb(new Error("Only images are allowed (jpeg, jpg, png, webp)"));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.get("/mine", protect, getMySellerRequest);
router.post("/", protect, upload.array("images", 5), createSellerRequest);
router.post("/:id/chat", protect, sendChatMessage);

router.get("/admin/all", protect, admin, getAllSellerRequests);

router.put("/admin/:id/accept", protect, admin, acceptSellerRequest);

router.put("/admin/:id/decline", protect, admin, declineSellerRequest);

export default router;
