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
import { Menu, CloudOff, RefreshCw, AlertTriangle } from 'lucide-react';

// Firebase Imports
import { db } from './firebase';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<AppView>(AppView.POS);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  // Mobile UI State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Network State
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isFirebaseConfigured, setIsFirebaseConfigured] = useState(!!db);

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
    taxName: 'Tax',
    autoPrint: false
  });

  // --- Network Listeners ---
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // --- DATA LOADING (Hybrid: Firestore or LocalStorage) ---
  useEffect(() => {
    if (db) {
        // --- FIRESTORE MODE ---
        setIsSyncing(true);
        const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
            const data = snapshot.docs.map(doc => doc.data() as Product);
            setProducts(data);
            if (data.length === 0 && !snapshot.metadata.fromCache) {
                 const batch = writeBatch(db);
                 INITIAL_PRODUCTS.forEach(p => batch.set(doc(db, 'products', p.id), p));
                 batch.commit();
            }
        });

        const unsubCategories = onSnapshot(collection(db, 'categories'), (snapshot) => {
            const data = snapshot.docs.map(doc => doc.id);
            setCategories(data.length > 0 ? data : Array.from(new Set(INITIAL_PRODUCTS.map(p => p.category))).sort());
        });

        const unsubSales = onSnapshot(collection(db, 'sales'), (snapshot) => {
            const data = snapshot.docs.map(doc => doc.data() as Sale);
            setSales(data.sort((a,b) => b.timestamp - a.timestamp));
        });

        const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
            const data = snapshot.docs.map(doc => doc.data() as User);
            setUsers(data);
            if (data.length === 0 && !snapshot.metadata.fromCache) {
                INITIAL_USERS.forEach(u => setDoc(doc(db, 'users', u.id), u));
            }
        });

        const unsubSettings = onSnapshot(doc(db, 'settings', 'store'), (docSnap) => {
            if (docSnap.exists()) {
                setStoreSettings(docSnap.data() as StoreSettings);
            }
            setIsSyncing(false);
        });

        return () => {
            unsubProducts();
            unsubCategories();
            unsubSales();
            unsubUsers();
            unsubSettings();
        };
    } else {
        // --- LOCAL STORAGE MODE ---
        const savedProducts = localStorage.getItem('easyPOS_products');
        const savedCategories = localStorage.getItem('easyPOS_categories');
        const savedSales = localStorage.getItem('easyPOS_sales');
        const savedUsers = localStorage.getItem('easyPOS_users');
        const savedSettings = localStorage.getItem('easyPOS_storeSettings');

        setProducts(savedProducts ? JSON.parse(savedProducts) : INITIAL_PRODUCTS);
        setCategories(savedCategories ? JSON.parse(savedCategories) : Array.from(new Set(INITIAL_PRODUCTS.map(p => p.category))).sort());
        setSales(savedSales ? JSON.parse(savedSales) : []);
        setUsers(savedUsers ? JSON.parse(savedUsers) : INITIAL_USERS);
        
        if (savedSettings) {
            setStoreSettings(prev => ({ ...prev, ...JSON.parse(savedSettings) }));
        }
    }
  }, []);

  // --- LOCAL PERSISTENCE (Only if !db) ---
  useEffect(() => {
      if (!db) {
          localStorage.setItem('easyPOS_products', JSON.stringify(products));
          localStorage.setItem('easyPOS_categories', JSON.stringify(categories));
          localStorage.setItem('easyPOS_sales', JSON.stringify(sales));
          localStorage.setItem('easyPOS_users', JSON.stringify(users));
          localStorage.setItem('easyPOS_storeSettings', JSON.stringify(storeSettings));
      }
  }, [products, categories, sales, users, storeSettings]);


  // --- ACTIONS (Switch between DB and Local State) ---

  const handleAddProduct = async (newProduct: Product) => {
    if (db) {
        await setDoc(doc(db, 'products', newProduct.id), newProduct);
        if (!categories.includes(newProduct.category)) {
            await setDoc(doc(db, 'categories', newProduct.category), { name: newProduct.category });
        }
    } else {
        setProducts([...products, newProduct]);
        if (!categories.includes(newProduct.category)) setCategories([...categories, newProduct.category]);
    }
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    if (db) {
        await setDoc(doc(db, 'products', updatedProduct.id), updatedProduct);
        if (!categories.includes(updatedProduct.category)) {
            await setDoc(doc(db, 'categories', updatedProduct.category), { name: updatedProduct.category });
        }
    } else {
        setProducts(products.map(p => p.id === updatedProduct.id ? updatedProduct : p));
        if (!categories.includes(updatedProduct.category)) setCategories([...categories, updatedProduct.category]);
    }
  };

  const handleBulkUpdateProduct = async (updatedProducts: Product[]) => {
    if (db) {
        const batch = writeBatch(db);
        updatedProducts.forEach(p => batch.set(doc(db, 'products', p.id), p));
        await batch.commit();
    } else {
        const updatesMap = new Map(updatedProducts.map(p => [p.id, p]));
        setProducts(products.map(p => updatesMap.has(p.id) ? updatesMap.get(p.id)! : p));
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    if (db) {
      await deleteDoc(doc(db, 'products', id));
    } else {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  const handleAddCategory = async (category: string) => {
    if (db) {
        await setDoc(doc(db, 'categories', category), { name: category });
    } else {
        if (!categories.includes(category)) setCategories([...categories, category]);
    }
  };

  const handleUpdateCategory = async (oldCategory: string, newCategory: string) => {
    if (db) {
        const batch = writeBatch(db);
        batch.set(doc(db, 'categories', newCategory), { name: newCategory });
        batch.delete(doc(db, 'categories', oldCategory));
        products.filter(p => p.category === oldCategory).forEach(p => {
            batch.update(doc(db, 'products', p.id), { category: newCategory });
        });
        await batch.commit();
    } else {
        setCategories(categories.map(c => c === oldCategory ? newCategory : c));
        setProducts(products.map(p => p.category === oldCategory ? { ...p, category: newCategory } : p));
    }
  };

  const handleDeleteCategory = async (category: string) => {
    if (!window.confirm(`Delete category "${category}"?`)) return;
    if (db) {
       await deleteDoc(doc(db, 'categories', category));
    } else {
       setCategories(categories.filter(c => c !== category));
    }
  };

  const handleCheckout = async (items: CartItem[], total: number, paymentMethod: 'CASH' | 'CARD', subTotal: number, discount: number, tax: number) => {
    const saleId = Date.now().toString();
    const newSale: Sale = {
      id: saleId,
      timestamp: Date.now(),
      items, subTotal, discount, tax, total, paymentMethod, status: 'COMPLETED'
    };

    if (db) {
        const batch = writeBatch(db);
        batch.set(doc(db, 'sales', saleId), newSale);
        items.forEach(item => {
            const currentProduct = products.find(p => p.id === item.id);
            if (currentProduct) {
                 batch.update(doc(db, 'products', item.id), { stock: currentProduct.stock - item.quantity });
            }
        });
        await batch.commit();
    } else {
        setSales([...sales, newSale]);
        const newProducts = products.map(p => {
            const soldItem = items.find(i => i.id === p.id);
            return soldItem ? { ...p, stock: p.stock - soldItem.quantity } : p;
        });
        setProducts(newProducts);
    }
  };

  const handleProcessReturn = async (saleId: string, returnMap: { [itemId: string]: number }) => {
    // Shared Logic
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;

    const prevReturns = sale.returnedItems || {};
    const newReturns = { ...prevReturns };
    Object.entries(returnMap).forEach(([itemId, qty]) => {
        newReturns[itemId] = (newReturns[itemId] || 0) + qty;
    });

    let totalOriginalCount = 0;
    let totalReturnedCount = 0;
    sale.items.forEach(item => {
        totalOriginalCount += item.quantity;
        totalReturnedCount += (newReturns[item.id] || 0);
    });
    const status = totalReturnedCount >= totalOriginalCount ? 'REFUNDED' : 'PARTIAL';

    if (db) {
        const batch = writeBatch(db);
        batch.update(doc(db, 'sales', saleId), { returnedItems: newReturns, status });
        Object.entries(returnMap).forEach(([itemId, qty]) => {
            const product = products.find(p => p.id === itemId);
            if (product) batch.update(doc(db, 'products', itemId), { stock: product.stock + qty });
        });
        await batch.commit();
    } else {
        setSales(sales.map(s => s.id === saleId ? { ...s, returnedItems: newReturns, status } : s));
        setProducts(products.map(p => {
             const returnQty = returnMap[p.id];
             return returnQty ? { ...p, stock: p.stock + returnQty } : p;
        }));
    }
  };

  const handleStockUpdate = async (id: string, newStock: number) => {
    if (db) {
        await updateDoc(doc(db, 'products', id), { stock: newStock });
    } else {
        setProducts(products.map(p => p.id === id ? { ...p, stock: newStock } : p));
    }
  };

  const handleAddUser = async (newUser: User) => {
    if (db) await setDoc(doc(db, 'users', newUser.id), newUser);
    else setUsers([...users, newUser]);
  };

  const handleDeleteUser = async (id: string) => {
    if (db) await deleteDoc(doc(db, 'users', id));
    else setUsers(users.filter(u => u.id !== id));
  };

  const handleUpdateStoreSettings = async (settings: StoreSettings) => {
    if (db) await setDoc(doc(db, 'settings', 'store'), settings);
    else setStoreSettings(settings);
  };

  const handleViewChange = (view: AppView) => {
      setCurrentView(view);
      setIsMobileMenuOpen(false);
  };

  if (!user) {
    return <Login onLogin={setUser} users={users} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans flex-col lg:flex-row">
      
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

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
      
      <main className="flex-1 overflow-hidden relative flex flex-col min-w-0">
        
        {/* Alerts / Banners */}
        {!isOnline && (
            <div className="bg-red-500 text-white text-xs font-bold text-center py-1 absolute top-0 left-0 right-0 z-50">
                <span className="flex items-center justify-center gap-2">
                    <CloudOff size={14} /> OFFLINE MODE
                </span>
            </div>
        )}
        {!isFirebaseConfigured && isOnline && (
            <div className="bg-orange-500 text-white text-xs font-bold text-center py-1 absolute top-0 left-0 right-0 z-50 cursor-pointer hover:bg-orange-600" onClick={() => setCurrentView(AppView.SETTINGS)}>
                <span className="flex items-center justify-center gap-2">
                    <AlertTriangle size={14} /> Local Storage Only. Click to Configure Firebase Sync.
                </span>
            </div>
        )}
        
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

        <div className={`flex-1 overflow-hidden relative ${(!isOnline || (!isFirebaseConfigured && isOnline)) ? 'pt-6' : ''}`}>
            {currentView === AppView.POS && (
            <POS 
                products={products} 
                onCheckout={handleCheckout} 
                storeSettings={storeSettings}
                onViewOrderHistory={() => handleViewChange(AppView.ORDERS)}
                onUpdateStoreSettings={handleUpdateStoreSettings}
            />
            )}
            
            {(currentView === AppView.INVENTORY || currentView === AppView.CATEGORIES) && (
            <Inventory 
                products={products} 
                categories={categories}
                onAddProduct={handleAddProduct}
                onUpdateProduct={handleUpdateProduct}
                onBulkUpdateProduct={handleBulkUpdateProduct}
                onDeleteProduct={handleDeleteProduct}
                onAddCategory={handleAddCategory}
                onUpdateCategory={handleUpdateCategory}
                onDeleteCategory={handleDeleteCategory}
                initialTab={currentView === AppView.CATEGORIES ? 'categories' : 'products'}
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
                storeSettings={storeSettings} 
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