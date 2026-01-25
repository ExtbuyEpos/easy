import { Product, User } from './types';

export const CURRENCY = '$';

export const INITIAL_PRODUCTS: Product[] = [
  // --- EXISTING GENERAL ITEMS ---
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
    id: '2', 
    sku: '8801002', 
    name: 'Green Tea Matcha', 
    costPrice: 8.50, 
    sellPrice: 14.00, 
    stock: 20, 
    category: 'Beverage',
    image: 'https://images.unsplash.com/photo-1582793988951-9aed5509eb97?auto=format&fit=crop&q=80&w=200',
    tags: ['Imported', 'Sugar-Free']
  },

  // --- CAR ACCESSORIES ---
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
    id: 'CA-003',
    sku: 'CA-1003',
    name: 'Premium Steering Wheel Cover',
    costPrice: 6.50,
    sellPrice: 15.50,
    stock: 22,
    category: 'Car Accessories',
    image: 'https://images.unsplash.com/photo-1552554752-c07dd7ae4739?auto=format&fit=crop&q=80&w=200',
    tags: ['Interior', 'Leather']
  },
  {
    id: 'CA-004',
    sku: 'CA-1004',
    name: 'Car Air Freshener - Ocean',
    costPrice: 1.20,
    sellPrice: 4.99,
    stock: 100,
    category: 'Car Accessories',
    image: 'https://images.unsplash.com/photo-1545622692-021021223932?auto=format&fit=crop&q=80&w=200',
    tags: ['Fragrance']
  },

  // --- CAR PARTS ---
  {
    id: 'CP-001',
    sku: 'CP-2001',
    name: 'Synthetic Motor Oil 5W-30 (1L)',
    costPrice: 8.00,
    sellPrice: 16.50,
    stock: 40,
    category: 'Car Parts',
    image: 'https://images.unsplash.com/photo-1593257853483-e070860473a2?auto=format&fit=crop&q=80&w=200',
    tags: ['Maintenance', 'Engine']
  },
  {
    id: 'CP-002',
    sku: 'CP-2002',
    name: 'Oil Filter Type-A',
    costPrice: 3.50,
    sellPrice: 8.99,
    stock: 50,
    category: 'Car Parts',
    image: 'https://images.unsplash.com/photo-1635773273932-c7c4c82b0e7a?auto=format&fit=crop&q=80&w=200',
    tags: ['Maintenance']
  },
  {
    id: 'CP-003',
    sku: 'CP-2003',
    name: 'Ceramic Brake Pads (Front)',
    costPrice: 25.00,
    sellPrice: 55.00,
    stock: 10,
    category: 'Car Parts',
    image: 'https://images.unsplash.com/photo-1486262715619-01b80250e0dc?auto=format&fit=crop&q=80&w=200',
    tags: ['Safety', 'Brakes']
  },
  {
    id: 'CP-004',
    sku: 'CP-2004',
    name: 'Spark Plug Set (4pcs)',
    costPrice: 12.00,
    sellPrice: 28.00,
    stock: 15,
    category: 'Car Parts',
    image: 'https://images.unsplash.com/photo-1632733711679-529326f6db12?auto=format&fit=crop&q=80&w=200',
    tags: ['Engine', 'Electrical']
  },

  // --- CAR CARE ---
  {
    id: 'CC-001',
    sku: 'CC-3001',
    name: 'Microfiber Wash Mitt',
    costPrice: 2.00,
    sellPrice: 6.50,
    stock: 60,
    category: 'Car Care',
    image: 'https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&q=80&w=200',
    tags: ['Cleaning']
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