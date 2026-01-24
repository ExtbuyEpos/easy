import React, { useState, useEffect, useRef } from 'react';
import { Product, CartItem } from '../types';
import { CURRENCY } from '../constants';
import { ShoppingCart, CreditCard, Trash2, Plus, Minus, Search, Printer, CheckCircle, MessageCircle, Phone, Image as ImageIcon, Receipt } from 'lucide-react';

interface POSProps {
  products: Product[];
  onCheckout: (items: CartItem[], total: number, paymentMethod: 'CASH' | 'CARD') => void;
}

export const POS: React.FC<POSProps> = ({ products, onCheckout }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [skuInput, setSkuInput] = useState('');
  const [showInvoice, setShowInvoice] = useState(false);
  const [lastSale, setLastSale] = useState<{items: CartItem[], total: number, id: string} | null>(null);
  const [customerPhone, setCustomerPhone] = useState('');
  const skuInputRef = useRef<HTMLInputElement>(null);

  // Focus scanner input on mount
  useEffect(() => {
    skuInputRef.current?.focus();
  }, []);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
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

  const handleSkuSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const product = products.find(p => p.sku === skuInput || p.name.toLowerCase() === skuInput.toLowerCase());
    if (product) {
      if (product.stock <= 0) {
        alert("Item out of stock!");
      } else {
        addToCart(product);
        setSkuInput('');
      }
    } else {
      alert("Product not found");
    }
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.sellPrice * item.quantity), 0);

  const processPayment = (method: 'CASH' | 'CARD') => {
    if (cart.length === 0) return;
    const saleId = Date.now().toString();
    setLastSale({ items: [...cart], total: cartTotal, id: saleId });
    onCheckout(cart, cartTotal, method);
    setCart([]);
    setCustomerPhone(''); // Reset phone for new customer
    setShowInvoice(true);
  };

  const handleWhatsAppShare = () => {
    if (!lastSale || !customerPhone) {
        alert("Please enter a customer phone number.");
        return;
    }

    const receiptText = [
        `*🧾 INVOICE - easyPOS*`,
        `Order: #${lastSale.id.slice(-6)}`,
        `Date: ${new Date(Number(lastSale.id)).toLocaleString()}`,
        ``,
        `*Items:*`,
        ...lastSale.items.map(item => `- ${item.name} (x${item.quantity}): ${CURRENCY}${(item.sellPrice * item.quantity).toFixed(2)}`),
        ``,
        `----------------`,
        `*TOTAL: ${CURRENCY}${lastSale.total.toFixed(2)}*`,
        `----------------`,
        ``,
        `Thank you for shopping with us!`
    ].join('\n');

    const encodedText = encodeURIComponent(receiptText);
    const cleanPhone = customerPhone.replace(/[^0-9]/g, '');
    
    window.open(`https://wa.me/${cleanPhone}?text=${encodedText}`, '_blank');
  };

  return (
    <div className="flex h-full bg-slate-100">
      {/* Product Grid - Left Side */}
      <div className="flex-1 p-6 flex flex-col overflow-hidden">
        <div className="mb-6 bg-white p-4 rounded-xl shadow-sm flex items-center gap-4">
          <Search className="text-slate-400" />
          <form onSubmit={handleSkuSubmit} className="flex-1">
            <input
              ref={skuInputRef}
              type="text"
              value={skuInput}
              onChange={(e) => setSkuInput(e.target.value)}
              placeholder="Scan Barcode or Search Product..."
              className="w-full text-lg outline-none bg-transparent placeholder-slate-400 text-slate-800"
              autoFocus
            />
          </form>
          <div className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">Press Enter to Add</div>
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-4">
          {products.map(product => (
            <div 
              key={product.id} 
              onClick={() => addToCart(product)}
              className={`bg-white rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:border-brand-500 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group ${product.stock === 0 ? 'opacity-60 grayscale' : ''}`}
            >
              <div className="relative h-32 bg-slate-100 flex items-center justify-center overflow-hidden">
                {product.image ? (
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <ImageIcon className="text-slate-300" size={32} />
                )}
                <div className="absolute top-2 left-2">
                   <span className="bg-white/90 backdrop-blur-sm text-brand-700 text-xs px-2 py-1 rounded-full font-bold shadow-sm">{product.category}</span>
                </div>
                {product.stock === 0 && (
                   <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                     <span className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Out of Stock</span>
                   </div>
                )}
              </div>
              
              <div className="p-4">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs text-slate-400 font-mono">{product.sku}</span>
                  <p className={`text-xs ${product.stock < 5 ? 'text-red-500 font-bold' : 'text-slate-500'}`}>
                    {product.stock} left
                  </p>
                </div>
                <h3 className="font-semibold text-slate-800 leading-tight mb-2 truncate">{product.name}</h3>
                <div className="flex justify-between items-center">
                   <div className="text-lg font-bold text-brand-600">{CURRENCY}{product.sellPrice.toFixed(2)}</div>
                   <div className="bg-slate-100 p-1.5 rounded-lg text-slate-600 group-hover:bg-brand-500 group-hover:text-white transition-colors">
                     <Plus size={16} />
                   </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Real-Time Invoice Preview - Right Side */}
      <div className="w-96 bg-slate-200 shadow-xl flex flex-col border-l border-slate-300 z-10 p-4">
        <div className="flex-1 bg-white rounded-lg shadow-sm flex flex-col overflow-hidden relative">
          {/* Receipt Texture Header */}
          <div className="h-2 bg-slate-800 w-full absolute top-0 left-0"></div>
          
          <div className="p-6 border-b border-dashed border-slate-300 text-center">
            <h2 className="text-xl font-bold text-slate-900 tracking-wider uppercase">easyPOS</h2>
            <p className="text-xs text-slate-500 mt-1">Retail & Supply Co.</p>
            <p className="text-xs text-slate-400 mt-2">{new Date().toLocaleString()}</p>
            <div className="mt-4 flex items-center justify-center gap-2 text-brand-600 bg-brand-50 py-1 rounded-full text-xs font-bold">
               <Receipt size={14} /> LIVE PREVIEW
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-sm">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2 opacity-50">
                <ShoppingCart size={48} />
                <p>Scan items to begin...</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.id} className="group relative">
                  <div className="flex justify-between items-start mb-1">
                     <span className="text-slate-800 font-bold">{item.name}</span>
                     <span className="text-slate-900">{CURRENCY}{(item.sellPrice * item.quantity).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-500 pl-2">
                     <div className="flex items-center gap-2">
                       <span>{item.quantity} x {CURRENCY}{item.sellPrice.toFixed(2)}</span>
                     </div>
                     <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                        <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-slate-100 rounded text-slate-800"><Minus size={12}/></button>
                        <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-slate-100 rounded text-slate-800"><Plus size={12}/></button>
                        <button onClick={() => removeFromCart(item.id)} className="p-1 hover:bg-red-50 rounded text-red-500 ml-1"><Trash2 size={12}/></button>
                     </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Receipt Footer & Totals */}
          <div className="p-6 bg-slate-50 border-t border-dashed border-slate-300">
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-slate-500 text-sm">
                <span>Subtotal</span>
                <span>{CURRENCY}{cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500 text-sm">
                <span>Tax (0%)</span>
                <span>{CURRENCY}0.00</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center pt-4 border-t border-slate-200 text-2xl font-bold text-slate-900 mb-6">
              <span>TOTAL</span>
              <span>{CURRENCY}{cartTotal.toFixed(2)}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => processPayment('CASH')}
                disabled={cart.length === 0}
                className="py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                Cash
              </button>
              <button 
                onClick={() => processPayment('CARD')}
                disabled={cart.length === 0}
                className="py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                <CreditCard size={18} /> Card
              </button>
            </div>
          </div>
          
          {/* Jagged Edge Bottom */}
          <div className="h-3 w-full bg-slate-200 relative" style={{
             backgroundImage: 'linear-gradient(45deg, #ffffff 25%, transparent 25%), linear-gradient(-45deg, #ffffff 25%, transparent 25%)',
             backgroundSize: '16px 16px',
             backgroundPosition: '0 0'
          }}></div>
        </div>
      </div>

      {/* Final Invoice Modal (Post-Checkout) */}
      {showInvoice && lastSale && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 print:p-0">
          <div className="bg-white w-80 shadow-2xl p-6 print:w-full print:shadow-none animate-fade-in relative">
            <button onClick={() => setShowInvoice(false)} className="absolute -top-4 -right-4 bg-white rounded-full p-2 text-slate-800 shadow-lg no-print hover:bg-slate-100">
              <span className="text-xl font-bold">×</span>
            </button>
            
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-slate-900 tracking-wider uppercase">easyPOS</h1>
              <p className="text-xs text-slate-500">Retail & Supply Co.</p>
              <p className="text-xs text-slate-400 mt-1">Order #{lastSale.id.slice(-6)}</p>
              <p className="text-xs text-slate-400">{new Date(Number(lastSale.id)).toLocaleString()}</p>
            </div>

            <div className="border-t border-b border-dashed border-slate-300 py-4 mb-4 space-y-2">
              {lastSale.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-slate-800">{item.name} x{item.quantity}</span>
                  <span className="font-mono text-slate-600">{CURRENCY}{(item.sellPrice * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center text-lg font-bold text-slate-900 mb-6">
              <span>TOTAL</span>
              <span>{CURRENCY}{lastSale.total.toFixed(2)}</span>
            </div>
            
             <div className="text-center mb-6">
                <p className="text-sm font-bold text-slate-700">PAID BY {lastSale.paymentMethod}</p>
             </div>

            {/* WhatsApp Section */}
            <div className="mt-6 mb-6 pt-4 border-t border-slate-100 no-print">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Send Receipt via WhatsApp</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Phone (e.g. 15551234567)"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                  />
                </div>
                <button 
                  onClick={handleWhatsAppShare}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                >
                  <MessageCircle size={18} /> 
                </button>
              </div>
            </div>

            <div className="text-center space-y-3 no-print">
              <button onClick={() => window.print()} className="w-full bg-slate-900 text-white py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-slate-800">
                <Printer size={16} /> Print Receipt
              </button>
              <button onClick={() => setShowInvoice(false)} className="w-full text-brand-600 py-2 hover:bg-brand-50 rounded-lg">
                Start New Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};