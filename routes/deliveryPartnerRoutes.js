import express from "express";
import multer from "multer";
import path from "path";
import { protect, admin } from "../middleware/authMiddleware.js";
import {
  registerDeliveryPartner,
  getMyPartnerProfile,
  getMyAssignedOrders,
  updateLocation,
  generateDeliveryOtp,
  verifyDeliveryOtp,
  getAllPartners,
  getActivePartners,
  acceptPartner,
  declinePartner,
  assignPartnerToOrders,
  unassignPartnerFromOrder,
  getPendingPartnerCount,
} from "../controllers/deliveryPartnerController.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    /jpeg|jpg|png|webp/.test(path.extname(file.originalname).toLowerCase())
      ? cb(null, true)
      : cb(new Error("Images only"));
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.get("/mine", protect, getMyPartnerProfile);
router.get("/my-orders", protect, getMyAssignedOrders);
router.post("/", protect, upload.array("images", 5), registerDeliveryPartner);
router.put("/location", protect, updateLocation);
router.post("/orders/:orderId/generate-otp", protect, generateDeliveryOtp);
router.post("/orders/:orderId/verify-otp", protect, verifyDeliveryOtp);
router.get("/admin/all", protect, admin, getAllPartners);
router.get("/admin/active", protect, admin, getActivePartners);
router.get("/admin/pending-count", protect, admin, getPendingPartnerCount);
router.put("/admin/orders/assign", protect, admin, assignPartnerToOrders);
router.put(
  "/admin/orders/:orderId/unassign",
  protect,
  admin,
  unassignPartnerFromOrder,
);
router.put("/admin/:id/accept", protect, admin, acceptPartner);
router.put("/admin/:id/decline", protect, admin, declinePartner);

export default router;
