import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { POS } from './components/POS';
import { Inventory } from './components/Inventory';
import { Reports } from './components/Reports';
import { Login } from './components/Login';
import { StockCheck } from './components/StockCheck';
import { Settings } from './components/Settings';
import { AppView, Product, Sale, CartItem, User } from './types';
import { INITIAL_PRODUCTS, INITIAL_USERS } from './constants';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<AppView>(AppView.POS);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Initialize Data (Simulate Database)
  useEffect(() => {
    const savedProducts = localStorage.getItem('easyPOS_products');
    const savedSales = localStorage.getItem('easyPOS_sales');
    const savedUsers = localStorage.getItem('easyPOS_users');

    if (savedProducts) {
      setProducts(JSON.parse(savedProducts));
    } else {
      setProducts(INITIAL_PRODUCTS);
    }

    if (savedSales) {
      setSales(JSON.parse(savedSales));
    }

    if (savedUsers) {
      setUsers(JSON.parse(savedUsers));
    } else {
      setUsers(INITIAL_USERS);
    }
  }, []);

  // Persistence Effects
  useEffect(() => {
    if (products.length > 0) localStorage.setItem('easyPOS_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    if (sales.length > 0) localStorage.setItem('easyPOS_sales', JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
     if (users.length > 0) localStorage.setItem('easyPOS_users', JSON.stringify(users));
  }, [users]);

  // Actions
  const handleAddProduct = (newProduct: Product) => {
    setProducts([...products, newProduct]);
  };

  const handleUpdateProduct = (updatedProduct: Product) => {
    setProducts(products.map(p => p.id === updatedProduct.id ? updatedProduct : p));
  };

  const handleDeleteProduct = (id: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  const handleCheckout = (items: CartItem[], total: number, paymentMethod: 'CASH' | 'CARD') => {
    const newSale: Sale = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      items,
      total,
      paymentMethod
    };

    setSales([...sales, newSale]);

    // Update Stock
    const newProducts = products.map(p => {
      const soldItem = items.find(i => i.id === p.id);
      if (soldItem) {
        return { ...p, stock: p.stock - soldItem.quantity };
      }
      return p;
    });
    setProducts(newProducts);
  };

  const handleStockUpdate = (id: string, newStock: number) => {
    setProducts(products.map(p => p.id === id ? { ...p, stock: newStock } : p));
  };

  // User Management Actions
  const handleAddUser = (newUser: User) => {
    setUsers([...users, newUser]);
  };

  const handleDeleteUser = (id: string) => {
    setUsers(users.filter(u => u.id !== id));
  };

  if (!user) {
    return <Login onLogin={setUser} users={users} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans">
      <Sidebar 
        currentView={currentView} 
        onChangeView={setCurrentView} 
        onLogout={() => setUser(null)} 
        currentUser={user}
      />
      
      <main className="flex-1 overflow-hidden relative">
        {currentView === AppView.POS && (
          <POS products={products} onCheckout={handleCheckout} />
        )}
        
        {currentView === AppView.INVENTORY && (
          <Inventory 
            products={products} 
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
          />
        )}
        
        {currentView === AppView.STOCK_CHECK && (
          <StockCheck 
            products={products}
            onUpdateStock={handleStockUpdate}
          />
        )}

        {currentView === AppView.REPORTS && (
          <Reports sales={sales} products={products} />
        )}

        {currentView === AppView.SETTINGS && user.role === 'ADMIN' && (
          <Settings 
             users={users} 
             onAddUser={handleAddUser} 
             onDeleteUser={handleDeleteUser}
             currentUser={user}
          />
        )}
      </main>
    </div>
  );
};

export default App;