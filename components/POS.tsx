import React, { useState, useEffect, useRef } from 'react';
import { Product, CartItem, StoreSettings } from '../types';
import { CURRENCY } from '../constants';
import { ShoppingCart, CreditCard, Trash2, Plus, Minus, Search, Printer, CheckCircle, MessageCircle, Phone, Image as ImageIcon, Receipt, Edit3, PlusCircle, X, Save, Tag, QrCode, Camera, ChevronLeft, ShoppingBag, Percent, DollarSign } from 'lucide-react';
import jsQR from 'jsqr';

interface POSProps {
  products: Product[];
  onCheckout: (items: CartItem[], total: number, paymentMethod: 'CASH' | 'CARD', subTotal: number, discount: number, tax: number) => void;
  storeSettings: StoreSettings;
}

export const POS: React.FC<POSProps> = ({ products, onCheckout, storeSettings }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [skuInput, setSkuInput] = useState('');
  const [showInvoice, setShowInvoice] = useState(false);
  
  // Sale State
  const [lastSale, setLastSale] = useState<{
      items: CartItem[], 
      subTotal: number, 
      discount: number, 
      tax: number,
      total: number, 
      id: string, 
      paymentMethod: string
  } | null>(null);

  const [customerPhone, setCustomerPhone] = useState('');
  const skuInputRef = useRef<HTMLInputElement>(null);

  // Mobile/Responsive State
  const [isCartOpen, setIsCartOpen] = useState(false);

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

  // Manual Discount State
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState<string>(''); // string for input handling

  // Focus scanner input on mount
  useEffect(() => {
    // Only auto-focus on desktop to prevent mobile keyboard popping up annoyingly
    if (window.innerWidth > 768) {
        skuInputRef.current?.focus();
    }
  }, []);

  // --- QR SCANNER LOGIC ---
  useEffect(() => {
    let animationFrameId: number;
    let stream: MediaStream | null = null;
    let isActive = true;

    const startCamera = async () => {
        if (isScannerOpen && isActive) {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
                if (videoRef.current && isActive) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.setAttribute("playsinline", "true"); 
                    await videoRef.current.play();
                    requestAnimationFrame(tick);
                }
            } catch (err) {
                console.error("Error accessing camera", err);
                if(isActive) {
                    alert("Could not access camera. Please ensure you have granted camera permissions.");
                    setIsScannerOpen(false);
                }
            }
        }
    };

    const tick = () => {
        if (!isActive) return;
        
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
                         handleScanResult(code.data);
                         return; 
                     }
                 }
             }
        }
        if (isScannerOpen && isActive) {
            animationFrameId = requestAnimationFrame(tick);
        }
    };
    
    if (isScannerOpen) {
        startCamera();
    }

    return () => {
         isActive = false;
         if (animationFrameId) cancelAnimationFrame(animationFrameId);
         if (stream) stream.getTracks().forEach(track => track.stop());
         
         // Force track stop if srcObject exists
         if (videoRef.current && videoRef.current.srcObject) {
             const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
             tracks.forEach(t => t.stop());
         }
    }
  }, [isScannerOpen]);

  const handleScanResult = (data: string) => {
    const product = products.find(p => p.sku === data || p.id === data);
    
    if (product) {
        if (product.stock <= 0) {
            alert(`Item "${product.name}" is out of stock!`);
            setIsScannerOpen(false);
        } else {
            addToCart(product);
            setIsScannerOpen(false);
        }
    } else {
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
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Discount Calculation
  const numDiscountValue = parseFloat(discountValue) || 0;
  let discountAmount = 0;
  if (discountType === 'PERCENTAGE') {
      discountAmount = subTotal * (numDiscountValue / 100);
  } else {
      discountAmount = numDiscountValue;
  }
  
  // Cap discount at subtotal (cannot be negative)
  if (discountAmount > subTotal) discountAmount = subTotal;
  
  const taxableAmount = subTotal - discountAmount;
  const taxAmount = storeSettings.taxEnabled ? taxableAmount * (storeSettings.taxRate / 100) : 0;
  const finalTotal = taxableAmount + taxAmount;

  // --- PAYMENT ---
  const processPayment = (method: 'CASH' | 'CARD') => {
    if (cart.length === 0) return;
    const saleId = Date.now().toString();
    
    const saleData = { 
        items: [...cart], 
        subTotal,
        discount: discountAmount,
        tax: taxAmount,
        total: finalTotal, 
        id: saleId,
        paymentMethod: method
    };

    setLastSale(saleData);
    onCheckout(cart, finalTotal, method, subTotal, discountAmount, taxAmount);
    
    // Reset state
    setCart([]);
    setDiscountValue('');
    setCustomerPhone(''); 
    setShowInvoice(true);
    setIsCartOpen(false); 
  };

  const handleWhatsAppShare = () => {
    if (!lastSale || !customerPhone) {
        alert("Please enter a customer phone number.");
        return;
    }

    const itemString = lastSale.items.map(item => `- ${item.name} (x${item.quantity}): ${CURRENCY}${(item.sellPrice * item.quantity).toFixed(2)}`).join('\n');
    
    const template = storeSettings.whatsappTemplate || `🧾 *{store_name}*
Order: #{order_id}
Date: {date}
...`; 

    const message = template
      .replace(/{store_name}/g, storeSettings.name)
      .replace(/{order_id}/g, lastSale.id.slice(-6))
      .replace(/{date}/g, new Date(Number(lastSale.id)).toLocaleString())
      .replace(/{items}/g, itemString)
      .replace(/{subtotal}/g, `${CURRENCY}${lastSale.subTotal.toFixed(2)}`)
      .replace(/{discount}/g, `${CURRENCY}${lastSale.discount.toFixed(2)}`)
      .replace(/{total}/g, `${CURRENCY}${lastSale.total.toFixed(2)}`)
      .replace(/{footer}/g, storeSettings.footerMessage || 'Thank you!');

    const encodedText = encodeURIComponent(message);
    const cleanPhone = customerPhone.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=${encodedText}`, '_blank');
  };

  const isSmallReceipt = storeSettings.receiptSize === '58mm';

  return (
    <div className="flex h-full bg-slate-100 relative overflow-hidden flex-col lg:flex-row">
      
      {/* Product Grid - Main Area */}
      <div className="flex-1 flex flex-col overflow-hidden h-full order-1 lg:order-1">
        
        {/* Search & Scan Bar - Sticky on Mobile */}
        <div className="bg-white p-3 lg:p-4 shadow-sm flex items-center gap-2 lg:gap-4 shrink-0 z-20 sticky top-0 lg:static">
          <Search className="text-slate-400 hidden lg:block" />
          <form onSubmit={handleSkuSubmit} className="flex-1">
            <input
              ref={skuInputRef}
              type="text"
              value={skuInput}
              onChange={(e) => setSkuInput(e.target.value)}
              placeholder="Scan Barcode or Search..."
              className="w-full text-base lg:text-lg outline-none bg-slate-100 lg:bg-transparent px-4 py-2.5 rounded-full lg:rounded-none placeholder-slate-400 text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500 lg:focus:ring-0 transition-all"
            />
          </form>
          <button 
             onClick={() => setIsScannerOpen(true)}
             className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2.5 rounded-full lg:rounded-lg transition-colors font-medium text-sm whitespace-nowrap active:scale-95 transform"
          >
             <QrCode size={18} />
             <span className="hidden md:inline">Scan QR</span>
          </button>
        </div>

        {/* Scrollable Products */}
        <div className="flex-1 overflow-y-auto p-3 lg:p-6 pb-24 lg:pb-6 bg-slate-50/50">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4">
            {products.map(product => (
                <div 
                key={product.id} 
                onClick={() => addToCart(product)}
                className={`bg-white rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:border-brand-500 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group active:scale-[0.98] ${product.stock === 0 ? 'opacity-60 grayscale' : ''}`}
                >
                <div className="relative aspect-square bg-slate-100 flex items-center justify-center overflow-hidden">
                    {product.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                    <ImageIcon className="text-slate-300" size={32} />
                    )}
                    <div className="absolute top-2 left-2 right-2 flex justify-between">
                        <span className="bg-white/90 backdrop-blur-sm text-brand-700 text-[10px] lg:text-xs px-2 py-1 rounded-full font-bold shadow-sm truncate max-w-[70%]">{product.category}</span>
                    </div>
                    {product.stock === 0 && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg">Out of Stock</span>
                    </div>
                    )}
                </div>
                
                <div className="p-3">
                    <div className="flex justify-between items-start mb-1">
                        <span className="text-[10px] text-slate-400 font-mono truncate">{product.sku}</span>
                        <p className={`text-[10px] ${product.stock < 5 ? 'text-red-500 font-bold' : 'text-slate-500'}`}>
                            {product.stock} left
                        </p>
                    </div>
                    <h3 className="font-semibold text-slate-800 text-sm leading-tight mb-2 line-clamp-2 h-10">{product.name}</h3>
                    <div className="flex justify-between items-center mt-auto">
                        <div className="text-base font-bold text-brand-600">{CURRENCY}{product.sellPrice.toFixed(2)}</div>
                        <div className="bg-brand-50 p-1.5 rounded-lg text-brand-600 group-hover:bg-brand-500 group-hover:text-white transition-colors">
                            <Plus size={16} />
                        </div>
                    </div>
                </div>
                </div>
            ))}
            </div>
        </div>
      </div>

      {/* MOBILE BOTTOM SUMMARY BAR */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-slate-900 text-white p-3 z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] safe-area-bottom">
         <button 
           onClick={() => setIsCartOpen(true)}
           className="w-full flex items-center justify-between px-4 py-3 active:bg-slate-800 rounded-xl transition-colors"
         >
             <div className="flex items-center gap-3">
                 <div className="relative">
                    <ShoppingBag size={24} />
                    {totalItems > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-900">{totalItems}</span>}
                 </div>
                 <div className="text-left">
                     <div className="text-xs text-slate-400">Current Order</div>
                     <div className="font-bold text-lg leading-none">View Cart</div>
                 </div>
             </div>
             <div className="bg-brand-600 px-4 py-2 rounded-lg font-bold text-lg shadow-lg">
                 {CURRENCY}{finalTotal.toFixed(2)}
             </div>
         </button>
      </div>

      {/* Cart/Invoice Panel - Responsive Drawer */}
      <div className={`
         fixed inset-0 z-40 bg-slate-200 shadow-xl flex flex-col border-l border-slate-300 transition-transform duration-300
         lg:static lg:w-96 lg:translate-x-0 lg:z-auto lg:h-full lg:order-2
         ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        {/* Mobile Header for Cart */}
        <div className="lg:hidden bg-slate-800 text-white p-4 flex justify-between items-center shrink-0 shadow-md">
             <div className="font-bold flex items-center gap-2 text-lg">
                 <ShoppingCart size={20} /> Current Order
             </div>
             <button onClick={() => setIsCartOpen(false)} className="bg-slate-700 p-2 rounded-full hover:bg-slate-600 transition-colors">
                 <X size={20} />
             </button>
        </div>

        <div className="flex-1 bg-white lg:m-4 lg:mb-4 lg:rounded-xl lg:shadow-sm flex flex-col overflow-hidden relative">
          {/* Receipt Texture Header */}
          <div className="h-2 bg-slate-800 w-full absolute top-0 left-0"></div>
          
          <div className="p-4 border-b border-dashed border-slate-300 text-center relative shrink-0">
            <div className="flex items-center justify-center absolute top-2 right-2 text-brand-600 bg-brand-50 py-1 px-2 rounded-full text-[10px] font-bold">
               <Receipt size={12} className="mr-1" /> LIVE
            </div>
            
            {storeSettings.logo && (
              <img src={storeSettings.logo} alt="Logo" className="h-10 lg:h-12 mx-auto mb-2 object-contain" />
            )}
            <h2 className="text-lg font-bold text-slate-900 tracking-wider uppercase truncate px-8">{storeSettings.name}</h2>
            {storeSettings.address && <p className="text-xs text-slate-500 mt-1 whitespace-pre-line truncate">{storeSettings.address}</p>}
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-sm relative">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 opacity-50">
                <div className="bg-slate-50 p-6 rounded-full">
                    <ShoppingCart size={48} />
                </div>
                <p className="font-sans font-medium">Cart is empty</p>
                <p className="font-sans text-xs">Scan items to begin...</p>
              </div>
            ) : (
              <>
              {cart.map(item => (
                <div 
                  key={item.id} 
                  className="group relative cursor-pointer hover:bg-slate-50 p-3 rounded-lg transition-colors border border-transparent hover:border-slate-200"
                  onClick={() => openEditModal(item)}
                >
                  <div className="flex justify-between items-start mb-1">
                     <span className="text-slate-800 font-bold leading-tight max-w-[70%]">{item.name}</span>
                     <span className="text-slate-900 font-bold">{CURRENCY}{(item.sellPrice * item.quantity).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-500 mt-2">
                     <div className="flex items-center gap-2">
                       <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-sans font-bold">{item.quantity} x {CURRENCY}{item.sellPrice.toFixed(2)}</span>
                     </div>
                     <div className="flex items-center gap-1">
                        <button onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, -1); }} className="w-7 h-7 flex items-center justify-center hover:bg-slate-200 rounded text-slate-700 bg-slate-100 transition-colors"><Minus size={14}/></button>
                        <button onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, 1); }} className="w-7 h-7 flex items-center justify-center hover:bg-slate-200 rounded text-slate-700 bg-slate-100 transition-colors"><Plus size={14}/></button>
                        <button onClick={(e) => { e.stopPropagation(); removeFromCart(item.id); }} className="w-7 h-7 flex items-center justify-center hover:bg-red-100 rounded text-red-500 ml-1 bg-red-50 transition-colors"><Trash2 size={14}/></button>
                     </div>
                  </div>
                </div>
              ))}
              </>
            )}
          </div>
          
           <div className="px-4 pb-2">
                 <button 
                    onClick={() => setIsCustomModalOpen(true)}
                    className="w-full py-2.5 border border-dashed border-slate-300 rounded-lg text-slate-500 text-xs font-bold hover:border-brand-500 hover:text-brand-600 hover:bg-brand-50 transition-all flex items-center justify-center gap-2"
                >
                    <PlusCircle size={14} /> Add Custom Item
                </button>
           </div>

          {/* Receipt Footer & Totals */}
          <div className="p-4 bg-slate-50 border-t border-dashed border-slate-300 shrink-0 pb-safe">
            
            {/* Discount Control Panel */}
            <div className="mb-4 bg-white border border-slate-200 p-2 rounded-lg shadow-sm">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                        <Tag size={12} /> Discount
                    </span>
                    <div className="flex bg-slate-100 rounded-md p-0.5">
                        <button 
                          onClick={() => setDiscountType('PERCENTAGE')}
                          className={`px-3 py-1 text-[10px] font-bold rounded ${discountType === 'PERCENTAGE' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500'}`}
                        >
                            %
                        </button>
                        <button 
                          onClick={() => setDiscountType('FIXED')}
                          className={`px-3 py-1 text-[10px] font-bold rounded ${discountType === 'FIXED' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500'}`}
                        >
                            $
                        </button>
                    </div>
                </div>
                <div className="relative">
                    {discountType === 'PERCENTAGE' ? (
                        <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
                    ) : (
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
                    )}
                    <input 
                         type="number"
                         min="0"
                         placeholder={discountType === 'PERCENTAGE' ? "Enter percentage" : "Enter amount"}
                         value={discountValue}
                         onChange={(e) => setDiscountValue(e.target.value)}
                         className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm outline-none focus:border-brand-500 focus:bg-white transition-colors"
                    />
                </div>
            </div>

            {/* Price Breakdown */}
            <div className="space-y-1 mb-4">
              <div className="flex justify-between text-slate-500 text-sm">
                <span>Subtotal</span>
                <span>{CURRENCY}{subTotal.toFixed(2)}</span>
              </div>
              
              {discountAmount > 0 && (
                <div className="flex justify-between text-green-600 text-sm font-medium">
                  <span>Discount {discountType === 'PERCENTAGE' && numDiscountValue > 0 ? `(${numDiscountValue}%)` : ''}</span>
                  <span>-{CURRENCY}{discountAmount.toFixed(2)}</span>
                </div>
              )}
              
              {storeSettings.taxEnabled && (
                <div className="flex justify-between text-slate-500 text-sm">
                    <span>{storeSettings.taxName} ({storeSettings.taxRate}%)</span>
                    <span>{CURRENCY}{taxAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between items-center pt-3 border-t border-slate-200 text-xl font-bold text-slate-900 mt-2">
                <span>TOTAL</span>
                <span>{CURRENCY}{finalTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pb-safe-offset">
              <button 
                onClick={() => processPayment('CASH')}
                disabled={cart.length === 0}
                className="py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md active:scale-[0.98]"
              >
                Cash
              </button>
              <button 
                onClick={() => processPayment('CARD')}
                disabled={cart.length === 0}
                className="py-3.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md active:scale-[0.98]"
              >
                <CreditCard size={18} /> Card
              </button>
            </div>
          </div>
          
          <div className="hidden lg:block h-3 w-full bg-slate-200 relative" style={{
             backgroundImage: 'linear-gradient(45deg, #ffffff 25%, transparent 25%), linear-gradient(-45deg, #ffffff 25%, transparent 25%)',
             backgroundSize: '16px 16px',
             backgroundPosition: '0 0'
          }}></div>
        </div>
      </div>

      {/* QR SCANNER MODAL */}
      {isScannerOpen && (
          <div className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-4">
              <button onClick={() => setIsScannerOpen(false)} className="absolute top-6 right-6 text-white bg-white/20 p-3 rounded-full hover:bg-white/30 transition-colors">
                  <X size={24} />
              </button>
              
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-700 w-full max-w-sm aspect-square bg-black">
                   <video ref={videoRef} className="w-full h-full object-cover"></video>
                   <canvas ref={canvasRef} className="hidden"></canvas>
                   <div className="absolute inset-0 border-[40px] border-black/50 flex items-center justify-center">
                       <div className="w-full h-full border-2 border-brand-500 relative rounded-lg">
                           <div className="absolute left-0 right-0 h-0.5 bg-red-500/80 animate-[scan_2s_ease-in-out_infinite] shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                       </div>
                   </div>
              </div>
              <p className="text-white mt-8 font-medium animate-pulse">Align QR Code within the frame</p>
          </div>
      )}

      {/* EDIT ITEM MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in flex flex-col">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h3 className="font-bold text-slate-800">Edit Item</h3>
                  <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1"><X size={20}/></button>
              </div>
              <div className="p-4 space-y-4">
                  <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Item Name</label>
                      <input 
                         type="text" 
                         value={editForm.name}
                         onChange={e => setEditForm({...editForm, name: e.target.value})}
                         className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                      />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase">Price</label>
                          <input 
                             type="number"
                             step="0.01" 
                             value={editForm.price}
                             onChange={e => setEditForm({...editForm, price: e.target.value})}
                             className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                          />
                      </div>
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase">Quantity</label>
                          <input 
                             type="number"
                             min="1"
                             value={editForm.quantity}
                             onChange={e => setEditForm({...editForm, quantity: e.target.value})}
                             className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                          />
                      </div>
                  </div>
                  <button onClick={handleSaveEdit} className="w-full bg-brand-600 text-white py-3.5 rounded-lg font-bold shadow-md hover:bg-brand-700 transition-colors">Update Item</button>
              </div>
           </div>
        </div>
      )}

      {/* CUSTOM ITEM MODAL */}
      {isCustomModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h3 className="font-bold text-slate-800">Add Custom Item</h3>
                  <button onClick={() => setIsCustomModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1"><X size={20}/></button>
              </div>
              <div className="p-4 space-y-4">
                  <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Description</label>
                      <input 
                         type="text" 
                         value={customForm.name}
                         onChange={e => setCustomForm({...customForm, name: e.target.value})}
                         placeholder="e.g. Service Fee"
                         className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                      />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase">Price</label>
                          <input 
                             type="number"
                             value={customForm.price}
                             onChange={e => setCustomForm({...customForm, price: e.target.value})}
                             className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                          />
                      </div>
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase">Quantity</label>
                          <input 
                             type="number"
                             value={customForm.quantity}
                             onChange={e => setCustomForm({...customForm, quantity: e.target.value})}
                             className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                          />
                      </div>
                  </div>
                  <button onClick={handleAddCustomItem} className="w-full bg-slate-900 text-white py-3.5 rounded-lg font-bold shadow-md hover:bg-slate-800 transition-colors">Add to Cart</button>
              </div>
           </div>
        </div>
      )}

      {/* Final Invoice Modal (Post-Checkout) */}
      {showInvoice && lastSale && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 print:p-0">
          <div className={`bg-white shadow-2xl p-6 print:shadow-none animate-fade-in relative max-h-[90vh] overflow-y-auto rounded-xl ${isSmallReceipt ? 'w-[280px] print:w-[58mm] text-xs' : 'w-full max-w-sm print:w-full'}`}>
            <button onClick={() => setShowInvoice(false)} className="absolute top-3 right-3 bg-slate-100 rounded-full p-2 text-slate-800 hover:bg-slate-200 no-print">
              <X size={20} />
            </button>
            
            <div className="text-center mb-6 mt-2">
              {storeSettings.logo && (
                 <img src={storeSettings.logo} alt="Logo" className={`${isSmallReceipt ? 'h-10' : 'h-14'} mx-auto mb-3 object-contain`} />
              )}
              <h1 className={`${isSmallReceipt ? 'text-lg' : 'text-xl'} font-bold text-slate-900 tracking-wider uppercase`}>{storeSettings.name}</h1>
              <p className="text-xs text-slate-500 whitespace-pre-line mt-1">{storeSettings.address}</p>
              
              <div className="mt-4 pt-2 border-t border-slate-100 flex flex-col items-center">
                 <p className="text-xs text-slate-400 font-mono">Order #{lastSale.id.slice(-6)}</p>
                 <p className="text-xs text-slate-400">{new Date(Number(lastSale.id)).toLocaleString()}</p>
              </div>
            </div>

            <div className="border-t border-b border-dashed border-slate-300 py-4 mb-4 space-y-2 font-mono text-sm">
              {lastSale.items.map((item, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-slate-800">{item.name} x{item.quantity}</span>
                  <span className="text-slate-600">{CURRENCY}{(item.sellPrice * item.quantity).toFixed(2)}</span>
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
                 {storeSettings.taxEnabled && lastSale.tax > 0 && (
                    <div className="flex justify-between text-sm text-slate-500">
                        <span>{storeSettings.taxName} ({storeSettings.taxRate}%)</span>
                        <span>{CURRENCY}{lastSale.tax.toFixed(2)}</span>
                    </div>
                 )}
            </div>

            <div className={`flex justify-between items-center ${isSmallReceipt ? 'text-lg' : 'text-2xl'} font-bold text-slate-900 mb-6`}>
              <span>TOTAL</span>
              <span>{CURRENCY}{lastSale.total.toFixed(2)}</span>
            </div>
             
             {storeSettings.footerMessage && (
                <div className="text-center text-xs text-slate-500 mb-6 italic">
                   "{storeSettings.footerMessage}"
                </div>
             )}

            <div className="mt-6 mb-6 pt-4 border-t border-slate-100 no-print">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Send Receipt via WhatsApp</label>
              <div className="flex gap-2">
                <input 
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Phone Number"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                <button 
                  onClick={handleWhatsAppShare}
                  className="bg-[#25D366] text-white px-4 rounded-lg flex items-center justify-center hover:bg-[#20bd5a] transition-colors"
                >
                  <MessageCircle size={20} /> 
                </button>
              </div>
            </div>

            <div className="text-center space-y-3 no-print">
              <button onClick={() => window.print()} className="w-full bg-slate-900 text-white py-3.5 rounded-xl flex items-center justify-center gap-2 font-bold hover:bg-slate-800 transition-colors shadow-sm">
                <Printer size={18} /> Print Receipt
              </button>
              <button onClick={() => setShowInvoice(false)} className="w-full text-slate-500 hover:text-slate-800 py-2 text-sm font-medium">
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};