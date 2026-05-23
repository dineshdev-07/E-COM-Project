import User from "../models/userModel.js";
import Product from "../models/Product.js";

export const getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate(
      "wishlist",
      "name price discountedPrice images brand quantity views salesCount expiryDate",
    );
    res.json(user.wishlist || []);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch wishlist" });
  }
};

export const toggleWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const productId = req.params.productId;

    const idx = user.wishlist.findIndex((id) => id.toString() === productId);
    if (idx === -1) {
      user.wishlist.push(productId);
    } else {
      user.wishlist.splice(idx, 1);
    }

    await user.save();
    res.json({ wishlist: user.wishlist });
  } catch (err) {
    res.status(500).json({ message: "Toggle failed" });
  }
};
