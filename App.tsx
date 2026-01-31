
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
import { AppView, Product, Sale, User, StoreSettings, Language } from './types';
import { translations } from './translations';
import { Loader2, Menu, Globe, ChevronLeft, LogOut } from 'lucide-react';
import { supabase } from './supabase';

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
  const [isSyncing, setIsSyncing] = useState(false);

  const [storeSettings, setStoreSettings] = useState<StoreSettings>({
    name: 'easyPOS', address: 'Retail Management System', phone: '', footerMessage: 'System Operational.',
    receiptSize: '80mm', whatsappTemplate: '', whatsappPhoneNumber: '', taxEnabled: false, taxRate: 0, taxName: 'Tax', autoPrint: false,
    visitorAccessCode: '2026'
  });

  const toggleLanguage = useCallback(() => setLanguage(prev => prev === 'en' ? 'ar' : 'en'), []);
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
    await supabase.auth.signOut();
    setUser(null);
    setCurrentView(AppView.LOGIN);
    setNavigationHistory([]);
  };

  // --- USER PERSISTENCE HANDLERS (Supabase Ready) ---
  const handleAddUser = async (newUser: User) => {
    setIsSyncing(true);
    try {
        // Optimistic Update
        setUsers(prev => [...prev, newUser]);
        
        // Supabase DB Sync
        const { error } = await supabase
            .from('profiles')
            .insert([{
                id: newUser.id,
                name: newUser.name,
                username: newUser.username,
                password: newUser.password, // In real apps, don't store plain passwords
                role: newUser.role,
                vendor_id: newUser.vendorId,
                vendor_settings: newUser.vendorSettings,
                vendor_staff_limit: newUser.vendorStaffLimit
            }]);
            
        if (error) throw error;
    } catch (err) {
        console.error("User provisioning failed", err);
    } finally {
        setIsSyncing(false);
    }
  };

  const handleUpdateUser = async (updatedUser: User) => {
    setIsSyncing(true);
    try {
        setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
        
        // Update currently logged in user if they updated themselves (e.g. Vendor updating store profile)
        if (user?.id === updatedUser.id) {
            setUser(updatedUser);
        }

        const { error } = await supabase
            .from('profiles')
            .update({
                name: updatedUser.name,
                username: updatedUser.username,
                password: updatedUser.password,
                role: updatedUser.role,
                vendor_id: updatedUser.vendorId,
                vendor_settings: updatedUser.vendorSettings,
                vendor_staff_limit: updatedUser.vendorStaffLimit
            })
            .eq('id', updatedUser.id);
            
        if (error) throw error;
    } catch (err) {
        console.error("User sync failed", err);
    } finally {
        setIsSyncing(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm("Permanently sever this identity node?")) return;
    setIsSyncing(true);
    try {
        setUsers(prev => prev.filter(u => u.id !== id));
        const { error } = await supabase.from('profiles').delete().eq('id', id);
        if (error) throw error;
    } catch (err) {
        console.error("Identity severance failed", err);
    } finally {
        setIsSyncing(false);
    }
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

  // Auth & Data Sync via Supabase
  useEffect(() => {
    const fetchSessionAndUsers = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        
        // Fetch all profiles from Supabase
        const { data: profiles, error } = await supabase.from('profiles').select('*');
        if (!error && profiles) {
            const mappedUsers: User[] = profiles.map(p => ({
                id: p.id,
                name: p.name,
                username: p.username,
                password: p.password,
                role: p.role,
                vendorId: p.vendor_id,
                vendorSettings: p.vendor_settings,
                vendorStaffLimit: p.vendor_staff_limit,
                email: p.email
            }));
            setUsers(mappedUsers);
        }

        if (session?.user) {
          const email = session.user.email?.toLowerCase() || '';
          const isAdmin = email === 'nabeelkhan1007@gmail.com' || email === 'zahratalsawsen1@gmail.com';
          
          // Find full profile
          const profile = profiles?.find(p => p.id === session.user.id);

          setUser({
            id: session.user.id,
            name: profile?.name || session.user.user_metadata.full_name || (isAdmin ? 'System Master' : 'User'),
            username: profile?.username || email.split('@')[0],
            role: profile?.role || (isAdmin ? 'ADMIN' : 'CUSTOMER'),
            email: email,
            vendorId: profile?.vendor_id,
            vendorSettings: profile?.vendor_settings,
            vendorStaffLimit: profile?.vendor_staff_limit
          });
          
          if (isAdmin) setCurrentView(AppView.POS);
          else if (profile?.role === 'VENDOR' || profile?.role === 'VENDOR_STAFF') setCurrentView(AppView.VENDOR_PANEL);
          else setCurrentView(AppView.CUSTOMER_PORTAL);
        }
        setIsAuthChecking(false);
    };

    fetchSessionAndUsers();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) setUser(null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
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
        language={language} toggleLanguage={toggleLanguage} activeVendorId={null}
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
        {!user?.role.includes('CUSTOMER') && currentView !== AppView.LOGIN && (
            <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-50 no-print">
                <div className="flex items-center gap-4">
                    <button onClick={() => setIsSidebarVisible(!isSidebarVisible)} className="p-2 lg:hidden text-slate-500"><Menu size={24}/></button>
                    <button onClick={handleGoBack} className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl hover:text-brand-600 transition-all flex items-center gap-2 group">
                        <ChevronLeft size={20} className="rtl:rotate-180" />
                        <span className="text-[10px] font-black uppercase tracking-widest">{t('back')}</span>
                    </button>
                    <h2 className="text-sm font-black uppercase tracking-[0.2em] dark:text-white italic ml-2">{getViewTitle(currentView)}</h2>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={toggleLanguage} className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-500 rounded-xl hover:bg-brand-500 hover:text-white transition-all"><Globe size={18}/></button>
                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>
                    <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-950/20 text-red-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all group border border-red-100 dark:border-red-900/20">
                        <LogOut size={16}/><span className="hidden md:inline">{t('logout')}</span>
                    </button>
                </div>
            </header>
        )}
        <div className="flex-1 overflow-hidden relative">
            {currentView === AppView.CUSTOMER_PORTAL && <CustomerPortal products={products} language={language} t={t} currentUser={user} onLoginRequest={() => navigateTo(AppView.LOGIN)} onLogout={handleLogout} onUpdateAvatar={() => {}} storeSettings={storeSettings} />}
            {currentView === AppView.VENDOR_PANEL && <VendorPanel products={products} sales={sales} users={users} currentUser={user!} onAddProduct={()=>{}} onUpdateProduct={()=>{}} onDeleteProduct={()=>{}} onBulkUpdateProduct={() => {}} onAddUser={handleAddUser} onUpdateUser={handleUpdateUser} onDeleteUser={handleDeleteUser} language={language} t={t} onGoBack={handleGoBack} />}
            {currentView === AppView.POS && <POS products={products} sales={sales} onCheckout={() => {}} storeSettings={storeSettings} onViewOrderHistory={() => navigateTo(AppView.ORDERS)} onUpdateStoreSettings={() => {}} t={t} language={language} currentUser={user!} onGoBack={handleGoBack} />}
            {currentView === AppView.INVENTORY && <Inventory products={products} onAddProduct={()=>{}} onUpdateProduct={()=>{}} onDeleteProduct={()=>{}} onBulkUpdateProduct={() => {}} onGoBack={handleGoBack} t={t} currentUser={user!} language={language} />}
            {currentView === AppView.REPORTS && <Reports sales={sales} products={products} users={users} onGoBack={handleGoBack} language={language} />}
            {currentView === AppView.ORDERS && <Orders sales={sales} onProcessReturn={() => {}} storeSettings={storeSettings} onGoBack={handleGoBack} language={language} />}
            {currentView === AppView.SETTINGS && <Settings users={users} vendorRequests={[]} products={products} sales={sales} onAddUser={handleAddUser} onUpdateUser={handleUpdateUser} onDeleteUser={handleDeleteUser} onReviewRequest={() => {}} onLogout={handleLogout} currentUser={user!} storeSettings={storeSettings} onUpdateStoreSettings={() => {}} onGoBack={handleGoBack} language={language} toggleLanguage={toggleLanguage} t={t} />}
        </div>
        {!user?.role.includes('CUSTOMER') && <ClawdBot products={products} sales={sales} storeSettings={storeSettings} currentUser={user!} language={language} t={t} />}
      </main>
    </div>
  );
};

export default App;
