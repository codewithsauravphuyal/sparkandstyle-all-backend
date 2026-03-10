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
router.use((0, auth_1.authorize)('admin'));
router.get('/dashboard', async (req, res, next) => {
    try {
        const totalUsers = await models_1.User.countDocuments({ role: 'user' });
        const totalProducts = await models_1.Product.countDocuments();
        const totalOrders = await models_1.Order.countDocuments();
        const totalRevenue = await models_1.Order.aggregate([
            { $match: { status: { $ne: 'cancelled' } } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);
        const recentOrders = await models_1.Order.find()
            .populate('user', 'name email')
            .sort({ createdAt: -1 })
            .limit(5);
        const topProducts = await models_1.Order.aggregate([
            { $unwind: '$items' },
            { $group: { _id: '$items.product', totalSold: { $sum: '$items.quantity' } } },
            { $sort: { totalSold: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' }
        ]);
        res.json({
            success: true,
            data: {
                totalUsers,
                totalProducts,
                totalOrders,
                totalRevenue: totalRevenue[0]?.total || 0,
                recentOrders,
                topProducts
            }
        });
    }
    catch (error) {
        next(error);
    }
});
router.get('/users', async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const users = await models_1.User.find({ role: 'user' })
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        const total = await models_1.User.countDocuments({ role: 'user' });
        res.json({
            success: true,
            data: {
                users,
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
    }
    catch (error) {
        next(error);
    }
});
router.get('/orders', async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const status = req.query.status;
        const filter = {};
        if (status) {
            filter.status = status;
        }
        const orders = await models_1.Order.find(filter)
            .populate('user', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        const total = await models_1.Order.countDocuments(filter);
        res.json({
            success: true,
            data: {
                orders,
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
    }
    catch (error) {
        next(error);
    }
});
router.put('/orders/:id/status', [
    (0, express_validator_1.body)('status').isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']).withMessage('Invalid order status'),
    (0, express_validator_1.body)('shippingInfo.deliveryPartner').optional().trim().isLength({ min: 1 }).withMessage('Delivery partner is required when shipping'),
    (0, express_validator_1.body)('shippingInfo.trackingNumber').optional().trim().isLength({ min: 1 }).withMessage('Tracking number is required'),
    (0, express_validator_1.body)('shippingInfo.trackingLink').optional().trim().isLength({ min: 1 }).withMessage('Tracking link is required')
], validate_1.validateRequest, async (req, res, next) => {
    try {
        const { status, shippingInfo } = req.body;
        const orderId = req.params.id;
        const order = await models_1.Order.findById(orderId).populate('user', 'name email');
        if (!order) {
            throw new errorHandler_1.CustomError('Order not found', 404);
        }
        const oldStatus = order.status;
        order.status = status;
        if (status === 'shipped' && shippingInfo) {
            order.shippingInfo = {
                ...order.shippingInfo,
                ...shippingInfo,
                estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            };
        }
        await order.save();
        res.json({
            success: true,
            message: 'Order status updated successfully',
            data: order
        });
    }
    catch (error) {
        next(error);
    }
});
router.get('/orders/:id', async (req, res, next) => {
    try {
        const order = await models_1.Order.findById(req.params.id)
            .populate('user', 'name email phone address')
            .populate('items.product', 'name sku images');
        if (!order) {
            throw new errorHandler_1.CustomError('Order not found', 404);
        }
        res.json({
            success: true,
            data: order
        });
    }
    catch (error) {
        next(error);
    }
});
router.post('/create-admin', [
    (0, express_validator_1.body)('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
    (0, express_validator_1.body)('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    (0, express_validator_1.body)('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
], validate_1.validateRequest, async (req, res, next) => {
    try {
        const { name, email, password } = req.body;
        const existingUser = await models_1.User.findOne({ email });
        if (existingUser) {
            throw new errorHandler_1.CustomError('User already exists with this email', 400);
        }
        const user = await models_1.User.create({
            name,
            email,
            password,
            role: 'admin'
        });
        delete user.password;
        res.status(201).json({
            success: true,
            message: 'Admin user created successfully',
            data: user
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=admin.js.map