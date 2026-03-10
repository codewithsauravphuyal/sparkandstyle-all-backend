import express from 'express';
import { body } from 'express-validator';
import { User, Product, Order, Contact, Wishlist, Cart, BlogPost } from '../models';
import { Settings } from '../models/Settings';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { CustomError } from '../middleware/errorHandler';
import { validateRequest } from '../middleware/validate';
import { sendEmail, emailTemplates } from '../services/emailService';
 
import { generateToken } from '../utils/generateToken';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Admin login (public)
router.post('/login', [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').trim().notEmpty().withMessage('Password is required')
], validateRequest, async (req: any, res: any, next: any) => {
  try {
    const { username, password } = req.body;

    const admin = await User.findOne({
      role: 'admin',
      $or: [
        { email: username.toLowerCase() },
        { name: username }
      ]
    }).select('+password');

    if (!admin) {
      throw new CustomError('Invalid credentials', 401);
    }

    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      throw new CustomError('Invalid credentials', 401);
    }

    const token = generateToken(admin._id.toString());
    delete (admin as any).password;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: admin,
        token
      }
    });
  } catch (error) {
    next(error);
  }
});

// Create admin user
// Public ONLY when there are no admins yet; after that, requires admin authentication.
router.post('/create-admin', [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
], validateRequest, async (req: AuthRequest, res: any, next: any) => {
  try {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount > 0) {
      const token = (req.header('Authorization') || '').replace('Bearer ', '').trim();
      if (!token) {
        throw new CustomError('Access denied. No token provided.', 401);
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      const requester = await User.findById(decoded.id).select('-password');
      if (!requester) {
        throw new CustomError('Invalid token. User not found.', 401);
      }
      if (requester.role !== 'admin') {
        throw new CustomError('Access denied. Insufficient permissions.', 403);
      }
    }

    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new CustomError('User already exists with this email', 400);
    }

    // Create admin user
    const user = await User.create({
      name,
      email,
      password,
      role: 'admin'
    });

    // Remove password from response
    delete (user as any).password;

    res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      data: user
    });
  } catch (error) {
    next(error);
  }
});

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

// Get current admin (for admin UI)
router.get('/me', async (req: AuthRequest, res: any, next: any) => {
  try {
    res.json({
      success: true,
      data: req.user
    });
  } catch (error) {
    next(error);
  }
});

