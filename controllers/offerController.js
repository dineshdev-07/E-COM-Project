import Offer from "../models/Offer.js";

export const getOffers = async (req, res) => {
  try {
    const offers = await Offer.find().sort({ createdAt: -1 });
    res.json(offers);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch offers" });
  }
};

export const addOffer = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Image required" });
    }

    const offer = await Offer.create({
      image: req.file.path,
      link: req.body.link || "",
    });

    res.status(201).json(offer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to add offer" });
  }
};

export const updateOffer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ message: "Offer not found" });

    if (req.body.link !== undefined) {
      offer.link = req.body.link;
    }

    if (req.file) {
      offer.image = req.file.path;
    }

    await offer.save();
    res.json(offer);
  } catch (err) {
    res.status(500).json({ message: "Update failed" });
  }
};

export const deleteOffer = async (req, res) => {
  try {
    await Offer.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Delete failed" });
  }
};
