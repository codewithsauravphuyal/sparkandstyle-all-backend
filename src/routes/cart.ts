import express from 'express';
import { body } from 'express-validator';
import { Cart, Product } from '../models';
import { authenticate, AuthRequest } from '../middleware/auth';
import { CustomError } from '../middleware/errorHandler';
import { validateRequest } from '../middleware/validate';

const router = express.Router();

// All cart routes require authentication
router.use(authenticate);

// Get user's cart
router.get('/', async (req: AuthRequest, res: any, next: any) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id }).populate({
      path: 'items.product',
      select: 'name slug price images isActive inventory trackInventory'
    });

    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    }

    // Filter out inactive products and check inventory
    cart.items = cart.items.filter(item => {
      const product = item.product as any;
      return product && product.isActive && 
             (!product.trackInventory || product.inventory >= item.quantity);
    });

    // Save filtered cart
    await cart.save();

    res.json({
      success: true,
      data: cart
    });
  } catch (error) {
    next(error);
  }
});

// Add item to cart
router.post('/add', [
  body('productId').isMongoId().withMessage('Valid product ID is required'),
  body('quantity').isInt({ min: 1, max: 10 }).withMessage('Quantity must be between 1 and 10')
], validateRequest, async (req: AuthRequest, res: any, next: any) => {
  try {
    const { productId, quantity } = req.body;

    // Check if product exists and is active
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      throw new CustomError('Product not found or unavailable', 400);
    }

    // Check inventory
    if (product.trackInventory && product.inventory < quantity) {
      throw new CustomError('Insufficient inventory', 400);
    }

    // Get or create cart
    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    }

    // Check if product already in cart
    const existingItemIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );

    if (existingItemIndex > -1) {
      // Update quantity
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;
      
      // Check inventory again
      if (product.trackInventory && product.inventory < newQuantity) {
        throw new CustomError('Insufficient inventory', 400);
      }
      
      cart.items[existingItemIndex].quantity = newQuantity;
    } else {
      // Add new item
      cart.items.push({
        product: productId,
        quantity,
        addedAt: new Date()
      });
    }

    await cart.save();

    // Populate product details for response
    await cart.populate({
      path: 'items.product',
      select: 'name slug price images isActive inventory trackInventory'
    });

    res.json({
      success: true,
      message: 'Item added to cart successfully',
      data: cart
    });
  } catch (error) {
    next(error);
  }
});

// Update cart item quantity
router.put('/update', [
  body('productId').isMongoId().withMessage('Valid product ID is required'),
  body('quantity').isInt({ min: 1, max: 10 }).withMessage('Quantity must be between 1 and 10')
], validateRequest, async (req: AuthRequest, res: any, next: any) => {
  try {
    const { productId, quantity } = req.body;

    // Check if product exists and is active
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      throw new CustomError('Product not found or unavailable', 400);
    }

    // Check inventory
    if (product.trackInventory && product.inventory < quantity) {
      throw new CustomError('Insufficient inventory', 400);
    }

    // Get cart
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      throw new CustomError('Cart not found', 404);
    }

    // Find item in cart
    const itemIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );

    if (itemIndex === -1) {
      throw new CustomError('Item not found in cart', 404);
    }

    // Update quantity
    cart.items[itemIndex].quantity = quantity;
    await cart.save();

    // Populate product details for response
    await cart.populate({
      path: 'items.product',
      select: 'name slug price images isActive inventory trackInventory'
    });

    res.json({
      success: true,
      message: 'Cart item updated successfully',
      data: cart
    });
  } catch (error) {
    next(error);
  }
});

// Remove item from cart
router.delete('/remove/:productId', async (req: AuthRequest, res: any, next: any) => {
  try {
    const productId = req.params.productId;

    // Get cart
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      throw new CustomError('Cart not found', 404);
    }

    // Remove item from cart
    cart.items = cart.items.filter(
      item => item.product.toString() !== productId
    );

    await cart.save();

    // Populate product details for response
    await cart.populate({
      path: 'items.product',
      select: 'name slug price images isActive inventory trackInventory'
    });

    res.json({
      success: true,
      message: 'Item removed from cart successfully',
      data: cart
    });
  } catch (error) {
    next(error);
  }
});

// Clear cart
const clearCartHandler = async (req: AuthRequest, res: any, next: any) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      throw new CustomError('Cart not found', 404);
    }

    cart.items = [];
    await cart.save();

    res.json({
      success: true,
      message: 'Cart cleared successfully',
      data: cart
    });
  } catch (error) {
    next(error);
  }
};

router.delete('/clear', clearCartHandler);
router.post('/clear', clearCartHandler);

export default router;
