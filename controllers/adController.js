import Ad from "../models/Ad.js";
import cloudinary from "../config/cloudinary.js";

export const getAds = async (req, res) => {
  try {
    const ads = await Ad.find({})
      .select("index image updatedAt")
      .sort({ index: 1 });

    res.json(ads);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch ads" });
  }
};

export const updateAd = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image uploaded" });
    }

    const index = Number(req.params.index);

    const existingAd = await Ad.findOne({ index });

    if (existingAd?.public_id) {
      await cloudinary.uploader.destroy(existingAd.public_id);
    }

    const ad = await Ad.findOneAndUpdate(
      { index },
      {
        image: req.file.path,
        public_id: req.file.filename,
      },
      { new: true, upsert: true },
    );

    res.json({ message: "Ad updated successfully", ad });
  } catch (err) {
    console.error("UPDATE ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};
