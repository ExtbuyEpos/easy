
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
import { PrintBarcode } from './components/PrintBarcode';
import { ClawdBot } from './components/ClawdBot';
import { CustomerPortal } from './components/CustomerPortal';
import { Bookings } from './components/Bookings';
import { AppView, Product, Sale, CartItem, User, StoreSettings, Language, Booking } from './types';
import { INITIAL_PRODUCTS, INITIAL_USERS } from './constants';
import { translations } from './translations';
import { Menu, CloudOff, AlertTriangle, PanelLeftOpen } from 'lucide-react';

import { db } from './firebase';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<AppView>(AppView.POS);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => localStorage.getItem('easyPOS_theme') === 'dark');
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('easyPOS_language') as Language) || 'en');
  
  const [isSidebarVisible, setIsSidebarVisible] = useState(window.innerWidth >= 1024);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isFirebaseConfigured] = useState(!!db);

  const [storeSettings, setStoreSettings] = useState<StoreSettings>({
    name: 'easyPOS', address: 'Retail Management System', phone: '', footerMessage: 'Thank you!',
    receiptSize: '80mm', whatsappTemplate: '', whatsappPhoneNumber: '', taxEnabled: false, taxRate: 0, taxName: 'Tax', autoPrint: false
  });

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('easyPOS_theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('easyPOS_language', language);
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);
  const toggleLanguage = () => setLanguage(prev => prev === 'en' ? 'ar' : 'en');
  const t = (key: string) => translations[language][key] || key;

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  useEffect(() => {
    if (db) {
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
        const unsubBookings = onSnapshot(collection(db, 'bookings'), (snapshot) => {
            const data = snapshot.docs.map(doc => doc.data() as Booking);
            setBookings(data.sort((a,b) => b.timestamp - a.timestamp));
        });
        const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
            const data = snapshot.docs.map(doc => doc.data() as User);
            setUsers(data);
            if (data.length === 0 && !snapshot.metadata.fromCache) {
                INITIAL_USERS.forEach(u => setDoc(doc(db, 'users', u.id), u));
            }
        });
        const unsubSettings = onSnapshot(doc(db, 'settings', 'store'), (docSnap) => {
            if (docSnap.exists()) setStoreSettings(docSnap.data() as StoreSettings);
            setIsSyncing(false);
        });
        return () => { unsubProducts(); unsubCategories(); unsubSales(); unsubBookings(); unsubUsers(); unsubSettings(); };
    } else {
        const savedProducts = localStorage.getItem('easyPOS_products');
        const savedCategories = localStorage.getItem('easyPOS_categories');
        const savedSales = localStorage.getItem('easyPOS_sales');
        const savedBookings = localStorage.getItem('easyPOS_bookings');
        const savedUsers = localStorage.getItem('easyPOS_users');
        const savedSettings = localStorage.getItem('easyPOS_storeSettings');
        setProducts(savedProducts ? JSON.parse(savedProducts) : INITIAL_PRODUCTS);
        setCategories(savedCategories ? JSON.parse(savedCategories) : Array.from(new Set(INITIAL_PRODUCTS.map(p => p.category))).sort());
        setSales(savedSales ? JSON.parse(savedSales) : []);
        setBookings(savedBookings ? JSON.parse(savedBookings) : []);
        setUsers(savedUsers ? JSON.parse(savedUsers) : INITIAL_USERS);
        if (savedSettings) setStoreSettings(prev => ({ ...prev, ...JSON.parse(savedSettings) }));
    }
  }, []);

  const handleAddProduct = async (newProduct: Product) => {
    if (db) await setDoc(doc(db, 'products', newProduct.id), newProduct);
    else {
      const updated = [...products, newProduct];
      setProducts(updated);
      localStorage.setItem('easyPOS_products', JSON.stringify(updated));
    }
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    if (db) await setDoc(doc(db, 'products', updatedProduct.id), updatedProduct);
    else {
      const updated = products.map(p => p.id === updatedProduct.id ? updatedProduct : p);
      setProducts(updated);
      localStorage.setItem('easyPOS_products', JSON.stringify(updated));
    }
  };

  const handleBulkUpdateProduct = async (updatedProducts: Product[]) => {
    if (db) {
        const batch = writeBatch(db);
        updatedProducts.forEach(p => batch.set(doc(db, 'products', p.id), p));
        await batch.commit();
    } else {
        const updatesMap = new Map(updatedProducts.map(p => [p.id, p]));
        const updated = products.map(p => updatesMap.has(p.id) ? updatesMap.get(p.id)! : p);
        setProducts(updated);
        localStorage.setItem('easyPOS_products', JSON.stringify(updated));
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Delete product?')) return;
    if (db) await deleteDoc(doc(db, 'products', id));
    else {
      const updated = products.filter(p => p.id !== id);
      setProducts(updated);
      localStorage.setItem('easyPOS_products', JSON.stringify(updated));
    }
  };

  // Booking Handlers
  const handleAddBooking = async (b: Booking) => {
    if (db) await setDoc(doc(db, 'bookings', b.id), b);
    else {
      const updated = [...bookings, b];
      setBookings(updated);
      localStorage.setItem('easyPOS_bookings', JSON.stringify(updated));
    }
  };

  const handleUpdateBooking = async (b: Booking) => {
    if (db) await setDoc(doc(db, 'bookings', b.id), b);
    else {
      const updated = bookings.map(item => item.id === b.id ? b : item);
      setBookings(updated);
      localStorage.setItem('easyPOS_bookings', JSON.stringify(updated));
    }
  };

  const handleDeleteBooking = async (id: string) => {
    if (!window.confirm('Delete booking?')) return;
    if (db) await deleteDoc(doc(db, 'bookings', id));
    else {
      const updated = bookings.filter(b => b.id !== id);
      setBookings(updated);
      localStorage.setItem('easyPOS_bookings', JSON.stringify(updated));
    }
  };

  const handleCheckout = async (items: CartItem[], total: number, paymentMethod: 'CASH' | 'CARD', subTotal: number, discount: number, tax: number, discountType: 'percent' | 'fixed', customerName?: string, customerPhone?: string) => {
    const saleId = Date.now().toString();
    const newSale: Sale = { 
      id: saleId, 
      timestamp: Date.now(), 
      items, 
      subTotal, 
      discount, 
      discountType,
      tax, 
      taxRate: storeSettings.taxRate,
      total, 
      paymentMethod, 
      status: 'COMPLETED',
      processedBy: user?.id,
      customerName,
      customerPhone
    };
    
    if (db) {
        const batch = writeBatch(db);
        batch.set(doc(db, 'sales', saleId), newSale);
        items.forEach(item => {
            const currentProduct = products.find(p => p.id === item.id);
            if (currentProduct) batch.update(doc(db, 'products', item.id), { stock: currentProduct.stock - item.quantity });
        });
        await batch.commit();
    } else {
        const updatedSales = [newSale, ...sales];
        setSales(updatedSales);
        localStorage.setItem('easyPOS_sales', JSON.stringify(updatedSales));
        
        const updatedProducts = products.map(p => {
            const soldItem = items.find(i => i.id === p.id);
            return soldItem ? { ...p, stock: p.stock - soldItem.quantity } : p;
        });
        setProducts(updatedProducts);
        localStorage.setItem('easyPOS_products', JSON.stringify(updatedProducts));
    }
  };

  const handleProcessReturn = async (saleId: string, returns: { [itemId: string]: number }) => {
    if (db) {
        const batch = writeBatch(db);
        const saleRef = doc(db, 'sales', saleId);
        const sale = sales.find(s => s.id === saleId);
        if (!sale) return;

        const updatedReturnedItems = { ...(sale.returnedItems || {}) };
        Object.entries(returns).forEach(([itemId, qty]) => {
            updatedReturnedItems[itemId] = (updatedReturnedItems[itemId] || 0) + qty;
            const p = products.find(prod => prod.id === itemId);
            if (p) batch.update(doc(db, 'products', itemId), { stock: p.stock + qty });
        });

        const isFullyRefunded = sale.items.every(item => 
            (updatedReturnedItems[item.id] || 0) >= item.quantity
        );

        batch.update(saleRef, { 
            returnedItems: updatedReturnedItems,
            status: isFullyRefunded ? 'REFUNDED' : 'PARTIAL'
        });
        await batch.commit();
    } else {
        const updatedSales = sales.map(s => {
            if (s.id === saleId) {
                const updatedReturns = { ...(s.returnedItems || {}) };
                Object.entries(returns).forEach(([itemId, qty]) => {
                    updatedReturns[itemId] = (updatedReturns[itemId] || 0) + qty;
                });
                const isFullyRefunded = s.items.every(item => (updatedReturns[item.id] || 0) >= item.quantity);
                return { ...s, returnedItems: updatedReturns, status: isFullyRefunded ? 'REFUNDED' : 'PARTIAL' };
            }
            return s;
        }) as Sale[];
        setSales(updatedSales);
        localStorage.setItem('easyPOS_sales', JSON.stringify(updatedSales));
        
        const updatedProducts = products.map(p => {
            const returnedQty = returns[p.id];
            return returnedQty ? { ...p, stock: p.stock + returnedQty } : p;
        });
        setProducts(updatedProducts);
        localStorage.setItem('easyPOS_products', JSON.stringify(updatedProducts));
    }
  };

  const handleStockUpdate = async (id: string, newStock: number) => {
    if (db) await updateDoc(doc(db, 'products', id), { stock: newStock });
    else {
      const updated = products.map(p => p.id === id ? { ...p, stock: newStock } : p);
      setProducts(updated);
      localStorage.setItem('easyPOS_products', JSON.stringify(updated));
    }
  };

  const handleUpdateStoreSettings = async (settings: StoreSettings) => {
    if (db) await setDoc(doc(db, 'settings', 'store'), settings);
    else {
      setStoreSettings(settings);
      localStorage.setItem('easyPOS_storeSettings', JSON.stringify(settings));
    }
  };

  const handleAddUser = async (newUser: User) => {
      if (db) await setDoc(doc(db, 'users', newUser.id), newUser);
      else {
          const updated = [...users, newUser];
          setUsers(updated);
          localStorage.setItem('easyPOS_users', JSON.stringify(updated));
      }
  };

  const handleDeleteUser = async (id: string) => {
      if (!window.confirm('Delete operator access?')) return;
      if (db) await deleteDoc(doc(db, 'users', id));
      else {
          const updated = users.filter(u => u.id !== id);
          setUsers(updated);
          localStorage.setItem('easyPOS_users', JSON.stringify(updated));
      }
  };

  const handleUpdateUserAvatar = (avatarData: string, tryOnCache?: Record<string, string>) => {
    if (user) {
      const updatedUser = { 
        ...user, 
        customerAvatar: avatarData || user.customerAvatar,
        tryOnCache: tryOnCache || user.tryOnCache 
      };
      setUser(updatedUser);
      // Persist to storage
      if (db) {
        updateDoc(doc(db, 'users', user.id), { 
          customerAvatar: updatedUser.customerAvatar,
          tryOnCache: updatedUser.tryOnCache
        });
      } else {
        const updatedUsers = users.map(u => u.id === user.id ? updatedUser : u);
        setUsers(updatedUsers);
        localStorage.setItem('easyPOS_users', JSON.stringify(updatedUsers));
      }
    }
  };

  const isCustomer = user?.role === 'CUSTOMER';

  if (!user && currentView !== AppView.CUSTOMER_PORTAL) {
    return (
      <Login 
        onLogin={(u) => { setUser(u); setCurrentView(u.role === 'CUSTOMER' ? AppView.CUSTOMER_PORTAL : AppView.POS); }} 
        users={users} 
        t={t} 
        isDarkMode={isDarkMode} 
        toggleTheme={toggleTheme} 
        language={language} 
        toggleLanguage={toggleLanguage}
        onEnterAsGuest={() => setCurrentView(AppView.CUSTOMER_PORTAL)}
      />
    );
  }

  const isSidebarShown = !isCustomer && (isMobileMenuOpen || (isSidebarVisible && window.innerWidth >= 1024));

  return (
    <div className="flex h-[100svh] overflow-hidden bg-[#111827] dark:bg-slate-950 font-sans flex-col lg:flex-row transition-colors">
      
      {isMobileMenuOpen && !isCustomer && (
        <div className="fixed inset-0 bg-black/70 z-[60] lg:hidden backdrop-blur-md" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {!isCustomer && (
        <div className={`
          fixed inset-y-0 left-0 rtl:left-auto rtl:right-0 z-[70] w-72 transform transition-all duration-500 ease-out 
          lg:static lg:w-72 lg:translate-x-0
          ${isSidebarShown ? 'translate-x-0' : 'ltr:-translate-x-full rtl:translate-x-full'}
          ${!isSidebarVisible && window.innerWidth >= 1024 ? 'lg:hidden' : ''}
        `}>
            <Sidebar 
              currentView={currentView} 
              onChangeView={(v) => { setCurrentView(v); setIsMobileMenuOpen(false); }} 
              onLogout={() => { setUser(null); setCurrentView(AppView.POS); }} 
              currentUser={user!} 
              onClose={() => {
                  if(window.innerWidth < 1024) setIsMobileMenuOpen(false);
                  else setIsSidebarVisible(false);
              }} 
              isOnline={isOnline} 
              isSyncing={isSyncing} 
              isDarkMode={isDarkMode} 
              toggleTheme={toggleTheme} 
              language={language} 
              toggleLanguage={toggleLanguage} 
              t={t} 
            />
        </div>
      )}

      <main className={`
        flex-1 overflow-hidden relative flex flex-col min-w-0 bg-[#f8fafc] dark:bg-slate-950 transition-all duration-500
        ${!isCustomer && isSidebarVisible && window.innerWidth >= 1024 ? 'lg:rounded-l-[44px] rtl:lg:rounded-r-[44px] shadow-2xl' : 'rounded-none'}
      `}>
        
        {!isCustomer && (
          <div className="absolute top-0 left-0 right-0 z-50 pointer-events-none flex justify-center">
              {!isOnline && (
                <div className="bg-red-600 text-white text-[9px] font-black px-6 py-1 rounded-b-xl shadow-lg flex items-center gap-2 animate-bounce pointer-events-auto">
                  <CloudOff size={12} /> {t('offlineMode')}
                </div>
              )}
              {!isFirebaseConfigured && isOnline && (
                <div className="bg-orange-500 text-white text-[9px] font-black px-6 py-1 rounded-b-xl shadow-lg cursor-pointer flex items-center gap-2 animate-pulse pointer-events-auto" onClick={() => setCurrentView(AppView.SETTINGS)}>
                  <AlertTriangle size={12} /> SYNC REQUIRED (TAP)
                </div>
              )}
          </div>
        )}

        {!isCustomer && !isSidebarVisible && (
            <div className="hidden lg:block absolute top-6 left-6 z-[60] no-print">
                <button onClick={() => setIsSidebarVisible(true)} className="p-3 bg-white dark:bg-slate-900 text-slate-800 dark:text-white rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 hover:scale-105 active:scale-95 transition-all">
                    <PanelLeftOpen size={24} className="text-brand-500" />
                </button>
            </div>
        )}

        {!isCustomer && (
          <div className="lg:hidden bg-slate-900 text-white p-5 flex items-center justify-between shrink-0 shadow-lg z-30">
              <div className="flex items-center gap-4">
                  <button onClick={() => setIsMobileMenuOpen(true)} className="p-2.5 bg-slate-800 rounded-xl active:scale-95 transition-transform"><Menu size={24} /></button>
                  <h1 className="font-black text-xl italic uppercase tracking-tighter">easyPOS</h1>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-brand-600 flex items-center justify-center font-black text-white">{user?.name.charAt(0).toUpperCase()}</div>
          </div>
        )}

        <div className="flex-1 overflow-hidden relative">
            {currentView === AppView.CUSTOMER_PORTAL && (
              <CustomerPortal 
                products={products} 
                language={language} 
                t={t} 
                currentUser={user}
                onLoginRequest={() => { setUser(null); setCurrentView(AppView.LOGIN); }}
                onLogout={() => { setUser(null); setCurrentView(AppView.CUSTOMER_PORTAL); }}
                onUpdateAvatar={handleUpdateUserAvatar}
              />
            )}
            {currentView === AppView.POS && (
              <POS products={products} sales={sales} onCheckout={handleCheckout} storeSettings={storeSettings} onViewOrderHistory={() => setCurrentView(AppView.ORDERS)} onUpdateStoreSettings={handleUpdateStoreSettings} t={t} language={language} currentUser={user!} onGoBack={() => setCurrentView(AppView.REPORTS)} />
            )}
            {currentView === AppView.BOOKINGS && (
              <Bookings bookings={bookings} onAddBooking={handleAddBooking} onUpdateBooking={handleUpdateBooking} onDeleteBooking={handleDeleteBooking} onGoBack={() => setCurrentView(AppView.POS)} language={language} t={t} />
            )}
            {(currentView === AppView.INVENTORY || currentView === AppView.CATEGORIES) && (
              <Inventory 
                products={products} 
                categories={categories} 
                onAddProduct={handleAddProduct} 
                onUpdateProduct={handleUpdateProduct} 
                onBulkUpdateProduct={handleBulkUpdateProduct} 
                onDeleteProduct={handleDeleteProduct} 
                initialTab={currentView === AppView.CATEGORIES ? 'categories' : 'products'} 
                onGoBack={() => setCurrentView(AppView.POS)} 
                t={t} 
                currentUser={user!} 
                language={language} 
                storeSettings={storeSettings}
              />
            )}
            {currentView === AppView.STOCK_CHECK && (
              <StockCheck 
                products={products} 
                onUpdateStock={handleStockUpdate} 
                onBulkUpdateProducts={handleBulkUpdateProduct} 
                onGoBack={() => setCurrentView(AppView.POS)} 
                language={language} 
              />
            )}
            {currentView === AppView.ORDERS && (
              <Orders sales={sales} onProcessReturn={handleProcessReturn} storeSettings={storeSettings} onGoBack={() => setCurrentView(AppView.POS)} language={language} />
            )}
            {currentView === AppView.REPORTS && (
              <Reports sales={sales} products={products} users={users} onGoBack={() => setCurrentView(AppView.POS)} language={language} />
            )}
            {currentView === AppView.SETTINGS && (
              <Settings users={users} products={products} sales={sales} onAddUser={handleAddUser} onDeleteUser={handleDeleteUser} currentUser={user!} storeSettings={storeSettings} onUpdateStoreSettings={handleUpdateStoreSettings} onGoBack={() => setCurrentView(AppView.POS)} language={language} toggleLanguage={toggleLanguage} t={t} />
            )}
            {currentView === AppView.BAILEYS_SETUP && (
              <BaileysSetup onUpdateStoreSettings={handleUpdateStoreSettings} settings={storeSettings} onGoBack={() => setCurrentView(AppView.POS)} t={t} />
            )}
            {currentView === AppView.PRINT_BARCODE && (
              <PrintBarcode products={products} storeSettings={storeSettings} onGoBack={() => setCurrentView(AppView.POS)} language={language} t={t} />
            )}
            {currentView === AppView.LOGIN && !user && (
              <Login 
                onLogin={(u) => { setUser(u); setCurrentView(u.role === 'CUSTOMER' ? AppView.CUSTOMER_PORTAL : AppView.POS); }} 
                users={users} 
                t={t} 
                isDarkMode={isDarkMode} 
                toggleTheme={toggleTheme} 
                language={language} 
                toggleLanguage={toggleLanguage}
                onEnterAsGuest={() => setCurrentView(AppView.CUSTOMER_PORTAL)}
              />
            )}
        </div>

        {user && !isCustomer && (
            <ClawdBot 
                products={products} 
                sales={sales} 
                storeSettings={storeSettings} 
                currentUser={user} 
                language={language} 
                t={t} 
            />
        )}
      </main>
    </div>
  );
};

export default App;
