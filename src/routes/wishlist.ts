import express from 'express';
import { body } from 'express-validator';
import { Wishlist, Product } from '../models';
import { authenticate, AuthRequest } from '../middleware/auth';
import { CustomError } from '../middleware/errorHandler';
import { validateRequest } from '../middleware/validate';

const router = express.Router();

// All wishlist routes require authentication
router.use(authenticate);

// Get user's wishlist
router.get('/', async (req: AuthRequest, res: any, next: any) => {
  try {
    let wishlist = await Wishlist.findOne({ user: req.user._id }).populate({
      path: 'items.product',
      select: 'name slug price images isActive inventory trackInventory shortDescription longDescription material occasion sizes inStock stockCount rating reviewCount isBestseller isNew tags'
    });

    if (!wishlist) {
      wishlist = await Wishlist.create({ user: req.user._id, items: [] });
    }

    // Filter out inactive products
    wishlist.items = wishlist.items.filter(item => {
      const product = item.product as any;
      return product && product.isActive;
    });

    // Save filtered wishlist
    await wishlist.save();

    res.json({
      success: true,
      data: wishlist
    });
  } catch (error) {
    next(error);
  }
});

// Add item to wishlist
router.post('/add', [
  body('productId').isMongoId().withMessage('Valid product ID is required')
], validateRequest, async (req: AuthRequest, res: any, next: any) => {
  try {
    const { productId } = req.body;

    // Check if product exists and is active
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      throw new CustomError('Product not found or unavailable', 400);
    }

    // Get or create wishlist
    let wishlist = await Wishlist.findOne({ user: req.user._id });
    if (!wishlist) {
      wishlist = await Wishlist.create({ user: req.user._id, items: [] });
    }

    // Check if product already in wishlist
    const existingItem = wishlist.items.find(
      item => item.product.toString() === productId
    );

    if (existingItem) {
      throw new CustomError('Product already in wishlist', 400);
    }

    // Add new item
    wishlist.items.push({
      product: productId,
      addedAt: new Date()
    });

    await wishlist.save();

    // Populate product details for response
    await wishlist.populate({
      path: 'items.product',
      select: 'name slug price images isActive inventory trackInventory shortDescription longDescription material occasion sizes inStock stockCount rating reviewCount isBestseller isNew tags'
    });

    res.json({
      success: true,
      message: 'Item added to wishlist successfully',
      data: wishlist
    });
  } catch (error) {
    next(error);
  }
});

// Remove item from wishlist
router.delete('/remove/:productId', async (req: AuthRequest, res: any, next: any) => {
  try {
    const productId = req.params.productId;

    // Get wishlist
    const wishlist = await Wishlist.findOne({ user: req.user._id });
    if (!wishlist) {
      throw new CustomError('Wishlist not found', 404);
    }

    // Remove item from wishlist
    wishlist.items = wishlist.items.filter(
      item => item.product.toString() !== productId
    );

    await wishlist.save();

    // Populate product details for response
    await wishlist.populate({
      path: 'items.product',
      select: 'name slug price images isActive inventory trackInventory shortDescription longDescription material occasion sizes inStock stockCount rating reviewCount isBestseller isNew tags'
    });

    res.json({
      success: true,
      message: 'Item removed from wishlist successfully',
      data: wishlist
    });
  } catch (error) {
    next(error);
  }
});

// Clear wishlist
const clearWishlistHandler = async (req: AuthRequest, res: any, next: any) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user._id });
    if (!wishlist) {
      throw new CustomError('Wishlist not found', 404);
    }

    wishlist.items = [];
    await wishlist.save();

    res.json({
      success: true,
      message: 'Wishlist cleared successfully',
      data: wishlist
    });
  } catch (error) {
    next(error);
  }
};

router.delete('/clear', clearWishlistHandler);
router.post('/clear', clearWishlistHandler);

export default router;
