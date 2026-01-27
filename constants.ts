
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
  },
  {
    id: 'DEMO-EL-003',
    sku: 'PB-20K-FAST',
    name: 'Velocity 20,000mAh Power Bank',
    costPrice: 25.00,
    sellPrice: 59.99,
    stock: 30,
    category: 'Electronics',
    image: 'https://images.unsplash.com/photo-1619441201138-04d306637968?auto=format&fit=crop&q=80&w=600',
    tags: ['Accessory', 'Fast Charge']
  },

  // --- HOME & LIFESTYLE ---
  {
    id: 'DEMO-HM-001',
    sku: 'MUG-CER-BRN',
    name: 'Artisan Ceramic Coffee Mug',
    costPrice: 4.50,
    sellPrice: 15.00,
    stock: 50,
    category: 'Home & Kitchen',
    image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&q=80&w=600',
    color: 'Terracotta',
    tags: ['Handmade', 'Kitchen']
  },
  {
    id: 'DEMO-HM-002',
    sku: 'LMP-DSK-LED',
    name: 'Modern LED Desk Lamp',
    costPrice: 15.00,
    sellPrice: 45.00,
    stock: 15,
    category: 'Home & Kitchen',
    image: 'https://images.unsplash.com/photo-1534073828943-f801091bb18c?auto=format&fit=crop&q=80&w=600',
    color: 'Silver',
    tags: ['Office', 'Lighting']
  },
  {
    id: 'DEMO-HM-003',
    sku: 'BOT-HYD-1L',
    name: 'Insulated Water Bottle (1L)',
    costPrice: 12.00,
    sellPrice: 32.00,
    stock: 45,
    category: 'Home & Kitchen',
    image: 'https://images.unsplash.com/photo-1602143307185-8a155539b324?auto=format&fit=crop&q=80&w=600',
    color: 'Forest Green',
    tags: ['Eco', 'Outdoor']
  },

  // --- ACCESSORIES ---
  {
    id: 'DEMO-AC-001',
    sku: 'BPK-ADV-30L',
    name: 'Nomad Adventure Backpack',
    costPrice: 35.00,
    sellPrice: 89.00,
    stock: 10,
    category: 'Accessories',
    image: 'https://images.unsplash.com/photo-1553062407-98eeb94c6a62?auto=format&fit=crop&q=80&w=600',
    color: 'Tan',
    tags: ['Travel', 'Waterproof']
  },
  {
    id: 'DEMO-AC-002',
    sku: 'WLT-LTH-MIN',
    name: 'Minimalist Leather Wallet',
    costPrice: 12.00,
    sellPrice: 35.00,
    stock: 22,
    category: 'Accessories',
    image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&q=80&w=600',
    color: 'Cognac',
    tags: ['Premium', 'RFID']
  },
  {
    id: 'DEMO-AC-003',
    sku: 'SNG-VNT-BLK',
    name: 'Retro Aviator Sunglasses',
    costPrice: 15.00,
    sellPrice: 49.00,
    stock: 14,
    category: 'Accessories',
    image: 'https://images.unsplash.com/photo-1511499767390-a73c2331bbf1?auto=format&fit=crop&q=80&w=600',
    color: 'Gold/Black',
    tags: ['Fashion', 'UV400']
  },

  // --- AUTOMOTIVE (PREVIOUS DEMO DATA RETAINED) ---
  {
    id: 'CR-001',
    sku: 'VEH-9001',
    name: 'Model S Performance Sedan',
    costPrice: 45000,
    sellPrice: 62000,
    stock: 2,
    category: 'Automotive',
    image: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&q=80&w=800',
    tags: ['Electric', 'Luxury']
  }
];

export const INITIAL_USERS: User[] = [
  {
    id: 'admin_1',
    name: 'Admin Main',
    username: 'admin',
    password: '97986666',
    role: 'ADMIN',
    email: 'zahratalsawsen1@gmail.com'
  }
];
