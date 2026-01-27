
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { AppView, Product, Sale, CartItem, User, StoreSettings, Language, Booking, VendorRequest } from './types';
import { INITIAL_PRODUCTS, INITIAL_USERS } from './constants';
import { translations } from './translations';
import { CloudOff, Loader2 } from 'lucide-react';
import { logPageView, logPurchase, logUserLogin } from './services/analyticsService';

import { db, auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';

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
  const [vendorRequests, setVendorRequests] = useState<VendorRequest[]>([]);
  
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => localStorage.getItem('easyPOS_theme') === 'dark');
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('easyPOS_language') as Language) || 'en');
  
  const [isSidebarVisible, setIsSidebarVisible] = useState(window.innerWidth >= 1024);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  const [storeSettings, setStoreSettings] = useState<StoreSettings>({
    name: 'easyPOS', address: 'Retail Management System', phone: '', footerMessage: 'Thank you!',
    receiptSize: '80mm', whatsappTemplate: '', whatsappPhoneNumber: '', taxEnabled: false, taxRate: 0, taxName: 'Tax', autoPrint: false,
    visitorAccessCode: '2026'
  });

  const [activeVendorId, setActiveVendorId] = useState<string | null>(null);

  // Supreme Admin Emails
  const SUPREME_ADMIN_EMAILS = [
    'nabeelkhan1007@gmail.com', 
    'zahratalsawsen1@gmail.com', 
    'extbuy.om@gmail.com'
  ];

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const match = hash.match(/#\/shop\/(.+)/);
      if (match) {
        setActiveVendorId(match[1]);
        setCurrentView(AppView.CUSTOMER_PORTAL);
      } else if (!hash || hash === '#/') {
        setActiveVendorId(null);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const activeVendor = useMemo(() => {
    if (!activeVendorId) return null;
    return users.find(u => u.vendorId === activeVendorId && u.role === 'VENDOR');
  }, [activeVendorId, users]);

  // Data Filtering Logic for Multi-Vendor Private Shops
  const filteredProducts = useMemo(() => {
    // If System Admin: See EVERYTHING
    if (user && SUPREME_ADMIN_EMAILS.includes(user.email?.toLowerCase() || '')) return products;
    
    // If Customer viewing a shop: See only that vendor's items
    if (activeVendorId) return products.filter(p => p.vendorId === activeVendorId);
    
    // If Vendor Staff or Vendor Owner: See only their own items
    if (user?.vendorId) return products.filter(p => p.vendorId === user.vendorId);
    
    // Default fallback
    return products;
  }, [products, user, activeVendorId]);

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
        const userEmail = fbUser.email?.toLowerCase() || '';
        const isSystemAdmin = SUPREME_ADMIN_EMAILS.includes(userEmail);
        
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
    setLanguage(prev => (prev === 'en' ? 'ar' : prev === 'ar' ? 'hi' : 'en'));
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
        });
        const unsubRequests = onSnapshot(collection(db, 'vendor_requests'), (snapshot) => {
            const data = snapshot.docs.map(doc => doc.data() as VendorRequest);
            setVendorRequests(data.sort((a,b) => b.timestamp - a.timestamp));
        });
        const unsubSettings = onSnapshot(doc(db, 'settings', 'store'), (docSnap) => {
            if (docSnap.exists()) setStoreSettings(docSnap.data() as StoreSettings);
            setIsSyncing(false);
        });
        return () => { unsubProducts(); unsubCategories(); unsubSales(); unsubBookings(); unsubUsers(); unsubRequests(); unsubSettings(); };
    }
  }, []);

  const handleAddProduct = async (newProduct: Product) => {
    if (db) await setDoc(doc(db, 'products', newProduct.id), newProduct);
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    if (db) await setDoc(doc(db, 'products', updatedProduct.id), updatedProduct);
  };

  const handleBulkUpdateProduct = async (updatedProducts: Product[]) => {
    if (db) {
        const batch = writeBatch(db);
        updatedProducts.forEach(p => batch.set(doc(db, 'products', p.id), p));
        await batch.commit();
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Delete product?')) return;
    if (db) await deleteDoc(doc(db, 'products', id));
  };

  const handleCheckout = async (items: CartItem[], total: number, paymentMethod: 'CASH' | 'CARD', subTotal: number, discount: number, tax: number, discountType: 'percent' | 'fixed', customerName?: string, customerPhone?: string) => {
    const saleId = Date.now().toString();
    const newSale: Sale = { 
      id: saleId, timestamp: Date.now(), items, subTotal, discount, discountType, tax, taxRate: storeSettings.taxRate, total, paymentMethod, status: 'COMPLETED', processedBy: user?.id, customerName, customerPhone
    };
    logPurchase(items, total);
    if (db) {
        const batch = writeBatch(db);
        batch.set(doc(db, 'sales', saleId), newSale);
        items.forEach(item => {
            const p = products.find(prod => prod.id === item.id);
            if (p) batch.update(doc(db, 'products', item.id), { stock: p.stock - item.quantity });
        });
        await batch.commit();
    }
  };

  const handleLogout = async () => {
    if (auth) await signOut(auth);
    setUser(null);
    setCurrentView(AppView.LOGIN);
    setNavigationHistory([]);
    setActiveVendorId(null);
    window.location.hash = '';
  };

  if (isAuthChecking) {
      return (
          <div className="min-h-screen bg-slate-950 flex items-center justify-center">
              <Loader2 className="animate-spin text-[#0ea5e9]" size={64} strokeWidth={3} />
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
        storeSettings={storeSettings}
        activeVendorId={activeVendorId}
        activeVendor={activeVendor}
      />
    );
  }

  return (
    <div className="flex ltr:h-[100svh] rtl:h-[100svh] overflow-hidden bg-[#111827] dark:bg-black font-sans flex-col lg:flex-row transition-colors">
      {!user?.role.includes('CUSTOMER') && (
        <div className={`fixed inset-y-0 z-[70] w-72 transform transition-all duration-500 lg:static lg:w-72 lg:translate-x-0 ${isSidebarVisible ? 'translate-x-0' : 'ltr:-translate-x-full rtl:translate-x-full'}`}>
            <Sidebar currentView={currentView} onChangeView={navigateTo} onLogout={handleLogout} currentUser={user!} isOnline={isOnline} isSyncing={isSyncing} isDarkMode={isDarkMode} toggleTheme={toggleTheme} language={language} toggleLanguage={toggleLanguage} t={t} onClose={() => setIsSidebarVisible(false)} />
        </div>
      )}
      <main className={`flex-1 overflow-hidden relative flex flex-col bg-[#f8fafc] dark:bg-slate-950 transition-all duration-500 ${!user?.role.includes('CUSTOMER') && isSidebarVisible ? 'ltr:lg:rounded-l-[44px] rtl:lg:rounded-r-[44px] shadow-2xl' : ''}`}>
        <div className="flex-1 overflow-hidden relative">
            {currentView === AppView.CUSTOMER_PORTAL && <CustomerPortal products={filteredProducts} language={language} t={t} currentUser={user} onLoginRequest={() => { setUser(null); navigateTo(AppView.LOGIN); }} onLogout={handleLogout} onUpdateAvatar={() => {}} storeSettings={storeSettings} />}
            {currentView === AppView.VENDOR_PANEL && <VendorPanel products={products} sales={sales} users={users} currentUser={user!} onAddProduct={handleAddProduct} onUpdateProduct={handleUpdateProduct} onDeleteProduct={handleDeleteProduct} onBulkUpdateProduct={handleBulkUpdateProduct} onAddUser={() => {}} onUpdateUser={() => {}} onDeleteUser={() => {}} language={language} t={t} onGoBack={handleGoBack} />}
            {currentView === AppView.POS && <POS products={filteredProducts} sales={sales} onCheckout={handleCheckout} storeSettings={storeSettings} onViewOrderHistory={() => navigateTo(AppView.ORDERS)} onUpdateStoreSettings={() => {}} t={t} language={language} currentUser={user!} onGoBack={handleGoBack} />}
            {currentView === AppView.INVENTORY && <Inventory products={filteredProducts} categories={categories} onAddProduct={handleAddProduct} onUpdateProduct={handleUpdateProduct} onDeleteProduct={handleDeleteProduct} onBulkUpdateProduct={handleBulkUpdateProduct} onGoBack={handleGoBack} t={t} currentUser={user!} language={language} storeSettings={storeSettings} />}
            {currentView === AppView.REPORTS && <Reports sales={sales} products={products} users={users} onGoBack={handleGoBack} language={language} />}
            {currentView === AppView.ORDERS && <Orders sales={sales} onProcessReturn={() => {}} storeSettings={storeSettings} onGoBack={handleGoBack} language={language} />}
            {currentView === AppView.SETTINGS && <Settings users={users} vendorRequests={vendorRequests} products={products} sales={sales} onAddUser={() => {}} onUpdateUser={() => {}} onDeleteUser={() => {}} onReviewRequest={() => {}} onLogout={handleLogout} currentUser={user!} storeSettings={storeSettings} onUpdateStoreSettings={() => {}} onGoBack={handleGoBack} language={language} toggleLanguage={toggleLanguage} t={t} onNavigate={navigateTo} />}
        </div>
        {user && !user.role.includes('CUSTOMER') && <ClawdBot products={products} sales={sales} storeSettings={storeSettings} currentUser={user} language={language} t={t} />}
      </main>
    </div>
  );
};

export default App;
