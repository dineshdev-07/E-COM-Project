import nodemailer from "nodemailer";

// Initialize Nodemailer Transporter with Gmail SMTP settings
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // true for port 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER, // Your existing Gmail address (e.g., example@gmail.com)
    pass: process.env.EMAIL_PASS, // Your generated 16-digit App Password
  },
});

// Basic check for Nodemailer configurations
const canSendEmail = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("⚠️ Nodemailer credentials (EMAIL_USER or EMAIL_PASS) are not set");
    return false;
  }
  return true;
};

const GREEN = "#6FAF8E";
const DARK = "#1A1A1A";
const BG = "#F4F7F6";
const BORDER = "#f0f0f0";

const itemRowsHTML = (orderItems = []) =>
  orderItems
    .map(
      (item) => `
    <tr>
      <td style="padding:10px 14px;border-bottom:1px solid ${BORDER};font-size:13px;color:#333;">
        ${item.name}
      </td>
      <td style="padding:10px 14px;border-bottom:1px solid ${BORDER};font-size:13px;color:#888;text-align:center;">
        ×${item.qty}
      </td>
      <td style="padding:10px 14px;border-bottom:1px solid ${BORDER};font-size:13px;font-weight:700;color:#333;text-align:right;">
        ₹${item.price * item.qty}
      </td>
    </tr>`,
    )
    .join("");

const emailShell = (bodyContent) => `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  </head>
  <body style="margin:0;padding:0;background:#F0FDF4;font-family:Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
      <tr>
        <td align="center">
          <table width="100%" cellpadding="0" cellspacing="0"
            style="max-width:560px;background:white;border-radius:28px;overflow:hidden;box-shadow:0 10px 35px rgba(0,0,0,0.08);">
            ${bodyContent}
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
`;

const orderMetaHTML = (order, extraRows = "") => {
  const orderId = String(order._id).slice(-8).toUpperCase();
  return `
  <table width="100%" cellpadding="0" cellspacing="0"
    style="background:${BG};border-radius:14px;padding:16px 20px;margin-bottom:24px;">
    <tr>
      <td colspan="2" style="font-size:11px;font-weight:800;text-transform:uppercase;color:#999;letter-spacing:1px;padding-bottom:12px;">Order Info</td>
    </tr>
    <tr>
      <td style="font-size:12px;color:#888;padding:4px 0;">Order ID</td>
      <td style="font-size:12px;font-weight:800;color:${DARK};text-align:right;font-family:monospace;">#${orderId}</td>
    </tr>
    <tr>
      <td style="font-size:12px;color:#888;padding:4px 0;">Payment</td>
      <td style="font-size:12px;font-weight:700;color:${GREEN};text-align:right;">
        ${order.paymentMethod || "Paid"} ✓
      </td>
    </tr>
    <tr>
      <td style="font-size:12px;color:#888;padding:4px 0;">Delivery To</td>
      <td style="font-size:12px;font-weight:600;color:#333;text-align:right;">
        ${order.shippingAddress?.address || ""}, ${order.shippingAddress?.city || ""}
      </td>
    </tr>
    ${extraRows}
  </table>`;
};

const itemsAndTotalHTML = (order) => `
  <p style="margin:0 0 10px;font-size:11px;font-weight:800;text-transform:uppercase;color:#999;letter-spacing:1px;">Items</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER};border-radius:12px;overflow:hidden;margin-bottom:20px;">
    <thead>
      <tr style="background:#f9f9f9;">
        <th style="padding:10px 14px;font-size:10px;font-weight:800;text-transform:uppercase;color:#999;text-align:left;">Item</th>
        <th style="padding:10px 14px;font-size:10px;font-weight:800;text-transform:uppercase;color:#999;text-align:center;">Qty</th>
        <th style="padding:10px 14px;font-size:10px;font-weight:800;text-transform:uppercase;color:#999;text-align:right;">Total</th>
      </tr>
    </thead>
    <tbody>${itemRowsHTML(order.orderItems)}</tbody>
  </table>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${DARK};border-radius:14px;padding:16px 20px;margin-bottom:28px;">
    <tr>
      <td style="font-size:13px;font-weight:700;color:${GREEN};text-transform:uppercase;letter-spacing:1px;">Amount</td>
      <td style="font-size:20px;font-weight:900;color:${GREEN};text-align:right;font-style:italic;">₹${order.totalPrice}</td>
    </tr>
  </table>`;

const ctaButton = (label, path) => `
  <div style="text-align:center;margin-bottom:24px;">
    <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}${path}"
      style="display:inline-block;background:${GREEN};color:#fff;text-decoration:none;font-weight:900;font-size:13px;padding:13px 32px;border-radius:50px;">
      ${label}
    </a>
  </div>`;

