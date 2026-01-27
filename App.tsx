
import React, { useState, useEffect, useCallback } from 'react';
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
import { VendorPanel } from './components/VendorPanel';
import { AppView, Product, Sale, CartItem, User, StoreSettings, Language, Booking } from './types';
import { INITIAL_PRODUCTS, INITIAL_USERS } from './constants';
import { translations } from './translations';
import { Menu, CloudOff, AlertTriangle, PanelLeftOpen, Loader2 } from 'lucide-react';
import { logPageView, logPurchase, logUserLogin } from './services/analyticsService';

import { db, auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, writeBatch, getDoc } from 'firebase/firestore';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [currentView, setCurrentView] = useState<AppView>(AppView.POS);
  const [navigationHistory, setNavigationHistory] = useState<AppView[]>([]);
  
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
    receiptSize: '80mm', whatsappTemplate: '', whatsappPhoneNumber: '', taxEnabled: false, taxRate: 0, taxName: 'Tax', autoPrint: false,
    visitorAccessCode: '2026'
  });

  const SYSTEM_OWNER_EMAIL = 'zahratalsawsen1@gmail.com';
  const isSystemOwner = user?.email?.toLowerCase() === SYSTEM_OWNER_EMAIL || user?.id === 'admin_1';

  const navigateTo = useCallback((view: AppView) => {
    if (view === currentView) return;
    setNavigationHistory(prev => [...prev, currentView]);
    setCurrentView(view);
    setIsMobileMenuOpen(false);
  }, [currentView]);

  const handleGoBack = useCallback(() => {
    if (navigationHistory.length > 0) {
      const prev = [...navigationHistory];
      const lastView = prev.pop();
      setNavigationHistory(prev);
      setCurrentView(lastView!);
    } else {
      let defaultView = AppView.POS;
      if (user?.role === 'CUSTOMER') defaultView = AppView.CUSTOMER_PORTAL;
      if (user?.role === 'VENDOR' || user?.role === 'VENDOR_STAFF') defaultView = AppView.VENDOR_PANEL;
      setCurrentView(defaultView);
    }
  }, [navigationHistory, user]);

  useEffect(() => {
    logPageView(currentView);
  }, [currentView]);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('easyPOS_theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('easyPOS_language', language);
    document.documentElement.dir = (language === 'ar') ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (!auth) {
        setIsAuthChecking(false);
        return;
    }
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        const adminEmails = ['zahratalsawsen1@gmail.com', 'extbuy.om@gmail.com'];
        const userEmail = fbUser.email?.toLowerCase() || '';
        const isSystemAdmin = adminEmails.includes(userEmail);
        
        const restoredUser: User = {
          id: fbUser.uid,
          name: fbUser.displayName || (isSystemAdmin ? 'System Admin' : 'Google User'),
          username: fbUser.email?.split('@')[0] || 'google_user',
          role: isSystemAdmin ? 'ADMIN' : 'CUSTOMER',
          email: fbUser.email || undefined,
          avatar: fbUser.photoURL || undefined
        };
        setUser(restoredUser);
        if (restoredUser.role === 'CUSTOMER') setCurrentView(AppView.CUSTOMER_PORTAL);
      }
      setIsAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);
  const toggleLanguage = () => {
    setLanguage(prev => {
        if (prev === 'en') return 'ar';
        if (prev === 'ar') return 'hi';
        return 'en';
    });
  };

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
        const unsubUsers = onSnapshot(collection(db, 'users'), async (snapshot) => {
            const data = snapshot.docs.map(doc => doc.data() as User);
            setUsers(data);
            if (data.length === 0 && !snapshot.metadata.fromCache) {
                INITIAL_USERS.forEach(async (u) => {
                    await setDoc(doc(db!, 'users', u.id), u, { merge: true });
                });
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

  const handleAddCategory = async (category: string) => {
    if (db) await setDoc(doc(db, 'categories', category), {});
    else {
      const updated = Array.from(new Set([...categories, category])).sort();
      setCategories(updated);
      localStorage.setItem('easyPOS_categories', JSON.stringify(updated));
    }
  };

  const handleUpdateCategory = async (oldCategory: string, newCategory: string) => {
    if (db) {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'categories', oldCategory));
      batch.set(doc(db, 'categories', newCategory), {});
      await batch.commit();
    } else {
      const updated = categories.map(c => c === oldCategory ? newCategory : c).sort();
      setCategories(updated);
      localStorage.setItem('easyPOS_categories', JSON.stringify(updated));
    }
  };

  const handleDeleteCategory = async (category: string) => {
    if (!window.confirm(`Delete category "${category}"?`)) return;
    if (db) await deleteDoc(doc(db, 'categories', category));
    else {
      const updated = categories.filter(c => c !== category);
      setCategories(updated);
      localStorage.setItem('easyPOS_categories', JSON.stringify(updated));
    }
  };

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
    
    logPurchase(items, total);

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

  const handleUpdateUser = async (updatedUser: User) => {
      if (db) await setDoc(doc(db, 'users', updatedUser.id), updatedUser, { merge: true });
      else {
          const updated = users.map(u => u.id === updatedUser.id ? updatedUser : u);
          setUsers(updated);
          localStorage.setItem('easyPOS_users', JSON.stringify(updated));
      }
  };

  const handleDeleteUser = async (id: string) => {
      const targetUser = users.find(u => u.id === id);
      if (!targetUser) return;
      if (targetUser.role === 'ADMIN' && !isSystemOwner) {
          alert("SECURITY ALERT: Only the System Owner can remove Admin nodes.");
          return;
      }
      if (!window.confirm('PERMANENT ACTION: Delete operator access?')) return;
      if (db) {
          try { await deleteDoc(doc(db, 'users', id)); } catch (e) { alert("Error deleting user."); }
      } else {
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
      if (db) {
        updateDoc(doc(db, 'users', user.id), { customerAvatar: updatedUser.customerAvatar, tryOnCache: updatedUser.tryOnCache });
      } else {
        const updatedUsers = users.map(u => u.id === user.id ? updatedUser : u);
        setUsers(updatedUsers);
        localStorage.setItem('easyPOS_users', JSON.stringify(updatedUsers));
      }
    }
  };

  const handleLogout = async () => {
    if (auth) await signOut(auth);
    setUser(null);
    setCurrentView(AppView.LOGIN);
    setNavigationHistory([]);
  };

  const isCustomer = user?.role === 'CUSTOMER';

  if (isAuthChecking) {
      return (
          <div className="min-h-screen bg-slate-900 flex items-center justify-center">
              <Loader2 className="animate-spin text-brand-500" size={48} />
          </div>
      );
  }

  if (!user && currentView !== AppView.CUSTOMER_PORTAL) {
    return (
      <Login 
        onLogin={(u) => { 
          setUser(u); 
          let landingView = AppView.POS;
          if (u.role === 'CUSTOMER') landingView = AppView.CUSTOMER_PORTAL;
          else if (u.role === 'VENDOR' || u.role === 'VENDOR_STAFF') landingView = AppView.VENDOR_PANEL;
          setCurrentView(landingView);
          logUserLogin('CREDENTIALS');
        }} 
        users={users} 
        t={t} 
        isDarkMode={isDarkMode} 
        toggleTheme={toggleTheme} 
        language={language} 
        toggleLanguage={toggleLanguage}
        onEnterAsGuest={() => {
          setCurrentView(AppView.CUSTOMER_PORTAL);
          logUserLogin('GUEST');
        }}
        storeSettings={storeSettings}
      />
    );
  }

  const isSidebarShown = !isCustomer && (isMobileMenuOpen || (isSidebarVisible && window.innerWidth >= 1024));

  return (
    <div className="flex ltr:h-[100svh] rtl:h-[100svh] overflow-hidden bg-[#111827] dark:bg-slate-950 font-sans flex-col lg:flex-row transition-colors">
      
      {isMobileMenuOpen && !isCustomer && (
        <div className="fixed inset-0 bg-black/70 z-[60] lg:hidden backdrop-blur-md" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {!isCustomer && (
        <div className={`
          fixed inset-y-0 ltr:left-0 rtl:right-0 z-[70] w-72 transform transition-all duration-500 ltr:ease-out rtl:ease-out
          lg:static lg:w-72 lg:translate-x-0
          ${isSidebarShown ? 'translate-x-0' : 'ltr:-translate-x-full rtl:translate-x-full'}
          ${!isSidebarVisible && window.innerWidth >= 1024 ? 'lg:hidden' : ''}
        `}>
            <Sidebar 
              currentView={currentView} 
              onChangeView={navigateTo} 
              onLogout={handleLogout} 
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
        ${!isCustomer && isSidebarVisible && window.innerWidth >= 1024 ? 'ltr:lg:rounded-l-[44px] rtl:lg:rounded-r-[44px] shadow-2xl' : 'rounded-none'}
      `}>
        
        {!isCustomer && (
          <div className="absolute ltr:top-0 rtl:top-0 ltr:left-0 rtl:right-0 ltr:right-0 rtl:left-0 z-50 pointer-events-none flex justify-center">
              {!isOnline && (
                <div className="bg-red-600 text-white text-[9px] font-black px-6 py-1 rounded-b-xl shadow-lg flex items-center gap-2 animate-bounce pointer-events-auto">
                  <CloudOff size={12} /> {t('offlineMode')}
                </div>
              )}
          </div>
        )}

        <div className="flex-1 overflow-hidden relative">
            {currentView === AppView.VENDOR_PANEL && user && (
              <VendorPanel 
                products={products}
                sales={sales}
                users={users}
                currentUser={user}
                onAddProduct={handleAddProduct}
                onUpdateProduct={handleUpdateProduct}
                onDeleteProduct={handleDeleteProduct}
                onBulkUpdateProduct={handleBulkUpdateProduct}
                onAddUser={handleAddUser}
                onUpdateUser={handleUpdateUser}
                onDeleteUser={handleDeleteUser}
                language={language}
                t={t}
                onGoBack={handleGoBack}
              />
            )}
            {currentView === AppView.CUSTOMER_PORTAL && (
              <CustomerPortal 
                products={products} 
                language={language} 
                t={t} 
                currentUser={user}
                onLoginRequest={() => { setUser(null); navigateTo(AppView.LOGIN); }}
                onLogout={handleLogout}
                onUpdateAvatar={handleUpdateUserAvatar}
                storeSettings={storeSettings}
              />
            )}
            {currentView === AppView.POS && (
              <POS products={products} sales={sales} onCheckout={handleCheckout} storeSettings={storeSettings} onViewOrderHistory={() => navigateTo(AppView.ORDERS)} onUpdateStoreSettings={handleUpdateStoreSettings} t={t} language={language} currentUser={user!} onGoBack={handleGoBack} />
            )}
            {currentView === AppView.BOOKINGS && (
              <Bookings bookings={bookings} onAddBooking={handleAddBooking} onUpdateBooking={handleUpdateBooking} onDeleteBooking={handleDeleteBooking} onGoBack={handleGoBack} language={language} t={t} />
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
                onGoBack={handleGoBack} 
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
                onGoBack={handleGoBack} 
                language={language} 
              />
            )}
            {currentView === AppView.ORDERS && (
              <Orders sales={sales} onProcessReturn={handleProcessReturn} storeSettings={storeSettings} onGoBack={handleGoBack} language={language} />
            )}
            {currentView === AppView.REPORTS && (
              <Reports sales={sales} products={products} users={users} onGoBack={handleGoBack} language={language} />
            )}
            {currentView === AppView.SETTINGS && (
              <Settings 
                users={users} 
                products={products} 
                sales={sales} 
                onAddUser={handleAddUser} 
                onUpdateUser={handleUpdateUser}
                onDeleteUser={handleDeleteUser} 
                onLogout={handleLogout}
                currentUser={user!} 
                storeSettings={storeSettings} 
                onUpdateStoreSettings={handleUpdateStoreSettings} 
                onGoBack={handleGoBack} 
                language={language} 
                toggleLanguage={toggleLanguage} 
                t={t} 
                onNavigate={navigateTo}
              />
            )}
            {currentView === AppView.BAILEYS_SETUP && (
              <BaileysSetup onUpdateStoreSettings={handleUpdateStoreSettings} settings={storeSettings} onGoBack={handleGoBack} t={t} />
            )}
            {currentView === AppView.PRINT_BARCODE && (
              <PrintBarcode products={products} storeSettings={storeSettings} onGoBack={handleGoBack} language={language} t={t} />
            )}
        </div>

        {user && !isCustomer && user.role !== 'VENDOR' && user.role !== 'VENDOR_STAFF' && (
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
