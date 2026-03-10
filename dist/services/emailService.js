"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailTemplates = exports.sendEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const createTransporter = () => {
    return nodemailer_1.default.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
};
const sendEmail = async (options) => {
    try {
        const transporter = createTransporter();
        const mailOptions = {
            from: `"Sparkle and Style" <${process.env.EMAIL_USER}>`,
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text
        };
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ' + info.messageId);
        return info;
    }
    catch (error) {
        console.error('Email sending error:', error);
        throw error;
    }
};
exports.sendEmail = sendEmail;
exports.emailTemplates = {
    orderConfirmation: (orderData) => ({
        subject: 'Your Order Has Been Confirmed - Sparkle and Style',
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Order Confirmation</h2>
        <p>Dear ${orderData.customerName},</p>
        <p>Thank you for your order! We're pleased to confirm that your order has been received and is being processed.</p>
        
        <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 5px;">
          <h3 style="margin-top: 0;">Order Details</h3>
          <p><strong>Order Number:</strong> ${orderData.orderNumber}</p>
          <p><strong>Order Date:</strong> ${new Date(orderData.createdAt).toLocaleDateString()}</p>
          <p><strong>Total Amount:</strong> $${orderData.totalAmount.toFixed(2)}</p>
        </div>

        <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 5px;">
          <h3 style="margin-top: 0;">Shipping Address</h3>
          <p>${orderData.shippingAddress.street}</p>
          <p>${orderData.shippingAddress.city}, ${orderData.shippingAddress.state} ${orderData.shippingAddress.postalCode}</p>
          <p>${orderData.shippingAddress.country}</p>
        </div>

        <h3>Order Items</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f5f5f5;">
              <th style="padding: 10px; text-align: left;">Product</th>
              <th style="padding: 10px; text-align: left;">Quantity</th>
              <th style="padding: 10px; text-align: left;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${orderData.items.map((item) => `
              <tr>
                <td style="padding: 10px;">${item.name}</td>
                <td style="padding: 10px;">${item.quantity}</td>
                <td style="padding: 10px;">$${item.price.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <p style="margin-top: 30px;">We'll send you another email when your order ships.</p>
        <p>Thank you for shopping with Sparkle and Style!</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>© 2024 Sparkle and Style. All rights reserved.</p>
        </div>
      </div>
    `
    }),
    orderShipped: (orderData) => ({
        subject: 'Your Order Has Been Shipped - Sparkle and Style',
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Your Order Has Been Shipped!</h2>
        <p>Dear ${orderData.customerName},</p>
        <p>Great news! Your order has been shipped and is on its way to you.</p>
        
        <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 5px;">
          <h3 style="margin-top: 0;">Shipping Information</h3>
          <p><strong>Order Number:</strong> ${orderData.orderNumber}</p>
          <p><strong>Delivery Partner:</strong> ${orderData.shippingInfo.deliveryPartner}</p>
          ${orderData.shippingInfo.trackingNumber ? `
            <p><strong>Tracking Number:</strong> ${orderData.shippingInfo.trackingNumber}</p>
          ` : ''}
          ${orderData.shippingInfo.trackingLink ? `
            <p><strong>Track Your Order:</strong> <a href="${orderData.shippingInfo.trackingLink}" style="color: #007bff;">Click here to track</a></p>
          ` : ''}
          ${orderData.shippingInfo.estimatedDelivery ? `
            <p><strong>Estimated Delivery:</strong> ${new Date(orderData.shippingInfo.estimatedDelivery).toLocaleDateString()}</p>
          ` : ''}
        </div>

        <p>You can track your order using the delivery partner's website with the tracking number provided.</p>
        <p>If you have any questions about your order, please don't hesitate to contact us.</p>
        
        <p>Thank you for shopping with Sparkle and Style!</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>© 2024 Sparkle and Style. All rights reserved.</p>
        </div>
      </div>
    `
    }),
    orderDelivered: (orderData) => ({
        subject: 'Your Order Has Been Delivered - Sparkle and Style',
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Your Order Has Been Delivered!</h2>
        <p>Dear ${orderData.customerName},</p>
        <p>Your order has been successfully delivered. We hope you love your new jewelry!</p>
        
        <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 5px;">
          <h3 style="margin-top: 0;">Order Details</h3>
          <p><strong>Order Number:</strong> ${orderData.orderNumber}</p>
          <p><strong>Delivery Date:</strong> ${new Date().toLocaleDateString()}</p>
        </div>

        <p>Please take a moment to review your purchase and share your experience with others.</p>
        <p>If you have any questions or concerns about your order, please contact our customer service.</p>
        
        <p>Thank you for choosing Sparkle and Style!</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>© 2024 Sparkle and Style. All rights reserved.</p>
        </div>
      </div>
    `
    }),
    newOrderAdmin: (orderData) => ({
        subject: 'New Order Received - Sparkle and Style',
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">New Order Received</h2>
        <p>You have received a new order from a customer.</p>
        
        <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 5px;">
          <h3 style="margin-top: 0;">Order Information</h3>
          <p><strong>Order Number:</strong> ${orderData.orderNumber}</p>
          <p><strong>Customer Name:</strong> ${orderData.customerName}</p>
          <p><strong>Customer Email:</strong> ${orderData.customerEmail}</p>
          <p><strong>Total Amount:</strong> $${orderData.totalAmount.toFixed(2)}</p>
          <p><strong>Order Date:</strong> ${new Date(orderData.createdAt).toLocaleDateString()}</p>
        </div>

        <p>Please log in to the admin panel to process this order.</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
          <p>This is an automated message from the Sparkle and Style system.</p>
        </div>
      </div>
    `
    }),
    passwordReset: (resetData) => ({
        subject: 'Password Reset Request - Sparkle and Style',
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hi ${resetData.name},</p>
        <p>We received a request to reset your password for your Sparkle and Style account.</p>
        
        <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 5px; text-align: center;">
          <p>Click the button below to reset your password:</p>
          <a href="${resetData.resetLink}" style="display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0;">
            Reset Password
          </a>
        </div>

        <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
        <p>This link will expire in 1 hour for security reasons.</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>© 2024 Sparkle and Style. All rights reserved.</p>
        </div>
      </div>
    `
    })
};
//# sourceMappingURL=emailService.js.map