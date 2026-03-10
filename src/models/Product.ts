import mongoose, { Document, Schema } from 'mongoose';

export type Material = "gold" | "silver" | "platinum" | "rose-gold" | "diamond";
export type Occasion = "wedding" | "casual" | "party" | "gift" | "anniversary";

export interface IProduct extends Document {
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  longDescription?: string;
  price: number;
  comparePrice?: number;
  originalPrice?: number;
  sku: string;
  trackInventory: boolean;
  inventory: number;
  stockCount?: number;
  inStock?: boolean;
  images: string[];
  category: mongoose.Types.ObjectId;
  tags: string[];
  isActive: boolean;
  isFeatured: boolean;
  isBestseller?: boolean;
  isNewProduct?: boolean;
  material?: Material;
  materials?: string[];
  occasion?: Occasion[];
  sizes?: string[];
  rating?: number;
  reviewCount?: number;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  careInstructions?: string;
  seoTitle?: string;
  seoDescription?: string;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [100, 'Product name cannot exceed 100 characters']
  },
  slug: {
    type: String,
    required: [true, 'Product slug is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  shortDescription: {
    type: String,
    trim: true,
    maxlength: [500, 'Short description cannot exceed 500 characters']
  },
  longDescription: {
    type: String,
    trim: true,
    maxlength: [5000, 'Long description cannot exceed 5000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0, 'Price cannot be negative']
  },
  comparePrice: {
    type: Number,
    min: [0, 'Compare price cannot be negative']
  },
  originalPrice: {
    type: Number,
    min: [0, 'Original price cannot be negative']
  },
  sku: {
    type: String,
    required: [true, 'SKU is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  trackInventory: {
    type: Boolean,
    default: true
  },
  inventory: {
    type: Number,
    required: [true, 'Inventory is required'],
    min: [0, 'Inventory cannot be negative'],
    default: 0
  },
  stockCount: {
    type: Number,
    min: [0, 'Stock count cannot be negative'],
    default: 0
  },
  inStock: {
    type: Boolean,
    default: true
  },
  images: [{
    type: String,
    trim: true
  }],
  category: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Product category is required']
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  isBestseller: {
    type: Boolean,
    default: false
  },
  isNewProduct: {
    type: Boolean,
    default: false
  },
  material: {
    type: String,
    enum: ['gold', 'silver', 'platinum', 'rose-gold', 'diamond'],
    trim: true
  },
  occasion: [{
    type: String,
    enum: ['wedding', 'casual', 'party', 'gift', 'anniversary'],
    trim: true
  }],
  sizes: [{
    type: String,
    trim: true
  }],
  rating: {
    type: Number,
    min: [0, 'Rating cannot be negative'],
    max: [5, 'Rating cannot exceed 5'],
    default: 0
  },
  reviewCount: {
    type: Number,
    min: [0, 'Review count cannot be negative'],
    default: 0
  },
  weight: {
    type: Number,
    min: [0, 'Weight cannot be negative']
  },
  dimensions: {
    length: {
      type: Number,
      min: [0, 'Length cannot be negative']
    },
    width: {
      type: Number,
      min: [0, 'Width cannot be negative']
    },
    height: {
      type: Number,
      min: [0, 'Height cannot be negative']
    }
  },
  materials: [{
    type: String,
    trim: true
  }],
  careInstructions: {
    type: String,
    trim: true,
    maxlength: [1000, 'Care instructions cannot exceed 1000 characters']
  },
  seoTitle: {
    type: String,
    trim: true,
    maxlength: [60, 'SEO title cannot exceed 60 characters']
  },
  seoDescription: {
    type: String,
    trim: true,
    maxlength: [160, 'SEO description cannot exceed 160 characters']
  }
}, {
  timestamps: true
});

export const Product = mongoose.model<IProduct>('Product', productSchema);
