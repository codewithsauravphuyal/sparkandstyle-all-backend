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
router.get('/', async (req, res, next) => {
    try {
        const categories = await models_1.Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
        res.json({
            success: true,
            data: categories
        });
    }
    catch (error) {
        next(error);
    }
});
router.get('/slug/:slug', async (req, res, next) => {
    try {
        const category = await models_1.Category.findOne({ slug: req.params.slug, isActive: true });
        if (!category) {
            throw new errorHandler_1.CustomError('Category not found', 404);
        }
        res.json({
            success: true,
            data: category
        });
    }
    catch (error) {
        next(error);
    }
});
router.use(auth_1.authenticate);
router.use((0, auth_1.authorize)('admin'));
router.post('/', [
    (0, express_validator_1.body)('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
    (0, express_validator_1.body)('slug').trim().isLength({ min: 2, max: 50 }).withMessage('Slug must be between 2 and 50 characters'),
    (0, express_validator_1.body)('description').optional().trim().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters')
], validate_1.validateRequest, async (req, res, next) => {
    try {
        const { name, slug, description, image, sortOrder } = req.body;
        const existingCategory = await models_1.Category.findOne({ slug });
        if (existingCategory) {
            throw new errorHandler_1.CustomError('Category with this slug already exists', 400);
        }
        const category = await models_1.Category.create({
            name,
            slug,
            description,
            image,
            sortOrder: sortOrder || 0
        });
        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            data: category
        });
    }
    catch (error) {
        next(error);
    }
});
router.put('/:id', [
    (0, express_validator_1.body)('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
    (0, express_validator_1.body)('slug').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Slug must be between 2 and 50 characters'),
    (0, express_validator_1.body)('description').optional().trim().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters')
], validate_1.validateRequest, async (req, res, next) => {
    try {
        const { name, slug, description, image, isActive, sortOrder } = req.body;
        if (slug) {
            const existingCategory = await models_1.Category.findOne({ slug, _id: { $ne: req.params.id } });
            if (existingCategory) {
                throw new errorHandler_1.CustomError('Category with this slug already exists', 400);
            }
        }
        const category = await models_1.Category.findByIdAndUpdate(req.params.id, { name, slug, description, image, isActive, sortOrder }, { new: true, runValidators: true });
        if (!category) {
            throw new errorHandler_1.CustomError('Category not found', 404);
        }
        res.json({
            success: true,
            message: 'Category updated successfully',
            data: category
        });
    }
    catch (error) {
        next(error);
    }
});
router.delete('/:id', async (req, res, next) => {
    try {
        const category = await models_1.Category.findByIdAndDelete(req.params.id);
        if (!category) {
            throw new errorHandler_1.CustomError('Category not found', 404);
        }
        res.json({
            success: true,
            message: 'Category deleted successfully'
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=category.js.map