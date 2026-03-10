import mongoose, { Document, Schema } from 'mongoose';

export interface IContact extends Document {
  name: string;
  email: string;
  message: string;
  phone?: string;
  subject?: string;
  status: 'new' | 'read' | 'replied' | 'archived';
  repliedAt?: Date;
  repliedBy?: mongoose.Types.ObjectId;
  replyMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const contactSchema = new Schema<IContact>({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxlength: [2000, 'Message cannot exceed 2000 characters']
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[+]?[\d\s-()]+$/, 'Please enter a valid phone number']
  },
  subject: {
    type: String,
    trim: true,
    maxlength: [200, 'Subject cannot exceed 200 characters']
  },
  status: {
    type: String,
    enum: ['new', 'read', 'replied', 'archived'],
    default: 'new'
  },
  repliedAt: {
    type: Date
  },
  repliedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  replyMessage: {
    type: String,
    trim: true,
    maxlength: [2000, 'Reply message cannot exceed 2000 characters']
  }
}, {
  timestamps: true
});

contactSchema.index({ status: 1, createdAt: -1 });
contactSchema.index({ email: 1 });

export const Contact = mongoose.model<IContact>('Contact', contactSchema);
