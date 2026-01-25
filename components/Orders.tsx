import React, { useState, useEffect, useRef } from 'react';
import { Sale, CartItem, StoreSettings } from '../types';
import { CURRENCY } from '../constants';
import { Search, Eye, RotateCcw, AlertCircle, CheckCircle, ArrowRight, X, Printer, Receipt, QrCode, ChevronLeft } from 'lucide-react';
import jsQR from 'jsqr';
import QRCode from 'qrcode';

interface OrdersProps {
  sales: Sale[];
  onProcessReturn: (saleId: string, returns: { [itemId: string]: number }) => void;
  storeSettings?: StoreSettings;
  onGoBack?: () => void;
}

export const Orders: React.FC<OrdersProps> = ({ sales, onProcessReturn, storeSettings, onGoBack }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  
  // Return Mode State
  const [isReturnMode, setIsReturnMode] = useState(false);
  const [returnDraft, setReturnDraft] = useState<{ [itemId: string]: number }>({});
  
  // Refund Invoice State
  const [showRefundInvoice, setShowRefundInvoice] = useState(false);
  const [refundData, setRefundData] = useState<{ originalSaleId: string; items: {name: string, price: number, qty: number}[]; total: number } | null>(null);

  // QR Codes for Display
  const [reprintQr, setReprintQr] = useState<string>('');
  const [refundQr, setRefundQr] = useState<string>('');

  // Scanner State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const filteredSales = sales.filter(s => 
    s.id.includes(searchTerm) || 
    s.items.some(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()))
  ).sort((a, b) => b.timestamp - a.timestamp);

  const getStatusColor = (status?: string) => {
    switch(status) {
      case 'REFUNDED': return 'bg-red-100 text-red-600';
      case 'PARTIAL': return 'bg-orange-100 text-orange-600';
      default: return 'bg-green-100 text-green-600';
    }
  };

  // --- QR GENERATION EFFECTS ---
  useEffect(() => {
    if (selectedSale) {
        QRCode.toDataURL(selectedSale.id, { margin: 1, width: 120 })
            .then(url => setReprintQr(url))
            .catch(err => console.error(err));
    }
  }, [selectedSale]);

  useEffect(() => {
    if (showRefundInvoice && refundData) {
        // Encode refund metadata for record keeping
        const refundInfo = `REFUND:${refundData.originalSaleId}`;
        QRCode.toDataURL(refundInfo, { margin: 1, width: 120 })
            .then(url => setRefundQr(url))
            .catch(err => console.error(err));
    }
  }, [showRefundInvoice, refundData]);

  // --- SCANNER LOGIC (Similar to POS) ---
  useEffect(() => {
    let animationFrameId: number;
    let stream: MediaStream | null = null;
    let isActive = true;

    const startCamera = async () => {
        if (isScannerOpen && isActive) {
            try {
                // Try environment camera first, fallback to any available
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
                } catch (envErr) {
                    console.warn("Environment camera not found, falling back to default.", envErr);
                    stream = await navigator.mediaDevices.getUserMedia({ video: true });
                }

                if (videoRef.current && isActive) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.setAttribute("playsinline", "true"); 
                    await videoRef.current.play();
                    requestAnimationFrame(tick);
                }
            } catch (err) {
                console.error("Error accessing camera", err);
                if(isActive) {
                    alert("Could not access camera. Please ensure you have a webcam connected and permissions granted.");
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
                     const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });

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
    }
  }, [isScannerOpen]);

  const handleScanResult = (data: string) => {
      // Assuming data is Sale ID
      const sale = sales.find(s => s.id === data);
      if (sale) {
          handleOpenDetail(sale);
          setIsScannerOpen(false);
      } else {
          alert(`Order not found for ID: ${data}`);
          setIsScannerOpen(false);
      }
  };

  // --- RETURN LOGIC ---
  const handleOpenDetail = (sale: Sale) => {
    setSelectedSale(sale);
    setIsReturnMode(false);
    setReturnDraft({});
  };

  const handleToggleReturn = (itemId: string, maxQty: number) => {
    setReturnDraft(prev => {
      const current = prev[itemId] || 0;
      if (current >= maxQty) return prev; // Cannot return more than sold
      return { ...prev, [itemId]: current + 1 };
    });
  };

  const handleDecrementReturn = (itemId: string) => {
    setReturnDraft(prev => {
      const current = prev[itemId] || 0;
      // If current is 1, decrementing makes it 0, so we remove the key entirely.
      if (current <= 1) {
        const newState = { ...prev };
        delete newState[itemId];
        return newState;
      }
      return { ...prev, [itemId]: current - 1 };
    });
  };

  const calculateRefundTotal = () => {
    if (!selectedSale) return 0;
    let total = 0;
    Object.entries(returnDraft).forEach(([itemId, val]) => {
      const qty = Number(val);
      const item = selectedSale.items.find(i => i.id === itemId);
      if (item && qty > 0) {
        // Calculate proportional price
        const price = Number(item.sellPrice) || 0;
        total += price * qty;
      }
    });
    return total;
  };

  const submitReturn = () => {
    if (!selectedSale) return;
    
    const refundAmount = calculateRefundTotal();
    const hasItems = Object.keys(returnDraft).length > 0;

    if (!hasItems || refundAmount <= 0) {
        alert("No items selected for return.");
        return;
    }
    
    if (window.confirm(`Confirm refund of ${CURRENCY}${refundAmount.toFixed(2)}?`)) {
        // Prepare data for the refund invoice
        const refundItems: {name: string, price: number, qty: number}[] = [];
        Object.entries(returnDraft).forEach(([itemId, val]) => {
            const qty = Number(val);
            const item = selectedSale.items.find(i => i.id === itemId);
            if(item) {
                refundItems.push({ name: item.name, price: item.sellPrice, qty });
            }
        });

        setRefundData({
            originalSaleId: selectedSale.id,
            items: refundItems,
            total: refundAmount
        });

        // Process logic
        onProcessReturn(selectedSale.id, returnDraft);
        
        // UI Reset & Show Invoice
        setIsReturnMode(false);
        setReturnDraft({});
        setSelectedSale(null); // Close main modal
        setShowRefundInvoice(true); // Open Refund Invoice
    }
  };

  const refundTotal = calculateRefundTotal();
  const isSmallReceipt = storeSettings?.receiptSize === '58mm';

  return (
    <div className="flex flex-col h-full bg-slate-50 p-6 overflow-hidden">
      <div className="mb-6 print:hidden flex items-center gap-2">
        {onGoBack && (
            <button onClick={onGoBack} className="lg:hidden p-2 -ml-2 rounded-full hover:bg-slate-200 text-slate-600 transition-colors">
                <ChevronLeft size={24} />
            </button>
        )}
        <div>
           <h2 className="text-2xl font-bold text-slate-800">Orders & Returns</h2>
           <p className="text-slate-500 text-sm">View history, reprint receipts, and process refunds.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden print:hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex gap-4">
           <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search by Order ID or Item Name..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 text-sm"
              />
           </div>
           <button 
              onClick={() => setIsScannerOpen(true)}
              className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-800 transition-colors"
           >
               <QrCode size={18} /> Scan Receipt
           </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-auto">
           <table className="w-full text-left text-sm">
             <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0 z-10">
               <tr>
                 <th className="p-4 border-b">Date</th>
                 <th className="p-4 border-b">Order ID</th>
                 <th className="p-4 border-b">Items</th>
                 <th className="p-4 border-b text-center">Payment</th>
                 <th className="p-4 border-b text-center">Status</th>
                 <th className="p-4 border-b text-right">Total</th>
                 <th className="p-4 border-b text-center">Action</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
               {filteredSales.map(sale => (
                 <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                   <td className="p-4 text-slate-500">
                      <div className="font-medium text-slate-700">{new Date(sale.timestamp).toLocaleDateString()}</div>
                      <div className="text-xs">{new Date(sale.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                   </td>
                   <td className="p-4 font-mono text-xs text-slate-400">#{sale.id.slice(-6)}</td>
                   <td className="p-4 text-slate-600 max-w-xs truncate">
                      {sale.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}
                   </td>
                   <td className="p-4 text-center">
                      <span className="px-2 py-1 bg-slate-100 rounded text-xs font-bold text-slate-600">{sale.paymentMethod}</span>
                   </td>
                   <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(sale.status)}`}>
                        {sale.status || 'COMPLETED'}
                      </span>
                   </td>
                   <td className="p-4 text-right font-bold text-slate-900">{CURRENCY}{sale.total.toFixed(2)}</td>
                   <td className="p-4 text-center">
                      <button 
                        onClick={() => handleOpenDetail(sale)}
                        className="p-2 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                      >
                         <Eye size={18} />
                      </button>
                   </td>
                 </tr>
               ))}
               {filteredSales.length === 0 && (
                   <tr><td colSpan={7} className="p-8 text-center text-slate-400">No orders found.</td></tr>
               )}
             </tbody>
           </table>
        </div>
      </div>

      {/* SCANNER MODAL */}
      {isScannerOpen && (
          <div className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-4 print:hidden">
              <button onClick={() => setIsScannerOpen(false)} className="absolute top-6 right-6 text-white bg-white/20 p-3 rounded-full hover:bg-white/30 transition-colors">
                  <X size={24} />
              </button>
              
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-700 w-full max-w-sm aspect-square bg-black">
                   <video ref={videoRef} className="w-full h-full object-cover"></video>
                   <canvas ref={canvasRef} className="hidden"></canvas>
                   <div className="absolute inset-0 border-[40px] border-black/50 flex items-center justify-center">
                       <div className="w-full h-full border-2 border-brand-500 relative rounded-lg">
                           <div className="absolute left-0 right-0 h-0.5 bg-green-500/80 animate-[scan_2s_ease-in-out_infinite] shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
                       </div>
                   </div>
              </div>
              <p className="text-white mt-8 font-medium animate-pulse">Scan Receipt QR Code</p>
          </div>
      )}

      {/* ORDER DETAIL / SALES RECEIPT MODAL */}
      {selectedSale && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 print:p-0 print:bg-white print:fixed print:inset-0 print:z-[10000]">
          <div className={`bg-white rounded-xl shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-[90vh] print:shadow-none print:max-h-none print:h-auto print:rounded-none ${isSmallReceipt ? 'w-[280px] print:w-[58mm] text-xs' : 'w-full max-w-sm print:w-full'}`}>
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 print:hidden">
               <div>
                  <h3 className="font-bold text-slate-800">Order #{selectedSale.id.slice(-6)}</h3>
                  <span className="text-xs text-slate-500">{new Date(selectedSale.timestamp).toLocaleString()}</span>
               </div>
               <button onClick={() => setSelectedSale(null)} className="text-slate-400 hover:text-slate-600 no-print"><X size={24}/></button>
            </div>

            {/* Print Header (Only visible when printing) */}
            <div className="hidden print:block text-center mb-4 mt-2">
                 {storeSettings?.logo && <img src={storeSettings.logo} alt="Logo" className="h-10 mx-auto mb-2 object-contain" />}
                 <h1 className="text-lg font-bold uppercase">{storeSettings?.name}</h1>
                 <p className="text-xs whitespace-pre-line">{storeSettings?.address}</p>
                 <div className="border-b border-dashed border-black mt-2 mb-2"></div>
                 <div className="text-left text-xs font-mono">
                     <div>Order: #{selectedSale.id.slice(-6)}</div>
                     <div>Date: {new Date(selectedSale.timestamp).toLocaleString()}</div>
                 </div>
                 <div className="border-b border-dashed border-black mt-2 mb-2"></div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 print:p-0 print:overflow-visible">
                
                {/* Status Banner */}
                <div className={`p-3 rounded-lg flex items-center gap-2 mb-6 ${getStatusColor(selectedSale.status)} print:hidden`}>
                    {selectedSale.status === 'REFUNDED' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
                    <span className="font-bold text-sm">Order Status: {selectedSale.status || 'COMPLETED'}</span>
                </div>

                {/* Items List */}
                <div className="space-y-4 font-mono text-sm print:space-y-2">
                  {selectedSale.items.map(item => {
                     const returnedCount = selectedSale.returnedItems?.[item.id] || 0;
                     const remainingQty = item.quantity - returnedCount;
                     const pendingReturnQty = returnDraft[item.id] || 0;
                     
                     return (
                        <div key={item.id} className="flex justify-between items-start border-b border-slate-50 pb-4 last:border-0 print:border-none print:pb-0">
                           <div className="flex-1">
                              <div className="font-bold text-slate-800">{item.name}</div>
                              <div className="text-xs text-slate-500 font-mono print:hidden">
                                 {CURRENCY}{item.sellPrice.toFixed(2)} x {item.quantity}
                              </div>
                              <div className="hidden print:block text-xs">
                                  {item.quantity} x {CURRENCY}{item.sellPrice.toFixed(2)}
                              </div>
                              {returnedCount > 0 && (
                                 <div className="text-xs text-red-500 font-bold mt-1 print:text-black print:font-normal">
                                    [Returned: {returnedCount}]
                                 </div>
                              )}
                           </div>
                           
                           {isReturnMode ? (
                              <div className="flex items-center gap-3">
                                 <button 
                                   onClick={() => handleDecrementReturn(item.id)}
                                   disabled={pendingReturnQty === 0}
                                   className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded text-slate-600 hover:bg-slate-200 disabled:opacity-50"
                                 > - </button>
                                 <span className="font-bold text-slate-900 w-4 text-center">{pendingReturnQty}</span>
                                 <button 
                                   onClick={() => handleToggleReturn(item.id, remainingQty)}
                                   disabled={remainingQty === 0 || pendingReturnQty >= remainingQty}
                                   className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded text-slate-600 hover:bg-slate-200 disabled:opacity-50"
                                 > + </button>
                              </div>
                           ) : (
                              <div className="text-right font-bold text-slate-800">
                                 {CURRENCY}{(item.sellPrice * item.quantity).toFixed(2)}
                              </div>
                           )}
                        </div>
                     );
                  })}
                </div>

                {/* Totals */}
                <div className="mt-6 pt-4 border-t border-slate-200 space-y-2 print:border-dashed print:border-black">
                    <div className="flex justify-between text-sm text-slate-500 print:text-black">
                        <span>Subtotal</span>
                        <span>{CURRENCY}{selectedSale.subTotal.toFixed(2)}</span>
                    </div>
                    {selectedSale.discount > 0 && (
                        <div className="flex justify-between text-sm text-green-600 print:text-black">
                            <span>Discount</span>
                            <span>-{CURRENCY}{selectedSale.discount.toFixed(2)}</span>
                        </div>
                    )}
                    {selectedSale.tax > 0 && (
                        <div className="flex justify-between text-sm text-slate-500 print:text-black">
                            <span>Tax</span>
                            <span>{CURRENCY}{selectedSale.tax.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-lg font-bold text-slate-900 pt-2 border-t border-slate-100 print:border-dashed print:border-black print:mt-2">
                        <span>Total Paid</span>
                        <span>{CURRENCY}{selectedSale.total.toFixed(2)}</span>
                    </div>
                </div>

                {/* Refund Summary Panel (On Screen Only) */}
                {isReturnMode && (
                   <div className="mt-6 bg-red-50 p-4 rounded-xl border border-red-100 animate-fade-in print:hidden">
                      <div className="flex justify-between items-center mb-2">
                         <span className="font-bold text-red-800">Refund Amount</span>
                         <span className="font-bold text-2xl text-red-600">{CURRENCY}{refundTotal.toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-red-600">
                         Items will be returned to inventory. Please refund the customer via their original payment method ({selectedSale.paymentMethod}).
                      </p>
                   </div>
                )}
            </div>
            
            {/* Print Footer */}
            <div className="hidden print:block text-center mt-4 text-xs">
                <div>{storeSettings?.footerMessage}</div>
            </div>

            {/* Reprint QR Code */}
             {reprintQr && (
                 <div className="hidden print:flex flex-col items-center justify-center pt-2 border-t border-dashed border-black mt-2">
                     <img src={reprintQr} alt="Invoice QR" className="w-24 h-24 mb-1" />
                     <p className="text-[10px] text-black font-mono">Scan for Return</p>
                 </div>
             )}

            {/* Footer Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3 print:hidden">
               {isReturnMode ? (
                  <>
                    <button 
                      onClick={() => setIsReturnMode(false)}
                      className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-200 rounded-lg transition-colors"
                    >
                       Cancel
                    </button>
                    <button 
                      onClick={submitReturn}
                      disabled={refundTotal <= 0}
                      className="flex-1 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                       Confirm Refund
                    </button>
                  </>
               ) : (
                  <>
                     <button 
                        onClick={() => window.print()}
                        className="flex-1 py-3 bg-slate-200 text-slate-800 font-bold rounded-lg hover:bg-slate-300 transition-colors flex items-center justify-center gap-2"
                     >
                        <Printer size={18} /> Reprint Invoice
                     </button>
                     {selectedSale.status !== 'REFUNDED' && (
                        <button 
                            onClick={() => setIsReturnMode(true)}
                            className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                        >
                            <RotateCcw size={18} /> Return Items
                        </button>
                     )}
                  </>
               )}
            </div>
          </div>
        </div>
      )}

      {/* REFUND INVOICE MODAL */}
      {showRefundInvoice && refundData && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 print:p-0 print:bg-white print:fixed print:inset-0 print:z-[10000]">
              <div className={`bg-white rounded-xl shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-[90vh] print:shadow-none print:max-h-none print:h-auto print:rounded-none ${isSmallReceipt ? 'w-[280px] print:w-[58mm] text-xs' : 'w-full max-w-sm print:w-full'}`}>
                 <div className="p-4 flex justify-end print:hidden">
                     <button onClick={() => setShowRefundInvoice(false)} className="bg-slate-100 p-2 rounded-full"><X size={20}/></button>
                 </div>
                 
                 <div className="p-6 pt-0 print:p-0 text-center">
                     {/* Print Header */}
                     {storeSettings?.logo && <img src={storeSettings.logo} alt="Logo" className="h-10 mx-auto mb-2 object-contain" />}
                     <h1 className="text-lg font-bold uppercase">{storeSettings?.name}</h1>
                     <p className="text-xs whitespace-pre-line">{storeSettings?.address}</p>
                     
                     <div className="border-b-2 border-dashed border-black mt-4 mb-2"></div>
                     <h2 className="text-xl font-bold uppercase my-2">REFUND RECEIPT</h2>
                     <div className="border-b-2 border-dashed border-black mb-4"></div>
                     
                     <div className="text-left text-xs font-mono mb-4">
                         <div>Ref Order: #{refundData.originalSaleId.slice(-6)}</div>
                         <div>Refund ID: #{Date.now().toString().slice(-6)}</div>
                         <div>Date: {new Date().toLocaleString()}</div>
                     </div>

                     <div className="border-b border-dashed border-black mb-2"></div>
                     
                     {/* Refund Items */}
                     <div className="space-y-2 text-left font-mono text-sm">
                         {refundData.items.map((item, idx) => (
                             <div key={idx} className="flex justify-between">
                                 <div>
                                     <div>{item.name}</div>
                                     <div className="text-xs">-{item.qty} x {CURRENCY}{item.price.toFixed(2)}</div>
                                 </div>
                                 <div className="font-bold">-{CURRENCY}{(item.price * item.qty).toFixed(2)}</div>
                             </div>
                         ))}
                     </div>

                     <div className="border-b border-dashed border-black mt-4 mb-2"></div>
                     
                     <div className="flex justify-between text-lg font-bold">
                         <span>TOTAL REFUND</span>
                         <span>-{CURRENCY}{refundData.total.toFixed(2)}</span>
                     </div>
                     
                     <div className="border-b border-dashed border-black mt-2 mb-4"></div>
                     
                     <div className="text-xs italic">
                         Returns processed to original payment method.
                     </div>

                     {/* Refund QR Code */}
                     {refundQr && (
                         <div className="flex flex-col items-center justify-center pt-2 mt-4">
                             <img src={refundQr} alt="Refund QR" className="w-24 h-24 mb-1" />
                             <p className="text-[10px] text-black font-mono">Refund Reference</p>
                         </div>
                     )}
                 </div>

                 <div className="p-4 border-t border-slate-100 bg-slate-50 print:hidden">
                     <button onClick={() => window.print()} className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2">
                         <Printer size={18} /> Print Refund Slip
                     </button>
                 </div>
              </div>
          </div>
      )}
    </div>
  );
};