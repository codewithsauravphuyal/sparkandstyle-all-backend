"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const cloudinary_1 = require("cloudinary");
const multer_storage_cloudinary_1 = __importDefault(require("multer-storage-cloudinary"));
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const router = express_1.default.Router();
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});
const storage = new multer_storage_cloudinary_1.default({
    cloudinary: cloudinary_1.v2,
    params: {
        folder: 'sparkleandstyle',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        public_id: (req, file) => {
            const timestamp = Date.now();
            const originalName = file.originalname.split('.')[0];
            return `${originalName}-${timestamp}`;
        }
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 10
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'));
        }
    }
});
router.post('/image', auth_1.authenticate, (0, auth_1.authorize)('admin'), upload.single('image'), async (req, res, next) => {
    try {
        if (!req.file) {
            throw new errorHandler_1.CustomError('No file uploaded', 400);
        }
        const imageUrl = req.file.path;
        const publicId = req.file.filename;
        res.json({
            success: true,
            message: 'Image uploaded successfully',
            data: {
                url: imageUrl,
                publicId: publicId,
                originalName: req.file.originalname,
                size: req.file.size,
                format: req.file.format
            }
        });
    }
    catch (error) {
        next(error);
    }
});
router.post('/images', auth_1.authenticate, (0, auth_1.authorize)('admin'), upload.array('images', 10), async (req, res, next) => {
    try {
        const files = req.files;
        if (!files || files.length === 0) {
            throw new errorHandler_1.CustomError('No files uploaded', 400);
        }
        const uploadedImages = files.map(file => ({
            url: file.path,
            publicId: file.filename,
            originalName: file.originalname,
            size: file.size,
            format: file.format
        }));
        res.json({
            success: true,
            message: `${files.length} images uploaded successfully`,
            data: uploadedImages
        });
    }
    catch (error) {
        next(error);
    }
});
router.delete('/image/:publicId', auth_1.authenticate, (0, auth_1.authorize)('admin'), async (req, res, next) => {
    try {
        const { publicId } = req.params;
        const result = await cloudinary_1.v2.uploader.destroy(`sparkleandstyle/${publicId}`);
        if (result.result === 'ok') {
            res.json({
                success: true,
                message: 'Image deleted successfully'
            });
        }
        else {
            throw new errorHandler_1.CustomError('Failed to delete image', 400);
        }
    }
    catch (error) {
        next(error);
    }
});
router.get('/image/:publicId', auth_1.authenticate, (0, auth_1.authorize)('admin'), async (req, res, next) => {
    try {
        const { publicId } = req.params;
        const result = await cloudinary_1.v2.api.resource(`sparkleandstyle/${publicId}`);
        res.json({
            success: true,
            data: {
                publicId: result.public_id,
                url: result.secure_url,
                format: result.format,
                size: result.bytes,
                width: result.width,
                height: result.height,
                createdAt: result.created_at
            }
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=upload.js.map