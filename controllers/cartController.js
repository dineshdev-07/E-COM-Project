import Cart from "../models/cartModel.js";
import Product from "../models/Product.js";
import User from "../models/userModel.js";

const calculateOfferPrice = (user, product) => {
  let extraDiscount = 0;
  let offerType = null;
  const basePrice = product.discountedPrice || product.price;

  if (user) {
    if (user.firstOrderCompleted === false) {
      extraDiscount = 20;
      offerType = "NEW_USER";
    } else if (user.loyaltyPoints >= 50) {
      extraDiscount = 5;
      offerType = "LOYALTY";
    }
  }

  const finalPrice = Math.round(basePrice * (1 - extraDiscount / 100));
  return { finalPrice, offerType, extraDiscountApplied: extraDiscount };
};

export const addToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const product = await Product.findById(productId);
    const user = await User.findById(req.user._id);

    if (!product) return res.status(404).json({ message: "Product not found" });

    const { finalPrice, offerType, extraDiscountApplied } = calculateOfferPrice(
      user,
      product,
    );

    let cart = await Cart.findOne({ user: req.user._id });

    const productImage = product.images?.[0] || product.image || "";

    const itemData = {
      product: product._id,
      name: product.name,
      price: product.price,
      discountedPrice: product.discountedPrice,
      finalPrice,
      offerType,
      extraDiscountApplied,
      image: productImage,
      quantity: Number(quantity) || 1,
    };

    if (!cart) {
      cart = await Cart.create({ user: req.user._id, cartItems: [itemData] });
    } else {
      const existingItem = cart.cartItems.find(
        (item) => item.product.toString() === productId,
      );
      if (existingItem) {
        existingItem.quantity += Number(quantity);
        existingItem.finalPrice = finalPrice;
      } else {
        cart.cartItems.push(itemData);
      }
      await cart.save();
    }

    const populatedCart = await Cart.findById(cart._id).populate({
      path: "cartItems.product",
      select:
        "name price discountedPrice images views salesCount expiryDate quantity brand",
    });

    res.status(200).json(populatedCart);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id }).populate({
      path: "cartItems.product",
      select:
        "name price discountedPrice images views salesCount expiryDate quantity brand",
    });

    if (!cart) return res.json({ cartItems: [] });

    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: "Fetch error" });
  }
};

export const removeItemFromCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    cart.cartItems = cart.cartItems.filter(
      (x) => x.product.toString() !== req.params.id,
    );
    await cart.save();
    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: "Remove error" });
  }
};

export const clearCart = async (req, res) => {
  try {
    await Cart.findOneAndDelete({ user: req.user._id });
    res.json({ message: "Cart Cleared" });
  } catch (error) {
    res.status(500).json({ message: "Clear error" });
  }
};

export const updateCartItem = async (req, res) => {
  const { quantity } = req.body;
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const itemIndex = cart.cartItems.findIndex(
      (item) => item.product.toString() === req.params.id,
    );

    if (itemIndex === -1)
      return res.status(404).json({ message: "Item not found in cart" });

    cart.cartItems[itemIndex].quantity = Number(quantity);
    await cart.save();
    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: "Update error", error: error.message });
  }
};
