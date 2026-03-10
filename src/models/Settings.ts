import mongoose, { Document, Schema } from 'mongoose';

export interface IPaymentSettings {
  qrCodeImage: string;
  qrCodeEnabled: boolean;
  paymentInstructions?: string;
  accountNumber?: string;
  accountName?: string;
  bankName?: string;
}

export interface IShippingSettings {
  deliveryPartners: Array<{
    name: string;
    website: string;
    trackingUrlTemplate?: string; // e.g., "https://nepalcanmoves.com/track/{trackingNumber}"
    enabled: boolean;
  }>;
  defaultShippingCost: number;
  freeShippingThreshold: number;
}

export interface ISettings extends Document {
  payment: IPaymentSettings;
  shipping: IShippingSettings;
  storeName: string;
  storeEmail: string;
  storePhone?: string;
  storeAddress?: string;
  updatedAt: Date;
}

function getDefaultStoreEmail() {
  const email = process.env.STORE_EMAIL ?? process.env.ADMIN_EMAIL ?? '';
  return email.toLowerCase();
}

const paymentSettingsSchema = new Schema<IPaymentSettings>({
  qrCodeImage: {
    type: String,
    trim: true
  },
  qrCodeEnabled: {
    type: Boolean,
    default: true
  },
  paymentInstructions: {
    type: String,
    trim: true,
    maxlength: [500, 'Payment instructions cannot exceed 500 characters']
  },
  accountNumber: {
    type: String,
    trim: true
  },
  accountName: {
    type: String,
    trim: true
  },
  bankName: {
    type: String,
    trim: true
  }
});

const shippingSettingsSchema = new Schema<IShippingSettings>({
  deliveryPartners: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    website: {
      type: String,
      required: true,
      trim: true
    },
    trackingUrlTemplate: {
      type: String,
      trim: true
    },
    enabled: {
      type: Boolean,
      default: true
    }
  }],
  defaultShippingCost: {
    type: Number,
    default: 25,
    min: [0, 'Shipping cost cannot be negative']
  },
  freeShippingThreshold: {
    type: Number,
    default: 500,
    min: [0, 'Free shipping threshold cannot be negative']
  }
});

const settingsSchema = new Schema<ISettings>({
  payment: {
    type: paymentSettingsSchema,
    default: () => ({
      qrCodeEnabled: true,
      qrCodeImage: '',
      paymentInstructions: 'Please scan the QR code and upload your payment screenshot.'
    })
  },
  shipping: {
    type: shippingSettingsSchema,
    default: () => ({
      deliveryPartners: [
        {
          name: 'Nepal Can Moves',
          website: 'https://nepalcanmoves.com',
          trackingUrlTemplate: 'https://nepalcanmoves.com/track/{trackingNumber}',
          enabled: true
        },
        {
          name: 'Pathaoo',
          website: 'https://pathaoo.com',
          trackingUrlTemplate: 'https://pathaoo.com/track/{trackingNumber}',
          enabled: true
        }
      ],
      defaultShippingCost: 25,
      freeShippingThreshold: 500
    })
  },
  storeName: {
    type: String,
    default: 'Sparkle and Style',
    trim: true
  },
  storeEmail: {
    type: String,
    required: [true, 'Store email is required'],
    default: getDefaultStoreEmail,
    trim: true,
    lowercase: true
  },
  storePhone: {
    type: String,
    trim: true
  },
  storeAddress: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Ensure only one settings document exists
settingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({
      storeEmail: getDefaultStoreEmail()
    });
  }
  return settings;
};

export const Settings = mongoose.model<ISettings>('Settings', settingsSchema);
