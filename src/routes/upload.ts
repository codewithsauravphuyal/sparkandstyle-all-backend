import express from 'express';
import multer, { StorageEngine } from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import CloudinaryStorage from 'multer-storage-cloudinary';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { CustomError } from '../middleware/errorHandler';

const router = express.Router();

// Configure Multer storage for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'sparkleandstyle',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    public_id: (req: any, file: any) => {
      const timestamp = Date.now();
      const originalName = file.originalname.split('.')[0];
      return `${originalName}-${timestamp}`;
    }
  } as any
}) as StorageEngine;

// Initialize multer upload
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 10 // Maximum 10 files at once
  },
  fileFilter: (req: any, file: any, cb: any) => {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'));
    }
  }
});

// Upload single image (admin only)
router.post('/image', authenticate, authorize('admin'), upload.single('image'), async (req: AuthRequest, res: any, next: any) => {
  try {
    if (!req.file) {
      throw new CustomError('No file uploaded', 400);
    }

    // The file is already uploaded to Cloudinary by multer-storage-cloudinary
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
        format: (req.file as any).format
      }
    });
  } catch (error) {
    next(error);
  }
});

// Upload multiple images (admin only)
router.post('/images', authenticate, authorize('admin'), upload.array('images', 10), async (req: AuthRequest, res: any, next: any) => {
  try {
    const files = req.files as any[];
    
    if (!files || files.length === 0) {
      throw new CustomError('No files uploaded', 400);
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
  } catch (error) {
    next(error);
  }
});

// Delete image from Cloudinary (admin only)
router.delete('/image/:publicId', authenticate, authorize('admin'), async (req: AuthRequest, res: any, next: any) => {
  try {
    const { publicId } = req.params;

    // Delete image from Cloudinary
    const result = await cloudinary.uploader.destroy(`sparkleandstyle/${publicId}`);

    if (result.result === 'ok') {
      res.json({
        success: true,
        message: 'Image deleted successfully'
      });
    } else {
      throw new CustomError('Failed to delete image', 400);
    }
  } catch (error) {
    next(error);
  }
});

// Get image info (admin only)
router.get('/image/:publicId', authenticate, authorize('admin'), async (req: AuthRequest, res: any, next: any) => {
  try {
    const { publicId } = req.params;

    // Get image info from Cloudinary
    const result = await cloudinary.api.resource(`sparkleandstyle/${publicId}`);

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
  } catch (error) {
    next(error);
  }
});

export default router;
