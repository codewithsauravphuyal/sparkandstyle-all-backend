import express from 'express';
import { body } from 'express-validator';
import { User } from '../models';
import { authenticate, AuthRequest } from '../middleware/auth';
import { CustomError } from '../middleware/errorHandler';
import { validateRequest } from '../middleware/validate';

const router = express.Router();

// All user routes require authentication
router.use(authenticate);

// Get user profile
router.get('/profile', async (req: AuthRequest, res: any, next: any) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      throw new CustomError('User not found', 404);
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
});

// Update user profile
router.put('/profile', [
  body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('phone').optional().matches(/^[+]?[\d\s-()]+$/).withMessage('Please provide a valid phone number'),
  body('address.street').optional().trim().isLength({ min: 1 }).withMessage('Street address is required'),
  body('address.city').optional().trim().isLength({ min: 1 }).withMessage('City is required'),
  body('address.state').optional().trim().isLength({ min: 1 }).withMessage('State is required'),
  body('address.postalCode').optional().trim().isLength({ min: 1 }).withMessage('Postal code is required'),
  body('address.country').optional().trim().isLength({ min: 1 }).withMessage('Country is required')
], validateRequest, async (req: AuthRequest, res: any, next: any) => {
  try {
    const { name, phone, address } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, phone, address },
      { new: true, runValidators: true }
    );

    if (!user) {
      throw new CustomError('User not found', 404);
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    next(error);
  }
});

// Change password
router.put('/password', [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long')
], validateRequest, async (req: AuthRequest, res: any, next: any) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      throw new CustomError('User not found', 404);
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      throw new CustomError('Current password is incorrect', 400);
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