/* ==========================================================================
   EMAIL DISPATCH FUNCTIONS
   ========================================================================== */

export const sendOrderSuccessEmail = async ({ to, name, order }) => {
  if (!canSendEmail()) return;

  const orderId = String(order._id).slice(-8).toUpperCase();
  const placedAt = new Date(order.createdAt || Date.now()).toLocaleString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const isCOD = order.paymentMethod === "COD";

  const body = `
    <tr>
      <td style="background:${GREEN};border-radius:20px 20px 0 0;padding:32px 32px 24px;text-align:center;">
        <div style="font-size:36px;margin-bottom:12px;">🛒</div>
        <h1 style="margin:0;font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.5px;">Order Placed!</h1>
        <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.85);">We've received your order and it's being prepared</p>
      </td>
    </tr>
    <tr>
      <td style="background:#fff;border-radius:0 0 20px 20px;padding:28px 32px 32px;">
        <p style="margin:0 0 20px;font-size:15px;color:#333;">Hi <strong>${name || "there"}</strong>, 👋</p>
        <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.6;">
          ${
            isCOD
              ? "Your order has been placed successfully! Please keep <strong>₹" + order.totalPrice + "</strong> ready to pay the delivery partner at the door."
              : "Your payment was confirmed and your order is now being processed."
          }
        </p>

        ${orderMetaHTML(order, `<tr><td style="font-size:12px;color:#888;padding:4px 0;">Placed On</td><td style="font-size:12px;font-weight:700;color:${DARK};text-align:right;">${placedAt}</td></tr>`)}
        ${itemsAndTotalHTML(order)}

        ${
          isCOD
            ? `<div style="background:#FFF8E7;border:1px solid #FFE082;border-radius:14px;padding:14px 18px;margin-bottom:24px;">
                 <p style="margin:0;font-size:13px;color:#856404;font-weight:700;">💵 Cash on Delivery — pay <strong>₹${order.totalPrice}</strong> when your order arrives.</p>
               </div>`
            : ""
        }

        <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F7F6;border-radius:14px;padding:16px 20px;margin-bottom:24px;">
          <tr>
            <td colspan="5" style="font-size:11px;font-weight:800;text-transform:uppercase;color:#999;letter-spacing:1px;padding-bottom:16px;">Your Delivery Journey</td>
          </tr>
          <tr>
            ${[
              { icon: "🛒", label: "Order<br/>Placed", done: true },
              { icon: "📦", label: "In<br/>Transit", done: false },
              { icon: "🛵", label: "Out for<br/>Delivery", done: false },
              { icon: "✅", label: "Delivered", done: false },
            ]
              .map(
                (s, i, arr) => `
              <td align="center" style="padding:0;width:${100 / arr.length}%;vertical-align:top;">
                <div style="width:28px;height:28px;border-radius:50%;margin:0 auto 6px;background:${s.done ? "#6FAF8E" : "#e5e7eb"};display:flex;align-items:center;justify-content:center;font-size:13px;line-height:28px;text-align:center;">${s.icon}</div>
                <p style="margin:0;font-size:9px;font-weight:800;color:${s.done ? "#374151" : "#d1d5db"};text-align:center;text-transform:uppercase;letter-spacing:0.3px;line-height:1.3;">${s.label}</p>
              </td>`,
              )
              .join("")}
          </tr>
        </table>

        ${ctaButton("Track My Order →", "/myorders")}
        <p style="margin:0;font-size:12px;color:#aaa;text-align:center;line-height:1.6;">Thank you for shopping with NeoMart 💚<br/>Questions? Just reply to this email.</p>
      </td>
    </tr>`;

  try {
    await transporter.sendMail({
      from: `"NeoMart 🛒" <${process.env.EMAIL_USER}>`,
      to,
      subject: `🛒 Order Confirmed! #${orderId} — NeoMart`,
      html: emailShell(body),
    });
    console.log(`📧 Order success email → ${to} [#${orderId}]`);
  } catch (error) {
    console.error(`❌ Failed to send Order Success Email to ${to}:`, error);
  }
};

export const sendOutForDeliveryEmail = async ({ to, name, order, partnerName }) => {
  if (!canSendEmail()) return;

  const orderId = String(order._id).slice(-8).toUpperCase();

  const body = `
    <tr>
      <td style="background:${GREEN};border-radius:20px 20px 0 0;padding:32px;text-align:center;">
        <div style="font-size:36px;">🛵</div>
        <h1 style="margin:10px 0 0;color:#fff;">Out For Delivery!</h1>
      </td>
    </tr>
    <tr>
      <td style="background:#fff;padding:28px;">
        <p>Hi <strong>${name}</strong>,<br/><br/>Your delivery partner <strong>${partnerName}</strong> is bringing your order.</p>
        ${orderMetaHTML(order)}
        ${itemsAndTotalHTML(order)}
        ${ctaButton("Track My Order →", "/myorders")}
      </td>
    </tr>`;

  try {
    await transporter.sendMail({
      from: `"NeoMart 🛒" <${process.env.EMAIL_USER}>`,
      to,
      subject: `🛵 Out for Delivery — Order #${orderId}`,
      html: emailShell(body),
    });
    console.log(`📧 Out for Delivery email → ${to} [#${orderId}]`);
  } catch (error) {
    console.error(`❌ Failed to send Out for Delivery Email to ${to}:`, error);
  }
};

