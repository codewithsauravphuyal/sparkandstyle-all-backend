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
router.get('/', [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
    (0, express_validator_1.query)('category').optional().isMongoId().withMessage('Invalid category ID'),
    (0, express_validator_1.query)('search').optional().trim().isLength({ min: 1 }).withMessage('Search term cannot be empty'),
    (0, express_validator_1.query)('minPrice').optional().isFloat({ min: 0 }).withMessage('Minimum price must be positive'),
    (0, express_validator_1.query)('maxPrice').optional().isFloat({ min: 0 }).withMessage('Maximum price must be positive'),
    (0, express_validator_1.query)('featured').optional().isBoolean().withMessage('Featured must be a boolean'),
    (0, express_validator_1.query)('sortBy').optional().isIn(['name', 'price', 'createdAt']).withMessage('Invalid sort field'),
    (0, express_validator_1.query)('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
], validate_1.validateRequest, async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const skip = (page - 1) * limit;
        const filter = { isActive: true };
        if (req.query.category) {
            filter.category = req.query.category;
        }
        if (req.query.featured) {
            filter.isFeatured = req.query.featured === 'true';
        }
        if (req.query.search) {
            filter.$text = { $search: req.query.search };
        }
        if (req.query.minPrice || req.query.maxPrice) {
            filter.price = {};
            if (req.query.minPrice)
                filter.price.$gte = parseFloat(req.query.minPrice);
            if (req.query.maxPrice)
                filter.price.$lte = parseFloat(req.query.maxPrice);
        }
        let sort = { createdAt: -1 };
        if (req.query.sortBy) {
            const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
            sort = { [req.query.sortBy]: sortOrder };
        }
        const products = await models_1.Product.find(filter)
            .populate('category', 'name slug')
            .sort(sort)
            .skip(skip)
            .limit(limit);
        const total = await models_1.Product.countDocuments(filter);
        res.json({
            success: true,
            data: {
                products,
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
router.get('/featured', async (req, res, next) => {
    try {
        const products = await models_1.Product.find({ isActive: true, isFeatured: true })
            .populate('category', 'name slug')
            .limit(8)
            .sort({ createdAt: -1 });
        res.json({
            success: true,
            data: products
        });
    }
    catch (error) {
        next(error);
    }
});
router.get('/slug/:slug', async (req, res, next) => {
    try {
        const product = await models_1.Product.findOne({ slug: req.params.slug, isActive: true })
            .populate('category', 'name slug description');
        if (!product) {
            throw new errorHandler_1.CustomError('Product not found', 404);
        }
        res.json({
            success: true,
            data: product
        });
    }
    catch (error) {
        next(error);
    }
});
router.get('/:id', async (req, res, next) => {
    try {
        const product = await models_1.Product.findById(req.params.id)
            .populate('category', 'name slug description');
        if (!product || !product.isActive) {
            throw new errorHandler_1.CustomError('Product not found', 404);
        }
        res.json({
            success: true,
            data: product
        });
    }
    catch (error) {
        next(error);
    }
});
router.use(auth_1.authenticate);
router.use((0, auth_1.authorize)('admin'));
router.post('/', [
    (0, express_validator_1.body)('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
    (0, express_validator_1.body)('slug').trim().isLength({ min: 2, max: 100 }).withMessage('Slug must be between 2 and 100 characters'),
    (0, express_validator_1.body)('description').trim().isLength({ min: 10, max: 2000 }).withMessage('Description must be between 10 and 2000 characters'),
    (0, express_validator_1.body)('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    (0, express_validator_1.body)('comparePrice').optional().isFloat({ min: 0 }).withMessage('Compare price must be a positive number'),
    (0, express_validator_1.body)('sku').trim().isLength({ min: 1 }).withMessage('SKU is required'),
    (0, express_validator_1.body)('category').isMongoId().withMessage('Valid category ID is required'),
    (0, express_validator_1.body)('inventory').isInt({ min: 0 }).withMessage('Inventory must be a non-negative integer')
], validate_1.validateRequest, async (req, res, next) => {
    try {
        const { name, slug, description, price, comparePrice, sku, category, images, tags, isActive, isFeatured, trackInventory, inventory, weight, dimensions, materials, careInstructions, seoTitle, seoDescription } = req.body;
        const existingProduct = await models_1.Product.findOne({
            $or: [{ slug }, { sku }]
        });
        if (existingProduct) {
            throw new errorHandler_1.CustomError('Product with this slug or SKU already exists', 400);
        }
        const categoryExists = await models_1.Category.findById(category);
        if (!categoryExists) {
            throw new errorHandler_1.CustomError('Category not found', 400);
        }
        const product = await models_1.Product.create({
            name,
            slug,
            description,
            price,
            comparePrice,
            sku,
            category,
            images: images || [],
            tags: tags || [],
            isActive: isActive !== undefined ? isActive : true,
            isFeatured: isFeatured || false,
            trackInventory: trackInventory !== undefined ? trackInventory : true,
            inventory: inventory || 0,
            weight,
            dimensions,
            materials: materials || [],
            careInstructions,
            seoTitle,
            seoDescription
        });
        const populatedProduct = await models_1.Product.findById(product._id).populate('category', 'name slug');
        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: populatedProduct
        });
    }
    catch (error) {
        next(error);
    }
});
router.put('/:id', [
    (0, express_validator_1.body)('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
    (0, express_validator_1.body)('slug').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Slug must be between 2 and 100 characters'),
    (0, express_validator_1.body)('description').optional().trim().isLength({ min: 10, max: 2000 }).withMessage('Description must be between 10 and 2000 characters'),
    (0, express_validator_1.body)('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    (0, express_validator_1.body)('comparePrice').optional().isFloat({ min: 0 }).withMessage('Compare price must be a positive number'),
    (0, express_validator_1.body)('sku').optional().trim().isLength({ min: 1 }).withMessage('SKU is required'),
    (0, express_validator_1.body)('category').optional().isMongoId().withMessage('Valid category ID is required'),
    (0, express_validator_1.body)('inventory').optional().isInt({ min: 0 }).withMessage('Inventory must be a non-negative integer')
], validate_1.validateRequest, async (req, res, next) => {
    try {
        const updateData = req.body;
        if (updateData.slug || updateData.sku) {
            const existingProduct = await models_1.Product.findOne({
                _id: { $ne: req.params.id },
                $or: [
                    ...(updateData.slug ? [{ slug: updateData.slug }] : []),
                    ...(updateData.sku ? [{ sku: updateData.sku }] : [])
                ]
            });
            if (existingProduct) {
                throw new errorHandler_1.CustomError('Product with this slug or SKU already exists', 400);
            }
        }
        if (updateData.category) {
            const categoryExists = await models_1.Category.findById(updateData.category);
            if (!categoryExists) {
                throw new errorHandler_1.CustomError('Category not found', 400);
            }
        }
        const product = await models_1.Product.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true }).populate('category', 'name slug');
        if (!product) {
            throw new errorHandler_1.CustomError('Product not found', 404);
        }
        res.json({
            success: true,
            message: 'Product updated successfully',
            data: product
        });
    }
    catch (error) {
        next(error);
    }
});
router.delete('/:id', async (req, res, next) => {
    try {
        const product = await models_1.Product.findByIdAndDelete(req.params.id);
        if (!product) {
            throw new errorHandler_1.CustomError('Product not found', 404);
        }
        res.json({
            success: true,
            message: 'Product deleted successfully'
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=product.js.map