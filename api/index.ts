import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'https://bidisha-sparkandstyle.vercel.app'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check / root
app.get('/', (req, res) => {
  res.status(200).json({ message: 'API is working', timestamp: new Date().toISOString() });
});

// Database connection (lazy connect per request for serverless)
const connectDB = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('MongoDB Connected');
  }
};

// Example protected route (you can import your existing routes here)
app.get('/api/admin/me', async (req, res) => {
  try {
    await connectDB();
    res.json({ message: 'Protected endpoint works' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default async function handler(req: any, res: any) {
  return app(req, res);
}
