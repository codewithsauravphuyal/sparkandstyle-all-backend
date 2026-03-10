import express from 'express';
import { body } from 'express-validator';
import { Category } from '../models';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { CustomError } from '../middleware/errorHandler';
import { validateRequest } from '../middleware/validate';

const router = express.Router();

// Get all categories (public)
router.get('/', async (req: any, res: any, next: any) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    next(error);
  }
});

// Get category by slug (public)
router.get('/slug/:slug', async (req: any, res: any, next: any) => {
  try {
    const category = await Category.findOne({ slug: req.params.slug, isActive: true });
    
    if (!category) {
      throw new CustomError('Category not found', 404);
    }

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
});

// Admin routes - require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

// Create new category
router.post('/', [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('slug').trim().isLength({ min: 2, max: 50 }).withMessage('Slug must be between 2 and 50 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters')
], validateRequest, async (req: AuthRequest, res: any, next: any) => {
  try {
    const { name, slug, description, image, sortOrder } = req.body;

    // Check if category with slug already exists
    const existingCategory = await Category.findOne({ slug });
    if (existingCategory) {
      throw new CustomError('Category with this slug already exists', 400);
    }

    const category = await Category.create({
      name,
      slug,
      description,
      image,
      sortOrder: sortOrder || 0
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category
    });
  } catch (error) {
    next(error);
  }
});

// Update category
router.put('/:id', [
  body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('slug').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Slug must be between 2 and 50 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters')
], validateRequest, async (req: AuthRequest, res: any, next: any) => {
  try {
    const { name, slug, description, image, isActive, sortOrder } = req.body;

    // If slug is being updated, check for duplicates
    if (slug) {
      const existingCategory = await Category.findOne({ slug, _id: { $ne: req.params.id } });
      if (existingCategory) {
        throw new CustomError('Category with this slug already exists', 400);
      }
    }

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { name, slug, description, image, isActive, sortOrder },
      { new: true, runValidators: true }
    );

    if (!category) {
      throw new CustomError('Category not found', 404);
    }

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: category
    });
  } catch (error) {
    next(error);
  }
});

// Delete category
router.delete('/:id', async (req: AuthRequest, res: any, next: any) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);

    if (!category) {
      throw new CustomError('Category not found', 404);
    }

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
