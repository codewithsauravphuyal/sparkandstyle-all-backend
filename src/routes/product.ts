import express from 'express';
import { body, query } from 'express-validator';
import { Product, Category } from '../models';
import { authenticate, authorize, optionalAuth, AuthRequest } from '../middleware/auth';
import { CustomError } from '../middleware/errorHandler';
import { validateRequest } from '../middleware/validate';

const router = express.Router();

// Get all products (public)
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('category').optional().isMongoId().withMessage('Invalid category ID'),
  query('search').optional().trim().isLength({ min: 1 }).withMessage('Search term cannot be empty'),
  query('minPrice').optional().isFloat({ min: 0 }).withMessage('Minimum price must be positive'),
  query('maxPrice').optional().isFloat({ min: 0 }).withMessage('Maximum price must be positive'),
  query('featured').optional().isBoolean().withMessage('Featured must be a boolean'),
  query('material').optional().isIn(['gold', 'silver', 'platinum', 'rose-gold', 'diamond']).withMessage('Invalid material'),
  query('occasion').optional().isIn(['wedding', 'casual', 'party', 'gift', 'anniversary']).withMessage('Invalid occasion'),
  query('bestseller').optional().isBoolean().withMessage('Bestseller must be a boolean'),
  query('new').optional().isBoolean().withMessage('New must be a boolean'),
  query('sortBy').optional().isIn(['name', 'price', 'createdAt', 'rating', 'popular']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
], validateRequest, async (req: any, res: any, next: any) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    // Build filter
    const filter: any = { isActive: true };

    if (req.query.category) {
      filter.category = req.query.category;
    }

    if (req.query.featured) {
      filter.isFeatured = req.query.featured === 'true';
    }

    if (req.query.bestseller) {
      filter.isBestseller = req.query.bestseller === 'true';
    }

    if (req.query.new) {
      filter.isNewProduct = req.query.new === 'true';
    }

    if (req.query.material) {
      filter.material = req.query.material;
    }

    if (req.query.occasion) {
      filter.occasion = req.query.occasion;
    }

    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
        { tags: { $in: [new RegExp(req.query.search, 'i')] } }
      ];
    }

    if (req.query.minPrice || req.query.maxPrice) {
      filter.price = {};
      if (req.query.minPrice) filter.price.$gte = parseFloat(req.query.minPrice);
      if (req.query.maxPrice) filter.price.$lte = parseFloat(req.query.maxPrice);
    }

    // Build sort
    let sort: any = { createdAt: -1 };
    if (req.query.sortBy) {
      if (req.query.sortBy === 'popular') {
        sort = { reviewCount: -1 };
      } else if (req.query.sortBy === 'rating') {
        sort = { rating: -1 };
      } else {
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
        sort = { [req.query.sortBy]: sortOrder };
      }
    }

    const products = await Product.find(filter)
      .populate('category', 'name slug')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await Product.countDocuments(filter);

    res.json({
      success: true,
      data: {
        products,
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

// Get featured products (public)
router.get('/featured', async (req: any, res: any, next: any) => {
  try {
    const products = await Product.find({ isActive: true, isFeatured: true })
      .populate('category', 'name slug')
      .limit(8)
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    next(error);
  }
});

// Get product by slug (public)
router.get('/slug/:slug', async (req: any, res: any, next: any) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug, isActive: true })
      .populate('category', 'name slug description');

    if (!product) {
      throw new CustomError('Product not found', 404);
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
});

// Get product by ID (public)
router.get('/:id', async (req: any, res: any, next: any) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name slug description');

    if (!product || !product.isActive) {
      throw new CustomError('Product not found', 404);
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
});

// Admin routes - require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

// Create new product
router.post('/', [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('slug').trim().isLength({ min: 2, max: 100 }).withMessage('Slug must be between 2 and 100 characters'),
  body('description').trim().isLength({ min: 10, max: 2000 }).withMessage('Description must be between 10 and 2000 characters'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('comparePrice').optional().isFloat({ min: 0 }).withMessage('Compare price must be a positive number'),
  body('sku').trim().isLength({ min: 1 }).withMessage('SKU is required'),
  body('category').isMongoId().withMessage('Valid category ID is required'),
  body('inventory').isInt({ min: 0 }).withMessage('Inventory must be a non-negative integer')
], validateRequest, async (req: AuthRequest, res: any, next: any) => {
  try {
    const {
      name,
      slug,
      description,
      price,
      comparePrice,
      sku,
      category,
      images,
      tags,
      isActive,
      isFeatured,
      trackInventory,
      inventory,
      weight,
      dimensions,
      materials,
      careInstructions,
      seoTitle,
      seoDescription
    } = req.body;

    // Check if product with slug or SKU already exists
    const existingProduct = await Product.findOne({
      $or: [{ slug }, { sku }]
    });
    
    if (existingProduct) {
      throw new CustomError('Product with this slug or SKU already exists', 400);
    }

    // Verify category exists
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      throw new CustomError('Category not found', 400);
    }

    const product = await Product.create({
      name,
      slug,
      description,
      price,
      comparePrice,
      sku,
      category,
      images: images || [],
      tags: tags || [],
      isActive: isActive !== undefined ? isActive : true,
      isFeatured: isFeatured || false,
      trackInventory: trackInventory !== undefined ? trackInventory : true,
      inventory: inventory || 0,
      weight,
      dimensions,
      materials: materials || [],
      careInstructions,
      seoTitle,
      seoDescription
    });

    const populatedProduct = await Product.findById(product._id).populate('category', 'name slug');

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: populatedProduct
    });
  } catch (error) {
    next(error);
  }
});

// Update product
router.put('/:id', [
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('slug').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Slug must be between 2 and 100 characters'),
  body('description').optional().trim().isLength({ min: 10, max: 2000 }).withMessage('Description must be between 10 and 2000 characters'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('comparePrice').optional().isFloat({ min: 0 }).withMessage('Compare price must be a positive number'),
  body('sku').optional().trim().isLength({ min: 1 }).withMessage('SKU is required'),
  body('category').optional().isMongoId().withMessage('Valid category ID is required'),
  body('inventory').optional().isInt({ min: 0 }).withMessage('Inventory must be a non-negative integer')
], validateRequest, async (req: AuthRequest, res: any, next: any) => {
  try {
    const updateData = req.body;

    // Check for duplicate slug or SKU if they are being updated
    if (updateData.slug || updateData.sku) {
      const existingProduct = await Product.findOne({
        _id: { $ne: req.params.id },
        $or: [
          ...(updateData.slug ? [{ slug: updateData.slug }] : []),
          ...(updateData.sku ? [{ sku: updateData.sku }] : [])
        ]
      });
      
      if (existingProduct) {
        throw new CustomError('Product with this slug or SKU already exists', 400);
      }
    }

    // Verify category exists if being updated
    if (updateData.category) {
      const categoryExists = await Category.findById(updateData.category);
      if (!categoryExists) {
        throw new CustomError('Category not found', 400);
      }
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('category', 'name slug');

    if (!product) {
      throw new CustomError('Product not found', 404);
    }

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  } catch (error) {
    next(error);
  }
});

// Delete product
router.delete('/:id', async (req: AuthRequest, res: any, next: any) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      throw new CustomError('Product not found', 404);
    }

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