export const sendDeliveryEmail = async ({ to, name, order }) => {
  if (!canSendEmail()) return;

  const orderId = String(order._id).slice(-8).toUpperCase();
  const deliveredAt = new Date(order.deliveredAt || Date.now()).toLocaleString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const body = `
    <tr>
      <td style="background:linear-gradient(135deg,#22C55E,#16A34A);border-radius:28px 28px 0 0;padding:42px 34px 30px;text-align:center;">
        <div style="font-size:48px;margin-bottom:14px;">🥬</div>
        <h1 style="margin:0;font-size:34px;font-weight:900;color:white;letter-spacing:-1px;">Fresh<span style="color:#DCFCE7;">Cart</span></h1>
        <p style="margin:14px 0 0;font-size:14px;color:rgba(255,255,255,0.92);line-height:1.6;">Your groceries have been delivered successfully 🎉</p>
      </td>
    </tr>
    <tr>
      <td style="background:white;border-radius:0 0 28px 28px;padding:36px 34px;">
        <p style="margin:0 0 18px;font-size:16px;color:#222;">Hi <strong>${name || "there"}</strong>, 👋</p>
        <p style="margin:0 0 28px;font-size:14px;line-height:1.8;color:#666;">Your FreshCart order has arrived safely at your doorstep. We hope you enjoy your fresh groceries and essentials 💚</p>
        
        <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:18px;padding:22px;margin-bottom:28px;text-align:center;">
          <div style="font-size:42px;margin-bottom:10px;">✅</div>
          <p style="margin:0;font-size:20px;font-weight:800;color:#166534;">Order Delivered</p>
          <p style="margin:10px 0 0;font-size:13px;color:#4B5563;">Delivered on ${deliveredAt}</p>
        </div>

        <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;border-radius:18px;padding:18px 22px;margin-bottom:28px;">
          <tr>
            <td colspan="2" style="font-size:11px;font-weight:800;text-transform:uppercase;color:#999;letter-spacing:1px;padding-bottom:14px;">Order Summary</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#888;padding:6px 0;">Order ID</td>
            <td style="font-size:13px;font-weight:800;color:#111;text-align:right;font-family:monospace;">#${orderId}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#888;padding:6px 0;">Payment</td>
            <td style="font-size:13px;font-weight:700;color:#16A34A;text-align:right;">${order.paymentMethod || "Paid"} ✓</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#888;padding:6px 0;">Total Amount</td>
            <td style="font-size:18px;font-weight:900;color:#16A34A;text-align:right;">₹${order.totalPrice}</td>
          </tr>
        </table>

        ${itemsAndTotalHTML(order)}

        <div style="background:#111827;border-radius:20px;padding:28px;text-align:center;margin-bottom:28px;">
          <div style="font-size:34px;margin-bottom:12px;">💚</div>
          <h2 style="margin:0;font-size:22px;color:white;font-weight:800;">Thank You for Shopping!</h2>
          <p style="margin:14px 0 0;font-size:13px;line-height:1.7;color:#D1D5DB;">FreshCart delivers fresh groceries, daily essentials, and happiness directly to your home.</p>
        </div>

        <div style="text-align:center;margin-bottom:24px;">
          <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/myorders"
            style="display:inline-block;background:linear-gradient(135deg,#22C55E,#16A34A);color:white;text-decoration:none;font-weight:800;font-size:14px;padding:15px 34px;border-radius:50px;box-shadow:0 6px 18px rgba(34,197,94,0.35);">
            View My Orders →
          </a>
        </div>
        <p style="margin:0;font-size:12px;color:#9CA3AF;text-align:center;line-height:1.7;">FreshCart 💚 <br/>Fresh groceries delivered faster.</p>
      </td>
    </tr>`;

  try {
    await transporter.sendMail({
      from: `"FreshCart 🥬" <${process.env.EMAIL_USER}>`,
      to,
      subject: `✅ FreshCart Order Delivered — #${orderId}`,
      html: emailShell(body),
    });
    console.log(`📧 Delivery email → ${to} [#${orderId}]`);
  } catch (error) {
    console.error(`❌ Failed to send Delivery Email to ${to}:`, error);
  }
};