// Dashboard statistics
router.get('/dashboard', async (req: AuthRequest, res: any, next: any) => {
  try {
    // Basic counts
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalProducts = await Product.countDocuments({ isActive: true });
    const totalOrders = await Order.countDocuments();
    const totalContacts = await Contact.countDocuments();
    const totalWishlists = await Wishlist.countDocuments();
    const totalBlogPosts = await BlogPost.countDocuments({ status: 'published' });
    
    // Product stats
    const bestsellers = await Product.countDocuments({ isBestseller: true, isActive: true });
    const newArrivals = await Product.countDocuments({ isNewProduct: true, isActive: true });
    
    // Order stats
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    const confirmedOrders = await Order.countDocuments({ status: 'confirmed' });
    const shippedOrders = await Order.countDocuments({ status: 'shipped' });
    const deliveredOrders = await Order.countDocuments({ status: 'delivered' });
    
    // Revenue stats
    const totalRevenue = await Order.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    
    const monthlyRevenue = await Order.aggregate([
      { 
        $match: { 
          status: { $ne: 'cancelled' },
          createdAt: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 1)) }
        } 
      },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    
    // Contact stats
    const newContacts = await Contact.countDocuments({ status: 'new' });
    const unreadContacts = await Contact.countDocuments({ status: { $in: ['new', 'read'] } });
    
    // Recent activity
    const recentOrders = await Order.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);
    
    const recentContacts = await Contact.find()
      .sort({ createdAt: -1 })
      .limit(5);
    
    // Top products
    const topProducts = await Order.aggregate([
      { $unwind: '$items' },
      { $group: { _id: '$items.product', totalSold: { $sum: '$items.quantity' } } },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' }
    ]);

    res.json({
      success: true,
      data: {
        // Basic counts
        totalUsers,
        totalProducts,
        totalOrders,
        totalContacts,
        totalWishlists,
        totalBlogPosts,
        
        // Product stats
        bestsellers,
        newArrivals,
        
        // Order stats
        pendingOrders,
        confirmedOrders,
        shippedOrders,
        deliveredOrders,
        
        // Revenue
        totalRevenue: totalRevenue[0]?.total || 0,
        monthlyRevenue: monthlyRevenue[0]?.total || 0,
        
        // Contact stats
        newContacts,
        unreadContacts,
        
        // Recent activity
        recentOrders,
        recentContacts,
        
        // Top products
        topProducts
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get all users
router.get('/users', async (req: AuthRequest, res: any, next: any) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const users = await User.find({ role: 'user' })
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments({ role: 'user' });

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get all orders
router.get('/orders', async (req: AuthRequest, res: any, next: any) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status;

    const filter: any = {};
    if (status) {
      filter.status = status;
    }

    const orders = await Order.find(filter)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Order.countDocuments(filter);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

const updateOrderStatusValidation = [
  body('status').isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']).withMessage('Invalid order status'),
  body('shippingInfo.deliveryPartner').optional().trim().isLength({ min: 1 }).withMessage('Delivery partner is required when shipping'),
  body('shippingInfo.trackingNumber').optional().trim().isLength({ min: 1 }).withMessage('Tracking number is required'),
  body('shippingInfo.trackingLink').optional().trim().isLength({ min: 1 }).withMessage('Tracking link is required')
];

// Helper function to generate tracking URL from template
const generateTrackingUrl = (template: string | undefined, trackingNumber: string): string => {
  if (!template) return '';
  return template.replace('{trackingNumber}', trackingNumber);
};

const updateOrderStatusHandler = async (req: AuthRequest, res: any, next: any) => {
  try {
    const { status, shippingInfo } = req.body;
    const orderId = req.params.id;

    const order = await Order.findById(orderId).populate('user', 'name email');
    if (!order) {
      throw new CustomError('Order not found', 404);
    }

    const oldStatus = order.status;
    order.status = status;

    // Add shipping info if order is being shipped
    if (status === 'shipped' && shippingInfo) {
      // Get settings to find tracking URL template
      const settings = await Settings.findOne();
      const deliveryPartner = settings?.shipping?.deliveryPartners.find(
        (p: any) => p.name === shippingInfo.deliveryPartner && p.enabled
      );
      
      // Generate tracking URL if template exists
      let trackingLink = shippingInfo.trackingLink;
      if (!trackingLink && deliveryPartner?.trackingUrlTemplate && shippingInfo.trackingNumber) {
        trackingLink = generateTrackingUrl(deliveryPartner.trackingUrlTemplate, shippingInfo.trackingNumber);
      }

      order.shippingInfo = {
        ...order.shippingInfo,
        ...shippingInfo,
        trackingLink: trackingLink || shippingInfo.trackingLink,
        estimatedDelivery: shippingInfo.estimatedDelivery 
          ? new Date(shippingInfo.estimatedDelivery)
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Default 7 days from now
      };
    }

    await order.save();

    // Send email notification to customer when order is shipped
    if (status === 'shipped' && order.user && (order.user as any).email) {
      try {
        const orderData = {
          orderNumber: order.orderNumber,
          customerName: (order.user as any).name,
          shippingInfo: order.shippingInfo
        };

        await sendEmail({
          to: (order.user as any).email,
          subject: `Your Order Has Been Shipped - ${order.orderNumber}`,
          html: emailTemplates.orderShipped(orderData).html
        });
      } catch (emailError) {
        console.error('Failed to send shipping notification email:', emailError);
        // Don't fail the status update if email fails
      }
    }

    // Send email notification when order is delivered
    if (status === 'delivered' && order.user && (order.user as any).email) {
      try {
        const orderData = {
          orderNumber: order.orderNumber,
          customerName: (order.user as any).name
        };

        await sendEmail({
          to: (order.user as any).email,
          subject: `Your Order Has Been Delivered - ${order.orderNumber}`,
          html: emailTemplates.orderDelivered(orderData).html
        });
      } catch (emailError) {
        console.error('Failed to send delivery notification email:', emailError);
        // Don't fail the status update if email fails
      }
    }

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

router.put('/orders/:id/status', updateOrderStatusValidation, validateRequest, updateOrderStatusHandler);
router.patch('/orders/:id/status', updateOrderStatusValidation, validateRequest, updateOrderStatusHandler);

// Get order details
router.get('/orders/:id', async (req: AuthRequest, res: any, next: any) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email phone address')
      .populate('items.product', 'name sku images');

    if (!order) {
      throw new CustomError('Order not found', 404);
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
});

export default router;
