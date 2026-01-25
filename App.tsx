import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { POS } from './components/POS';
import { Inventory } from './components/Inventory';
import { Reports } from './components/Reports';
import { Login } from './components/Login';
import { StockCheck } from './components/StockCheck';
import { Settings } from './components/Settings';
import { BaileysSetup } from './components/BaileysSetup';
import { Orders } from './components/Orders';
import { AppView, Product, Sale, CartItem, User, StoreSettings } from './types';
import { INITIAL_PRODUCTS, INITIAL_USERS } from './constants';
import { Menu, CloudOff, RefreshCw } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<AppView>(AppView.POS);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  // Mobile UI State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Network State
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  const [storeSettings, setStoreSettings] = useState<StoreSettings>({
    name: 'easyPOS',
    address: 'Retail Management System',
    phone: '',
    footerMessage: 'Thank you for your business!',
    receiptSize: '80mm',
    whatsappTemplate: `🧾 *{store_name}*
Order: #{order_id}
Date: {date}

*Items:*
{items}

----------------
Subtotal: {subtotal}
Discount: {discount}
*TOTAL: {total}*
----------------

{footer}`,
    whatsappPhoneNumber: '',
    taxEnabled: false,
    taxRate: 0,
    taxName: 'Tax'
  });

  // --- Network Listeners ---
  useEffect(() => {
    const handleOnline = () => {
        setIsOnline(true);
        setIsSyncing(true);
        // Simulate Sync Process
        setTimeout(() => {
            setIsSyncing(false);
        }, 2500);
    };

    const handleOffline = () => {
        setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize Data (Simulate Database) & Pre-load Local Storage
  useEffect(() => {
    const savedProducts = localStorage.getItem('easyPOS_products');
    const savedSales = localStorage.getItem('easyPOS_sales');
    const savedUsers = localStorage.getItem('easyPOS_users');
    const savedSettings = localStorage.getItem('easyPOS_storeSettings');

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

    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setStoreSettings(prev => ({ 
          ...prev, // Keep defaults if new keys are missing in localstorage
          ...parsed,
          whatsappTemplate: parsed.whatsappTemplate || prev.whatsappTemplate 
      }));
    }
  }, []);

  // Persistence Effects (Offline Storage)
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

  const handleBulkUpdateProduct = (updatedProducts: Product[]) => {
    const updatesMap = new Map(updatedProducts.map(p => [p.id, p]));
    setProducts(products.map(p => updatesMap.has(p.id) ? updatesMap.get(p.id)! : p));
  };

  const handleDeleteProduct = (id: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  const handleCheckout = (items: CartItem[], total: number, paymentMethod: 'CASH' | 'CARD', subTotal: number, discount: number, tax: number) => {
    const newSale: Sale = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      items,
      subTotal,
      discount,
      tax,
      total,
      paymentMethod,
      status: 'COMPLETED'
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

  const handleProcessReturn = (saleId: string, returnMap: { [itemId: string]: number }) => {
    // 1. Update Sales Record
    const updatedSales = sales.map(sale => {
      if (sale.id === saleId) {
        const prevReturns = sale.returnedItems || {};
        const newReturns = { ...prevReturns };
        
        // Merge new returns
        Object.entries(returnMap).forEach(([itemId, qty]) => {
          newReturns[itemId] = (newReturns[itemId] || 0) + qty;
        });

        // Sanity Check: Ensure we don't return more than purchased
        sale.items.forEach(item => {
            if (newReturns[item.id] > item.quantity) {
                newReturns[item.id] = item.quantity;
            }
        });

        // Calculate status
        let totalOriginalCount = 0;
        let totalReturnedCount = 0;

        sale.items.forEach(item => {
            totalOriginalCount += item.quantity;
            totalReturnedCount += (newReturns[item.id] || 0);
        });

        // If everything returned, mark REFUNDED, else PARTIAL
        const status = totalReturnedCount >= totalOriginalCount ? 'REFUNDED' : 'PARTIAL';

        return { ...sale, returnedItems: newReturns, status };
      }
      return sale;
    });
    setSales(updatedSales);

    // 2. Update Stock (Restock items)
    const updatedProducts = products.map(p => {
       const returnQty = returnMap[p.id];
       if (returnQty && returnQty > 0) {
           return { ...p, stock: p.stock + returnQty };
       }
       return p;
    });
    setProducts(updatedProducts);
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

  // Settings Actions
  const handleUpdateStoreSettings = (settings: StoreSettings) => {
    setStoreSettings(settings);
    localStorage.setItem('easyPOS_storeSettings', JSON.stringify(settings));
  };

  const handleViewChange = (view: AppView) => {
      setCurrentView(view);
      setIsMobileMenuOpen(false); // Close mobile menu on navigation
  };

  if (!user) {
    return <Login onLogin={setUser} users={users} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans flex-col lg:flex-row">
      
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Responsive Container */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 shadow-2xl transform transition-transform duration-300 lg:translate-x-0 lg:static lg:w-64 lg:shadow-none ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <Sidebar 
            currentView={currentView} 
            onChangeView={handleViewChange} 
            onLogout={() => setUser(null)} 
            currentUser={user}
            onCloseMobile={() => setIsMobileMenuOpen(false)}
            isOnline={isOnline}
            isSyncing={isSyncing}
          />
      </div>
      
      {/* Main Layout Area */}
      <main className="flex-1 overflow-hidden relative flex flex-col min-w-0">
        
        {/* Sync/Offline Banner (Top Overlay) */}
        {!isOnline && (
            <div className="bg-red-500 text-white text-xs font-bold text-center py-1 absolute top-0 left-0 right-0 z-50">
                <span className="flex items-center justify-center gap-2">
                    <CloudOff size={14} /> YOU ARE OFFLINE. DATA SAVING LOCALLY.
                </span>
            </div>
        )}
        {isSyncing && (
             <div className="bg-blue-500 text-white text-xs font-bold text-center py-1 absolute top-0 left-0 right-0 z-50 animate-pulse">
                <span className="flex items-center justify-center gap-2">
                    <RefreshCw size={14} className="animate-spin" /> CONNECTION RESTORED. SYNCING DATA...
                </span>
            </div>
        )}
        
        {/* Mobile Header */}
        <div className="lg:hidden bg-slate-900 text-white p-4 flex items-center justify-between shrink-0 shadow-md z-30">
            <div className="flex items-center gap-3">
               <button onClick={() => setIsMobileMenuOpen(true)} className="p-1 hover:bg-slate-800 rounded">
                  <Menu size={24} />
               </button>
               <h1 className="font-bold text-lg tracking-tight">easyPOS</h1>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center font-bold text-sm">
                    {user.name.charAt(0).toUpperCase()}
                </div>
            </div>
        </div>

        {/* Content Viewport */}
        <div className={`flex-1 overflow-hidden relative ${(!isOnline || isSyncing) ? 'pt-6' : ''}`}>
            {currentView === AppView.POS && (
            <POS 
                products={products} 
                onCheckout={handleCheckout} 
                storeSettings={storeSettings}
            />
            )}
            
            {currentView === AppView.INVENTORY && (
            <Inventory 
                products={products} 
                onAddProduct={handleAddProduct}
                onUpdateProduct={handleUpdateProduct}
                onBulkUpdateProduct={handleBulkUpdateProduct}
                onDeleteProduct={handleDeleteProduct}
            />
            )}
            
            {currentView === AppView.STOCK_CHECK && (
            <StockCheck 
                products={products}
                onUpdateStock={handleStockUpdate}
            />
            )}

            {currentView === AppView.ORDERS && (
            <Orders 
                sales={sales} 
                onProcessReturn={handleProcessReturn} 
            />
            )}

            {currentView === AppView.REPORTS && (
            <Reports sales={sales} products={products} />
            )}

            {currentView === AppView.SETTINGS && user.role === 'ADMIN' && (
            <Settings 
                users={users} 
                products={products}
                sales={sales}
                onAddUser={handleAddUser} 
                onDeleteUser={handleDeleteUser}
                currentUser={user}
                storeSettings={storeSettings}
                onUpdateStoreSettings={handleUpdateStoreSettings}
            />
            )}

            {currentView === AppView.BAILEYS_SETUP && user.role === 'ADMIN' && (
                <BaileysSetup 
                onUpdateStoreSettings={handleUpdateStoreSettings} 
                settings={storeSettings}
                />
            )}
        </div>
      </main>
    </div>
  );
};

export default App;