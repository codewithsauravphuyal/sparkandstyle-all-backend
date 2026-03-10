import mongoose, { Document } from 'mongoose';
export interface IOrderItem {
    product: mongoose.Types.ObjectId;
    name: string;
    sku: string;
    price: number;
    quantity: number;
    image: string;
}
export interface IShippingAddress {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
}
export interface IShippingInfo {
    deliveryPartner: string;
    trackingNumber?: string;
    trackingLink?: string;
    estimatedDelivery?: Date;
}
export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
export interface IOrder extends Document {
    orderNumber: string;
    user: mongoose.Types.ObjectId;
    items: IOrderItem[];
    totalAmount: number;
    subtotal: number;
    shippingCost: number;
    tax: number;
    status: OrderStatus;
    shippingAddress: IShippingAddress;
    billingAddress?: IShippingAddress;
    shippingInfo?: IShippingInfo;
    paymentMethod: string;
    paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
    paymentId?: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Order: mongoose.Model<IOrder, {}, {}, {}, mongoose.Document<unknown, {}, IOrder, {}, {}> & IOrder & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Order.d.ts.map