import React, { useState, useEffect, useRef } from 'react';
import { Product, CartItem, StoreSettings, Sale, Language } from '../types';
import { CURRENCY } from '../constants';
import { ShoppingCart, Plus, Minus, Search, Image as ImageIcon, QrCode, X, History, ShoppingBag, DollarSign, TrendingUp, Package, Edit3, Trash2, CheckCircle, Printer, MessageCircle, MoreVertical, CreditCard, Receipt, Percent, Tag, ChevronUp, Share2, Send } from 'lucide-react';
import jsQR from 'jsqr';
import QRCode from 'qrcode';
import { formatNumber, formatCurrency } from '../utils/format';

interface POSProps {
  products: Product[];
  sales: Sale[];
  onCheckout: (items: CartItem[], total: number, paymentMethod: 'CASH' | 'CARD', subTotal: number, discount: number, tax: number) => void;
  storeSettings: StoreSettings;
  onViewOrderHistory: () => void;
  onUpdateStoreSettings: (settings: StoreSettings) => void;
  t?: (key: string) => string;
  language: Language;
}

export const POS: React.FC<POSProps> = ({ products, sales, onCheckout, storeSettings, onViewOrderHistory, onUpdateStoreSettings, t = (k) => k, language }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [skuInput, setSkuInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showInvoice, setShowInvoice] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [invoiceQr, setInvoiceQr] = useState<string>('');
  const [editingCartItem, setEditingCartItem] = useState<{index: number, item: CartItem} | null>(null);
  
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('percent');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [isSendingWA, setIsSendingWA] = useState(false);

  const skuInputRef = useRef<HTMLInputElement>(null);

  const todayRevenue = sales
    .filter(s => new Date(s.timestamp).toDateString() === new Date().toDateString())
    .reduce((acc, s) => acc + s.total, 0);
  
  const todayCount = sales
    .filter(s => new Date(s.timestamp).toDateString() === new Date().toDateString())
    .length;

  const recentSales = sales.slice(0, 5);
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

  const handleEditCartItem = (index: number, item: CartItem) => {
    setEditingCartItem({ index, item: { ...item } });
  };

  const saveEditedItem = () => {
    if (editingCartItem) {
      setCart(prev => {
        const newCart = [...prev];
        newCart[editingCartItem.index] = editingCartItem.item;
        return newCart;
      });
      setEditingCartItem(null);
    }
  };

  const filteredProducts = products.filter(p => {
    const term = skuInput.toLowerCase().trim();
    const matchesSearch = term === '' || p.name.toLowerCase().includes(term) || p.sku.includes(term);
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const cartSubtotal = cart.reduce((acc, item) => acc + (item.sellPrice * item.quantity), 0);
  const totalDiscountAmount = discountType === 'percent' ? (cartSubtotal * (discountValue / 100)) : discountValue;
  const subtotalAfterDiscount = Math.max(0, cartSubtotal - totalDiscountAmount);
  const taxAmount = storeSettings.taxEnabled ? subtotalAfterDiscount * (storeSettings.taxRate / 100) : 0;
  const finalTotal = subtotalAfterDiscount + taxAmount;

  const processPayment = (method: 'CASH' | 'CARD') => {
    if (cart.length === 0) return;
    const saleId = Date.now().toString();
    const saleData: Sale = { items: [...cart], subTotal: cartSubtotal, discount: totalDiscountAmount, tax: taxAmount, total: finalTotal, id: saleId, paymentMethod: method, timestamp: Date.now(), status: 'COMPLETED' };
    setLastSale(saleData);
    onCheckout(cart, finalTotal, method, cartSubtotal, totalDiscountAmount, taxAmount);
    setCart([]);
    setDiscountValue(0);
    setShowInvoice(true);
    setIsCartOpen(false);
    QRCode.toDataURL(saleId).then(setInvoiceQr);
  };

  const handleShareWhatsApp = () => {
    if (!lastSale) return;
    setIsSendingWA(true);
    // Simulate API Call
    setTimeout(() => {
      setIsSendingWA(false);
      alert("Receipt sent via WhatsApp successfully!");
    }, 1500);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.style.display = 'none';
    const parent = e.currentTarget.parentElement;
    if (parent) {
      const placeholder = document.createElement('div');
      placeholder.className = "w-full h-full flex items-center justify-center text-slate-200 bg-slate-50 dark:bg-slate-800";
      placeholder.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';
      parent.appendChild(placeholder);
    }
  };

  return (
    <div className="flex h-full bg-[#f1f5f9] dark:bg-slate-950 flex-col lg:flex-row overflow-hidden transition-all duration-300">
      
      {/* Main Terminal View */}
      <div className="flex-1 flex flex-col overflow-hidden h-full border-r border-slate-200 dark:border-slate-800 pb-20 lg:pb-0">
        
        {/* Fixed Top Interface */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 lg:px-8 lg:py-6 shrink-0 z-30 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div className="flex-1 relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={20} />
              <input
                ref={skuInputRef}
                type="text"
                value={skuInput}
                onChange={(e) => setSkuInput(e.target.value)}
                placeholder={t('searchProducts')}
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all font-bold dark:text-white"
              />
            </div>
            <div className="flex gap-2 shrink-0 overflow-x-auto no-scrollbar pb-1">
               <button onClick={() => setIsScannerOpen(true)} className="flex items-center gap-2 bg-[#111827] dark:bg-slate-800 hover:bg-slate-800 text-white px-5 py-3.5 rounded-2xl transition-all font-black text-xs uppercase shadow-lg active:scale-95">
                 <QrCode size={18} /> {t('scan')}
               </button>
               <button onClick={onViewOrderHistory} className="flex items-center gap-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-white px-5 py-3.5 border border-slate-200 dark:border-slate-700 rounded-2xl transition-all font-black text-xs uppercase shadow-sm active:scale-95">
                 <History size={18} /> {t('history')}
               </button>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`whitespace-nowrap px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                  selectedCategory === cat ? 'bg-brand-600 text-white border-brand-500 shadow-md' : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid - Optimized for Mobile */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar bg-slate-50/50 dark:bg-slate-950">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                {filteredProducts.map(product => (
                <div 
                    key={product.id} 
                    onClick={() => addToCart(product)}
                    className={`bg-white dark:bg-slate-900 rounded-[2.5rem] p-3 md:p-4 border border-slate-100 dark:border-slate-800 cursor-pointer hover:shadow-2xl transition-all duration-300 flex flex-col group active:scale-[0.97] ${product.stock <= 0 ? 'opacity-50' : ''}`}
                >
                    <div className="relative aspect-square rounded-[1.8rem] overflow-hidden bg-slate-50 dark:bg-slate-800 mb-3 shrink-0">
                    {product.image ? (
                        <img src={product.image} onError={handleImageError} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-200"><ImageIcon size={32} /></div>
                    )}
                    {product.stock < 10 && (
                        <div className="absolute bottom-2 right-2 bg-red-500 text-white text-[8px] font-black px-2 py-1 rounded-lg uppercase">Low Stock</div>
                    )}
                    </div>
                    <div className="flex flex-col flex-1">
                        <h3 className="font-black text-slate-800 dark:text-slate-100 text-xs md:text-sm leading-tight line-clamp-2 h-8 mb-2">{product.name}</h3>
                        <div className="mt-auto flex justify-between items-center">
                            <div className="text-sm md:text-lg font-black text-brand-600 dark:text-brand-400">
                                {formatCurrency(product.sellPrice, language, CURRENCY)}
                            </div>
                            <div className="w-8 h-8 md:w-10 md:h-10 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl flex items-center justify-center group-hover:bg-brand-600 group-hover:text-white transition-all shadow-sm">
                                <Plus size={18} strokeWidth={3} />
                            </div>
                        </div>
                    </div>
                </div>
                ))}
            </div>
        </div>

        {/* Live Sales Ticker */}
        <div className="h-10 bg-slate-900 dark:bg-black px-6 flex items-center gap-4 overflow-hidden shrink-0 fixed bottom-20 lg:bottom-0 left-0 right-0 lg:static z-20">
            <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest animate-pulse">Live</span>
            <div className="flex items-center gap-8 animate-marquee whitespace-nowrap">
                {recentSales.map(s => (
                    <div key={s.id} className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        ORD-{s.id.slice(-4)} • <span className="text-white">{formatCurrency(s.total, language, CURRENCY)}</span> • {new Date(s.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                ))}
            </div>
        </div>
      </div>

      {/* Cart Actions Summary (Mobile Sticky Bottom) */}
      <div 
        onClick={() => setIsCartOpen(true)}
        className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 pb-6 flex items-center justify-between z-40 cursor-pointer shadow-[0_-10px_30px_rgba(0,0,0,0.1)] active:bg-slate-50"
      >
          <div className="flex items-center gap-3">
              <div className="relative">
                  <ShoppingBag className="text-brand-600" size={28} />
                  {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">{formatNumber(cart.reduce((a,b)=>a+b.quantity,0), language)}</span>}
              </div>
              <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Total</div>
                  <div className="text-xl font-black dark:text-white">{formatCurrency(finalTotal, language, CURRENCY)}</div>
              </div>
          </div>
          <button className="bg-brand-600 text-white px-8 py-3.5 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-2 shadow-lg shadow-brand-500/20">
              Checkout <ChevronUp size={16} />
          </button>
      </div>

      {/* Cart Drawer */}
      <div className={`
        fixed inset-x-0 bottom-0 z-50 lg:static lg:inset-auto lg:z-auto
        w-full lg:w-[460px] h-[92%] lg:h-full bg-white dark:bg-slate-900 shadow-2xl transition-transform duration-500 transform
        rounded-t-[40px] lg:rounded-none overflow-hidden flex flex-col
        ${isCartOpen ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}
      `}>
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
             <div className="bg-brand-600 p-2 rounded-xl text-white"><Receipt size={22} /></div>
             <h2 className="text-xl font-black uppercase tracking-tight dark:text-white">Live Invoice</h2>
          </div>
          <button onClick={() => setIsCartOpen(false)} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-full text-slate-400"><X size={24}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar bg-slate-50/30 dark:bg-slate-900/50">
           {cart.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center opacity-20 text-slate-400 space-y-4">
               <ShoppingCart size={80} strokeWidth={1} />
               <p className="font-black text-[10px] uppercase tracking-[0.4em]">Empty Register</p>
             </div>
           ) : (
             <div className="bg-white dark:bg-slate-900 shadow-2xl rounded-[3rem] border border-slate-100 dark:border-slate-800 flex flex-col animate-fade-in">
                <div className="p-8 text-center bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="font-black text-lg uppercase dark:text-white">{storeSettings.name}</h3>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">{storeSettings.address}</p>
                </div>

                <div className="p-6 space-y-1">
                    {cart.map((item, index) => (
                      <div key={item.id} onClick={() => handleEditCartItem(index, item)} className="group flex justify-between items-start gap-4 p-4 -mx-2 rounded-[1.5rem] hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer">
                         <div className="flex-1 min-w-0">
                             <span className="text-sm font-black text-slate-800 dark:text-slate-100 block truncate">{item.name}</span>
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formatNumber(item.quantity, language)} x {formatCurrency(item.sellPrice, language, CURRENCY)}</span>
                         </div>
                         <div className="text-right">
                             <span className="text-sm font-black text-slate-900 dark:text-white">{formatCurrency(item.sellPrice * item.quantity, language, CURRENCY)}</span>
                         </div>
                      </div>
                    ))}
                </div>

                <div className="p-8 bg-slate-50 dark:bg-slate-800/30 border-t-2 border-dashed border-slate-200 dark:border-slate-700 space-y-4">
                    <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <span>Subtotal</span>
                            <span>{formatCurrency(cartSubtotal, language, CURRENCY)}</span>
                        </div>
                        {discountValue > 0 && (
                          <div className="flex justify-between text-[10px] font-black text-emerald-600 uppercase tracking-widest animate-fade-in">
                              <span>Discount {discountType === 'percent' ? `(${formatNumber(discountValue, language)}%)` : ''}</span>
                              <span>-{formatCurrency(totalDiscountAmount, language, CURRENCY)}</span>
                          </div>
                        )}
                        {storeSettings.taxEnabled && (
                          <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              <span>{storeSettings.taxName} ({formatNumber(storeSettings.taxRate, language)}%)</span>
                              <span>{formatCurrency(taxAmount, language, CURRENCY)}</span>
                          </div>
                        )}
                    </div>
                    <div className="flex justify-between items-end pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest pb-1">Total Due</span>
                        <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{formatCurrency(finalTotal, language, CURRENCY)}</span>
                    </div>
                </div>
             </div>
           )}
        </div>

        <div className="p-8 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 space-y-6 shrink-0">
          {cart.length > 0 && (
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 p-4 rounded-[2rem] border border-slate-100 dark:border-slate-700">
                 <Tag size={20} className="text-slate-400" />
                 <div className="flex flex-1 gap-2">
                    <input 
                        type="number" 
                        value={discountValue || ''} 
                        onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)}
                        placeholder="Apply Discount"
                        className="bg-transparent font-black text-sm outline-none w-full dark:text-white"
                    />
                    <div className="flex bg-white dark:bg-slate-700 rounded-xl p-1 border border-slate-200 dark:border-slate-600">
                        <button onClick={() => setDiscountType('percent')} className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ${discountType === 'percent' ? 'bg-brand-600 text-white shadow-md' : 'text-slate-400'}`}>%</button>
                        <button onClick={() => setDiscountType('fixed')} className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ${discountType === 'fixed' ? 'bg-brand-600 text-white shadow-md' : 'text-slate-400'}`}>{CURRENCY}</button>
                    </div>
                 </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => processPayment('CASH')} className="py-6 bg-slate-900 dark:bg-slate-800 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 flex items-center justify-center gap-2"><DollarSign size={18}/> {t('cash')}</button>
                <button onClick={() => processPayment('CARD')} className="py-6 bg-brand-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 flex items-center justify-center gap-2"><CreditCard size={18}/> {t('card')}</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingCartItem && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end lg:items-center justify-center z-[100] p-0 lg:p-4">
              <div className="bg-white dark:bg-slate-900 w-full lg:max-w-sm rounded-t-[40px] lg:rounded-[3rem] shadow-2xl p-8 lg:p-10 animate-slide-up border border-white/10">
                  <div className="flex justify-between items-center mb-10">
                      <div>
                          <h3 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white">Adjust Item</h3>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 truncate max-w-[200px]">{editingCartItem.item.name}</p>
                      </div>
                      <button onClick={() => setEditingCartItem(null)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-400"><X size={20}/></button>
                  </div>
                  <div className="space-y-8">
                      <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Manual Price Override</label>
                          <div className="relative">
                              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xl">{CURRENCY}</span>
                              <input 
                                type="number" 
                                value={editingCartItem.item.sellPrice} 
                                onChange={e => setEditingCartItem({ ...editingCartItem, item: { ...editingCartItem.item, sellPrice: parseFloat(e.target.value) || 0 }})}
                                className="w-full p-6 pl-14 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[2.5rem] outline-none focus:border-brand-500 dark:text-white font-black text-3xl shadow-inner" 
                                autoFocus
                              />
                          </div>
                      </div>
                      <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Quantity Control</label>
                          <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 p-2 rounded-[2.5rem] border-2 border-slate-100 dark:border-slate-700 shadow-inner">
                             <button onClick={() => setEditingCartItem({ ...editingCartItem, item: { ...editingCartItem.item, quantity: Math.max(1, editingCartItem.item.quantity - 1) }})} className="w-16 h-16 flex items-center justify-center bg-white dark:bg-slate-700 rounded-3xl text-slate-500 active:scale-90 shadow-sm"><Minus size={24} strokeWidth={3}/></button>
                             <span className="flex-1 text-center font-black text-4xl dark:text-white">{formatNumber(editingCartItem.item.quantity, language)}</span>
                             <button onClick={() => setEditingCartItem({ ...editingCartItem, item: { ...editingCartItem.item, quantity: editingCartItem.item.quantity + 1 }})} className="w-16 h-16 flex items-center justify-center bg-white dark:bg-slate-700 rounded-3xl text-slate-500 active:scale-90 shadow-sm"><Plus size={24} strokeWidth={3}/></button>
                          </div>
                      </div>
                      <div className="flex gap-4 pb-8 lg:pb-0">
                          <button onClick={() => { updateQuantity(editingCartItem.item.id, -editingCartItem.item.quantity); setEditingCartItem(null); }} className="p-6 bg-red-50 dark:bg-red-950/20 text-red-600 rounded-[2rem] border border-red-100 dark:border-red-900/30 active:scale-95 transition-all"><Trash2 size={24}/></button>
                          <button onClick={saveEditedItem} className="flex-1 py-6 bg-slate-900 dark:bg-brand-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all">Apply Changes</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* FINAL RECEIPT MODAL */}
      {showInvoice && lastSale && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-3xl flex items-center justify-center z-[110] p-4 print:p-0">
          <div className="bg-white rounded-[3.5rem] w-full max-w-md relative animate-fade-in-up shadow-2xl print:shadow-none print:w-full overflow-hidden flex flex-col">
            <div className="p-8 pb-4 flex justify-between items-center no-print">
                 <div className="flex items-center gap-3">
                    <div className="bg-emerald-500 p-2 rounded-xl text-white shadow-lg"><CheckCircle size={20}/></div>
                    <span className="font-black text-sm uppercase tracking-widest text-emerald-600">Sale Recorded</span>
                 </div>
                 <button onClick={() => setShowInvoice(false)} className="p-2 bg-slate-100 rounded-full text-slate-800"><X size={24}/></button>
            </div>
            
            <div className="p-8 flex-1 overflow-y-auto print:p-0">
                <div className="text-center mb-8">
                   <h1 className="text-3xl font-black uppercase tracking-tighter italic">{storeSettings.name}</h1>
                   <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold mt-2 leading-relaxed">{storeSettings.address}</p>
                </div>
                
                <div className="border-y-2 border-dashed border-slate-200 py-6 mb-8 space-y-3 font-mono text-sm">
                   {lastSale.items.map((item: any) => (
                     <div key={item.id} className="flex justify-between items-start">
                        <span className="flex-1 pr-4">{item.name} <span className="text-[10px] text-slate-400 block mt-0.5">x{formatNumber(item.quantity, language)}</span></span>
                        <span className="font-bold text-slate-900">{formatCurrency(item.sellPrice * item.quantity, language, CURRENCY)}</span>
                     </div>
                   ))}
                </div>

                <div className="space-y-4 mb-8">
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Charged ({lastSale.paymentMethod})</span>
                        <span className="text-5xl font-black tracking-tighter">{formatCurrency(lastSale.total, language, CURRENCY)}</span>
                    </div>
                </div>

                {invoiceQr && (
                    <div className="flex flex-col items-center justify-center mb-8 bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100">
                        <img src={invoiceQr} className="w-24 h-24 mix-blend-multiply" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-4">ORD-{lastSale.id.slice(-6)}</span>
                    </div>
                )}
                
                <div className="text-center text-[9px] text-slate-400 font-black uppercase tracking-widest leading-relaxed">
                    {storeSettings.footerMessage || "Experience Future Retail Solutions."}
                </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 space-y-3 no-print">
                <button 
                  onClick={handleShareWhatsApp} 
                  disabled={isSendingWA}
                  className="w-full bg-[#00a884] text-white py-5 rounded-[2rem] font-black uppercase tracking-widest hover:bg-[#008f6f] transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl text-xs"
                >
                  {isSendingWA ? <Loader2 size={20} className="animate-spin" /> : <MessageCircle size={20}/>}
                  WhatsApp Receipt
                </button>
                <button onClick={() => window.print()} className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl text-xs">
                    <Printer size={20}/> Print Physical Copy
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Loader2 = ({ className, size = 20 }: { className?: string, size?: number }) => (
  <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);