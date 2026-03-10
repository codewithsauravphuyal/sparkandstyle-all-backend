import express from 'express';
import { query } from 'express-validator';
import { BlogPost } from '../models/BlogPost';
import { validateRequest } from '../middleware/validate';
import { CustomError } from '../middleware/errorHandler';

const router = express.Router();

// Public: list published blog posts
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
], validateRequest, async (req: any, res: any, next: any) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await BlogPost.find({ status: 'published' })
      .select('title slug excerpt status publishedAt createdAt updatedAt')
      .populate('author', 'name email')
      .sort({ publishedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await BlogPost.countDocuments({ status: 'published' });

    res.json({
      success: true,
      data: {
        posts,
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

// Public: get published post by slug
router.get('/:slug', async (req: any, res: any, next: any) => {
  try {
    const post = await BlogPost.findOne({ slug: req.params.slug.toLowerCase(), status: 'published' })
      .populate('author', 'name email');

    if (!post) {
      throw new CustomError('Post not found', 404);
    }

    res.json({
      success: true,
      data: post
    });
  } catch (error) {
    next(error);
  }
});

export default router;
