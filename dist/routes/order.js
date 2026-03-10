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
const server_1 = require("../server");
const router = express_1.default.Router();
router.use(auth_1.authenticate);
router.get('/', async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const orders = await models_1.Order.find({ user: req.user._id })
            .populate('items.product', 'name images')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        const total = await models_1.Order.countDocuments({ user: req.user._id });
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
router.get('/:id', async (req, res, next) => {
    try {
        const order = await models_1.Order.findOne({
            _id: req.params.id,
            user: req.user._id
        }).populate('items.product', 'name images');
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
router.post('/', [
    (0, express_validator_1.body)('shippingAddress.street').trim().isLength({ min: 1 }).withMessage('Street address is required'),
    (0, express_validator_1.body)('shippingAddress.city').trim().isLength({ min: 1 }).withMessage('City is required'),
    (0, express_validator_1.body)('shippingAddress.state').trim().isLength({ min: 1 }).withMessage('State is required'),
    (0, express_validator_1.body)('shippingAddress.postalCode').trim().isLength({ min: 1 }).withMessage('Postal code is required'),
    (0, express_validator_1.body)('shippingAddress.country').trim().isLength({ min: 1 }).withMessage('Country is required'),
    (0, express_validator_1.body)('paymentMethod').trim().isLength({ min: 1 }).withMessage('Payment method is required'),
    (0, express_validator_1.body)('billingAddress').optional().isObject(),
    (0, express_validator_1.body)('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters')
], validate_1.validateRequest, async (req, res, next) => {
    try {
        const { shippingAddress, billingAddress, paymentMethod, notes } = req.body;
        const cart = await models_1.Cart.findOne({ user: req.user._id }).populate('items.product');
        if (!cart || cart.items.length === 0) {
            throw new errorHandler_1.CustomError('Cart is empty', 400);
        }
        const orderItems = [];
        let subtotal = 0;
        for (const cartItem of cart.items) {
            const product = cartItem.product;
            if (!product || !product.isActive) {
                throw new errorHandler_1.CustomError(`Product ${product?.name || 'unknown'} is no longer available`, 400);
            }
            if (product.trackInventory && product.inventory < cartItem.quantity) {
                throw new errorHandler_1.CustomError(`Insufficient inventory for ${product.name}`, 400);
            }
            orderItems.push({
                product: product._id,
                name: product.name,
                sku: product.sku,
                price: product.price,
                quantity: cartItem.quantity,
                image: product.images[0] || ''
            });
            subtotal += product.price * cartItem.quantity;
        }
        const shippingCost = 0;
        const tax = subtotal * 0.13;
        const totalAmount = subtotal + shippingCost + tax;
        const order = await models_1.Order.create({
            user: req.user._id,
            items: orderItems,
            subtotal,
            shippingCost,
            tax,
            totalAmount,
            shippingAddress,
            billingAddress: billingAddress || shippingAddress,
            paymentMethod,
            notes
        });
        for (const cartItem of cart.items) {
            const product = cartItem.product;
            if (product.trackInventory) {
                await models_1.Product.findByIdAndUpdate(product._id, {
                    $inc: { inventory: -cartItem.quantity }
                });
            }
        }
        cart.items = [];
        await cart.save();
        server_1.io.to('admin-room').emit('new-order', {
            orderId: order._id,
            orderNumber: order.orderNumber,
            totalAmount: order.totalAmount,
            customerName: req.user.name,
            customerEmail: req.user.email
        });
        const populatedOrder = await models_1.Order.findById(order._id).populate('items.product', 'name images');
        res.status(201).json({
            success: true,
            message: 'Order created successfully',
            data: populatedOrder
        });
    }
    catch (error) {
        next(error);
    }
});
router.put('/:id/cancel', async (req, res, next) => {
    try {
        const order = await models_1.Order.findOne({
            _id: req.params.id,
            user: req.user._id
        });
        if (!order) {
            throw new errorHandler_1.CustomError('Order not found', 404);
        }
        if (order.status !== 'pending') {
            throw new errorHandler_1.CustomError('Order cannot be cancelled at this stage', 400);
        }
        order.status = 'cancelled';
        await order.save();
        for (const orderItem of order.items) {
            await models_1.Product.findByIdAndUpdate(orderItem.product, {
                $inc: { inventory: orderItem.quantity }
            });
        }
        res.json({
            success: true,
            message: 'Order cancelled successfully',
            data: order
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=order.js.map