
import React, { useState, useMemo } from 'react';
import { Product, Language, User, StoreSettings } from '../types';
import { CURRENCY } from '../constants';
import { Search, ShoppingBag, User as UserIcon, Sparkles, LogIn, ChevronRight, LayoutGrid, List, Camera, ImageIcon, UserCircle2, Settings2, RefreshCcw } from 'lucide-react';
import { formatCurrency, formatNumber } from '../utils/format';
import { VirtualTryOn } from './VirtualTryOn';
import { CustomerBot } from './CustomerBot';

interface CustomerPortalProps {
  products: Product[];
  language: Language;
  t: (key: string) => string;
  onLoginRequest: () => void;
  currentUser: User | null;
  onLogout: () => void;
  onUpdateAvatar: (data: string, tryOnCache?: Record<string, string>) => void;
  storeSettings: StoreSettings;
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({
  products,
  language,
  t,
  onLoginRequest,
  currentUser,
  onLogout,
  onUpdateAvatar,
  storeSettings
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [tryOnProduct, setTryOnProduct] = useState<Product | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAvatarSetup, setShowAvatarSetup] = useState(false);

  const categories = useMemo(() => ['All', ...Array.from(new Set(products.map(p => p.category))).sort()], [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const needsAvatarSetup = currentUser && !currentUser.customerAvatar && !showAvatarSetup;

  if (tryOnProduct || needsAvatarSetup || showAvatarSetup) {
    return (
      <VirtualTryOn 
        product={tryOnProduct} 
        onClose={() => { setTryOnProduct(null); setShowAvatarSetup(false); }} 
        language={language} 
        t={t} 
        initialAvatar={currentUser?.customerAvatar}
        tryOnCache={currentUser?.tryOnCache}
        onCaptureAvatar={(avatarData, cache) => {
            onUpdateAvatar(avatarData, cache);
            setShowAvatarSetup(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors flex flex-col relative">
      {/* Customer Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 py-6 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-brand-600 p-2.5 rounded-2xl shadow-xl shadow-brand-600/20 rotate-3">
              <ShoppingBag className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black italic uppercase tracking-tighter dark:text-white">easyPOS <span className="text-brand-600">Shop</span></h1>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Virtual Showroom</p>
            </div>
          </div>

          <div className="flex-1 max-w-xl hidden md:block relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder={t('searchProducts')} 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-800 py-3.5 pl-12 pr-6 rounded-2xl border border-transparent focus:border-brand-500 outline-none transition-all font-bold dark:text-white text-sm"
            />
          </div>

          <div className="flex items-center gap-4">
            {currentUser ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Authenticated</p>
                  <p className="text-xs font-black dark:text-white">{currentUser.name}</p>
                </div>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <button 
                      onClick={() => setShowAvatarSetup(true)}
                      className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center text-brand-600 hover:text-brand-400 transition-all active:scale-90 shadow-sm"
                      title="Update AI Avatar"
                    >
                      <UserCircle2 size={20} />
                    </button>
                    <button 
                      onClick={onLogout}
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 transition-all active:scale-90"
                      title="Sign Out"
                    >
                      <UserIcon size={20} />
                    </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={onLoginRequest}
                className="flex items-center gap-3 px-6 py-3 bg-slate-900 dark:bg-brand-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all italic"
              >
                <LogIn size={18} /> {t('loginWithGoogle')}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Banner (Only for Guests) */}
      {!currentUser && (
        <div className="bg-brand-600 p-8 md:p-16 text-white text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-brand-700 to-transparent opacity-50"></div>
          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-xl rounded-full text-[10px] font-black uppercase tracking-widest italic">
              <Sparkles size={14} /> New: AI Virtual Try-On Available
            </div>
            <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter leading-none">Experience Your Look in Real-Time</h2>
            <p className="text-brand-100 font-medium text-sm md:text-base leading-relaxed opacity-80">Sign in with Google to unlock professional AI features including our virtual magic mirror.</p>
            <button 
              onClick={onLoginRequest}
              className="px-10 py-5 bg-white text-brand-600 rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-2xl hover:scale-105 transition-all active:scale-95 italic"
            >
              Unlock AI Features
            </button>
          </div>
          <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-white/10 rounded-full blur-[100px]"></div>
          <div className="absolute -top-20 -left-20 w-80 h-80 bg-brand-400/20 rounded-full blur-[80px]"></div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 py-4 overflow-x-auto no-scrollbar flex items-center gap-4 justify-center">
        {categories.map(cat => (
          <button 
            key={cat} 
            onClick={() => setSelectedCategory(cat)} 
            className={`whitespace-nowrap px-6 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border-2 ${selectedCategory === cat ? 'bg-brand-600 text-white border-brand-500 shadow-lg' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-transparent hover:bg-slate-100'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Main Grid */}
      <main className="flex-1 p-6 md:p-12 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between mb-10">
           <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-brand-600/10 flex items-center justify-center text-brand-600">
                  <LayoutGrid size={20} />
              </div>
              <h3 className="text-2xl font-black italic uppercase tracking-tighter dark:text-white">Our Collection</h3>
           </div>
           <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
              <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-slate-100 dark:bg-slate-800 text-brand-600 shadow-inner' : 'text-slate-400'}`}><LayoutGrid size={18} /></button>
              <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-slate-100 dark:bg-slate-800 text-brand-600 shadow-inner' : 'text-slate-400'}`}><List size={18} /></button>
           </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="py-24 text-center space-y-4 opacity-30">
            <Search size={80} strokeWidth={1} className="mx-auto" />
            <p className="font-black text-[10px] uppercase tracking-[0.4em] italic">No products found matching your search</p>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8' : 'flex flex-col gap-4'}>
            {filteredProducts.map(p => (
              <div 
                key={p.id} 
                className={`group bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 ${viewMode === 'list' ? 'flex items-center p-4 gap-6' : 'flex flex-col p-4'}`}
              >
                <div className={`relative overflow-hidden bg-slate-50 dark:bg-slate-800 rounded-[2.2rem] shrink-0 ${viewMode === 'list' ? 'w-32 h-32 md:w-40 md:h-40' : 'aspect-square mb-6'}`}>
                  {p.image ? (
                    <img src={p.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={p.name} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-200"><ImageIcon size={48} /></div>
                  )}
                  {currentUser && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); setTryOnProduct(p); }}
                      className="absolute bottom-4 left-4 right-4 py-3 bg-white/80 backdrop-blur-xl text-brand-600 rounded-2xl font-black text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0 flex items-center justify-center gap-2 shadow-xl hover:bg-brand-600 hover:text-white"
                    >
                      <Sparkles size={14} /> {currentUser.tryOnCache?.[p.id] ? 'View Instant Result' : 'Try on My Avatar'}
                    </button>
                  )}
                </div>

                <div className="flex-1 flex flex-col min-w-0">
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <h4 className="font-black text-slate-900 dark:text-white text-lg tracking-tight truncate uppercase italic">{p.name}</h4>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 shrink-0">{p.category}</span>
                  </div>
                  {(p.size || p.color) && (
                    <div className="flex gap-2 mb-4">
                      {p.size && <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[9px] font-black uppercase text-slate-500 border border-slate-200 dark:border-slate-700">{t('size')}: {p.size}</span>}
                      {p.color && <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[9px] font-black uppercase text-slate-500 border border-slate-200 dark:border-slate-700">{t('color')}: {p.color}</span>}
                    </div>
                  )}
                  <div className="flex items-end justify-between mt-auto">
                    <div>
                      <p className="text-2xl font-black text-brand-600 dark:text-brand-400 tracking-tighter">{formatCurrency(p.sellPrice, language, CURRENCY)}</p>
                    </div>
                    {p.stock <= 5 && (
                      <div className="bg-red-50 dark:bg-red-950/20 px-3 py-1 rounded-full text-[8px] font-black text-red-600 uppercase tracking-widest border border-red-100 dark:border-red-900/30">Limited Stock</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Support Chatbot for Customers */}
      <CustomerBot 
        products={products}
        storeSettings={storeSettings}
        currentUser={currentUser}
        language={language}
        t={t}
      />

      {/* Simple Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 p-12 text-center opacity-40">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('copyright')}</p>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2 italic">{t('poweredBy')}</p>
      </footer>
    </div>
  );
};
