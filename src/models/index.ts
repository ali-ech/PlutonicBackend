import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IEmirate extends Document {
  name: string;
  active: boolean;
}

const emirateSchema = new Schema<IEmirate>(
  { name: { type: String, required: true }, active: { type: Boolean, default: true } },
  { timestamps: true }
);

export const Emirate = mongoose.model<IEmirate>('Emirate', emirateSchema);

export interface ICity extends Document {
  emirateId: Types.ObjectId;
  name: string;
}

const citySchema = new Schema<ICity>(
  {
    emirateId: { type: Schema.Types.ObjectId, ref: 'Emirate', required: true },
    name: { type: String, required: true },
  },
  { timestamps: true }
);

export const City = mongoose.model<ICity>('City', citySchema);

export interface ICategory extends Document {
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  sortOrder: number;
  active: boolean;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    sortOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Category = mongoose.model<ICategory>('Category', categorySchema);

export interface IServiceStep {
  title: string;
  description: string;
  order: number;
}

export interface ISubService extends Document {
  categoryId: Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  durationMinutes: number;
  youtubeUrl: string;
  steps: IServiceStep[];
  active: boolean;
}

const subServiceSchema = new Schema<ISubService>(
  {
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    description: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    durationMinutes: { type: Number, default: 60 },
    youtubeUrl: { type: String, default: '' },
    steps: [
      {
        title: String,
        description: String,
        order: Number,
      },
    ],
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

subServiceSchema.index({ categoryId: 1, slug: 1 }, { unique: true });

export const SubService = mongoose.model<ISubService>('SubService', subServiceSchema);

export interface ISubServiceCityPrice extends Document {
  subServiceId: Types.ObjectId;
  cityId: Types.ObjectId;
  priceAed: number;
}

const priceSchema = new Schema<ISubServiceCityPrice>(
  {
    subServiceId: { type: Schema.Types.ObjectId, ref: 'SubService', required: true },
    cityId: { type: Schema.Types.ObjectId, ref: 'City', required: true },
    priceAed: { type: Number, required: true },
  },
  { timestamps: true }
);

priceSchema.index({ subServiceId: 1, cityId: 1 }, { unique: true });

export const SubServiceCityPrice = mongoose.model<ISubServiceCityPrice>(
  'SubServiceCityPrice',
  priceSchema
);

export type BookingStatus =
  | 'pending_payment'
  | 'confirmed'
  | 'reschedule_pending'
  | 'completed'
  | 'cancelled';

export type PaymentStatus = 'pending' | 'paid';
export type PaymentMethod = 'stripe' | 'cash' | 'bank_transfer';

export interface IBookingServiceLine {
  subServiceId: Types.ObjectId;
  name: string;
  price: number;
  durationMinutes: number;
}

export interface IRescheduleOption {
  date: string;
  slotStart: string;
  slotEnd: string;
}

export interface IRescheduleProposal {
  options: IRescheduleOption[];
  token: string;
  expiresAt: Date;
  customerSelectedIndex?: number;
}

export interface IBooking extends Document {
  ref: string;
  customer: {
    name: string;
    phone: string;
    email?: string;
    address: string;
    notes?: string;
  };
  cityId: Types.ObjectId;
  date: string;
  slotStart: string;
  slotEnd: string;
  subServices: IBookingServiceLine[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: BookingStatus;
  receiptReceivedOnWhatsapp: boolean;
  stripeSessionId?: string;
  rescheduleProposal?: IRescheduleProposal;
}

const bookingSchema = new Schema<IBooking>(
  {
    ref: { type: String, required: true, unique: true },
    customer: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: String,
      address: { type: String, required: true },
      notes: String,
    },
    cityId: { type: Schema.Types.ObjectId, ref: 'City', required: true },
    date: { type: String, required: true },
    slotStart: { type: String, required: true },
    slotEnd: { type: String, required: true },
    subServices: [
      {
        subServiceId: { type: Schema.Types.ObjectId, ref: 'SubService' },
        name: String,
        price: Number,
        durationMinutes: Number,
      },
    ],
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ['stripe', 'cash', 'bank_transfer'],
      required: true,
    },
    paymentStatus: { type: String, enum: ['pending', 'paid'], default: 'pending' },
    status: {
      type: String,
      enum: ['pending_payment', 'confirmed', 'reschedule_pending', 'completed', 'cancelled'],
      default: 'confirmed',
    },
    receiptReceivedOnWhatsapp: { type: Boolean, default: false },
    stripeSessionId: String,
    rescheduleProposal: {
      options: [{ date: String, slotStart: String, slotEnd: String }],
      token: String,
      expiresAt: Date,
      customerSelectedIndex: Number,
    },
  },
  { timestamps: true }
);

export const Booking = mongoose.model<IBooking>('Booking', bookingSchema);

export interface IAdminUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
  fcmTokens: string[];
}

const adminSchema = new Schema<IAdminUser>(
  {
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    name: { type: String, default: 'Admin' },
    fcmTokens: [String],
  },
  { timestamps: true }
);

export const AdminUser = mongoose.model<IAdminUser>('AdminUser', adminSchema);

export interface ISettings extends Document {
  workStart: string;
  workEnd: string;
  bufferMinutes: number;
  customDiscountPercent: number;
  customDiscountMinServices: number;
  businessInfo: {
    companyName: string;
    address: string;
    phone: string;
    phoneAlt: string;
    whatsapp: string;
    email: string;
    website: string;
    iban: string;
    bankName: string;
    accountName: string;
  };
  socialLinks: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    pinterest?: string;
  };
  googleBusiness?: {
    placeId?: string;
    searchQuery?: string;
    rating?: number;
    reviewCount?: number;
    reviewsUrl?: string;
    mapsUrl?: string;
    directionsUrl?: string;
    mapsEmbedUrl?: string;
    category?: string;
    buildingName?: string;
    photoUrl?: string;
    exteriorPhotoUrl?: string;
  };
}

