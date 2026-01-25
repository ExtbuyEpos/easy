import React from 'react';
import { LayoutGrid, ShoppingCart, Package, BarChart3, LogOut, ScanLine, Settings, MessageCircle, X, History, Wifi, WifiOff, Cloud, RefreshCw, List } from 'lucide-react';
import { AppView, User, UserRole } from '../types';

interface SidebarProps {
  currentView: AppView;
  onChangeView: (view: AppView) => void;
  onLogout: () => void;
  currentUser: User;
  onCloseMobile?: () => void;
  isOnline: boolean;
  isSyncing: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, onLogout, currentUser, onCloseMobile, isOnline, isSyncing }) => {
  
  // Define visibility logic
  const getNavItems = (role: UserRole) => {
    const items = [
      { view: AppView.POS, label: 'POS Terminal', icon: ShoppingCart },
    ];
    
    // Orders & Returns accessible to everyone except pure Cashiers
    if (['ADMIN', 'MANAGER', 'STAFF'].includes(role)) {
       items.push({ view: AppView.ORDERS, label: 'Orders & Returns', icon: History });
    }

    if (['ADMIN', 'MANAGER', 'STAFF'].includes(role)) {
      items.push({ view: AppView.INVENTORY, label: 'Inventory', icon: Package });
      items.push({ view: AppView.CATEGORIES, label: 'Category List', icon: List });
      items.push({ view: AppView.STOCK_CHECK, label: 'Stock Check', icon: ScanLine });
    }

    if (['ADMIN', 'MANAGER'].includes(role)) {
      items.push({ view: AppView.REPORTS, label: 'Reports & AI', icon: BarChart3 });
    }

    if (role === 'ADMIN') {
      items.push({ view: AppView.SETTINGS, label: 'Settings', icon: Settings });
      items.push({ view: AppView.BAILEYS_SETUP, label: 'WhatsApp Setup', icon: MessageCircle });
    }

    return items;
  };

  const navItems = getNavItems(currentUser.role);

  return (
    <div className="w-full bg-slate-900 text-white flex flex-col h-full shadow-xl no-print">
      <div className="p-6 border-b border-slate-800 flex justify-between items-center">
        <div>
           <h1 className="text-2xl font-bold tracking-tight text-brand-500">easyPOS</h1>
           <p className="text-xs text-slate-400 mt-1">Retail Management System</p>
        </div>
        {/* Mobile Close Button */}
        {onCloseMobile && (
            <button onClick={onCloseMobile} className="lg:hidden text-slate-400 hover:text-white">
                <X size={24} />
            </button>
        )}
      </div>

      <div className="p-4 bg-slate-800/50 mb-2">
         <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center font-bold text-lg">
                 {currentUser.name.charAt(0).toUpperCase()}
             </div>
             <div className="overflow-hidden">
                 <p className="font-bold text-sm truncate">{currentUser.name}</p>
                 <p className="text-xs text-slate-400 capitalize">{currentUser.role.toLowerCase()}</p>
             </div>
         </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => (
          <button
            key={item.view}
            onClick={() => onChangeView(item.view)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
              currentView === item.view
                ? 'bg-brand-600 text-white shadow-md'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <item.icon size={20} className="shrink-0" />
            <span className="font-medium truncate">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Network Status Indicator */}
      <div className="px-4 pb-2">
         <div className={`p-3 rounded-lg flex items-center gap-3 text-xs font-bold border ${isOnline ? 'bg-emerald-900/30 border-emerald-800 text-emerald-400' : 'bg-red-900/30 border-red-800 text-red-400'}`}>
             {isSyncing ? (
                 <RefreshCw size={16} className="animate-spin" />
             ) : isOnline ? (
                 <Wifi size={16} />
             ) : (
                 <WifiOff size={16} />
             )}
             
             <div className="flex-1">
                 <div>{isSyncing ? 'SYNCING DATA...' : isOnline ? 'ONLINE MODE' : 'OFFLINE MODE'}</div>
                 <div className="font-normal opacity-80 text-[10px]">
                     {isOnline ? 'Data synced to cloud' : 'Data saved to device'}
                 </div>
             </div>
         </div>
      </div>

      <div className="p-4 border-t border-slate-800">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors"
        >
          <LogOut size={20} className="shrink-0" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
};