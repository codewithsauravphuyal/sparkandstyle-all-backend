import express from 'express';
import { body } from 'express-validator';
import { Order, Cart, Product } from '../models';
import { authenticate, AuthRequest } from '../middleware/auth';
import { CustomError } from '../middleware/errorHandler';
import { validateRequest } from '../middleware/validate';
import { io } from '../server';

const router = express.Router();

// All order routes require authentication
router.use(authenticate);

// Get user's orders
router.get('/', async (req: AuthRequest, res: any, next: any) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const orders = await Order.find({ user: req.user._id })
      .populate('items.product', 'name images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Order.countDocuments({ user: req.user._id });

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

// Get order by ID
router.get('/:id', async (req: AuthRequest, res: any, next: any) => {
  try {
    const order = await Order.findOne({ 
      _id: req.params.id, 
      user: req.user._id 
    }).populate('items.product', 'name images');

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

// Create order from cart
router.post('/', [
  body('shippingAddress.street').trim().isLength({ min: 1 }).withMessage('Street address is required'),
  body('shippingAddress.city').trim().isLength({ min: 1 }).withMessage('City is required'),
  body('shippingAddress.state').trim().isLength({ min: 1 }).withMessage('State is required'),
  body('shippingAddress.postalCode').trim().isLength({ min: 1 }).withMessage('Postal code is required'),
  body('shippingAddress.country').trim().isLength({ min: 1 }).withMessage('Country is required'),
  body('paymentMethod').trim().isLength({ min: 1 }).withMessage('Payment method is required'),
  body('billingAddress').optional().isObject(),
  body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters')
], validateRequest, async (req: AuthRequest, res: any, next: any) => {
  try {
    const { shippingAddress, billingAddress, paymentMethod, notes } = req.body;

    // Get user's cart
    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    if (!cart || cart.items.length === 0) {
      throw new CustomError('Cart is empty', 400);
    }

    // Check inventory and prepare order items
    const orderItems: any[] = [];
    let subtotal = 0;

    for (const cartItem of cart.items) {
      const product = cartItem.product as any;
      
      if (!product || !product.isActive) {
        throw new CustomError(`Product ${product?.name || 'unknown'} is no longer available`, 400);
      }

      if (product.trackInventory && product.inventory < cartItem.quantity) {
        throw new CustomError(`Insufficient inventory for ${product.name}`, 400);
      }

      orderItems.push({
        product: product._id,
        name: product.name,
        sku: product.sku,
        price: product.price,
        quantity: cartItem.quantity,
        image: product.images[0] || ''
      });

      subtotal += product.price * cartItem.quantity;
    }

    // Calculate totals
    const shippingCost = 0; // You can implement shipping calculation logic here
    const tax = subtotal * 0.13; // 13% tax - adjust as needed
    const totalAmount = subtotal + shippingCost + tax;

    // Create order
    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      subtotal,
      shippingCost,
      tax,
      totalAmount,
      shippingAddress,
      billingAddress: billingAddress || shippingAddress,
      paymentMethod,
      notes
    });

    // Update product inventory
    for (const cartItem of cart.items) {
      const product = cartItem.product as any;
      if (product.trackInventory) {
        await Product.findByIdAndUpdate(product._id, {
          $inc: { inventory: -cartItem.quantity }
        });
      }
    }

    // Clear cart
    cart.items = [];
    await cart.save();

    // Notify admin about new order
    io.to('admin-room').emit('new-order', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      customerName: req.user.name,
      customerEmail: req.user.email
    });

    // Populate order details for response
    const populatedOrder = await Order.findById(order._id).populate('items.product', 'name images');

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: populatedOrder
    });
  } catch (error) {
    next(error);
  }
});

// Cancel order
const cancelOrderHandler = async (req: AuthRequest, res: any, next: any) => {
  try {
    const order = await Order.findOne({ 
      _id: req.params.id, 
      user: req.user._id 
    });

    if (!order) {
      throw new CustomError('Order not found', 404);
    }

    if (order.status !== 'pending') {
      throw new CustomError('Order cannot be cancelled at this stage', 400);
    }

    // Update order status
    order.status = 'cancelled';
    await order.save();

    // Restore inventory
    for (const orderItem of order.items) {
      await Product.findByIdAndUpdate(orderItem.product, {
        $inc: { inventory: orderItem.quantity }
      });
    }

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

router.put('/:id/cancel', cancelOrderHandler);
router.post('/:id/cancel', cancelOrderHandler);

export default router;
