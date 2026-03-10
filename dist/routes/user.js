"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const models_1 = require("../models");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const validate_1 = require("../middleware/validate");
const router = express_1.default.Router();
router.use(auth_1.authenticate);
router.get('/profile', async (req, res, next) => {
    try {
        const user = await models_1.User.findById(req.user._id);
        if (!user) {
            throw new errorHandler_1.CustomError('User not found', 404);
        }
        res.json({
            success: true,
            data: user
        });
    }
    catch (error) {
        next(error);
    }
});
router.put('/profile', [
    (0, express_validator_1.body)('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
    (0, express_validator_1.body)('phone').optional().matches(/^[+]?[\d\s-()]+$/).withMessage('Please provide a valid phone number'),
    (0, express_validator_1.body)('address.street').optional().trim().isLength({ min: 1 }).withMessage('Street address is required'),
    (0, express_validator_1.body)('address.city').optional().trim().isLength({ min: 1 }).withMessage('City is required'),
    (0, express_validator_1.body)('address.state').optional().trim().isLength({ min: 1 }).withMessage('State is required'),
    (0, express_validator_1.body)('address.postalCode').optional().trim().isLength({ min: 1 }).withMessage('Postal code is required'),
    (0, express_validator_1.body)('address.country').optional().trim().isLength({ min: 1 }).withMessage('Country is required')
], validate_1.validateRequest, async (req, res, next) => {
    try {
        const { name, phone, address } = req.body;
        const user = await models_1.User.findByIdAndUpdate(req.user._id, { name, phone, address }, { new: true, runValidators: true });
        if (!user) {
            throw new errorHandler_1.CustomError('User not found', 404);
        }
        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: user
        });
    }
    catch (error) {
        next(error);
    }
});
router.put('/password', [
    (0, express_validator_1.body)('currentPassword').notEmpty().withMessage('Current password is required'),
    (0, express_validator_1.body)('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long')
], validate_1.validateRequest, async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await models_1.User.findById(req.user._id).select('+password');
        if (!user) {
            throw new errorHandler_1.CustomError('User not found', 404);
        }
        const isCurrentPasswordValid = await user.comparePassword(currentPassword);
        if (!isCurrentPasswordValid) {
            throw new errorHandler_1.CustomError('Current password is incorrect', 400);
        }
        user.password = newPassword;
        await user.save();
        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=user.js.map