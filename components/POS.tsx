import React, { useState, useEffect, useRef } from 'react';
import { Product, CartItem, StoreSettings } from '../types';
import { CURRENCY } from '../constants';
import { ShoppingCart, Plus, Minus, Search, Image as ImageIcon, QrCode, X, History, ShoppingBag, DollarSign, TrendingUp, Package, Edit3, Trash2 } from 'lucide-react';
import jsQR from 'jsqr';
import QRCode from 'qrcode';

interface POSProps {
  products: Product[];
  onCheckout: (items: CartItem[], total: number, paymentMethod: 'CASH' | 'CARD', subTotal: number, discount: number, tax: number) => void;
  storeSettings: StoreSettings;
  onViewOrderHistory: () => void;
  onUpdateStoreSettings: (settings: StoreSettings) => void;
  t?: (key: string) => string;
  sales?: any[];
}

export const POS: React.FC<POSProps> = ({ products, onCheckout, storeSettings, onViewOrderHistory, onUpdateStoreSettings, t = (k) => k, sales = [] }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [skuInput, setSkuInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showInvoice, setShowInvoice] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [invoiceQr, setInvoiceQr] = useState<string>('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const skuInputRef = useRef<HTMLInputElement>(null);

  // Today's Stats
  const todayRevenue = sales
    .filter(s => new Date(s.timestamp).toDateString() === new Date().toDateString())
    .reduce((acc, s) => acc + s.total, 0);
  
  const todayCount = sales
    .filter(s => new Date(s.timestamp).toDateString() === new Date().toDateString())
    .length;

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category))).sort()];

  useEffect(() => {
    if (window.innerWidth > 1024) skuInputRef.current?.focus();
  }, []);

  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      alert("Item out of stock!");
      return;
    }
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const filteredProducts = products.filter(p => {
    const term = skuInput.toLowerCase().trim();
    const matchesSearch = term === '' || p.name.toLowerCase().includes(term) || p.sku.includes(term);
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const subTotal = cart.reduce((acc, item) => acc + (item.sellPrice * item.quantity), 0);
  const taxAmount = storeSettings.taxEnabled ? subTotal * (storeSettings.taxRate / 100) : 0;
  const finalTotal = subTotal + taxAmount;

  const processPayment = (method: 'CASH' | 'CARD') => {
    if (cart.length === 0) return;
    const saleId = Date.now().toString();
    const saleData = { items: [...cart], subTotal, discount: 0, tax: taxAmount, total: finalTotal, id: saleId, paymentMethod: method, timestamp: Date.now() };
    setLastSale(saleData);
    onCheckout(cart, finalTotal, method, subTotal, 0, taxAmount);
    setCart([]);
    setShowInvoice(true);
    setIsCartOpen(false);
    
    QRCode.toDataURL(saleId).then(setInvoiceQr);
  };

  return (
    <div className="flex h-full bg-[#f8fafc] dark:bg-slate-950 flex-col lg:flex-row overflow-hidden transition-colors">
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden h-full">
        
        {/* Daily Stats Widget & Header */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 p-4 lg:p-6 space-y-4 shrink-0 shadow-sm z-20">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="flex-1 relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  ref={skuInputRef}
                  type="text"
                  value={skuInput}
                  onChange={(e) => setSkuInput(e.target.value)}
                  placeholder={t('searchProducts')}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all font-medium dark:text-white"
                />
              </div>
            </div>
            
            <div className="flex gap-3 shrink-0">
               <button onClick={() => setIsScannerOpen(true)} className="flex items-center gap-2 bg-[#111827] hover:bg-slate-800 text-white px-6 py-3.5 rounded-2xl transition-all font-black text-sm shadow-lg active:scale-95">
                 <QrCode size={20} /> <span>{t('scan')}</span>
               </button>
               <button onClick={onViewOrderHistory} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-white px-6 py-3.5 border border-slate-100 dark:border-slate-700 rounded-2xl transition-all font-black text-sm shadow-sm active:scale-95">
                 <History size={20} /> <span>{t('history')}</span>
               </button>
            </div>
          </div>

          {/* Category Filters */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
             {categories.map(cat => (
               <button
                 key={cat}
                 onClick={() => setSelectedCategory(cat)}
                 className={`whitespace-nowrap px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                   selectedCategory === cat 
                   ? 'bg-brand-600 text-white border-brand-500 shadow-lg' 
                   : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-700 shadow-sm'
                 }`}
               >
                 {cat}
               </button>
             ))}
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
             <div className="bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-3">
                <div className="bg-emerald-500 p-2 rounded-xl text-white shadow-sm"><DollarSign size={18}/></div>
                <div>
                   <div className="text-[9px] font-black text-emerald-600/70 uppercase tracking-widest leading-none mb-1">{t('todayRevenue')}</div>
                   <div className="text-sm font-black text-emerald-900 dark:text-emerald-100 leading-none">{CURRENCY}{todayRevenue.toFixed(2)}</div>
                </div>
             </div>
             <div className="bg-brand-50 dark:bg-brand-950/30 p-3 rounded-2xl border border-brand-100 dark:border-brand-900/30 flex items-center gap-3">
                <div className="bg-brand-500 p-2 rounded-xl text-white shadow-sm"><ShoppingBag size={18}/></div>
                <div>
                   <div className="text-[9px] font-black text-brand-600/70 uppercase tracking-widest leading-none mb-1">{t('todayOrders')}</div>
                   <div className="text-sm font-black text-brand-900 dark:text-brand-100 leading-none">{todayCount}</div>
                </div>
             </div>
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredProducts.map(product => (
              <div 
                key={product.id} 
                onClick={() => addToCart(product)}
                className={`bg-white dark:bg-slate-900 rounded-[32px] p-4 border border-slate-100 dark:border-slate-800 cursor-pointer hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full group active:scale-95 ${product.stock <= 0 ? 'opacity-50' : ''}`}
              >
                <div className="relative aspect-square rounded-[24px] overflow-hidden bg-slate-50 dark:bg-slate-800 mb-4 shrink-0">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-200"><ImageIcon size={48} /></div>
                  )}
                  <div className="absolute top-2 left-2">
                    <span className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-black text-brand-600 uppercase tracking-widest shadow-sm">
                      {product.category}
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-col flex-1">
                   <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                      <span className="font-mono">{product.sku}</span>
                      <span className="flex items-center gap-1">
                        <Package size={10} /> {product.stock}
                      </span>
                   </div>
                   <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight line-clamp-2 h-10 tracking-tight mb-4">
                      {product.name}
                   </h3>
                   <div className="mt-auto flex justify-between items-center">
                      <div className="text-xl font-black text-brand-600 dark:text-brand-400">
                        {CURRENCY}{product.sellPrice.toFixed(2)}
                      </div>
                      <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl flex items-center justify-center transition-all group-hover:bg-brand-600 group-hover:text-white group-hover:shadow-lg">
                        <Plus size={20} strokeWidth={3} />
                      </div>
                   </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cart Drawer */}
      <div className={`
        fixed inset-y-0 right-0 z-50 w-full md:w-[420px] bg-white dark:bg-slate-900 shadow-2xl transform transition-transform duration-500
        lg:static lg:translate-x-0 lg:z-auto lg:border-l lg:border-slate-100 lg:dark:border-slate-800
        ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}
        flex flex-col
      `}>
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
             <div className="bg-brand-500/10 p-2.5 rounded-2xl text-brand-600">
                <ShoppingCart size={24} />
             </div>
             <h2 className="text-xl font-black uppercase tracking-tight dark:text-white">{t('currentOrder')}</h2>
          </div>
          <button onClick={() => setIsCartOpen(false)} className="lg:hidden p-2 hover:bg-slate-100 rounded-full text-slate-400"><X size={24}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-30 text-slate-400 space-y-4">
              <ShoppingBag size={64} />
              <p className="font-black text-sm uppercase tracking-[0.2em]">{t('cartEmpty')}</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-800/50 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                   <span className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight flex-1">{item.name}</span>
                   <span className="font-black text-slate-900 dark:text-white ml-4">{CURRENCY}{(item.sellPrice * item.quantity).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                   <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.quantity} x {CURRENCY}{item.sellPrice.toFixed(2)}</div>
                   <div className="flex items-center gap-1 bg-white dark:bg-slate-900 rounded-xl p-1 border border-slate-100 dark:border-slate-700">
                      <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-lg text-slate-500"><Minus size={14}/></button>
                      <span className="w-8 text-center text-xs font-black dark:text-white">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-lg text-slate-500"><Plus size={14}/></button>
                   </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-8 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 shrink-0 space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-black text-slate-400 uppercase tracking-widest">
              <span>{t('subtotal')}</span>
              <span className="text-slate-700 dark:text-slate-200">{CURRENCY}{subTotal.toFixed(2)}</span>
            </div>
            {taxAmount > 0 && (
              <div className="flex justify-between text-xs font-black text-slate-400 uppercase tracking-widest">
                <span>{storeSettings.taxName} ({storeSettings.taxRate}%)</span>
                <span className="text-slate-700 dark:text-slate-200">{CURRENCY}{taxAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-3xl font-black text-slate-900 dark:text-white tracking-tighter pt-4 border-t border-dashed border-slate-200 dark:border-slate-700">
              <span className="text-xs uppercase tracking-widest mt-2">{t('total')}</span>
              <span>{CURRENCY}{finalTotal.toFixed(2)}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => processPayment('CASH')} disabled={cart.length === 0} className="py-5 bg-slate-900 dark:bg-slate-700 hover:bg-black text-white rounded-[2rem] font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 disabled:opacity-50">{t('cash')}</button>
            <button onClick={() => processPayment('CARD')} disabled={cart.length === 0} className="py-5 bg-brand-600 hover:bg-brand-500 text-white rounded-[2rem] font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 disabled:opacity-50">{t('card')}</button>
          </div>
        </div>
      </div>

      {/* Mobile Cart Trigger */}
      <button 
        onClick={() => setIsCartOpen(true)}
        className="lg:hidden fixed bottom-6 right-6 w-16 h-16 bg-brand-600 text-white rounded-full shadow-2xl flex items-center justify-center z-40 active:scale-90 transition-transform"
      >
        <ShoppingBag size={28} />
        {cart.length > 0 && <span className="absolute top-0 right-0 w-6 h-6 bg-red-500 border-2 border-white rounded-full text-[10px] font-black flex items-center justify-center">{cart.reduce((a,b)=>a+b.quantity,0)}</span>}
      </button>

      {/* Invoice Modal */}
      {showInvoice && lastSale && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 print:p-0">
          <div className="bg-white rounded-[40px] p-8 w-full max-w-sm relative animate-fade-in shadow-2xl print:shadow-none print:w-full">
            <button onClick={() => setShowInvoice(false)} className="absolute top-6 right-6 bg-slate-100 p-2 rounded-full text-slate-800 no-print hover:scale-110 transition-transform"><X size={24}/></button>
            <div className="text-center mb-10">
               {storeSettings.logo && <img src={storeSettings.logo} className="h-16 mx-auto mb-4" />}
               <h1 className="text-2xl font-black uppercase tracking-tight">{storeSettings.name}</h1>
               <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1 font-bold">{storeSettings.address}</p>
            </div>
            <div className="border-y-2 border-dashed border-slate-200 py-6 mb-6 space-y-3 font-mono text-xs">
               {lastSale.items.map((item: any) => (
                 <div key={item.id} className="flex justify-between">
                    <span>{item.name} (x{item.quantity})</span>
                    <span className="font-bold">{CURRENCY}{(item.sellPrice * item.quantity).toFixed(2)}</span>
                 </div>
               ))}
            </div>
            <div className="flex justify-between items-center mb-10">
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Amount</span>
               <span className="text-3xl font-black tracking-tighter">{CURRENCY}{lastSale.total.toFixed(2)}</span>
            </div>
            {invoiceQr && <div className="flex justify-center mb-10"><img src={invoiceQr} className="w-32 h-32" /></div>}
            <button onClick={() => window.print()} className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black uppercase tracking-widest no-print hover:bg-black transition-all active:scale-95">Print Receipt</button>
          </div>
        </div>
      )}
    </div>
  );
};
