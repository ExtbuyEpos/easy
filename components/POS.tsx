
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Product, CartItem, StoreSettings, Sale, Language } from '../types';
import { CURRENCY } from '../constants';
import { ShoppingCart, Plus, Minus, Search, Image as ImageIcon, QrCode, X, History, ShoppingBag, DollarSign, TrendingUp, Package, Edit3, Trash2, CheckCircle, Printer, MessageCircle, MoreVertical, CreditCard, Receipt, Percent, Tag, ChevronUp, Share2, Send, Loader2, Camera, ChevronDown } from 'lucide-react';
import jsQR from 'jsqr';
import QRCode from 'qrcode';
import { formatNumber, formatCurrency } from '../utils/format';

interface POSProps {
  products: Product[];
  sales: Sale[];
  onCheckout: (items: CartItem[], total: number, paymentMethod: 'CASH' | 'CARD', subTotal: number, discount: number, tax: number, discountType: 'fixed' | 'percent') => void;
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
  
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('percent');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [isSendingWA, setIsSendingWA] = useState(false);

  const skuInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const categories = useMemo(() => ['All', ...Array.from(new Set(products.map(p => p.category))).sort()], [products]);

  useEffect(() => {
    if (window.innerWidth > 1024) skuInputRef.current?.focus();
  }, []);

