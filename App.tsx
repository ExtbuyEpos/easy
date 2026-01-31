
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
import { CloudOff, Loader2, LogOut, ChevronLeft, Menu, Bell, Globe } from 'lucide-react';

import { db, auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [currentView, setCurrentView] = useState<AppView>(AppView.POS);
  const [navigationHistory, setNavigationHistory] = useState<AppView[]>([]);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => localStorage.getItem('easyPOS_theme') === 'dark');
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('easyPOS_language') as Language) || 'en');
  
  const [isSidebarVisible, setIsSidebarVisible] = useState(window.innerWidth >= 1024);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  const [storeSettings, setStoreSettings] = useState<StoreSettings>({
    name: 'easyPOS', address: 'Retail Management System', phone: '', footerMessage: 'System Operational.',
    receiptSize: '80mm', whatsappTemplate: '', whatsappPhoneNumber: '', taxEnabled: false, taxRate: 0, taxName: 'Tax', autoPrint: false,
    visitorAccessCode: '2026'
  });

  const [activeVendorId, setActiveVendorId] = useState<string | null>(null);

  const isSupremeAdmin = useMemo(() => user?.email?.toLowerCase() === 'nabeelkhan1007@gmail.com', [user]);

  const toggleLanguage = useCallback(() => {
    setLanguage(prev => prev === 'en' ? 'ar' : 'en');
  }, []);

  const navigateTo = useCallback((view: AppView) => {
    if (view === currentView) return;
    setNavigationHistory(prev => [...prev, currentView]);
    setCurrentView(view);
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

  const handleLogout = async () => {
    if (auth) await signOut(auth);
    setUser(null);
    setCurrentView(AppView.LOGIN);
    setActiveVendorId(null);
    setNavigationHistory([]);
  };

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('easyPOS_theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('easyPOS_language', language);
    document.documentElement.dir = (language === 'ar') ? 'rtl' : 'ltr';
  }, [language]);

  useEffect(() => {
    if (!auth) { setIsAuthChecking(false); return; }
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        const userEmail = fbUser.email?.toLowerCase() || '';
        const isAdmin = userEmail === 'nabeelkhan1007@gmail.com' || userEmail === 'zahratalsawsen1@gmail.com';
        const restoredUser: User = {
          id: fbUser.uid,
          name: fbUser.displayName || (isAdmin ? 'System Master' : 'User'),
          username: fbUser.email?.split('@')[0] || 'user',
          role: isAdmin ? 'ADMIN' : 'CUSTOMER',
          email: fbUser.email || undefined,
        };
        setUser(restoredUser);
        if (restoredUser.role === 'CUSTOMER') setCurrentView(AppView.CUSTOMER_PORTAL);
      }
      setIsAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (db) {
        setIsSyncing(true);
        const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
            setProducts(snapshot.docs.map(doc => doc.data() as Product));
        });
        const unsubSales = onSnapshot(collection(db, 'sales'), (snapshot) => {
            setSales(snapshot.docs.map(doc => doc.data() as Sale).sort((a,b) => b.timestamp - a.timestamp));
        });
        const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
            setUsers(snapshot.docs.map(doc => doc.data() as User));
        });
        const unsubSettings = onSnapshot(doc(db, 'settings', 'store'), (docSnap) => {
            if (docSnap.exists()) setStoreSettings(docSnap.data() as StoreSettings);
            setIsSyncing(false);
        });
        return () => { unsubProducts(); unsubSales(); unsubUsers(); unsubSettings(); };
    }
  }, []);

  const t = (key: string) => translations[language][key] || key;

  if (isAuthChecking) {
      return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="animate-spin text-brand-500" size={64} strokeWidth={3} /></div>;
  }

  if (!user && currentView !== AppView.CUSTOMER_PORTAL) {
    return (
      <Login 
        onLogin={(u) => { setUser(u); setCurrentView(u.role === 'CUSTOMER' ? AppView.CUSTOMER_PORTAL : (u.role.includes('VENDOR') ? AppView.VENDOR_PANEL : AppView.POS)); }} 
        users={users} t={t} isDarkMode={isDarkMode} toggleTheme={() => setIsDarkMode(!isDarkMode)} 
        language={language} toggleLanguage={toggleLanguage} activeVendorId={activeVendorId}
      />
    );
  }

  const getViewTitle = (view: AppView) => {
    switch(view) {
      case AppView.POS: return t('posTerminal');
      case AppView.INVENTORY: return t('inventory');
      case AppView.REPORTS: return t('reportsAi');
      case AppView.VENDOR_PANEL: return t('vendorPanel');
      case AppView.SETTINGS: return t('settings');
      case AppView.ORDERS: return t('ordersReturns');
      default: return 'System';
    }
  };

  return (
    <div className="flex h-[100svh] overflow-hidden bg-[#111827] font-sans flex-col lg:flex-row transition-colors">
      {!user?.role.includes('CUSTOMER') && (
        <div className={`fixed inset-y-0 z-[100] w-72 transform transition-all duration-500 lg:static lg:w-72 lg:translate-x-0 ${isSidebarVisible ? 'translate-x-0' : 'ltr:-translate-x-full rtl:translate-x-full'}`}>
            <Sidebar currentView={currentView} onChangeView={navigateTo} onLogout={handleLogout} currentUser={user!} isOnline={true} isSyncing={isSyncing} isDarkMode={isDarkMode} toggleTheme={() => setIsDarkMode(!isDarkMode)} language={language} toggleLanguage={toggleLanguage} t={t} onClose={() => setIsSidebarVisible(false)} />
        </div>
      )}
      <main className={`flex-1 overflow-hidden relative flex flex-col bg-[#f8fafc] dark:bg-slate-950 transition-all duration-500 ${!user?.role.includes('CUSTOMER') && isSidebarVisible ? 'ltr:lg:rounded-l-[44px] rtl:lg:rounded-r-[44px] shadow-2xl' : ''}`}>
        
        {/* Simplified One-Click Multi-Button Header */}
        {!user?.role.includes('CUSTOMER') && currentView !== AppView.LOGIN && (
            <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-50 no-print">
                <div className="flex items-center gap-4">
                    <button onClick={() => setIsSidebarVisible(!isSidebarVisible)} className="p-2 lg:hidden text-slate-500"><Menu size={24}/></button>
                    {/* Primary Back Button for Each Page */}
                    <button onClick={handleGoBack} className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl hover:text-brand-600 transition-all flex items-center gap-2 group">
                        <ChevronLeft size={20} className="rtl:rotate-180 group-hover:-translate-x-0.5 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest">{t('back')}</span>
                    </button>
                    <h2 className="text-sm font-black uppercase tracking-[0.2em] dark:text-white italic ml-2">{getViewTitle(currentView)}</h2>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={toggleLanguage} className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-500 rounded-xl hover:bg-brand-500 hover:text-white transition-all">
                        <Globe size={18}/>
                    </button>
                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>
                    {/* Top Logout Button for Each Page */}
                    <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-950/20 text-red-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all group border border-red-100 dark:border-red-900/20">
                        <LogOut size={16} className="group-hover:-translate-x-1 transition-transform"/>
                        <span className="hidden md:inline">{t('logout')}</span>
                    </button>
                </div>
            </header>
        )}

        <div className="flex-1 overflow-hidden relative">
            {currentView === AppView.CUSTOMER_PORTAL && <CustomerPortal products={products} language={language} t={t} currentUser={user} onLoginRequest={() => navigateTo(AppView.LOGIN)} onLogout={handleLogout} onUpdateAvatar={() => {}} storeSettings={storeSettings} />}
            {currentView === AppView.VENDOR_PANEL && <VendorPanel products={products} sales={sales} users={users} currentUser={user!} onAddProduct={(p) => setDoc(doc(db!, 'products', p.id), p)} onUpdateProduct={(p) => setDoc(doc(db!, 'products', p.id), p)} onDeleteProduct={(id) => deleteDoc(doc(db!, 'products', id))} onBulkUpdateProduct={() => {}} onAddUser={(u) => setDoc(doc(db!, 'users', u.id), u)} onUpdateUser={(u) => setDoc(doc(db!, 'users', u.id), u)} onDeleteUser={(id) => deleteDoc(doc(db!, 'users', id))} language={language} t={t} onGoBack={handleGoBack} />}
            {currentView === AppView.POS && <POS products={products} sales={sales} onCheckout={() => {}} storeSettings={storeSettings} onViewOrderHistory={() => navigateTo(AppView.ORDERS)} onUpdateStoreSettings={() => {}} t={t} language={language} currentUser={user!} onGoBack={handleGoBack} />}
            {currentView === AppView.INVENTORY && <Inventory products={products} onAddProduct={(p) => setDoc(doc(db!, 'products', p.id), p)} onUpdateProduct={(p) => setDoc(doc(db!, 'products', p.id), p)} onDeleteProduct={(id) => deleteDoc(doc(db!, 'products', id))} onBulkUpdateProduct={() => {}} onGoBack={handleGoBack} t={t} currentUser={user!} language={language} />}
            {currentView === AppView.REPORTS && <Reports sales={sales} products={products} users={users} onGoBack={handleGoBack} language={language} />}
            {currentView === AppView.ORDERS && <Orders sales={sales} onProcessReturn={() => {}} storeSettings={storeSettings} onGoBack={handleGoBack} language={language} />}
            {currentView === AppView.SETTINGS && <Settings users={users} vendorRequests={[]} products={products} sales={sales} onAddUser={(u) => setDoc(doc(db!, 'users', u.id), u)} onUpdateUser={(u) => setDoc(doc(db!, 'users', u.id), u)} onDeleteUser={(id) => deleteDoc(doc(db!, 'users', id))} onReviewRequest={() => {}} onLogout={handleLogout} currentUser={user!} storeSettings={storeSettings} onUpdateStoreSettings={() => {}} onGoBack={handleGoBack} language={language} toggleLanguage={toggleLanguage} t={t} />}
        </div>
        {!user?.role.includes('CUSTOMER') && <ClawdBot products={products} sales={sales} storeSettings={storeSettings} currentUser={user!} language={language} t={t} />}
      </main>
    </div>
  );
};

export default App;
