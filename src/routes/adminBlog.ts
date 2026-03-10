import express from 'express';
import { body, query } from 'express-validator';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { CustomError } from '../middleware/errorHandler';
import { BlogPost } from '../models/BlogPost';

const router = express.Router();

router.use(authenticate);
router.use(authorize('admin'));

// Admin: list all posts
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('status').optional().isIn(['draft', 'published']).withMessage('Invalid status')
], validateRequest, async (req: AuthRequest, res: any, next: any) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (req.query.status) filter.status = req.query.status;

    const posts = await BlogPost.find(filter)
      .select('title slug excerpt status publishedAt createdAt updatedAt')
      .populate('author', 'name email')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await BlogPost.countDocuments(filter);

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

// Admin: get post by slug
router.get('/slug/:slug', async (req: AuthRequest, res: any, next: any) => {
  try {
    const post = await BlogPost.findOne({ slug: req.params.slug.toLowerCase() }).populate('author', 'name email');
    if (!post) {
      throw new CustomError('Post not found', 404);
    }
    res.json({ success: true, data: post });
  } catch (error) {
    next(error);
  }
});

// Admin: update post by slug
router.put('/slug/:slug', [
  body('title').optional().trim().isLength({ min: 2, max: 200 }).withMessage('Title must be between 2 and 200 characters'),
  body('slug').optional().trim().isLength({ min: 2, max: 200 }).withMessage('Slug must be between 2 and 200 characters'),
  body('excerpt').optional().trim().isLength({ min: 2, max: 500 }).withMessage('Excerpt must be between 2 and 500 characters'),
  body('contentHtml').optional().notEmpty().withMessage('Content is required'),
  body('status').optional().isIn(['draft', 'published']).withMessage('Invalid status')
], validateRequest, async (req: AuthRequest, res: any, next: any) => {
  try {
    const post = await BlogPost.findOne({ slug: req.params.slug.toLowerCase() });
    if (!post) throw new CustomError('Post not found', 404);

    const update: any = { ...req.body };
    if (update.slug) update.slug = update.slug.toLowerCase();

    if (update.slug) {
      const dup = await BlogPost.findOne({ _id: { $ne: post._id }, slug: update.slug });
      if (dup) throw new CustomError('Post with this slug already exists', 400);
    }

    const prevStatus = post.status;
    Object.assign(post, update);

    if (prevStatus !== 'published' && post.status === 'published') {
      post.publishedAt = new Date();
    }
    if (post.status !== 'published') {
      post.publishedAt = undefined;
    }

    await post.save();
    res.json({ success: true, message: 'Post updated', data: post });
  } catch (error) {
    next(error);
  }
});

// Admin: delete post by slug
router.delete('/slug/:slug', async (req: AuthRequest, res: any, next: any) => {
  try {
    const post = await BlogPost.findOneAndDelete({ slug: req.params.slug.toLowerCase() });
    if (!post) throw new CustomError('Post not found', 404);
    res.json({ success: true, message: 'Post deleted' });
  } catch (error) {
    next(error);
  }
});

// Admin: get post by id
router.get('/:id', async (req: AuthRequest, res: any, next: any) => {
  try {
    const post = await BlogPost.findById(req.params.id).populate('author', 'name email');
    if (!post) {
      throw new CustomError('Post not found', 404);
    }
    res.json({ success: true, data: post });
  } catch (error) {
    next(error);
  }
});

// Admin: create post
router.post('/', [
  body('title').trim().isLength({ min: 2, max: 200 }).withMessage('Title must be between 2 and 200 characters'),
  body('slug').trim().isLength({ min: 2, max: 200 }).withMessage('Slug must be between 2 and 200 characters'),
  body('excerpt').trim().isLength({ min: 2, max: 500 }).withMessage('Excerpt must be between 2 and 500 characters'),
  body('contentHtml').notEmpty().withMessage('Content is required'),
  body('status').optional().isIn(['draft', 'published']).withMessage('Invalid status')
], validateRequest, async (req: AuthRequest, res: any, next: any) => {
  try {
    const { title, slug, excerpt, contentHtml, status } = req.body;

    const exists = await BlogPost.findOne({ slug: slug.toLowerCase() });
    if (exists) {
      throw new CustomError('Post with this slug already exists', 400);
    }

    const post = await BlogPost.create({
      title,
      slug: slug.toLowerCase(),
      excerpt,
      contentHtml,
      status: status || 'draft',
      author: req.user!._id,
      publishedAt: (status === 'published') ? new Date() : undefined
    });

    res.status(201).json({ success: true, message: 'Post created', data: post });
  } catch (error) {
    next(error);
  }
});

// Admin: update post
router.put('/:id', [
  body('title').optional().trim().isLength({ min: 2, max: 200 }).withMessage('Title must be between 2 and 200 characters'),
  body('slug').optional().trim().isLength({ min: 2, max: 200 }).withMessage('Slug must be between 2 and 200 characters'),
  body('excerpt').optional().trim().isLength({ min: 2, max: 500 }).withMessage('Excerpt must be between 2 and 500 characters'),
  body('contentHtml').optional().notEmpty().withMessage('Content is required'),
  body('status').optional().isIn(['draft', 'published']).withMessage('Invalid status')
], validateRequest, async (req: AuthRequest, res: any, next: any) => {
  try {
    const update: any = { ...req.body };
    if (update.slug) update.slug = update.slug.toLowerCase();

    if (update.slug) {
      const dup = await BlogPost.findOne({ _id: { $ne: req.params.id }, slug: update.slug });
      if (dup) throw new CustomError('Post with this slug already exists', 400);
    }

    const post = await BlogPost.findById(req.params.id);
    if (!post) throw new CustomError('Post not found', 404);

    const prevStatus = post.status;

    Object.assign(post, update);

    if (prevStatus !== 'published' && post.status === 'published') {
      post.publishedAt = new Date();
    }
    if (post.status !== 'published') {
      post.publishedAt = undefined;
    }

    await post.save();

    res.json({ success: true, message: 'Post updated', data: post });
  } catch (error) {
    next(error);
  }
});

// Admin: delete post
router.delete('/:id', async (req: AuthRequest, res: any, next: any) => {
  try {
    const post = await BlogPost.findByIdAndDelete(req.params.id);
    if (!post) throw new CustomError('Post not found', 404);
    res.json({ success: true, message: 'Post deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;
