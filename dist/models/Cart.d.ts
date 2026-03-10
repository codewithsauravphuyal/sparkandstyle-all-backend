import mongoose, { Document } from 'mongoose';
export interface ICartItem {
    product: mongoose.Types.ObjectId;
    quantity: number;
    addedAt: Date;
}
export interface ICart extends Document {
    user: mongoose.Types.ObjectId;
    items: ICartItem[];
    createdAt: Date;
    updatedAt: Date;
}
export declare const Cart: mongoose.Model<ICart, {}, {}, {}, mongoose.Document<unknown, {}, ICart, {}, {}> & ICart & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Cart.d.ts.map