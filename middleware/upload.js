import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../utils/cloudinary.js";

const storageAds = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: "ads_offers",
    public_id: `ad-${Date.now()}`,
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  }),
});

const storageProduct = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: "products",
    public_id: `product-${Date.now()}`,
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  }),
});

export const upload = multer({ storage: storageAds }); // Use for ads/offers routes
export const uploadProduct = multer({ storage: storageProduct }); // Use for product routes
