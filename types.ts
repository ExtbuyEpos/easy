
export enum AppView {
  LOGIN = 'LOGIN',
  POS = 'POS',
  INVENTORY = 'INVENTORY',
  CATEGORIES = 'CATEGORIES',
  REPORTS = 'REPORTS',
  STOCK_CHECK = 'STOCK_CHECK',
  SETTINGS = 'SETTINGS',
  BAILEYS_SETUP = 'BAILEYS_SETUP',
  ORDERS = 'ORDERS',
  PRINT_BARCODE = 'PRINT_BARCODE',
  CUSTOMER_PORTAL = 'CUSTOMER_PORTAL',
  BOOKINGS = 'BOOKINGS',
  VENDOR_PANEL = 'VENDOR_PANEL',
  VENDOR_REQUESTS = 'VENDOR_REQUESTS'
}

export type UserRole = 'ADMIN' | 'MANAGER' | 'STAFF' | 'CASHIER' | 'CUSTOMER' | 'VENDOR' | 'VENDOR_STAFF';
export type Language = 'en' | 'ar' | 'hi';

export interface Translations {
  [key: string]: string;
}

export interface VendorRequest {
  id: string;
  name: string;
  storeName: string;
  email: string;
  phone: string;
  description?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  timestamp: number;
}

export interface ProductVariant {
  color: string;
  size: string;
  stock: number;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  costPrice: number;
  sellPrice: number;
  stock: number;
  category: string;
  image?: string;
  tags?: string[];
  size?: string;
  color?: string;
  hasVariants?: boolean;
  variants?: ProductVariant[];
  vendorId?: string; // Links product to a specific vendor
}

export interface CartItem extends Product {
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
}

export interface Sale {
  id: string;
  timestamp: number;
  items: CartItem[];
  subTotal: number;
  discount: number;
  discountType?: 'percent' | 'fixed';
  tax: number;
  taxRate?: number;
  total: number;
  paymentMethod: 'CASH' | 'CARD';
  status?: 'COMPLETED' | 'REFUNDED' | 'PARTIAL';
  returnedItems?: { [itemId: string]: number };
  processedBy?: string; // User ID
  customerName?: string;
  customerPhone?: string;
}

export interface Booking {
  id: string;
  timestamp: number;
  customerName: string;
  customerMobile: string;
  customerAddress: string;
  bookingDate: string; // ISO string
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  serviceType?: string;
}

export interface VendorSettings {
  storeName: string;
  storeAddress: string;
  storeLogo?: string;
  shopPasscode: string;
  customUrlSlug: string;
}

export interface User {
  id: string;
  name: string;
  username: string;
  password?: string;
  role: UserRole;
  employeeId?: string;
  email?: string;
  avatar?: string;
  customerAvatar?: string;
  tryOnCache?: Record<string, string>;
  vendorId?: string;
  vendorStaffLimit?: number;
  vendorSettings?: VendorSettings;
}

export interface StoreSettings {
  name: string;
  address: string;
  phone: string;
  logo?: string;
  footerMessage?: string;
  receiptSize?: '58mm' | '80mm';
  whatsappTemplate?: string;
  whatsappPhoneNumber?: string;
  taxEnabled: boolean;
  taxRate: number;
  taxName: string;
  autoPrint: boolean;
  cloudflareAiUrl?: string; 
  hackClubAiUrl?: string; 
  visitorAccessCode?: string; 
}

export interface StockAdjustment {
  id: string;
  timestamp: number;
  sku: string;
  name: string;
  oldStock: number;
  newStock: number;
  variance: number;
  processedBy?: string;
}
