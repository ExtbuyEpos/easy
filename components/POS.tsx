import React, { useState, useEffect, useRef } from 'react';
import { Product, CartItem, StoreSettings } from '../types';
import { CURRENCY } from '../constants';
import { ShoppingCart, CreditCard, Trash2, Plus, Minus, Search, Printer, CheckCircle, MessageCircle, Phone, Image as ImageIcon, Receipt, Edit3, PlusCircle, X, Save, Tag, QrCode, Camera } from 'lucide-react';
import jsQR from 'jsqr';

interface POSProps {
  products: Product[];
  onCheckout: (items: CartItem[], total: number, paymentMethod: 'CASH' | 'CARD') => void;
  storeSettings: StoreSettings;
}

const ACTIVE_DISCOUNTS = [
  { code: 'SAVE10', type: 'PERCENTAGE', value: 10 },
  { code: 'SUMMER20', type: 'PERCENTAGE', value: 20 },
  { code: 'MINUS5', type: 'FIXED', value: 5 },
  { code: 'WELCOME', type: 'FIXED', value: 10 },
];

export const POS: React.FC<POSProps> = ({ products, onCheckout, storeSettings }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [skuInput, setSkuInput] = useState('');
  const [showInvoice, setShowInvoice] = useState(false);
  const [lastSale, setLastSale] = useState<{items: CartItem[], subTotal: number, discount: number, total: number, id: string, paymentMethod: string} | null>(null);
  const [customerPhone, setCustomerPhone] = useState('');
  const skuInputRef = useRef<HTMLInputElement>(null);

  // Scanner State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Edit & Custom Item States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);
  const [editForm, setEditForm] = useState({ price: '', quantity: '', name: '' });

  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customForm, setCustomForm] = useState({ name: '', price: '', quantity: '1' });

  // Discount State
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{code: string, type: string, value: number} | null>(null);

  // Focus scanner input on mount
  useEffect(() => {
    skuInputRef.current?.focus();
  }, []);

  // --- QR SCANNER LOGIC ---
  useEffect(() => {
    let animationFrameId: number;
    let stream: MediaStream | null = null;

    const startCamera = async () => {
        if (isScannerOpen) {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    // required to tell iOS safari we don't want fullscreen
                    videoRef.current.setAttribute("playsinline", "true"); 
                    await videoRef.current.play();
                    requestAnimationFrame(tick);
                }
            } catch (err) {
                console.error("Error accessing camera", err);
                alert("Could not access camera. Please ensure you have granted camera permissions.");
                setIsScannerOpen(false);
            }
        }
    };

    const tick = () => {
        if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
             const canvas = canvasRef.current;
             if (canvas) {
                 const ctx = canvas.getContext("2d", { willReadFrequently: true });
                 if (ctx) {
                     canvas.height = videoRef.current.videoHeight;
                     canvas.width = videoRef.current.videoWidth;
                     ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                     const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                     
                     // Decode QR
                     const code = jsQR(imageData.data, imageData.width, imageData.height, {
                         inversionAttempts: "dontInvert",
                     });

                     if (code) {
                         // Found a QR code
                         handleScanResult(code.data);
                         return; // Stop scanning loop
                     }
                 }
             }
        }
        if (isScannerOpen) {
            animationFrameId = requestAnimationFrame(tick);
        }
    };
    
    if (isScannerOpen) {
        startCamera();
    }

    return () => {
         if (animationFrameId) cancelAnimationFrame(animationFrameId);
         if (stream) stream.getTracks().forEach(track => track.stop());
    }
  }, [isScannerOpen]);

  const handleScanResult = (data: string) => {
    // Try to find product by SKU or ID
    const product = products.find(p => p.sku === data || p.id === data);
    
    if (product) {
        if (product.stock <= 0) {
            alert(`Item "${product.name}" is out of stock!`);
            setIsScannerOpen(false);
        } else {
            addToCart(product);
            setIsScannerOpen(false);
            // Optional: Play beep sound here if we had an audio file
        }
    } else {
         // Debounce could be added here, but for now we just alert and close to avoid loop
         alert(`Product not found for QR Code: ${data}`);
         setIsScannerOpen(false);
    }
  };

  // --- CART LOGIC ---
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

  // --- EDIT ITEM LOGIC ---
  const openEditModal = (item: CartItem) => {
    setEditingItem(item);
    setEditForm({ 
      price: item.sellPrice.toString(), 
      quantity: item.quantity.toString(), 
      name: item.name 
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;
    const price = parseFloat(editForm.price);
    const qty = parseInt(editForm.quantity);
    
    if (isNaN(price) || price < 0 || isNaN(qty) || qty < 1) {
        alert("Invalid price or quantity");
        return;
    }

    setCart(prev => prev.map(item => 
       item.id === editingItem.id 
         ? { ...item, sellPrice: price, quantity: qty, name: editForm.name || item.name }
         : item
    ));
    setIsEditModalOpen(false);
    setEditingItem(null);
  };

  // --- CUSTOM ITEM LOGIC ---
  const handleAddCustomItem = () => {
    const price = parseFloat(customForm.price);
    const qty = parseInt(customForm.quantity);

    if (!customForm.name || isNaN(price) || isNaN(qty) || qty < 1) {
        alert("Please enter valid details");
        return;
    }

    const newItem: CartItem = {
        id: `custom_${Date.now()}`,
        sku: 'CUSTOM',
        name: customForm.name,
        costPrice: 0,
        sellPrice: price,
        stock: 9999,
        category: 'Custom',
        quantity: qty,
        image: '' 
    };
    setCart(prev => [...prev, newItem]);
    setIsCustomModalOpen(false);
    setCustomForm({ name: '', price: '', quantity: '1' });
  };

  // --- CALCULATIONS ---
  const subTotal = cart.reduce((acc, item) => acc + (item.sellPrice * item.quantity), 0);
  
  let discountAmount = 0;
  if (appliedDiscount) {
      if (appliedDiscount.type === 'PERCENTAGE') {
          discountAmount = subTotal * (appliedDiscount.value / 100);
      } else {
          discountAmount = appliedDiscount.value;
      }
  }
  // Prevent negative total
  if (discountAmount > subTotal) discountAmount = subTotal;
  
  const finalTotal = subTotal - discountAmount;

  // --- DISCOUNT HANDLERS ---
  const handleApplyDiscount = () => {
      const code = discountCode.trim().toUpperCase();
      const discount = ACTIVE_DISCOUNTS.find(d => d.code === code);
      if (discount) {
          setAppliedDiscount(discount);
          setDiscountCode('');
      } else {
          alert('Invalid or expired discount code.');
          setAppliedDiscount(null);
      }
  };

  const handleRemoveDiscount = () => {
      setAppliedDiscount(null);
      setDiscountCode('');
  };

  const processPayment = (method: 'CASH' | 'CARD') => {
    if (cart.length === 0) return;
    const saleId = Date.now().toString();
    setLastSale({ 
        items: [...cart], 
        subTotal: subTotal,
        discount: discountAmount,
        total: finalTotal, 
        id: saleId,
        paymentMethod: method
    });
    onCheckout(cart, finalTotal, method);
    setCart([]);
    setAppliedDiscount(null);
    setCustomerPhone(''); // Reset phone for new customer
    setShowInvoice(true);
  };

  const handleWhatsAppShare = () => {
    if (!lastSale || !customerPhone) {
        alert("Please enter a customer phone number.");
        return;
    }

    const receiptText = [
        `*🧾 ${storeSettings.name}*`,
        `Order: #${lastSale.id.slice(-6)}`,
        `Date: ${new Date(Number(lastSale.id)).toLocaleString()}`,
        ``,
        `*Items:*`,
        ...lastSale.items.map(item => `- ${item.name} (x${item.quantity}): ${CURRENCY}${(item.sellPrice * item.quantity).toFixed(2)}`),
        ``,
        `----------------`,
        `Subtotal: ${CURRENCY}${lastSale.subTotal.toFixed(2)}`,
        lastSale.discount > 0 ? `Discount: -${CURRENCY}${lastSale.discount.toFixed(2)}` : '',
        `*TOTAL: ${CURRENCY}${lastSale.total.toFixed(2)}*`,
        `----------------`,
        ``,
        storeSettings.footerMessage
    ].filter(line => line !== '').join('\n');

    const encodedText = encodeURIComponent(receiptText);
    const cleanPhone = customerPhone.replace(/[^0-9]/g, '');
    
    window.open(`https://wa.me/${cleanPhone}?text=${encodedText}`, '_blank');
  };

  const isSmallReceipt = storeSettings.receiptSize === '58mm';

  return (
    <div className="flex h-full bg-slate-100 relative">
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
          <button 
             onClick={() => setIsScannerOpen(true)}
             className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg transition-colors font-medium text-sm"
             title="Scan QR Code with Camera"
          >
             <QrCode size={18} />
             <span className="hidden md:inline">Scan QR</span>
          </button>
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
          
          <div className="p-6 border-b border-dashed border-slate-300 text-center relative">
            <div className="flex items-center justify-center absolute top-2 right-2 text-brand-600 bg-brand-50 py-1 px-2 rounded-full text-[10px] font-bold">
               <Receipt size={12} className="mr-1" /> LIVE
            </div>
            
            {storeSettings.logo && (
              <img src={storeSettings.logo} alt="Logo" className="h-12 mx-auto mb-2 object-contain" />
            )}
            <h2 className="text-xl font-bold text-slate-900 tracking-wider uppercase">{storeSettings.name}</h2>
            <p className="text-xs text-slate-500 mt-1 whitespace-pre-line">{storeSettings.address}</p>
            {storeSettings.phone && <p className="text-xs text-slate-400 mt-1">Tel: {storeSettings.phone}</p>}
            
            <p className="text-[10px] text-slate-400 mt-2 font-mono">{new Date().toLocaleString()}</p>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-sm relative">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2 opacity-50">
                <ShoppingCart size={48} />
                <p>Scan items to begin...</p>
              </div>
            ) : (
              <>
              {cart.map(item => (
                <div 
                  key={item.id} 
                  className="group relative cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors border border-transparent hover:border-slate-200"
                  onClick={() => openEditModal(item)}
                  title="Click to edit item"
                >
                  <div className="flex justify-between items-start mb-1">
                     <span className="text-slate-800 font-bold">{item.name}</span>
                     <span className="text-slate-900">{CURRENCY}{(item.sellPrice * item.quantity).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-500 pl-2">
                     <div className="flex items-center gap-2">
                       <span>{item.quantity} x {CURRENCY}{item.sellPrice.toFixed(2)}</span>
                     </div>
                     <div className="flex items-center gap-1">
                         <div className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-500 mr-2">
                            <Edit3 size={12} />
                         </div>
                         {/* Stop propagation so these buttons don't trigger the modal */}
                        <button onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, -1); }} className="p-1 hover:bg-slate-200 rounded text-slate-800 bg-slate-100"><Minus size={12}/></button>
                        <button onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, 1); }} className="p-1 hover:bg-slate-200 rounded text-slate-800 bg-slate-100"><Plus size={12}/></button>
                        <button onClick={(e) => { e.stopPropagation(); removeFromCart(item.id); }} className="p-1 hover:bg-red-100 rounded text-red-500 ml-1 bg-red-50"><Trash2 size={12}/></button>
                     </div>
                  </div>
                </div>
              ))}
              </>
            )}
            
            {/* Add Custom Item Button - Always visible at bottom of list */}
             <button 
                onClick={() => setIsCustomModalOpen(true)}
                className="w-full py-3 border-2 border-dashed border-slate-200 rounded-lg text-slate-500 text-xs font-bold hover:border-brand-500 hover:text-brand-600 hover:bg-brand-50 transition-all flex items-center justify-center gap-2 mt-4"
             >
                <PlusCircle size={14} /> Add Custom Item / Service
             </button>
          </div>

          {/* Receipt Footer & Totals */}
          <div className="p-6 bg-slate-50 border-t border-dashed border-slate-300">
            {/* Discount Code Input */}
            <div className="mb-4">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                       <Tag className="absolute left-2 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
                       <input 
                         type="text" 
                         placeholder="Discount Code" 
                         value={discountCode}
                         onChange={(e) => setDiscountCode(e.target.value)}
                         onKeyDown={(e) => e.key === 'Enter' && handleApplyDiscount()}
                         className="w-full pl-8 pr-2 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-brand-500 uppercase"
                         disabled={!!appliedDiscount}
                       />
                    </div>
                    {appliedDiscount ? (
                        <button onClick={handleRemoveDiscount} className="px-3 py-1.5 bg-red-50 text-red-600 text-xs font-bold rounded-lg border border-red-100 hover:bg-red-100">
                          Remove
                        </button>
                    ) : (
                        <button onClick={handleApplyDiscount} className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-200">
                          Apply
                        </button>
                    )}
                </div>
                {appliedDiscount && (
                    <div className="text-green-600 text-[10px] mt-1 font-bold flex items-center gap-1">
                        <CheckCircle size={10} /> Applied: {appliedDiscount.code} ({appliedDiscount.type === 'PERCENTAGE' ? `${appliedDiscount.value}% OFF` : `-${CURRENCY}${appliedDiscount.value}`})
                    </div>
                )}
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-slate-500 text-sm">
                <span>Subtotal</span>
                <span>{CURRENCY}{subTotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-green-600 text-sm font-medium">
                  <span>Discount</span>
                  <span>-{CURRENCY}{discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-500 text-sm">
                <span>Tax (0%)</span>
                <span>{CURRENCY}0.00</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center pt-4 border-t border-slate-200 text-2xl font-bold text-slate-900 mb-6">
              <span>TOTAL</span>
              <span>{CURRENCY}{finalTotal.toFixed(2)}</span>
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

      {/* QR SCANNER MODAL */}
      {isScannerOpen && (
          <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center animate-fade-in">
              <div className="absolute top-4 right-4">
                  <button onClick={() => setIsScannerOpen(false)} className="text-white bg-white/10 p-2 rounded-full hover:bg-white/20">
                      <X size={32} />
                  </button>
              </div>
              
              <div className="text-white text-center mb-6">
                  <h2 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2"><QrCode /> Scan Product QR</h2>
                  <p className="text-slate-400 text-sm">Point camera at a product QR code</p>
              </div>

              <div className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-700 w-full max-w-sm aspect-square bg-black">
                   <video ref={videoRef} className="w-full h-full object-cover"></video>
                   <canvas ref={canvasRef} className="hidden"></canvas>
                   
                   {/* Scanner Overlay Guide */}
                   <div className="absolute inset-0 border-[40px] border-black/50 flex items-center justify-center">
                       <div className="w-full h-full border-2 border-brand-500 relative">
                           <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-brand-500 -mt-1 -ml-1"></div>
                           <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-brand-500 -mt-1 -mr-1"></div>
                           <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-brand-500 -mb-1 -ml-1"></div>
                           <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-brand-500 -mb-1 -mr-1"></div>
                           
                           {/* Scan Line Animation */}
                           <div className="absolute left-0 right-0 h-0.5 bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-[scan_2s_ease-in-out_infinite]"></div>
                       </div>
                   </div>
              </div>
              
              <div className="mt-8">
                  <button onClick={() => setIsScannerOpen(false)} className="bg-slate-800 text-white px-6 py-2 rounded-full font-bold hover:bg-slate-700">
                      Cancel Scan
                  </button>
              </div>

              <style>{`
                @keyframes scan {
                  0% { top: 5%; opacity: 0; }
                  10% { opacity: 1; }
                  50% { top: 95%; }
                  90% { opacity: 1; }
                  100% { top: 95%; opacity: 0; }
                }
              `}</style>
          </div>
      )}

      {/* EDIT ITEM MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2"><Edit3 size={16}/> Edit Item</h3>
                  <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
              </div>
              <div className="p-4 space-y-4">
                  <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Item Name</label>
                      <input 
                         type="text" 
                         value={editForm.name}
                         onChange={e => setEditForm({...editForm, name: e.target.value})}
                         className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                      />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase">Price ({CURRENCY})</label>
                          <input 
                             type="number"
                             step="0.01" 
                             value={editForm.price}
                             onChange={e => setEditForm({...editForm, price: e.target.value})}
                             className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                          />
                      </div>
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase">Quantity</label>
                          <input 
                             type="number"
                             min="1"
                             value={editForm.quantity}
                             onChange={e => setEditForm({...editForm, quantity: e.target.value})}
                             className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                          />
                      </div>
                  </div>
                  <button onClick={handleSaveEdit} className="w-full bg-brand-600 text-white py-2 rounded-lg font-bold hover:bg-brand-700 transition-colors">
                     Update Item
                  </button>
              </div>
           </div>
        </div>
      )}

      {/* CUSTOM ITEM MODAL */}
      {isCustomModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2"><PlusCircle size={16}/> Add Custom Item</h3>
                  <button onClick={() => setIsCustomModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
              </div>
              <div className="p-4 space-y-4">
                  <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Item Description</label>
                      <input 
                         type="text" 
                         placeholder="e.g. Misc Service"
                         value={customForm.name}
                         onChange={e => setCustomForm({...customForm, name: e.target.value})}
                         className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                         autoFocus
                      />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase">Price ({CURRENCY})</label>
                          <input 
                             type="number"
                             step="0.01" 
                             placeholder="0.00"
                             value={customForm.price}
                             onChange={e => setCustomForm({...customForm, price: e.target.value})}
                             className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                          />
                      </div>
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase">Quantity</label>
                          <input 
                             type="number"
                             min="1"
                             value={customForm.quantity}
                             onChange={e => setCustomForm({...customForm, quantity: e.target.value})}
                             className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                          />
                      </div>
                  </div>
                  <button onClick={handleAddCustomItem} className="w-full bg-slate-900 text-white py-2 rounded-lg font-bold hover:bg-slate-800 transition-colors">
                     Add to Invoice
                  </button>
              </div>
           </div>
        </div>
      )}

      {/* Final Invoice Modal (Post-Checkout) */}
      {showInvoice && lastSale && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 print:p-0">
          <div className={`bg-white shadow-2xl p-6 print:shadow-none animate-fade-in relative ${isSmallReceipt ? 'w-[240px] print:w-[58mm] text-xs' : 'w-80 print:w-full'}`}>
            <button onClick={() => setShowInvoice(false)} className="absolute -top-4 -right-4 bg-white rounded-full p-2 text-slate-800 shadow-lg no-print hover:bg-slate-100">
              <span className="text-xl font-bold">×</span>
            </button>
            
            <div className="text-center mb-6">
              {storeSettings.logo && (
                 <img src={storeSettings.logo} alt="Logo" className={`${isSmallReceipt ? 'h-10' : 'h-16'} mx-auto mb-3 object-contain`} />
              )}
              <h1 className={`${isSmallReceipt ? 'text-lg' : 'text-xl'} font-bold text-slate-900 tracking-wider uppercase`}>{storeSettings.name}</h1>
              <p className="text-xs text-slate-500 whitespace-pre-line">{storeSettings.address}</p>
              {storeSettings.phone && <p className="text-xs text-slate-500">Tel: {storeSettings.phone}</p>}
              
              <div className="mt-4 pt-2 border-t border-slate-100">
                 <p className="text-xs text-slate-400">Order #{lastSale.id.slice(-6)}</p>
                 <p className="text-xs text-slate-400">{new Date(Number(lastSale.id)).toLocaleString()}</p>
              </div>
            </div>

            <div className="border-t border-b border-dashed border-slate-300 py-4 mb-4 space-y-2">
              {lastSale.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-slate-800">{item.name} x{item.quantity}</span>
                  <span className="font-mono text-slate-600">{CURRENCY}{(item.sellPrice * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="space-y-1 mb-4 border-b border-slate-200 pb-4">
                 <div className="flex justify-between text-sm text-slate-500">
                     <span>Subtotal</span>
                     <span>{CURRENCY}{lastSale.subTotal.toFixed(2)}</span>
                 </div>
                 {lastSale.discount > 0 && (
                    <div className="flex justify-between text-sm text-green-600 font-bold">
                        <span>Discount</span>
                        <span>-{CURRENCY}{lastSale.discount.toFixed(2)}</span>
                    </div>
                 )}
            </div>

            <div className={`flex justify-between items-center ${isSmallReceipt ? 'text-base' : 'text-lg'} font-bold text-slate-900 mb-6`}>
              <span>TOTAL</span>
              <span>{CURRENCY}{lastSale.total.toFixed(2)}</span>
            </div>
            
             <div className="text-center mb-6">
                <p className="text-sm font-bold text-slate-700">PAID BY {lastSale.paymentMethod}</p>
             </div>
             
             {storeSettings.footerMessage && (
                <div className="text-center text-xs text-slate-500 mb-6">
                   {storeSettings.footerMessage}
                </div>
             )}

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