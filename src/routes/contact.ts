import express from 'express';
import { body, query } from 'express-validator';
import { Contact } from '../models';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { CustomError } from '../middleware/errorHandler';
import { validateRequest } from '../middleware/validate';

const router = express.Router();

// Public route - Submit contact form
router.post('/', [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('message').trim().isLength({ min: 10, max: 2000 }).withMessage('Message must be between 10 and 2000 characters'),
  body('phone').optional().matches(/^[+]?[\d\s-()]+$/).withMessage('Please provide a valid phone number'),
  body('subject').optional().trim().isLength({ max: 200 }).withMessage('Subject cannot exceed 200 characters')
], validateRequest, async (req: any, res: any, next: any) => {
  try {
    const { name, email, message, phone, subject } = req.body;

    const contact = await Contact.create({
      name,
      email,
      message,
      phone,
      subject,
      status: 'new'
    });

    res.status(201).json({
      success: true,
      message: 'Your message has been sent successfully. We will get back to you soon!',
      data: contact
    });
  } catch (error) {
    next(error);
  }
});

// Admin routes - require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

// Get all contact submissions
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('status').optional().isIn(['new', 'read', 'replied', 'archived']).withMessage('Invalid status'),
  query('search').optional().trim().isLength({ min: 1 }).withMessage('Search term cannot be empty')
], validateRequest, async (req: AuthRequest, res: any, next: any) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Build filter
    const filter: any = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
        { message: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const contacts = await Contact.find(filter)
      .populate('repliedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Contact.countDocuments(filter);

    res.json({
      success: true,
      data: {
        contacts,
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

// Get contact by ID
router.get('/:id', async (req: AuthRequest, res: any, next: any) => {
  try {
    const contact = await Contact.findById(req.params.id)
      .populate('repliedBy', 'name email');

    if (!contact) {
      throw new CustomError('Contact submission not found', 404);
    }

    // Mark as read if status is 'new'
    if (contact.status === 'new') {
      contact.status = 'read';
      await contact.save();
    }

    res.json({
      success: true,
      data: contact
    });
  } catch (error) {
    next(error);
  }
});

// Update contact status
router.put('/:id/status', [
  body('status').isIn(['new', 'read', 'replied', 'archived']).withMessage('Invalid status')
], validateRequest, async (req: AuthRequest, res: any, next: any) => {
  try {
    const { status } = req.body;

    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).populate('repliedBy', 'name email');

    if (!contact) {
      throw new CustomError('Contact submission not found', 404);
    }

    res.json({
      success: true,
      message: 'Status updated successfully',
      data: contact
    });
  } catch (error) {
    next(error);
  }
});

// Reply to contact
router.post('/:id/reply', [
  body('replyMessage').trim().isLength({ min: 10, max: 2000 }).withMessage('Reply message must be between 10 and 2000 characters')
], validateRequest, async (req: AuthRequest, res: any, next: any) => {
  try {
    const { replyMessage } = req.body;

    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      {
        status: 'replied',
        replyMessage,
        repliedAt: new Date(),
        repliedBy: req.user._id
      },
      { new: true, runValidators: true }
    ).populate('repliedBy', 'name email');

    if (!contact) {
      throw new CustomError('Contact submission not found', 404);
    }

    // TODO: Send email notification to the contact

    res.json({
      success: true,
      message: 'Reply sent successfully',
      data: contact
    });
  } catch (error) {
    next(error);
  }
});

// Delete contact
router.delete('/:id', async (req: AuthRequest, res: any, next: any) => {
  try {
    const contact = await Contact.findByIdAndDelete(req.params.id);

    if (!contact) {
      throw new CustomError('Contact submission not found', 404);
    }

    res.json({
      success: true,
      message: 'Contact submission deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
