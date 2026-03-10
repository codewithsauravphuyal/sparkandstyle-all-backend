import mongoose, { Document } from 'mongoose';
export interface IProduct extends Document {
    name: string;
    slug: string;
    description: string;
    price: number;
    comparePrice?: number;
    sku: string;
    trackInventory: boolean;
    inventory: number;
    images: string[];
    category: mongoose.Types.ObjectId;
    tags: string[];
    isActive: boolean;
    isFeatured: boolean;
    weight?: number;
    dimensions?: {
        length: number;
        width: number;
        height: number;
    };
    materials: string[];
    careInstructions?: string;
    seoTitle?: string;
    seoDescription?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Product: mongoose.Model<IProduct, {}, {}, {}, mongoose.Document<unknown, {}, IProduct, {}, {}> & IProduct & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Product.d.ts.map