import { Product, User } from './types';

export const CURRENCY = '$';

export const INITIAL_PRODUCTS: Product[] = [
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
  { 
    id: '3', 
    sku: '8801003', 
    name: 'Ceramic Mug', 
    costPrice: 3.00, 
    sellPrice: 8.99, 
    stock: 12, 
    category: 'Merchandise',
    image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&q=80&w=200',
    tags: ['Fragile']
  },
  { 
    id: '4', 
    sku: '8801004', 
    name: 'Oat Milk 1L', 
    costPrice: 2.50, 
    sellPrice: 4.50, 
    stock: 100, 
    category: 'Dairy',
    image: 'https://images.unsplash.com/photo-1603569283847-aa295f0d016a?auto=format&fit=crop&q=80&w=200',
    tags: ['Vegan', 'Gluten-Free']
  },
  { 
    id: '5', 
    sku: '8801005', 
    name: 'Croissant', 
    costPrice: 1.20, 
    sellPrice: 3.50, 
    stock: 8, 
    category: 'Bakery',
    image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&q=80&w=200',
    tags: ['Fresh']
  },
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