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

    const startCamera = async () => {
        if (isScannerOpen) {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
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
                         handleScanResult(code.data);
                         return; 
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
      <div className="flex-1 flex flex-col overflow-hidden h-full">
        {/* Search & Scan Bar */}
        <div className="bg-white p-3 lg:p-4 shadow-sm flex items-center gap-2 lg:gap-4 shrink-0 z-10">
          <Search className="text-slate-400 hidden lg:block" />
          <form onSubmit={handleSkuSubmit} className="flex-1">
            <input
              ref={skuInputRef}
              type="text"
              value={skuInput}
              onChange={(e) => setSkuInput(e.target.value)}
              placeholder="Scan Barcode or Search..."
              className="w-full text-base lg:text-lg outline-none bg-slate-50 lg:bg-transparent px-3 py-2 lg:p-0 rounded-lg lg:rounded-none placeholder-slate-400 text-slate-800"
            />
          </form>
          <button 
             onClick={() => setIsScannerOpen(true)}
             className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2 rounded-lg transition-colors font-medium text-sm"
          >
             <QrCode size={18} />
             <span className="hidden md:inline">Scan QR</span>
          </button>
        </div>

        {/* Scrollable Products */}
        <div className="flex-1 overflow-y-auto p-3 lg:p-6 pb-24 lg:pb-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4">
            {products.map(product => (
                <div 
                key={product.id} 
                onClick={() => addToCart(product)}
                className={`bg-white rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:border-brand-500 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group ${product.stock === 0 ? 'opacity-60 grayscale' : ''}`}
                >
                <div className="relative h-28 lg:h-32 bg-slate-100 flex items-center justify-center overflow-hidden">
                    {product.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                    <ImageIcon className="text-slate-300" size={32} />
                    )}
                    <div className="absolute top-2 left-2">
                    <span className="bg-white/90 backdrop-blur-sm text-brand-700 text-[10px] lg:text-xs px-2 py-1 rounded-full font-bold shadow-sm">{product.category}</span>
                    </div>
                    {product.stock === 0 && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Out of Stock</span>
                    </div>
                    )}
                </div>
                
                <div className="p-3 lg:p-4">
                    <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] text-slate-400 font-mono truncate">{product.sku}</span>
                    <p className={`text-[10px] ${product.stock < 5 ? 'text-red-500 font-bold' : 'text-slate-500'}`}>
                        {product.stock} left
                    </p>
                    </div>
                    <h3 className="font-semibold text-slate-800 text-sm lg:text-base leading-tight mb-2 truncate">{product.name}</h3>
                    <div className="flex justify-between items-center">
                    <div className="text-base lg:text-lg font-bold text-brand-600">{CURRENCY}{product.sellPrice.toFixed(2)}</div>
                    <div className="bg-slate-100 p-1 lg:p-1.5 rounded-lg text-slate-600 group-hover:bg-brand-500 group-hover:text-white transition-colors">
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
           className="w-full flex items-center justify-between px-4 py-2"
         >
             <div className="flex items-center gap-3">
                 <div className="relative">
                    <ShoppingBag size={24} />
                    {totalItems > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{totalItems}</span>}
                 </div>
                 <div className="text-left">
                     <div className="text-xs text-slate-400">{totalItems} items</div>
                     <div className="font-bold text-lg leading-none">View Cart</div>
                 </div>
             </div>
             <div className="bg-brand-600 px-4 py-2 rounded-lg font-bold">
                 {CURRENCY}{finalTotal.toFixed(2)}
             </div>
         </button>
      </div>

      {/* Cart/Invoice Panel */}
      <div className={`
         fixed inset-0 z-40 bg-slate-200 shadow-xl flex flex-col border-l border-slate-300 transition-transform duration-300
         lg:static lg:w-96 lg:translate-x-0 lg:z-auto
         ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        {/* Mobile Header for Cart */}
        <div className="lg:hidden bg-slate-800 text-white p-4 flex justify-between items-center shrink-0">
             <div className="font-bold flex items-center gap-2">
                 <ShoppingCart size={20} /> Current Order
             </div>
             <button onClick={() => setIsCartOpen(false)} className="bg-slate-700 p-2 rounded-full">
                 <X size={20} />
             </button>
        </div>

        <div className="flex-1 bg-white rounded-none lg:rounded-lg lg:m-4 lg:mb-4 lg:shadow-sm flex flex-col overflow-hidden relative">
          {/* Receipt Texture Header */}
          <div className="h-2 bg-slate-800 w-full absolute top-0 left-0"></div>
          
          <div className="p-4 lg:p-6 border-b border-dashed border-slate-300 text-center relative shrink-0">
            <div className="flex items-center justify-center absolute top-2 right-2 text-brand-600 bg-brand-50 py-1 px-2 rounded-full text-[10px] font-bold">
               <Receipt size={12} className="mr-1" /> LIVE
            </div>
            
            {storeSettings.logo && (
              <img src={storeSettings.logo} alt="Logo" className="h-10 lg:h-12 mx-auto mb-2 object-contain" />
            )}
            <h2 className="text-lg lg:text-xl font-bold text-slate-900 tracking-wider uppercase">{storeSettings.name}</h2>
            <p className="text-xs text-slate-500 mt-1 whitespace-pre-line">{storeSettings.address}</p>
            {storeSettings.phone && <p className="text-xs text-slate-400 mt-1">Tel: {storeSettings.phone}</p>}
          </div>

          {/* Cart Items List */}
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
                        <button onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, -1); }} className="p-2 lg:p-1 hover:bg-slate-200 rounded text-slate-800 bg-slate-100"><Minus size={14}/></button>
                        <button onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, 1); }} className="p-2 lg:p-1 hover:bg-slate-200 rounded text-slate-800 bg-slate-100"><Plus size={14}/></button>
                        <button onClick={(e) => { e.stopPropagation(); removeFromCart(item.id); }} className="p-2 lg:p-1 hover:bg-red-100 rounded text-red-500 ml-1 bg-red-50"><Trash2 size={14}/></button>
                     </div>
                  </div>
                </div>
              ))}
              </>
            )}
            
             <button 
                onClick={() => setIsCustomModalOpen(true)}
                className="w-full py-3 border-2 border-dashed border-slate-200 rounded-lg text-slate-500 text-xs font-bold hover:border-brand-500 hover:text-brand-600 hover:bg-brand-50 transition-all flex items-center justify-center gap-2 mt-4"
             >
                <PlusCircle size={14} /> Add Custom Item
             </button>
          </div>

          {/* Receipt Footer & Totals */}
          <div className="p-4 lg:p-6 bg-slate-50 border-t border-dashed border-slate-300 shrink-0 mb-16 lg:mb-0">
            
            {/* Discount Control Panel */}
            <div className="mb-4 bg-slate-100 p-2 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                        <Tag size={12} /> Discount
                    </span>
                    <div className="flex bg-white rounded-md shadow-sm p-0.5">
                        <button 
                          onClick={() => setDiscountType('PERCENTAGE')}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded ${discountType === 'PERCENTAGE' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}
                        >
                            %
                        </button>
                        <button 
                          onClick={() => setDiscountType('FIXED')}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded ${discountType === 'FIXED' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}
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
                         placeholder={discountType === 'PERCENTAGE' ? "Enter percentage (e.g. 10)" : "Enter amount (e.g. 5.00)"}
                         value={discountValue}
                         onChange={(e) => setDiscountValue(e.target.value)}
                         className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-md text-sm outline-none focus:border-brand-500"
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

              <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-xl font-bold text-slate-900 mt-2">
                <span>TOTAL</span>
                <span>{CURRENCY}{finalTotal.toFixed(2)}</span>
              </div>
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
          
          <div className="hidden lg:block h-3 w-full bg-slate-200 relative" style={{
             backgroundImage: 'linear-gradient(45deg, #ffffff 25%, transparent 25%), linear-gradient(-45deg, #ffffff 25%, transparent 25%)',
             backgroundSize: '16px 16px',
             backgroundPosition: '0 0'
          }}></div>
        </div>
      </div>

      {/* QR SCANNER MODAL */}
      {isScannerOpen && (
          <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4">
              <button onClick={() => setIsScannerOpen(false)} className="absolute top-4 right-4 text-white bg-white/10 p-2 rounded-full">
                  <X size={32} />
              </button>
              
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-700 w-full max-w-sm aspect-square bg-black">
                   <video ref={videoRef} className="w-full h-full object-cover"></video>
                   <canvas ref={canvasRef} className="hidden"></canvas>
                   <div className="absolute inset-0 border-[40px] border-black/50 flex items-center justify-center">
                       <div className="w-full h-full border-2 border-brand-500 relative">
                           <div className="absolute left-0 right-0 h-0.5 bg-red-500/80 animate-[scan_2s_ease-in-out_infinite]"></div>
                       </div>
                   </div>
              </div>
          </div>
      )}

      {/* EDIT ITEM MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h3 className="font-bold text-slate-800">Edit Item</h3>
                  <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
              </div>
              <div className="p-4 space-y-4">
                  <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Item Name</label>
                      <input 
                         type="text" 
                         value={editForm.name}
                         onChange={e => setEditForm({...editForm, name: e.target.value})}
                         className="w-full p-2 border border-slate-200 rounded-lg"
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
                             className="w-full p-2 border border-slate-200 rounded-lg"
                          />
                      </div>
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase">Quantity</label>
                          <input 
                             type="number"
                             min="1"
                             value={editForm.quantity}
                             onChange={e => setEditForm({...editForm, quantity: e.target.value})}
                             className="w-full p-2 border border-slate-200 rounded-lg"
                          />
                      </div>
                  </div>
                  <button onClick={handleSaveEdit} className="w-full bg-brand-600 text-white py-3 rounded-lg font-bold">Update</button>
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
                  <button onClick={() => setIsCustomModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
              </div>
              <div className="p-4 space-y-4">
                  <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Description</label>
                      <input 
                         type="text" 
                         value={customForm.name}
                         onChange={e => setCustomForm({...customForm, name: e.target.value})}
                         className="w-full p-2 border border-slate-200 rounded-lg"
                      />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase">Price</label>
                          <input 
                             type="number"
                             value={customForm.price}
                             onChange={e => setCustomForm({...customForm, price: e.target.value})}
                             className="w-full p-2 border border-slate-200 rounded-lg"
                          />
                      </div>
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase">Quantity</label>
                          <input 
                             type="number"
                             value={customForm.quantity}
                             onChange={e => setCustomForm({...customForm, quantity: e.target.value})}
                             className="w-full p-2 border border-slate-200 rounded-lg"
                          />
                      </div>
                  </div>
                  <button onClick={handleAddCustomItem} className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold">Add Item</button>
              </div>
           </div>
        </div>
      )}

      {/* Final Invoice Modal (Post-Checkout) */}
      {showInvoice && lastSale && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 print:p-0">
          <div className={`bg-white shadow-2xl p-6 print:shadow-none animate-fade-in relative max-h-[90vh] overflow-y-auto ${isSmallReceipt ? 'w-[240px] print:w-[58mm] text-xs' : 'w-full max-w-sm print:w-full'}`}>
            <button onClick={() => setShowInvoice(false)} className="absolute top-2 right-2 bg-slate-100 rounded-full p-2 text-slate-800 no-print">
              <X size={20} />
            </button>
            
            <div className="text-center mb-6 mt-4">
              {storeSettings.logo && (
                 <img src={storeSettings.logo} alt="Logo" className={`${isSmallReceipt ? 'h-10' : 'h-16'} mx-auto mb-3 object-contain`} />
              )}
              <h1 className={`${isSmallReceipt ? 'text-lg' : 'text-xl'} font-bold text-slate-900 tracking-wider uppercase`}>{storeSettings.name}</h1>
              <p className="text-xs text-slate-500 whitespace-pre-line">{storeSettings.address}</p>
              
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
                 {storeSettings.taxEnabled && lastSale.tax > 0 && (
                    <div className="flex justify-between text-sm text-slate-500">
                        <span>{storeSettings.taxName} ({storeSettings.taxRate}%)</span>
                        <span>{CURRENCY}{lastSale.tax.toFixed(2)}</span>
                    </div>
                 )}
            </div>

            <div className={`flex justify-between items-center ${isSmallReceipt ? 'text-base' : 'text-xl'} font-bold text-slate-900 mb-6`}>
              <span>TOTAL</span>
              <span>{CURRENCY}{lastSale.total.toFixed(2)}</span>
            </div>
             
             {storeSettings.footerMessage && (
                <div className="text-center text-xs text-slate-500 mb-6">
                   {storeSettings.footerMessage}
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
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                  />
                <button 
                  onClick={handleWhatsAppShare}
                  className="bg-green-500 text-white px-4 rounded-lg flex items-center justify-center"
                >
                  <MessageCircle size={20} /> 
                </button>
              </div>
            </div>

            <div className="text-center space-y-3 no-print">
              <button onClick={() => window.print()} className="w-full bg-slate-900 text-white py-3 rounded-lg flex items-center justify-center gap-2 font-bold">
                <Printer size={18} /> Print Receipt
              </button>
              <button onClick={() => setShowInvoice(false)} className="w-full text-brand-600 py-2">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};