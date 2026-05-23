import express from "express";
import {
  getOffers,
  addOffer,
  updateOffer,
  deleteOffer,
} from "../controllers/offerController.js";
import { protect, admin } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

router.get("/", getOffers);
router.post("/", protect, admin, upload.single("image"), addOffer);
router.put("/:id", protect, admin, upload.single("image"), updateOffer);
router.delete("/:id", protect, admin, deleteOffer);

export default router;
