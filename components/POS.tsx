
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Product, CartItem, StoreSettings, Sale, Language, User } from '../types';
import { CURRENCY } from '../constants';
import { ShoppingCart, Plus, Minus, Search, Image as ImageIcon, X, History, ShoppingBag, DollarSign, CheckCircle, Printer, MessageCircle, CreditCard, Receipt, Eye, ChevronLeft, Calendar, User as UserIcon, Tag, Percent, Contact } from 'lucide-react';
import QRCode from 'qrcode';
import { formatNumber, formatCurrency } from '../utils/format';

interface POSProps {
  products: Product[];
  sales: Sale[];
  onCheckout: (items: CartItem[], total: number, paymentMethod: 'CASH' | 'CARD', subTotal: number, discount: number, tax: number, discountType: 'fixed' | 'percent', customerName?: string, customerPhone?: string) => void;
  storeSettings: StoreSettings;
  onViewOrderHistory: () => void;
  onUpdateStoreSettings: (settings: StoreSettings) => void;
  t?: (key: string) => string;
  language: Language;
  currentUser: User;
  onGoBack?: () => void;
}

export const POS: React.FC<POSProps> = ({ 
  products, 
  sales, 
  onCheckout, 
  storeSettings, 
  onViewOrderHistory, 
  onUpdateStoreSettings, 
  t = (k) => k, 
  language, 
  currentUser,
  onGoBack
}) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [skuInput, setSkuInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showInvoice, setShowInvoice] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [invoiceQr, setInvoiceQr] = useState<string>('');
  const [showLivePreview, setShowLivePreview] = useState(false);
  
  // Customer Info
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('percent');
  const [discountValue, setDiscountValue] = useState<number>(0);

  const skuInputRef = useRef<HTMLInputElement>(null);

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

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
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
      status: 'COMPLETED',
      processedBy: currentUser.id,
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined
    };
    setLastSale(saleData);
    onCheckout(cart, finalTotal, method, cartSubtotal, totalDiscountAmount, taxAmount, discountType, customerName, customerPhone);
    
    // Clear Session
    setCart([]);
    setDiscountValue(0);
    setCustomerName('');
    setCustomerPhone('');
    
    setShowInvoice(true);
    setIsCartOpen(false);
    
    try {
        const qr = await QRCode.toDataURL(saleId, { margin: 1, width: 240 });
        setInvoiceQr(qr);
    } catch (e) {
        console.error("QR Generation Failed", e);
    }
  };

  return (
    <div className="flex h-full bg-[#f1f5f9] dark:bg-slate-950 flex-col lg:flex-row overflow-hidden transition-all duration-300">
      {/* Product Selection Panel */}
      <div className="flex-1 flex flex-col overflow-hidden h-full border-r border-slate-200 dark:border-slate-800 pb-20 lg:pb-0">
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 lg:px-8 lg:py-6 shrink-0 z-30 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-4 flex-1">
              <button onClick={onGoBack} className="p-3 -ml-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-brand-600 transition-all active:scale-90" title="Return to Dashboard">
                  <ChevronLeft size={24} className="rtl:rotate-180" />
              </button>
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input type="text" value={skuInput} onChange={(e) => setSkuInput(e.target.value)} placeholder={t('searchProducts')} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 outline-none font-bold dark:text-white" />
              </div>
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

      {/* Checkout Side Panel */}
      <div className={`fixed inset-x-0 bottom-0 z-50 lg:static lg:inset-auto lg:z-auto w-full lg:w-[480px] h-[92%] lg:h-full bg-white dark:bg-slate-900 shadow-2xl transition-transform duration-500 transform rounded-t-[40px] lg:rounded-none overflow-hidden flex flex-col ${isCartOpen ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}`}>
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
             <div className="bg-brand-600 p-2.5 rounded-xl text-white shadow-lg"><Receipt size={22} /></div>
             <h2 className="text-xl font-black uppercase tracking-tight dark:text-white italic">Current Checkout</h2>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowLivePreview(!showLivePreview)}
              className={`p-2.5 rounded-xl transition-all ${showLivePreview ? 'bg-brand-600 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}
              title="Toggle Live Digital Receipt"
            >
              <Eye size={20} />
            </button>
            <button onClick={() => setIsCartOpen(false)} className="lg:hidden p-2 bg-slate-50 dark:bg-slate-800 rounded-full text-slate-400"><X size={24}/></button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30 dark:bg-slate-900/50">
           {showLivePreview && cart.length > 0 ? (
             <div className="p-8 animate-fade-in-up">
                <div className="bg-white text-slate-900 p-8 rounded-[1rem] shadow-2xl relative font-mono text-xs border-t-[12px] border-brand-500 overflow-hidden">
                   <div className="absolute inset-x-0 -bottom-3 h-4 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iMTAiIHZpZXdCb3g9IjAgMCA0MCAxMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMCAwbDEwIDEwbDEwLTEwbDEwIDEwbDEwLTEwdjEwaC00MHoiIGZpbGw9IndoaXRlIi8+PC9zdmc+')] bg-repeat-x"></div>
                   <div className="text-center mb-6">
                      <p className="font-black text-xl uppercase tracking-tighter">{storeSettings.name}</p>
                      <p className="opacity-60 text-[9px] uppercase tracking-widest leading-relaxed mt-1">{storeSettings.address}</p>
                      <div className="border-b border-dashed border-slate-300 my-4"></div>
                      <p className="text-[10px] font-black uppercase tracking-widest italic">Live Order Draft</p>
                   </div>
                   <div className="space-y-3 mb-6">
                      {cart.map((item, idx) => (
                         <div key={idx} className="flex justify-between items-start">
                            <span className="flex-1 pr-4">
                               {item.name.toUpperCase()}
                               <span className="block opacity-60 text-[9px] mt-0.5">{formatNumber(item.quantity, language)} X {formatCurrency(item.sellPrice, language, CURRENCY)}</span>
                            </span>
                            <span className="font-bold">{formatCurrency(item.sellPrice * item.quantity, language, CURRENCY)}</span>
                         </div>
                      ))}
                   </div>
                   <div className="border-t border-dashed border-slate-300 pt-4 space-y-2">
                      <div className="flex justify-between font-bold"><span>SUBTOTAL:</span><span>{formatCurrency(cartSubtotal, language, CURRENCY)}</span></div>
                      {totalDiscountAmount > 0 && (
                        <div className="flex justify-between text-emerald-600 font-bold">
                            <span>DISCOUNT:</span>
                            <span>-{formatCurrency(totalDiscountAmount, language, CURRENCY)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-black text-base pt-2 mt-2 border-t border-slate-900">
                          <span>TOTAL DUE:</span>
                          <span>{formatCurrency(finalTotal, language, CURRENCY)}</span>
                      </div>
                   </div>
                   <div className="mt-8 text-center opacity-40 text-[9px] space-y-1">
                      <p className="flex items-center justify-center gap-1"><UserIcon size={10}/> OPERATOR: {currentUser.name.toUpperCase()}</p>
                      {customerName && <p className="flex items-center justify-center gap-1 uppercase"><Contact size={10}/> CLIENT: {customerName}</p>}
                   </div>
                </div>
             </div>
           ) : (
             <div className="p-4 md:p-6 space-y-4">
                {cart.length === 0 ? (
                  <div className="h-full py-20 flex flex-col items-center justify-center opacity-20 text-slate-400 space-y-4">
                    <ShoppingBag size={80} strokeWidth={1} />
                    <p className="font-black text-[10px] uppercase tracking-[0.4em]">Ready for Orders</p>
                  </div>
                ) : (
                  <div className="space-y-4 animate-fade-in">
                      {/* Customer Context Section */}
                      <div className="bg-brand-50/30 dark:bg-brand-900/10 p-5 rounded-[2.5rem] border border-brand-100 dark:border-brand-900/30 space-y-3">
                          <p className="text-[9px] font-black uppercase tracking-widest text-brand-600 flex items-center gap-2"><Contact size={12}/> Customer Record (Optional)</p>
                          <div className="grid grid-cols-2 gap-3">
                              <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Full Name" className="w-full bg-white dark:bg-slate-800 p-3 rounded-xl text-xs font-bold outline-none border border-slate-100 dark:border-slate-700" />
                              <input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="Phone" className="w-full bg-white dark:bg-slate-800 p-3 rounded-xl text-xs font-bold outline-none border border-slate-100 dark:border-slate-700" />
                          </div>
                      </div>

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
           )}
        </div>

        <div className="p-8 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 space-y-6 shrink-0 shadow-[0_-20px_40px_-10px_rgba(0,0,0,0.05)]">
          {cart.length > 0 && (
            <div className="space-y-6 animate-fade-in-up">
              <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Tag size={12}/> Adjustment / Ledger Discount</label>
                    <div className="flex bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-100 dark:border-slate-700">
                        <button onClick={() => setDiscountType('percent')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black transition-all ${discountType === 'percent' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-sm' : 'text-slate-400'}`}>% Ratio</button>
                        <button onClick={() => setDiscountType('fixed')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black transition-all ${discountType === 'fixed' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-sm' : 'text-slate-400'}`}>$ Flat</button>
                    </div>
                  </div>
                  <div className="relative">
                    <input 
                        type="number" 
                        value={discountValue || ''} 
                        onChange={e => setDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))} 
                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:border-brand-500 font-black text-center text-xl dark:text-white"
                        placeholder={`Adjustment amount...`}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-black">{discountType === 'percent' ? '%' : CURRENCY}</div>
                  </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2.5rem] space-y-3 border border-slate-100 dark:border-slate-700">
                  <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]"><span>Gross Subtotal</span><span>{formatCurrency(cartSubtotal, language, CURRENCY)}</span></div>
                  {totalDiscountAmount > 0 && <div className="flex justify-between text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]"><span>Discount Applied</span><span>-{formatCurrency(totalDiscountAmount, language, CURRENCY)}</span></div>}
                  {storeSettings.taxEnabled && <div className="flex justify-between text-[10px] font-black text-orange-500 uppercase tracking-[0.2em]"><span>{storeSettings.taxName} ({storeSettings.taxRate}%)</span><span>+{formatCurrency(taxAmount, language, CURRENCY)}</span></div>}
                  <div className="pt-4 mt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-end">
                      <span className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-[0.3em] pb-1 italic">Total Payable</span>
                      <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{formatCurrency(finalTotal, language, CURRENCY)}</span>
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => processPayment('CASH')} className="py-6 bg-slate-900 dark:bg-slate-800 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 flex items-center justify-center gap-3 transition-all"><DollarSign size={20}/> {t('cash')}</button>
                <button onClick={() => processPayment('CARD')} className="py-6 bg-brand-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 flex items-center justify-center gap-3 transition-all"><CreditCard size={20}/> {t('card')}</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showInvoice && lastSale && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-3xl flex items-center justify-center z-[110] p-4 print:p-0">
          <div className="bg-white rounded-[3.5rem] w-full max-w-md relative animate-fade-in-up shadow-2xl overflow-hidden flex flex-col">
            <div className="p-8 pb-4 flex justify-between items-center no-print">
                 <div className="flex items-center gap-3 text-emerald-600"><CheckCircle size={24} /><span className="font-black text-[10px] uppercase tracking-widest">Sale Authorized</span></div>
                 <button onClick={() => setShowInvoice(false)} className="p-2 bg-slate-100 rounded-full text-slate-800"><X size={20}/></button>
            </div>
            <div className="p-10 flex-1 overflow-y-auto print:p-0">
                <div className="text-center mb-10">
                   <h1 className="text-3xl font-black uppercase tracking-tighter italic leading-none">{storeSettings.name}</h1>
                   <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold mt-3 leading-relaxed">{storeSettings.address}</p>
                </div>
                {lastSale.customerName && (
                    <div className="mb-6 bg-slate-50 p-4 rounded-2xl border-2 border-dashed border-slate-200">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Customer Record</p>
                        <p className="text-sm font-black text-slate-900">{lastSale.customerName.toUpperCase()}</p>
                        {lastSale.customerPhone && <p className="text-[10px] font-bold text-slate-500">{lastSale.customerPhone}</p>}
                    </div>
                )}
                <div className="space-y-4 mb-10 border-t-2 border-dashed border-slate-100 pt-8 font-mono">
                   {lastSale.items.map((item: any) => (
                     <div key={item.id} className="flex justify-between items-start text-sm">
                        <span className="flex-1 pr-6">{item.name.toUpperCase()} <span className="text-[10px] opacity-50 block mt-1">x{formatNumber(item.quantity, language)} @ {formatCurrency(item.sellPrice, language, CURRENCY)}</span></span>
                        <span className="font-black">{formatCurrency(item.sellPrice * item.quantity, language, CURRENCY)}</span>
                     </div>
                   ))}
                </div>
                <div className="bg-slate-50 p-8 rounded-[2.5rem] space-y-3 mb-10 border border-slate-100 font-mono text-xs">
                    <div className="flex justify-between opacity-50"><span>INVOICE TOTAL</span><span>{formatCurrency(lastSale.subTotal, language, CURRENCY)}</span></div>
                    {lastSale.discount > 0 && <div className="flex justify-between text-emerald-600"><span>MARKDOWN</span><span>-{formatCurrency(lastSale.discount, language, CURRENCY)}</span></div>}
                    {lastSale.tax > 0 && <div className="flex justify-between text-orange-500"><span>TAX {lastSale.taxRate}%</span><span>+{formatCurrency(lastSale.tax, language, CURRENCY)}</span></div>}
                    <div className="flex justify-between items-center pt-4 mt-4 border-t border-slate-200 text-lg font-black text-slate-900"><span>PAID TOTAL</span><span>{formatCurrency(lastSale.total, language, CURRENCY)}</span></div>
                </div>
                {invoiceQr && <div className="flex flex-col items-center justify-center mb-10"><img src={invoiceQr} className="w-32 h-32" /><p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-6">ORD-{lastSale.id.slice(-6)}</p></div>}
                <div className="text-center text-[9px] text-slate-400 font-black uppercase tracking-widest italic">{storeSettings.footerMessage || "Transaction logged successfully."}</div>
            </div>
            <div className="p-10 bg-slate-50 border-t border-slate-100 grid grid-cols-2 gap-4 no-print shrink-0">
                <button onClick={() => window.print()} className="col-span-2 flex items-center justify-center gap-3 bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-[10px] shadow-xl active:scale-95 transition-all"><Printer size={18}/> Print Official Receipt</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
