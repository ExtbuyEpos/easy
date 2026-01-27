
import { Product, User } from './types';

export const CURRENCY = '$';

export const INITIAL_PRODUCTS: Product[] = [
  // --- APPAREL / CLOTHING ---
  {
    id: 'CL-001',
    sku: 'APP-1001',
    name: 'Midnight Urban Hoodie',
    costPrice: 15.00,
    sellPrice: 45.00,
    stock: 50,
    category: 'Apparel',
    image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=600',
    tags: ['Streetwear', 'Cotton']
  },
  {
    id: 'CL-002',
    sku: 'APP-1002',
    name: 'Vintage Leather Jacket',
    costPrice: 85.00,
    sellPrice: 189.99,
    stock: 12,
    category: 'Apparel',
    image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&q=80&w=600',
    tags: ['Premium', 'Leather']
  },
  {
    id: 'CL-003',
    sku: 'APP-1003',
    name: 'Classic White Tee',
    costPrice: 5.00,
    sellPrice: 19.50,
    stock: 100,
    category: 'Apparel',
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=600',
    tags: ['Basic', 'Essential']
  },
  {
    id: 'CL-004',
    sku: 'APP-1004',
    name: 'Slim Fit Denim Jeans',
    costPrice: 22.00,
    sellPrice: 59.00,
    stock: 45,
    category: 'Apparel',
    image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&q=80&w=600',
    tags: ['Denim', 'Blue']
  },

  // --- AUTOMOTIVE / CARS & PERFORMANCE ---
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
  },
  {
    id: 'CR-002',
    sku: 'VEH-9002',
    name: 'Heritage Sport Coupe',
    costPrice: 38000,
    sellPrice: 54500,
    stock: 1,
    category: 'Automotive',
    image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=800',
    tags: ['Turbo', 'Classic']
  },
  {
    id: 'CP-005',
    sku: 'PERF-101',
    name: 'Carbon Fiber GT Wing',
    costPrice: 200.00,
    sellPrice: 550.00,
    stock: 8,
    category: 'Car Parts',
    image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=600',
    tags: ['Aero', 'Performance']
  },
  {
    id: 'CP-006',
    sku: 'PERF-102',
    name: 'Forged Racing Wheels (Set)',
    costPrice: 800.00,
    sellPrice: 1600.00,
    stock: 4,
    category: 'Car Parts',
    image: 'https://images.unsplash.com/photo-1552650272-b8a34e21bc4b?auto=format&fit=crop&q=80&w=600',
    tags: ['Alloy', 'Rims']
  },

  // --- EXISTING ITEMS ---
  { 
    id: '1', 
    sku: '8801001', 
    name: 'Organic Coffee Beans', 
    costPrice: 12.00, 
    sellPrice: 18.50, 
    stock: 45, 
    category: 'Beverage',
    image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&q=80&w=200',
    tags: ['Organic', 'Best Seller']
  },
  {
    id: 'CA-001',
    sku: 'CA-1001',
    name: 'Universal Phone Mount',
    costPrice: 4.50,
    sellPrice: 12.99,
    stock: 35,
    category: 'Car Accessories',
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&q=80&w=200',
    tags: ['Interior', 'Gadget']
  },
  {
    id: 'CA-002',
    sku: 'CA-1002',
    name: 'LED Interior Ambient Lights',
    costPrice: 8.00,
    sellPrice: 19.99,
    stock: 15,
    category: 'Car Accessories',
    image: 'https://images.unsplash.com/photo-1542318073-671c2250284f?auto=format&fit=crop&q=80&w=200',
    tags: ['Lighting', 'Modification']
  },
  {
    id: 'CP-001',
    sku: 'CP-2001',
    name: 'Synthetic Motor Oil 5W-30',
    costPrice: 8.00,
    sellPrice: 16.50,
    stock: 40,
    category: 'Car Parts',
    image: 'https://images.unsplash.com/photo-1593257853483-e070860473a2?auto=format&fit=crop&q=80&w=200',
    tags: ['Maintenance', 'Engine']
  },
  {
    id: 'CC-002',
    sku: 'CC-3002',
    name: 'High Gloss Tire Shine',
    costPrice: 4.50,
    sellPrice: 11.99,
    stock: 25,
    category: 'Car Care',
    image: 'https://images.unsplash.com/photo-1627483262268-9c96d8a36896?auto=format&fit=crop&q=80&w=200',
    tags: ['Detailing']
  }
];

export const INITIAL_USERS: User[] = [
  {
    id: 'admin_1',
    name: 'System Owner',
    username: 'admin',
    password: '123',
    role: 'ADMIN'
  }
];
