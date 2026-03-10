import express from 'express';
import { body } from 'express-validator';
import { Settings } from '../models/Settings';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { CustomError } from '../middleware/errorHandler';
import { validateRequest } from '../middleware/validate';

const router = express.Router();

// Get settings (public for payment settings, admin for all)
router.get('/', async (req: any, res: any, next: any) => {
  try {
    const settings = await (Settings as any).getSettings();

    // If not admin, only return payment settings
    const isAdmin = req.user && req.user.role === 'admin';
    
    if (isAdmin) {
      res.json({
        success: true,
        data: settings
      });
    } else {
      res.json({
        success: true,
        data: {
          payment: {
            qrCodeImage: settings.payment.qrCodeImage,
            qrCodeEnabled: settings.payment.qrCodeEnabled,
            paymentInstructions: settings.payment.paymentInstructions
          },
          shipping: {
            freeShippingThreshold: settings.shipping.freeShippingThreshold,
            defaultShippingCost: settings.shipping.defaultShippingCost
          }
        }
      });
    }
  } catch (error) {
    next(error);
  }
});

// Get payment settings (public)
router.get('/payment', async (req: any, res: any, next: any) => {
  try {
    const settings = await (Settings as any).getSettings();

    res.json({
      success: true,
      data: {
        qrCodeImage: settings.payment.qrCodeImage,
        qrCodeEnabled: settings.payment.qrCodeEnabled,
        paymentInstructions: settings.payment.paymentInstructions,
        accountNumber: settings.payment.accountNumber,
        accountName: settings.payment.accountName,
        bankName: settings.payment.bankName
      }
    });
  } catch (error) {
    next(error);
  }
});

// Admin routes - require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

// Update settings
router.put('/', [
  body('storeName').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Store name must be between 1 and 100 characters'),
  body('storeEmail').optional().isEmail().withMessage('Please provide a valid email'),
  body('storePhone').optional().trim(),
  body('storeAddress').optional().trim()
], validateRequest, async (req: AuthRequest, res: any, next: any) => {
  try {
    const settings = await (Settings as any).getSettings();

    const { storeName, storeEmail, storePhone, storeAddress } = req.body;
    
    if (storeName) settings.storeName = storeName;
    if (storeEmail) settings.storeEmail = storeEmail;
    if (storePhone !== undefined) settings.storePhone = storePhone;
    if (storeAddress !== undefined) settings.storeAddress = storeAddress;

    await settings.save();

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: settings
    });
  } catch (error) {
    next(error);
  }
});

// Update payment settings
router.put('/payment', [
  body('qrCodeImage').optional().trim(),
  body('qrCodeEnabled').optional().isBoolean(),
  body('paymentInstructions').optional().trim().isLength({ max: 500 }).withMessage('Payment instructions cannot exceed 500 characters'),
  body('accountNumber').optional().trim(),
  body('accountName').optional().trim(),
  body('bankName').optional().trim()
], validateRequest, async (req: AuthRequest, res: any, next: any) => {
  try {
    const settings = await (Settings as any).getSettings();

    const { qrCodeImage, qrCodeEnabled, paymentInstructions, accountNumber, accountName, bankName } = req.body;
    
    if (qrCodeImage !== undefined) settings.payment.qrCodeImage = qrCodeImage;
    if (qrCodeEnabled !== undefined) settings.payment.qrCodeEnabled = qrCodeEnabled;
    if (paymentInstructions !== undefined) settings.payment.paymentInstructions = paymentInstructions;
    if (accountNumber !== undefined) settings.payment.accountNumber = accountNumber;
    if (accountName !== undefined) settings.payment.accountName = accountName;
    if (bankName !== undefined) settings.payment.bankName = bankName;

    await settings.save();

    res.json({
      success: true,
      message: 'Payment settings updated successfully',
      data: settings.payment
    });
  } catch (error) {
    next(error);
  }
});

// Update shipping settings
router.put('/shipping', [
  body('defaultShippingCost').optional().isFloat({ min: 0 }).withMessage('Shipping cost must be positive'),
  body('freeShippingThreshold').optional().isFloat({ min: 0 }).withMessage('Free shipping threshold must be positive'),
  body('deliveryPartners').optional().isArray()
], validateRequest, async (req: AuthRequest, res: any, next: any) => {
  try {
    const settings = await (Settings as any).getSettings();

    const { defaultShippingCost, freeShippingThreshold, deliveryPartners } = req.body;
    
    if (defaultShippingCost !== undefined) settings.shipping.defaultShippingCost = defaultShippingCost;
    if (freeShippingThreshold !== undefined) settings.shipping.freeShippingThreshold = freeShippingThreshold;
    if (deliveryPartners !== undefined) {
      // Validate delivery partners
      for (const partner of deliveryPartners) {
        if (!partner.name || !partner.website) {
          throw new CustomError('Delivery partner must have name and website', 400);
        }
      }
      settings.shipping.deliveryPartners = deliveryPartners;
    }

    await settings.save();

    res.json({
      success: true,
      message: 'Shipping settings updated successfully',
      data: settings.shipping
    });
  } catch (error) {
    next(error);
  }
});

export default router;
