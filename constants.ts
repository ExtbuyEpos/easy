
import { Product, User } from './types';

export const CURRENCY = '$';

export const INITIAL_PRODUCTS: Product[] = [
  // --- APPAREL / CLOTHING (WITH VARIANTS) ---
  {
    id: 'DEMO-CL-001',
    sku: 'TSH-BLK-M',
    name: 'Urban Essentials Tee - Black',
    costPrice: 8.00,
    sellPrice: 25.00,
    stock: 40,
    category: 'Apparel',
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=600',
    size: 'M',
    color: 'Black',
    tags: ['Cotton', 'Summer']
  },
  {
    id: 'DEMO-CL-002',
    sku: 'TSH-WHT-L',
    name: 'Urban Essentials Tee - White',
    costPrice: 8.00,
    sellPrice: 25.00,
    stock: 35,
    category: 'Apparel',
    image: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&q=80&w=600',
    size: 'L',
    color: 'White',
    tags: ['Cotton', 'Summer']
  },
  {
    id: 'DEMO-CL-003',
    sku: 'HOD-NVY-XL',
    name: 'Premium Fleece Hoodie - Navy',
    costPrice: 18.00,
    sellPrice: 55.00,
    stock: 20,
    category: 'Apparel',
    image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=600',
    size: 'XL',
    color: 'Navy',
    tags: ['Winter', 'Heavyweight']
  },
  {
    id: 'DEMO-CL-004',
    sku: 'JNS-BLU-32',
    name: 'Classic Slim Fit Denim',
    costPrice: 22.00,
    sellPrice: 65.00,
    stock: 25,
    category: 'Apparel',
    image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&q=80&w=600',
    size: '32/S',
    color: 'Blue',
    tags: ['Denim', 'Stretch']
  },

  // --- ELECTRONICS & GADGETS ---
  {
    id: 'DEMO-EL-001',
    sku: 'SW-PRO-MAX',
    name: 'Titan Pro Smartwatch',
    costPrice: 120.00,
    sellPrice: 299.00,
    stock: 12,
    category: 'Electronics',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=600',
    color: 'Space Gray',
    tags: ['Tech', 'OLED']
  },
  {
    id: 'DEMO-EL-002',
    sku: 'EBD-AIR-V2',
    name: 'SonicWave Wireless Earbuds',
    costPrice: 45.00,
    sellPrice: 129.00,
    stock: 18,
    category: 'Electronics',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=600',
    color: 'Matte Black',
    tags: ['Audio', 'Bluetooth']
  }
];

export const INITIAL_USERS: User[] = [
  {
    id: 'admin_1',
    name: 'Nabeel Khan',
    username: 'nabeelkhan',
    password: 'root_password',
    role: 'ADMIN',
    email: 'nabeelkhan1007@gmail.com'
  },
  {
    id: 'admin_2',
    name: 'Admin Secondary',
    username: 'admin',
    password: '97986666',
    role: 'ADMIN',
    email: 'zahratalsawsen1@gmail.com'
  },
  {
    id: 'demo_sys_admin',
    name: 'Test Administrator',
    username: 'testadmin',
    password: '123',
    role: 'ADMIN'
  },
  {
    id: 'demo_vendor',
    name: 'Demo Vendor',
    username: 'vendor',
    password: '123',
    role: 'VENDOR',
    vendorId: 'VND-DEMO',
    vendorSettings: {
        storeName: 'Demo Vendor Shop',
        storeAddress: '123 Demo St',
        shopPasscode: '2026',
        customUrlSlug: 'vnd-demo'
    },
    vendorStaffLimit: 5
  },
  {
    id: 'demo_customer',
    name: 'Demo Customer',
    username: 'customer',
    password: '123',
    role: 'CUSTOMER'
  },
  {
    id: 'demo_staff',
    name: 'Demo Staff',
    username: 'staff',
    password: '123',
    role: 'STAFF'
  }
];
