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
router.get('/', async (req, res, next) => {
    try {
        let cart = await models_1.Cart.findOne({ user: req.user._id }).populate({
            path: 'items.product',
            select: 'name slug price images isActive inventory trackInventory'
        });
        if (!cart) {
            cart = await models_1.Cart.create({ user: req.user._id, items: [] });
        }
        cart.items = cart.items.filter(item => {
            const product = item.product;
            return product && product.isActive &&
                (!product.trackInventory || product.inventory >= item.quantity);
        });
        await cart.save();
        res.json({
            success: true,
            data: cart
        });
    }
    catch (error) {
        next(error);
    }
});
router.post('/add', [
    (0, express_validator_1.body)('productId').isMongoId().withMessage('Valid product ID is required'),
    (0, express_validator_1.body)('quantity').isInt({ min: 1, max: 10 }).withMessage('Quantity must be between 1 and 10')
], validate_1.validateRequest, async (req, res, next) => {
    try {
        const { productId, quantity } = req.body;
        const product = await models_1.Product.findById(productId);
        if (!product || !product.isActive) {
            throw new errorHandler_1.CustomError('Product not found or unavailable', 400);
        }
        if (product.trackInventory && product.inventory < quantity) {
            throw new errorHandler_1.CustomError('Insufficient inventory', 400);
        }
        let cart = await models_1.Cart.findOne({ user: req.user._id });
        if (!cart) {
            cart = await models_1.Cart.create({ user: req.user._id, items: [] });
        }
        const existingItemIndex = cart.items.findIndex(item => item.product.toString() === productId);
        if (existingItemIndex > -1) {
            const newQuantity = cart.items[existingItemIndex].quantity + quantity;
            if (product.trackInventory && product.inventory < newQuantity) {
                throw new errorHandler_1.CustomError('Insufficient inventory', 400);
            }
            cart.items[existingItemIndex].quantity = newQuantity;
        }
        else {
            cart.items.push({
                product: productId,
                quantity,
                addedAt: new Date()
            });
        }
        await cart.save();
        await cart.populate({
            path: 'items.product',
            select: 'name slug price images isActive inventory trackInventory'
        });
        res.json({
            success: true,
            message: 'Item added to cart successfully',
            data: cart
        });
    }
    catch (error) {
        next(error);
    }
});
router.put('/update', [
    (0, express_validator_1.body)('productId').isMongoId().withMessage('Valid product ID is required'),
    (0, express_validator_1.body)('quantity').isInt({ min: 1, max: 10 }).withMessage('Quantity must be between 1 and 10')
], validate_1.validateRequest, async (req, res, next) => {
    try {
        const { productId, quantity } = req.body;
        const product = await models_1.Product.findById(productId);
        if (!product || !product.isActive) {
            throw new errorHandler_1.CustomError('Product not found or unavailable', 400);
        }
        if (product.trackInventory && product.inventory < quantity) {
            throw new errorHandler_1.CustomError('Insufficient inventory', 400);
        }
        const cart = await models_1.Cart.findOne({ user: req.user._id });
        if (!cart) {
            throw new errorHandler_1.CustomError('Cart not found', 404);
        }
        const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
        if (itemIndex === -1) {
            throw new errorHandler_1.CustomError('Item not found in cart', 404);
        }
        cart.items[itemIndex].quantity = quantity;
        await cart.save();
        await cart.populate({
            path: 'items.product',
            select: 'name slug price images isActive inventory trackInventory'
        });
        res.json({
            success: true,
            message: 'Cart item updated successfully',
            data: cart
        });
    }
    catch (error) {
        next(error);
    }
});
router.delete('/remove/:productId', async (req, res, next) => {
    try {
        const productId = req.params.productId;
        const cart = await models_1.Cart.findOne({ user: req.user._id });
        if (!cart) {
            throw new errorHandler_1.CustomError('Cart not found', 404);
        }
        cart.items = cart.items.filter(item => item.product.toString() !== productId);
        await cart.save();
        await cart.populate({
            path: 'items.product',
            select: 'name slug price images isActive inventory trackInventory'
        });
        res.json({
            success: true,
            message: 'Item removed from cart successfully',
            data: cart
        });
    }
    catch (error) {
        next(error);
    }
});
const clearCartHandler = async (req, res, next) => {
    try {
        const cart = await models_1.Cart.findOne({ user: req.user._id });
        if (!cart) {
            throw new errorHandler_1.CustomError('Cart not found', 404);
        }
        cart.items = [];
        await cart.save();
        res.json({
            success: true,
            message: 'Cart cleared successfully',
            data: cart
        });
    }
    catch (error) {
        next(error);
    }
};
router.delete('/clear', clearCartHandler);
router.post('/clear', clearCartHandler);
exports.default = router;
//# sourceMappingURL=cart.js.map