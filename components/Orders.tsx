import React, { useState, useEffect } from 'react';
import { Sale, StoreSettings, Language } from '../types';
import { CURRENCY } from '../constants';
import { Search, Eye, RotateCcw, CheckCircle, X, Printer, QrCode, ChevronLeft } from 'lucide-react';
import QRCode from 'qrcode';
import { formatNumber, formatCurrency } from '../utils/format';

interface OrdersProps {
  sales: Sale[];
  onProcessReturn: (saleId: string, returns: { [itemId: string]: number }) => void;
  storeSettings?: StoreSettings;
  onGoBack?: () => void;
  language: Language;
}

export const Orders: React.FC<OrdersProps> = ({ sales, onProcessReturn, storeSettings, onGoBack, language }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isReturnMode, setIsReturnMode] = useState(false);
  const [returnDraft, setReturnDraft] = useState<{ [itemId: string]: number }>({});
  const [showRefundInvoice, setShowRefundInvoice] = useState(false);
  const [refundData, setRefundData] = useState<{ originalSaleId: string; items: {name: string, price: number, qty: number}[]; total: number; timestamp: number } | null>(null);
  const [refundQr, setRefundQr] = useState<string>('');

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

  useEffect(() => {
    if (showRefundInvoice && refundData) {
        QRCode.toDataURL(`REFUND:${refundData.originalSaleId}-${refundData.timestamp}`, { margin: 1, width: 120 }).then(setRefundQr);
    }
  }, [showRefundInvoice, refundData]);

  const handleOpenDetail = (sale: Sale) => {
    setSelectedSale(sale);
    setIsReturnMode(false);
    setReturnDraft({});
  };

  const handleToggleReturn = (itemId: string, maxQty: number) => {
    setReturnDraft(prev => {
      const current = prev[itemId] || 0;
      if (current >= maxQty) return prev;
      return { ...prev, [itemId]: current + 1 };
    });
  };

  const handleDecrementReturn = (itemId: string) => {
    setReturnDraft(prev => {
      const current = prev[itemId] || 0;
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
    return Object.entries(returnDraft).reduce((acc, [itemId, qty]) => {
      const item = selectedSale.items.find(i => i.id === itemId);
      return acc + (item ? (Number(item.sellPrice) * Number(qty)) : 0);
    }, 0);
  };

  const submitReturn = () => {
    if (!selectedSale) return;
    const refundAmount = calculateRefundTotal();
    if (refundAmount <= 0) return;
    
    if (window.confirm(`Confirm refund of ${formatCurrency(refundAmount, language, CURRENCY)}?`)) {
        const refundItems = Object.entries(returnDraft).map(([itemId, qty]) => {
            const item = selectedSale.items.find(i => i.id === itemId)!;
            return { name: item.name, price: item.sellPrice, qty };
        });
        const now = Date.now();
        setRefundData({ originalSaleId: selectedSale.id, items: refundItems, total: refundAmount, timestamp: now });
        onProcessReturn(selectedSale.id, returnDraft);
        setIsReturnMode(false);
        setReturnDraft({});
        setSelectedSale(null);
        setShowRefundInvoice(true);
    }
  };

  const refundTotal = calculateRefundTotal();
  const isSmallReceipt = storeSettings?.receiptSize === '58mm';

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 p-4 lg:p-8 overflow-hidden transition-colors">
      <div className="mb-8 print:hidden flex items-center gap-4">
        <button onClick={onGoBack} className="p-3 -ml-3 rounded-2xl bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 shadow-sm transition-all active:scale-90" title="Go Back">
            <ChevronLeft size={28} className="rtl:rotate-180" />
        </button>
        <div>
           <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">Operations</h2>
           <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mt-1">Order History & Refunds</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 flex-1 flex flex-col overflow-hidden print:hidden transition-all">
        <div className="p-4 md:p-6 border-b border-slate-50 dark:border-slate-800 flex flex-col md:flex-row gap-4">
           <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" placeholder="Search Order ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:border-brand-500 dark:text-white font-bold" />
           </div>
           <button className="flex items-center justify-center gap-3 bg-slate-900 dark:bg-brand-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 hover:bg-black transition-all"><QrCode size={18} /> Scan Receipt</button>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
           <table className="w-full text-left text-sm border-separate border-spacing-0">
             <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-400 font-black uppercase text-[9px] tracking-widest sticky top-0 z-10 backdrop-blur-md">
               <tr>
                 <th className="p-6">Date</th>
                 <th className="p-6">ID</th>
                 <th className="p-6 hidden lg:table-cell">Items</th>
                 <th className="p-6 text-center hidden md:table-cell">Method</th>
                 <th className="p-6 text-center">Status</th>
                 <th className="p-6 text-right">Total</th>
                 <th className="p-6 text-center">View</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
               {filteredSales.map(sale => (
                 <tr key={sale.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all group">
                   <td className="p-6">
                      <div className="font-black text-slate-800 dark:text-slate-100">{new Date(sale.timestamp).toLocaleDateString()}</div>
                      <div className="text-[10px] font-bold text-slate-400">{new Date(sale.timestamp).toLocaleTimeString()}</div>
                   </td>
                   <td className="p-6 font-mono text-xs text-slate-400">#{formatNumber(sale.id.slice(-6), language)}</td>
                   <td className="p-6 text-slate-600 dark:text-slate-400 max-w-xs truncate hidden lg:table-cell">
                      {sale.items.map(i => `${i.name}`).join(', ')}
                   </td>
                   <td className="p-6 text-center hidden md:table-cell">
                      <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-500">{sale.paymentMethod}</span>
                   </td>
                   <td className="p-6 text-center">
                      <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${getStatusColor(sale.status)}`}>
                        {sale.status || 'COMPLETED'}
                      </span>
                   </td>
                   <td className="p-6 text-right font-black text-slate-900 dark:text-white text-lg">{formatCurrency(sale.total, language, CURRENCY)}</td>
                   <td className="p-6 text-center">
                      <button onClick={() => handleOpenDetail(sale)} className="p-3 bg-brand-500/10 text-brand-600 rounded-xl hover:bg-brand-500 hover:text-white transition-all"><Eye size={18} /></button>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
        </div>
      </div>

      {showRefundInvoice && refundData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-3xl flex items-center justify-center z-[110] p-4 print:p-0">
          <div className="bg-white rounded-[3.5rem] w-full max-w-md relative animate-fade-in-up shadow-2xl print:shadow-none print:w-full overflow-hidden flex flex-col">
            <div className="p-8 pb-4 flex justify-between items-center no-print">
                 <div className="flex items-center gap-3 text-red-600">
                    <CheckCircle size={24} />
                    <span className="font-black text-sm uppercase tracking-widest">Refund Generated</span>
                 </div>
                 <button onClick={() => setShowRefundInvoice(false)} className="p-2 bg-slate-100 rounded-full text-slate-800"><X size={24}/></button>
            </div>
            
            <div className="p-8 flex-1 overflow-y-auto print:p-0">
                <div className="text-center mb-8">
                   <h1 className="text-2xl font-black uppercase tracking-tighter italic">REFUND INVOICE</h1>
                   <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-2">{storeSettings?.name}</p>
                   <p className="text-[9px] text-slate-400 uppercase tracking-widest">{storeSettings?.address}</p>
                </div>
                
                <div className="border-y-2 border-dashed border-slate-200 py-6 mb-8 space-y-3 font-mono text-sm">
                   <div className="flex justify-between text-[10px] text-slate-400 font-bold mb-2">
                       <span>Original ID: #{refundData.originalSaleId.slice(-6)}</span>
                       <span>Date: {new Date(refundData.timestamp).toLocaleDateString()}</span>
                   </div>
                   {refundData.items.map((item, idx) => (
                     <div key={idx} className="flex justify-between items-start">
                        <span className="flex-1 pr-4">{item.name} <span className="text-[10px] text-slate-400 block mt-0.5">x{formatNumber(item.qty, language)}</span></span>
                        <span className="font-bold text-red-600">-{formatCurrency(item.price * item.qty, language, CURRENCY)}</span>
                     </div>
                   ))}
                </div>

                <div className="space-y-4 mb-8">
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Refund Amount Paid</span>
                        <span className="text-4xl font-black tracking-tighter text-red-600">{formatCurrency(refundData.total, language, CURRENCY)}</span>
                    </div>
                </div>

                {refundQr && (
                    <div className="flex flex-col items-center justify-center mb-8 bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100">
                        <img src={refundQr} className="w-24 h-24 mix-blend-multiply" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-4">RFND-{refundData.timestamp}</span>
                    </div>
                )}
                
                <div className="text-center text-[9px] text-slate-400 font-black uppercase tracking-widest leading-relaxed">
                    This is an official refund document. Keep for your records.
                </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 no-print">
                <button onClick={() => window.print()} className="w-full bg-red-600 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest hover:bg-red-700 transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl text-xs">
                    <Printer size={20}/> Print Refund Invoice
                </button>
            </div>
          </div>
        </div>
      )}

      {selectedSale && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-4 print:p-0 print:bg-white print:fixed print:inset-0 print:z-[10000]">
          <div className={`bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh] print:shadow-none print:max-h-none print:h-auto print:rounded-none ${isSmallReceipt ? 'w-[280px] print:w-[58mm] text-xs' : 'w-full max-w-sm print:w-full'}`}>
            <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 print:hidden">
               <div>
                  <h3 className="font-black text-slate-800 dark:text-white uppercase italic tracking-tighter">Order #{formatNumber(selectedSale.id.slice(-6), language)}</h3>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(selectedSale.timestamp).toLocaleString()}</span>
               </div>
               <button onClick={() => setSelectedSale(null)} className="text-slate-400 hover:text-red-500 no-print transition-all"><X size={24}/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 print:p-0 print:overflow-visible">
                <div className="hidden print:block text-center mb-8">
                     <h1 className="text-2xl font-black uppercase italic">{storeSettings?.name}</h1>
                     <p className="text-[10px] whitespace-pre-line font-bold text-slate-500">{storeSettings?.address}</p>
                     <div className="border-b-2 border-dashed border-slate-200 mt-4 mb-4"></div>
                </div>

                <div className="space-y-6">
                  {selectedSale.items.map(item => {
                     const returnedCount = selectedSale.returnedItems?.[item.id] || 0;
                     const remainingQty = item.quantity - returnedCount;
                     const pendingReturnQty = returnDraft[item.id] || 0;
                     return (
                        <div key={item.id} className="flex justify-between items-start group">
                           <div className="flex-1">
                              <div className="font-black text-slate-800 dark:text-slate-100 text-sm">{item.name}</div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                 {formatCurrency(item.sellPrice, language, CURRENCY)} x {formatNumber(item.quantity, language)}
                              </div>
                              {returnedCount > 0 && <div className="text-[9px] font-black text-red-500 uppercase tracking-widest mt-1">[Returned: {formatNumber(returnedCount, language)}]</div>}
                           </div>
                           {isReturnMode ? (
                              <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-100 dark:border-slate-700">
                                 <button onClick={() => handleDecrementReturn(item.id)} disabled={pendingReturnQty === 0} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-700 rounded-lg shadow-sm text-slate-400 disabled:opacity-30"> - </button>
                                 <span className="font-black text-slate-900 dark:text-white w-4 text-center">{formatNumber(pendingReturnQty, language)}</span>
                                 <button onClick={() => handleToggleReturn(item.id, remainingQty)} disabled={remainingQty === 0 || pendingReturnQty >= remainingQty} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-700 rounded-lg shadow-sm text-slate-400 disabled:opacity-30"> + </button>
                              </div>
                           ) : (
                              <div className="text-right font-black text-slate-900 dark:text-white">{formatCurrency(item.sellPrice * item.quantity, language, CURRENCY)}</div>
                           )}
                        </div>
                     );
                  })}
                </div>

                <div className="mt-8 pt-8 border-t-2 border-dashed border-slate-100 dark:border-slate-800 space-y-3">
                    <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <span>Subtotal</span>
                        <span>{formatCurrency(selectedSale.subTotal, language, CURRENCY)}</span>
                    </div>
                    {selectedSale.discount > 0 && <div className="flex justify-between text-[10px] font-black text-emerald-500 uppercase tracking-widest"><span>Discount</span><span>-{formatCurrency(selectedSale.discount, language, CURRENCY)}</span></div>}
                    <div className="flex justify-between items-end pt-4 border-t border-slate-50 dark:border-slate-800">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Grand Total</span>
                        <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{formatCurrency(selectedSale.total, language, CURRENCY)}</span>
                    </div>
                </div>
            </div>
            
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex gap-3 print:hidden">
               {isReturnMode ? (
                  <>
                    <button onClick={() => setIsReturnMode(false)} className="flex-1 py-4 text-slate-500 font-black uppercase tracking-widest text-[10px]">Cancel</button>
                    <button onClick={submitReturn} disabled={refundTotal <= 0} className="flex-1 py-4 bg-red-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl active:scale-95 disabled:opacity-50 text-[10px]">Refund {formatCurrency(refundTotal, language, CURRENCY)}</button>
                  </>
               ) : (
                  <>
                     <button onClick={() => window.print()} className="flex-1 py-4 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 active:scale-95"><Printer size={18} /> Reprint</button>
                     {selectedSale.status !== 'REFUNDED' && (
                        <button onClick={() => setIsReturnMode(true)} className="flex-1 py-4 bg-slate-900 dark:bg-brand-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 active:scale-95 shadow-xl"><RotateCcw size={18} /> Return</button>
                     )}
                  </>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};