"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const models_1 = require("../models");
const generateToken_1 = require("../utils/generateToken");
const errorHandler_1 = require("../middleware/errorHandler");
const validate_1 = require("../middleware/validate");
const router = express_1.default.Router();
const registerValidation = [
    (0, express_validator_1.body)('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
    (0, express_validator_1.body)('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    (0, express_validator_1.body)('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    (0, express_validator_1.body)('phone').optional().matches(/^[+]?[\d\s-()]+$/).withMessage('Please provide a valid phone number')
];
const loginValidation = [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    (0, express_validator_1.body)('password').notEmpty().withMessage('Password is required')
];
router.post('/register', registerValidation, validate_1.validateRequest, async (req, res, next) => {
    try {
        const { name, email, password, phone, address } = req.body;
        const existingUser = await models_1.User.findOne({ email });
        if (existingUser) {
            throw new errorHandler_1.CustomError('User already exists with this email', 400);
        }
        const user = await models_1.User.create({
            name,
            email,
            password,
            phone,
            address
        });
        const token = (0, generateToken_1.generateToken)(user._id.toString());
        delete user.password;
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user,
                token
            }
        });
    }
    catch (error) {
        next(error);
    }
});
router.post('/login', loginValidation, validate_1.validateRequest, async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await models_1.User.findOne({ email }).select('+password');
        if (!user) {
            throw new errorHandler_1.CustomError('Invalid email or password', 401);
        }
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            throw new errorHandler_1.CustomError('Invalid email or password', 401);
        }
        const token = (0, generateToken_1.generateToken)(user._id.toString());
        delete user.password;
        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user,
                token
            }
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map