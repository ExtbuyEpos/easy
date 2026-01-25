import React from 'react';
import { ShoppingCart, Package, BarChart3, LogOut, ScanLine, Settings, MessageCircle, X, History, Wifi, WifiOff, RefreshCw, List, Moon, Sun, Globe, LayoutDashboard, ChevronLeft, ChevronRight } from 'lucide-react';
import { AppView, User, UserRole, Language } from '../types';

interface SidebarProps {
  currentView: AppView;
  onChangeView: (view: AppView) => void;
  onLogout: () => void;
  currentUser: User;
  onClose?: () => void;
  isOnline: boolean;
  isSyncing: boolean;
  isDarkMode: boolean;
  toggleTheme: () => void;
  language: Language;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, onChangeView, onLogout, currentUser, onClose, isOnline, isSyncing,
  isDarkMode, toggleTheme, language, toggleLanguage, t
}) => {
  
  const getNavItems = (role: UserRole) => {
    const items = [
      { view: AppView.POS, label: t('posTerminal'), icon: ShoppingCart },
    ];
    
    // CASHIER: Restricted to POS Only
    if (role === 'CASHIER') return items;

    // STAFF & ABOVE
    if (['ADMIN', 'MANAGER', 'STAFF'].includes(role)) {
       items.push({ view: AppView.ORDERS, label: t('ordersReturns'), icon: History });
    }

    if (['ADMIN', 'MANAGER', 'STAFF'].includes(role)) {
      items.push({ view: AppView.INVENTORY, label: t('inventory'), icon: Package });
      items.push({ view: AppView.CATEGORIES, label: t('categoryList'), icon: List });
      items.push({ view: AppView.STOCK_CHECK, label: t('stockCheck'), icon: ScanLine });
    }

    // MANAGER & ADMIN (Managers can see reports, as requested)
    if (['ADMIN', 'MANAGER'].includes(role)) {
      items.push({ view: AppView.REPORTS, label: t('reportsAi'), icon: BarChart3 });
    }

    // ADMIN ONLY
    if (role === 'ADMIN') {
      items.push({ view: AppView.SETTINGS, label: t('settings'), icon: Settings });
      items.push({ view: AppView.BAILEYS_SETUP, label: t('whatsappSetup'), icon: MessageCircle });
    }

    return items;
  };

  const navItems = getNavItems(currentUser.role);

  return (
    <div className="w-full bg-[#111827] dark:bg-slate-950 text-white flex flex-col h-full shadow-2xl no-print border-r border-slate-800 transition-all duration-300">
      {/* Brand Header */}
      <div className="p-8 pb-10 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
           <div className="bg-brand-500 p-2.5 rounded-xl shadow-xl shadow-brand-500/20 transform hover:rotate-12 transition-transform cursor-pointer">
              <LayoutDashboard size={26} className="text-white" />
           </div>
           <div>
              <h1 className="text-2xl font-black tracking-tighter text-white uppercase italic">easyPOS</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest leading-none">
                    {isOnline ? 'System Live' : 'Offline Mode'}
                  </p>
              </div>
           </div>
        </div>
        
        {/* Toggle / Close Button for both Mobile and Desktop */}
        {onClose && (
            <button 
                onClick={onClose} 
                className="p-2.5 bg-slate-800/50 hover:bg-slate-800 rounded-xl text-slate-400 transition-all active:scale-90"
                title="Hide Sidebar"
            >
                <ChevronLeft size={20} className="rtl:rotate-180" />
            </button>
        )}
      </div>

      {/* User Status Section */}
      <div className="mx-6 mb-8">
          <div className="bg-slate-800/30 dark:bg-slate-900/40 p-4 rounded-[24px] border border-slate-700/30 flex items-center gap-4 backdrop-blur-sm">
              <div className="relative group">
                  <div className="w-14 h-14 rounded-[18px] bg-gradient-to-br from-brand-400 to-brand-700 flex items-center justify-center font-black text-2xl text-white shadow-lg transform group-hover:scale-105 transition-all">
                      {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 bg-emerald-500 border-[3px] border-slate-900 rounded-full"></div>
              </div>
              <div className="overflow-hidden flex-1">
                  <p className="font-black text-sm truncate text-white leading-none mb-1.5">{currentUser.name}</p>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-[9px] text-brand-400 font-black uppercase tracking-widest">{currentUser.role}</span>
                  </div>
              </div>
          </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto custom-scrollbar">
        <div className="px-4 mb-3 flex items-center justify-between">
           <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em]">Control Panel</span>
           <div className="h-px bg-slate-800 flex-1 ml-4 opacity-50"></div>
        </div>
        {navItems.map((item) => {
          const isActive = currentView === item.view;
          return (
            <button
              key={item.view}
              onClick={() => {
                onChangeView(item.view);
              }}
              className={`w-full group flex items-center gap-3.5 px-6 py-4 rounded-2xl transition-all duration-300 relative ${
                isActive
                  ? 'bg-brand-600 text-white shadow-2xl shadow-brand-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <item.icon size={22} className={`shrink-0 transition-all ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'group-hover:scale-110 group-hover:text-brand-400'}`} />
              <span className={`font-black text-sm tracking-tight ${isActive ? 'translate-x-1.5' : 'group-hover:translate-x-1'} transition-transform`}>{item.label}</span>
              
              {isActive && (
                 <div className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white rounded-full animate-pulse shadow-[0_0_10px_white]"></div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer System Actions */}
      <div className="p-4 pt-6 border-t border-slate-800/50 dark:border-slate-900 space-y-4">
        
        {/* Toggle Utility Buttons */}
        <div className="grid grid-cols-2 gap-3">
            <button 
                onClick={toggleTheme}
                className="flex flex-col items-center justify-center gap-2 p-3.5 rounded-[22px] bg-slate-800/20 hover:bg-slate-800/40 transition-all border border-slate-700/20 group"
            >
                {isDarkMode ? <Sun size={20} className="text-amber-400 group-hover:rotate-45 transition-transform"/> : <Moon size={20} className="text-brand-400 group-hover:-rotate-12 transition-transform" />}
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-white">{isDarkMode ? t('light') : t('dark')}</span>
            </button>
            <button 
                onClick={toggleLanguage}
                className="flex flex-col items-center justify-center gap-2 p-3.5 rounded-[22px] bg-slate-800/20 hover:bg-slate-800/40 transition-all border border-slate-700/20 group"
            >
                <Globe size={20} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-white">{language === 'en' ? 'Arabic' : 'English'}</span>
            </button>
        </div>

        {/* Dynamic Sync Status Card */}
        <div className={`p-4 rounded-[24px] transition-all border shadow-lg ${isOnline ? 'bg-emerald-950/10 border-emerald-900/30 text-emerald-400' : 'bg-red-950/10 border-red-900/30 text-red-400'}`}>
             <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${isOnline ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                    {isSyncing ? (
                        <RefreshCw size={18} className="animate-spin" />
                    ) : isOnline ? (
                        <Wifi size={18} />
                    ) : (
                        <WifiOff size={18} />
                    )}
                </div>
                
                <div className="flex-1 overflow-hidden">
                    <div className="text-[10px] font-black uppercase tracking-widest mb-0.5 leading-none">{isSyncing ? t('syncing') : isOnline ? t('onlineMode') : t('offlineMode')}</div>
                    <div className="font-bold text-[9px] opacity-40 truncate">
                        {isOnline ? t('synced') : t('savedDevice')}
                    </div>
                </div>
             </div>
        </div>

        {/* Enhanced Logout Button */}
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-3 px-6 py-4.5 rounded-[24px] text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all font-black text-xs uppercase tracking-[0.15em] border border-transparent hover:border-red-500/20 group"
        >
          <LogOut size={18} className="shrink-0 group-hover:-translate-x-1 transition-transform" />
          <span>{t('logout')}</span>
        </button>
      </div>
    </div>
  );
};