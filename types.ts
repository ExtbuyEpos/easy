export enum AppView {
  LOGIN = 'LOGIN',
  POS = 'POS',
  INVENTORY = 'INVENTORY',
  REPORTS = 'REPORTS',
  STOCK_CHECK = 'STOCK_CHECK',
  SETTINGS = 'SETTINGS',
  BAILEYS_SETUP = 'BAILEYS_SETUP',
  ORDERS = 'ORDERS'
}

export type UserRole = 'ADMIN' | 'MANAGER' | 'STAFF' | 'CASHIER';

export interface Product {
  id: string;
  sku: string; // Barcode
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
  tax: number;
  total: number;
  paymentMethod: 'CASH' | 'CARD';
  status?: 'COMPLETED' | 'REFUNDED' | 'PARTIAL';
  returnedItems?: { [itemId: string]: number }; // Maps Item ID to returned quantity
}

export interface User {
  id: string;
  name: string;
  username: string;
  password?: string;
  role: UserRole;
}

export interface DashboardStats {
  totalSales: number;
  transactionCount: number;
  lowStockCount: number;
  profit: number;
}

export interface StoreSettings {
  name: string;
  address: string;
  phone: string;
  logo?: string; // Base64 string
  footerMessage?: string;
  receiptSize?: '58mm' | '80mm';
  whatsappTemplate?: string;
  taxEnabled: boolean;
  taxRate: number;
  taxName: string;
}