  const addToCart = (product: Product) => {
    if (product.stock <= 0) return alert("Out of stock!");
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const cartSubtotal = cart.reduce((acc, item) => acc + (item.sellPrice * item.quantity), 0);
  const totalDiscountAmount = discountType === 'percent' ? (cartSubtotal * (discountValue / 100)) : discountValue;
  const subtotalAfterDiscount = Math.max(0, cartSubtotal - totalDiscountAmount);
  const taxAmount = storeSettings.taxEnabled ? subtotalAfterDiscount * (storeSettings.taxRate / 100) : 0;
  const finalTotal = subtotalAfterDiscount + taxAmount;

  const processPayment = async (method: 'CASH' | 'CARD') => {
    if (cart.length === 0) return;
    const saleId = Date.now().toString();
    const saleData: Sale = { 
      items: [...cart], 
      subTotal: cartSubtotal, 
      discount: totalDiscountAmount, 
      discountType,
      tax: taxAmount, 
      taxRate: storeSettings.taxRate,
      total: finalTotal, 
      id: saleId, 
      paymentMethod: method, 
      timestamp: Date.now(), 
      status: 'COMPLETED' 
    };
    setLastSale(saleData);
    onCheckout(cart, finalTotal, method, cartSubtotal, totalDiscountAmount, taxAmount, discountType);
    setCart([]);
    setDiscountValue(0);
    setShowInvoice(true);
    setIsCartOpen(false);
    
    try {
        const qr = await QRCode.toDataURL(saleId, { margin: 1, width: 240 });
        setInvoiceQr(qr);
    } catch (e) {
        console.error("QR Fail", e);
    }
  };

  const handleShareWhatsApp = () => {
    if (!lastSale) return;
    if (localStorage.getItem('easyPOS_whatsappSession') !== 'active') return alert("WhatsApp Bridge not linked!");
    const customerPhone = prompt("Customer Phone (e.g. 971500000000):");
    if (!customerPhone) return;
    setIsSendingWA(true);
    setTimeout(() => {
      setIsSendingWA(false);
      const msg = `Order #${lastSale.id.slice(-5)} from ${storeSettings.name}. Total: ${formatCurrency(lastSale.total, language, CURRENCY)}. Receipt: https://easypos.io/r/${lastSale.id}`;
      window.open(`https://wa.me/${customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
    }, 1200);
  };

  return (
    <div className="flex h-full bg-[#f1f5f9] dark:bg-slate-950 flex-col lg:flex-row overflow-hidden transition-all duration-300">
      <div className="flex-1 flex flex-col overflow-hidden h-full border-r border-slate-200 dark:border-slate-800 pb-20 lg:pb-0">
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 lg:px-8 lg:py-6 shrink-0 z-30 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div className="flex-1 relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input type="text" value={skuInput} onChange={(e) => setSkuInput(e.target.value)} placeholder={t('searchProducts')} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 outline-none font-bold dark:text-white" />
            </div>
            <div className="flex gap-2 shrink-0">
               <button onClick={onViewOrderHistory} className="flex items-center gap-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-white px-5 py-3.5 border border-slate-200 dark:border-slate-700 rounded-2xl transition-all font-black text-xs uppercase shadow-sm active:scale-95"><History size={18} /> {t('history')}</button>
               <button onClick={() => setIsCartOpen(true)} className="lg:hidden flex items-center gap-2 bg-brand-600 text-white px-5 py-3.5 rounded-2xl transition-all font-black text-xs uppercase shadow-lg active:scale-95"><ShoppingCart size={18} /> {cart.length}</button>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
            {categories.map(cat => (
              <button key={cat} onClick={() => setSelectedCategory(cat)} className={`whitespace-nowrap px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border-2 ${selectedCategory === cat ? 'bg-brand-600 text-white border-brand-500 shadow-md' : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-700'}`}>{cat}</button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar bg-slate-50/50 dark:bg-slate-950">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                {products.filter(p => (selectedCategory === 'All' || p.category === selectedCategory) && (skuInput === '' || p.name.toLowerCase().includes(skuInput.toLowerCase()) || p.sku.includes(skuInput))).map(product => (
                <div key={product.id} onClick={() => addToCart(product)} className={`bg-white dark:bg-slate-900 rounded-[2.5rem] p-3 md:p-4 border border-slate-100 dark:border-slate-800 cursor-pointer hover:shadow-2xl transition-all flex flex-col group active:scale-[0.97] ${product.stock <= 0 ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                    <div className="relative aspect-square rounded-[1.8rem] overflow-hidden bg-slate-50 dark:bg-slate-800 mb-3 shrink-0">
                        {product.image ? <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-500" /> : <div className="w-full h-full flex items-center justify-center text-slate-200"><ImageIcon size={32} /></div>}
                        {product.stock < 10 && <div className="absolute bottom-2 right-2 bg-red-500 text-white text-[8px] font-black px-2 py-1 rounded-lg uppercase">Low Stock</div>}
                    </div>
                    <div className="flex flex-col flex-1">
                        <h3 className="font-black text-slate-800 dark:text-slate-100 text-xs md:text-sm leading-tight line-clamp-2 h-8 mb-2">{product.name}</h3>
                        <div className="mt-auto flex justify-between items-center">
                            <div className="text-sm md:text-lg font-black text-brand-600 dark:text-brand-400">{formatCurrency(product.sellPrice, language, CURRENCY)}</div>
                            <div className="w-8 h-8 md:w-10 md:h-10 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl flex items-center justify-center group-hover:bg-brand-600 group-hover:text-white transition-all shadow-sm"><Plus size={18} strokeWidth={3} /></div>
                        </div>
                    </div>
                </div>
                ))}
            </div>
        </div>
      </div>

      {/* Cart Panel */}
      <div className={`fixed inset-x-0 bottom-0 z-50 lg:static lg:inset-auto lg:z-auto w-full lg:w-[480px] h-[92%] lg:h-full bg-white dark:bg-slate-900 shadow-2xl transition-transform duration-500 transform rounded-t-[40px] lg:rounded-none overflow-hidden flex flex-col ${isCartOpen ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}`}>
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
             <div className="bg-brand-600 p-2.5 rounded-xl text-white shadow-lg"><Receipt size={22} /></div>
             <h2 className="text-xl font-black uppercase tracking-tight dark:text-white italic">Current Invoice</h2>
          </div>
          <button onClick={() => setIsCartOpen(false)} className="lg:hidden p-2 bg-slate-50 dark:bg-slate-800 rounded-full text-slate-400"><X size={24}/></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar bg-slate-50/30 dark:bg-slate-900/50 space-y-4">
           {cart.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center opacity-20 text-slate-400 space-y-4">
               <ShoppingBag size={80} strokeWidth={1} />
               <p className="font-black text-[10px] uppercase tracking-[0.4em]">Register Empty</p>
             </div>
           ) : (
             <div className="space-y-4 animate-fade-in">
                {cart.map((item) => (
                    <div key={item.id} className="bg-white dark:bg-slate-800 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center overflow-hidden shrink-0">
                            {item.image ? <img src={item.image} className="w-full h-full object-cover" /> : <ImageIcon size={20} className="text-slate-300" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-black text-slate-800 dark:text-slate-100 text-sm truncate">{item.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formatCurrency(item.sellPrice, language, CURRENCY)}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400 hover:text-red-500 active:scale-90 transition-all"><Minus size={14}/></button>
                            <span className="font-black text-sm dark:text-white w-4 text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400 hover:text-brand-600 active:scale-90 transition-all"><Plus size={14}/></button>
                        </div>
                        <button onClick={() => removeFromCart(item.id)} className="p-2 text-slate-300 hover:text-red-500"><X size={18}/></button>
                    </div>
                ))}
             </div>
           )}
        </div>

        {/* Totals & Discounts Section */}
        <div className="p-8 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 space-y-6 shrink-0 shadow-[0_-20px_40px_-10px_rgba(0,0,0,0.05)]">
          {cart.length > 0 && (
            <div className="space-y-6 animate-fade-in-up">
              {/* Discount Entry */}
              <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Adjustment / Discount</label>
                    <div className="flex bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-100 dark:border-slate-700">
                        <button onClick={() => setDiscountType('percent')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black transition-all ${discountType === 'percent' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-sm' : 'text-slate-400'}`}>% Percent</button>
                        <button onClick={() => setDiscountType('fixed')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black transition-all ${discountType === 'fixed' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-sm' : 'text-slate-400'}`}>$ Fixed</button>
                    </div>
                  </div>
                  <div className="relative">
                      <input 
                        type="number" 
                        value={discountValue || ''} 
                        onChange={e => setDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))} 
                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:border-brand-500 font-black text-center text-xl dark:text-white"
                        placeholder={`Enter ${discountType === 'percent' ? 'percentage' : 'fixed amount'}...`}
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-black">{discountType === 'percent' ? '%' : CURRENCY}</div>
                  </div>
              </div>

              {/* Financial Summary */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2.5rem] space-y-3 border border-slate-100 dark:border-slate-700">
                  <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                      <span>Subtotal</span>
                      <span className="text-slate-600 dark:text-slate-300">{formatCurrency(cartSubtotal, language, CURRENCY)}</span>
                  </div>
                  {totalDiscountAmount > 0 && (
                    <div className="flex justify-between text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">
                        <span>Discount ({discountType === 'percent' ? `${discountValue}%` : 'Fixed'})</span>
                        <span>-{formatCurrency(totalDiscountAmount, language, CURRENCY)}</span>
                    </div>
                  )}
                  {storeSettings.taxEnabled && (
                    <div className="flex justify-between text-[10px] font-black text-orange-500 uppercase tracking-[0.2em]">
                        <span>{storeSettings.taxName} ({storeSettings.taxRate}%)</span>
                        <span>+{formatCurrency(taxAmount, language, CURRENCY)}</span>
                    </div>
                  )}
                  <div className="pt-4 mt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-end">
                      <span className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-[0.3em] pb-1 italic">Total Due</span>
                      <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{formatCurrency(finalTotal, language, CURRENCY)}</span>
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <button onClick={() => processPayment('CASH')} className="group py-6 bg-slate-900 dark:bg-slate-800 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 flex items-center justify-center gap-3 transition-all">
                    <DollarSign size={20} className="group-hover:rotate-12 transition-transform"/> {t('cash')}
                </button>
                <button onClick={() => processPayment('CARD')} className="group py-6 bg-brand-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 flex items-center justify-center gap-3 transition-all">
                    <CreditCard size={20} className="group-hover:-translate-y-1 transition-transform"/> {t('card')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modern Invoice Modal */}
      {showInvoice && lastSale && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-3xl flex items-center justify-center z-[110] p-4 print:p-0">
          <div className="bg-white rounded-[3.5rem] w-full max-w-md relative animate-fade-in-up shadow-2xl overflow-hidden flex flex-col">
            <div className="p-8 pb-4 flex justify-between items-center no-print">
                 <div className="flex items-center gap-3 text-emerald-600">
                    <CheckCircle size={24} />
                    <span className="font-black text-[10px] uppercase tracking-widest">Payment Success</span>
                 </div>
                 <button onClick={() => setShowInvoice(false)} className="p-2 bg-slate-100 rounded-full text-slate-800"><X size={20}/></button>
            </div>
            
            <div className="p-10 flex-1 overflow-y-auto print:p-0">
                <div className="text-center mb-10">
                   {storeSettings.logo && <img src={storeSettings.logo} className="h-16 mx-auto mb-6 object-contain" />}
                   <h1 className="text-3xl font-black uppercase tracking-tighter italic leading-none">{storeSettings.name}</h1>
                   <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold mt-3 leading-relaxed">{storeSettings.address}</p>
                </div>

                <div className="space-y-4 mb-10 border-t-2 border-dashed border-slate-100 pt-8">
                   {lastSale.items.map((item: any) => (
                     <div key={item.id} className="flex justify-between items-start text-sm">
                        <span className="flex-1 pr-6 font-medium text-slate-700">
                            {item.name} 
                            <span className="text-[10px] text-slate-400 block mt-1 uppercase font-black">QTY: {formatNumber(item.quantity, language)} @ {formatCurrency(item.sellPrice, language, CURRENCY)}</span>
                        </span>
                        <span className="font-black text-slate-900">{formatCurrency(item.sellPrice * item.quantity, language, CURRENCY)}</span>
                     </div>
                   ))}
                </div>

                <div className="bg-slate-50 p-8 rounded-[2.5rem] space-y-3 mb-10 border border-slate-100">
                    <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <span>Invoice Total</span>
                        <span>{formatCurrency(lastSale.subTotal, language, CURRENCY)}</span>
                    </div>
                    {lastSale.discount > 0 && (
                        <div className="flex justify-between text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                            <span>Discount ({lastSale.discountType === 'percent' ? 'Promo' : 'Fixed'})</span>
                            <span>-{formatCurrency(lastSale.discount, language, CURRENCY)}</span>
                        </div>
                    )}
                    {lastSale.tax > 0 && (
                        <div className="flex justify-between text-[10px] font-black text-orange-500 uppercase tracking-widest">
                            <span>Vat ({lastSale.taxRate}%)</span>
                            <span>+{formatCurrency(lastSale.tax, language, CURRENCY)}</span>
                        </div>
                    )}
                    <div className="flex justify-between items-center pt-4 mt-4 border-t border-slate-200">
                        <span className="text-[11px] font-black uppercase tracking-widest text-slate-900">Paid Amount</span>
                        <span className="text-4xl font-black tracking-tighter text-slate-900">{formatCurrency(lastSale.total, language, CURRENCY)}</span>
                    </div>
                </div>

                {invoiceQr && (
                    <div className="flex flex-col items-center justify-center mb-10 bg-white rounded-[2.5rem] p-6 border-4 border-slate-50">
                        <img src={invoiceQr} className="w-32 h-32" alt="Invoice QR" />
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] mt-6 italic">ORD-{lastSale.id.slice(-6)}</p>
                    </div>
                )}
                
                <div className="text-center text-[9px] text-slate-400 font-black uppercase tracking-[0.3em] italic leading-relaxed">
                    {storeSettings.footerMessage || "Thank you for choosing easyPOS Terminal."}
                </div>
            </div>

            <div className="p-10 bg-slate-50 border-t border-slate-100 grid grid-cols-2 gap-4 no-print shrink-0">
                <button onClick={handleShareWhatsApp} disabled={isSendingWA} className="flex items-center justify-center gap-3 bg-[#00a884] text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-[10px] shadow-xl active:scale-95 transition-all">
                  {isSendingWA ? <Loader2 size={18} className="animate-spin" /> : <MessageCircle size={18}/>} WhatsApp
                </button>
                <button onClick={() => window.print()} className="flex items-center justify-center gap-3 bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-[10px] shadow-xl active:scale-95 transition-all">
                  <Printer size={18}/> Print
                </button>
                <button onClick={() => setShowInvoice(false)} className="col-span-2 py-4 text-slate-400 font-black uppercase tracking-widest text-[10px] hover:text-slate-900 transition-all">Dismiss Window</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
