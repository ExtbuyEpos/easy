
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
  PRINT_BARCODE = 'PRINT_BARCODE'
}

export type UserRole = 'ADMIN' | 'MANAGER' | 'STAFF' | 'CASHIER';
export type Language = 'en' | 'ar';

export interface Translations {
  [key: string]: string;
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
}

export interface CartItem extends Product {
  quantity: number;
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

export interface User {
  id: string;
  name: string;
  username: string;
  password?: string;
  role: UserRole;
  employeeId?: string;
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