export const sendOtpEmail = async ({ to, name, otp, order, partnerName }) => {
  if (!canSendEmail()) return;

  const orderId = String(order._id).slice(-8).toUpperCase();
  const itemCount = order.orderItems?.length || 0;

  const body = `
    <tr>
      <td style="background:${DARK};border-radius:20px 20px 0 0;padding:32px 32px 28px;text-align:center;">
        <div style="font-size:34px;margin-bottom:10px;">🛵</div>
        <h1 style="margin:0;font-size:21px;font-weight:900;color:#fff;letter-spacing:-0.5px;">Your Delivery is On the Way!</h1>
        <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.6);">NeoMart Order #${orderId}</p>
      </td>
    </tr>
    <tr>
      <td style="background:#fff;border-radius:0 0 20px 20px;padding:28px 32px 32px;">
        <p style="margin:0 0 6px;font-size:15px;color:#333;">Hi <strong>${name || "there"}</strong>, 👋</p>
        <p style="margin:0 0 28px;font-size:14px;color:#666;line-height:1.6;">
          Your delivery partner <strong>${partnerName || "our agent"}</strong> is heading to your location right now with your ${itemCount} item${itemCount !== 1 ? "s" : ""}.
        </p>

        <div style="background:#F4F7F6;border:2px dashed ${GREEN};border-radius:20px;padding:28px 24px;text-align:center;margin-bottom:28px;">
          <p style="margin:0 0 6px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:#888;">Your Delivery OTP</p>
          <p style="margin:0;font-size:52px;font-weight:900;letter-spacing:14px;color:${DARK};font-family:monospace;">${otp}</p>
          <p style="margin:10px 0 0;font-size:11px;color:#aaa;">⏱ Valid for <strong>15 minutes</strong></p>
        </div>

        <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F7F6;border-radius:14px;padding:18px 20px;margin-bottom:24px;">
          <tr>
            <td colspan="2" style="font-size:11px;font-weight:800;text-transform:uppercase;color:#999;letter-spacing:1px;padding-bottom:14px;">How it works</td>
          </tr>
          ${[
            ["🛒", "Order placed & confirmed"],
            ["📦", "In transit — your order is being prepared"],
            ["🛵", "Out for delivery — partner is at your door"],
            ["🔐", "Share your OTP → collect package ✅"],
          ]
            .map(
              ([num, text]) => `
          <tr>
            <td style="font-size:16px;padding:5px 10px 5px 0;vertical-align:top;">${num}</td>
            <td style="font-size:13px;color:#555;padding:6px 0;vertical-align:top;">${text}</td>
          </tr>`,
            )
            .join("")}
        </table>

        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0f0f0;border-radius:12px;padding:12px 16px;margin-bottom:24px;">
          <tr>
            <td style="font-size:12px;color:#888;padding:3px 0;">Order</td>
            <td style="font-size:12px;font-weight:800;color:${DARK};text-align:right;font-family:monospace;">#${orderId}</td>
          </tr>
          <tr>
            <td style="font-size:12px;color:#888;padding:3px 0;">Amount</td>
            <td style="font-size:12px;font-weight:800;color:${GREEN};text-align:right;">
              ₹${order.totalPrice}
              ${order.paymentMethod === "COD" ? " <span style='color:#888;font-weight:600;'>(Pay on delivery)</span>" : " ✓ Paid"}
            </td>
          </tr>
          <tr>
            <td style="font-size:12px;color:#888;padding:3px 0;">Address</td>
            <td style="font-size:12px;font-weight:600;color:#333;text-align:right;">
              ${order.shippingAddress?.address || ""}, ${order.shippingAddress?.city || ""}
            </td>
          </tr>
        </table>

        <div style="background:#FFF8E7;border:1px solid #FFE082;border-radius:12px;padding:12px 16px;margin-bottom:24px;">
          <p style="margin:0;font-size:12px;color:#856404;line-height:1.5;">
            🔒 <strong>Keep this OTP private.</strong> Share it only with the NeoMart delivery partner at your door. Never share it over the phone or with anyone else.
          </p>
        </div>

        <p style="margin:0;font-size:12px;color:#aaa;text-align:center;line-height:1.6;">Thank you for shopping with NeoMart 💚<br/>If you didn't place this order, reply to this email.</p>
      </td>
    </tr>`;

  try {
    await transporter.sendMail({
      from: `"NeoMart 🛒" <${process.env.EMAIL_USER}>`,
      to,
      subject: `🔐 Your NeoMart delivery OTP: ${otp} (Order #${orderId})`,
      html: emailShell(body),
    });
    console.log(`📧 OTP email → ${to} [#${orderId}] OTP: ${otp}`);
  } catch (error) {
    console.error(`❌ Failed to send OTP Email to ${to}:`, error);
  }
};