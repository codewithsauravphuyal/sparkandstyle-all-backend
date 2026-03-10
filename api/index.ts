import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Import the same routes & middleware as the standalone server
import authRoutes from '../src/routes/auth';
import userRoutes from '../src/routes/user';
import productRoutes from '../src/routes/product';
import categoryRoutes from '../src/routes/category';
import cartRoutes from '../src/routes/cart';
import orderRoutes from '../src/routes/order';
import adminRoutes from '../src/routes/admin';
import uploadRoutes from '../src/routes/upload';
import blogRoutes from '../src/routes/blog';
import adminBlogRoutes from '../src/routes/adminBlog';
import contactRoutes from '../src/routes/contact';
import wishlistRoutes from '../src/routes/wishlist';
import settingsRoutes from '../src/routes/settings';

import { errorHandler } from '../src/middleware/errorHandler';
import { notFound } from '../src/middleware/notFound';

dotenv.config();

const app = express();

// Rate limiting (same as server.ts)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
});

// Middleware
app.use(helmet());
app.use(limiter);
app.use(
  cors({
    origin:
      process.env.ALLOWED_ORIGINS?.split(',') || [
        'http://localhost:3000',
        'https://bidisha-sparkandstyle.vercel.app',
      ],
    credentials: true,
  }),
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check / root
app.get('/', (req, res) => {
  res
    .status(200)
    .json({ message: 'API is working', timestamp: new Date().toISOString() });
});

// Database connection (lazy connect per request for serverless)
const connectDB = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('MongoDB Connected');
  }
};

// Ensure DB is connected before hitting routes
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ error: 'Database connection error' });
  }
});

// API Routes (mirror of src/server.ts)
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/blog', adminBlogRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/settings', settingsRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Vercel handler
export default function handler(req: any, res: any) {
  return app(req, res);
}