const settingsSchema = new Schema<ISettings>(
  {
    workStart: { type: String, default: '08:00' },
    workEnd: { type: String, default: '18:00' },
    bufferMinutes: { type: Number, default: 30 },
    customDiscountPercent: { type: Number, default: 10 },
    customDiscountMinServices: { type: Number, default: 2 },
    businessInfo: {
      companyName: String,
      address: String,
      phone: String,
      phoneAlt: String,
      whatsapp: String,
      email: String,
      website: String,
      iban: String,
      bankName: String,
      accountName: String,
    },
    socialLinks: {
      facebook: String,
      instagram: String,
      twitter: String,
      linkedin: String,
      pinterest: String,
    },
    googleBusiness: {
      rating: Number,
      reviewCount: Number,
      reviewsUrl: String,
      mapsUrl: String,
      directionsUrl: String,
      mapsEmbedUrl: String,
      category: String,
      buildingName: String,
      photoUrl: String,
      exteriorPhotoUrl: String,
      placeId: String,
      searchQuery: String,
    },
  },
  { timestamps: true }
);

export const Settings = mongoose.model<ISettings>('Settings', settingsSchema);

export interface ITeamMember extends Document {
  name: string;
  role: string;
  bio: string;
  photoUrl: string;
  sortOrder: number;
}

const teamSchema = new Schema<ITeamMember>(
  {
    name: { type: String, required: true },
    role: { type: String, default: '' },
    bio: { type: String, default: '' },
    photoUrl: { type: String, default: '' },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const TeamMember = mongoose.model<ITeamMember>('TeamMember', teamSchema);

export interface ITestimonial extends Document {
  name: string;
  text: string;
  rating: number;
}

const testimonialSchema = new Schema<ITestimonial>(
  {
    name: { type: String, required: true },
    text: { type: String, required: true },
    rating: { type: Number, default: 5 },
  },
  { timestamps: true }
);

export const Testimonial = mongoose.model<ITestimonial>('Testimonial', testimonialSchema);

export interface IContentPage extends Document {
  slug: string;
  title: string;
  body: string;
}

const contentPageSchema = new Schema<IContentPage>(
  {
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    body: { type: String, default: '' },
  },
  { timestamps: true }
);

export const ContentPage = mongoose.model<IContentPage>('ContentPage', contentPageSchema);

export interface IInquiry extends Document {
  name: string;
  email: string;
  phone: string;
  message: string;
  status: 'new' | 'read' | 'closed';
}

const inquirySchema = new Schema<IInquiry>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, default: '' },
    message: { type: String, required: true },
    status: { type: String, enum: ['new', 'read', 'closed'], default: 'new' },
  },
  { timestamps: true }
);

export const Inquiry = mongoose.model<IInquiry>('Inquiry', inquirySchema);
