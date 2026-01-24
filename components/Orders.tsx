import React, { useState } from 'react';
import { Sale, CartItem } from '../types';
import { CURRENCY } from '../constants';
import { Search, Eye, RotateCcw, AlertCircle, CheckCircle, ArrowRight, X, Printer } from 'lucide-react';

interface OrdersProps {
  sales: Sale[];
  onProcessReturn: (saleId: string, returns: { [itemId: string]: number }) => void;
}

export const Orders: React.FC<OrdersProps> = ({ sales, onProcessReturn }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  
  // Return Mode State
  const [isReturnMode, setIsReturnMode] = useState(false);
  const [returnDraft, setReturnDraft] = useState<{ [itemId: string]: number }>({});

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
        onProcessReturn(selectedSale.id, returnDraft);
        setIsReturnMode(false);
        setReturnDraft({});
        setSelectedSale(null); // Close modal
    }
  };

  const refundTotal = calculateRefundTotal();

  return (
    <div className="flex flex-col h-full bg-slate-50 p-6 overflow-hidden">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Orders & Returns</h2>
        <p className="text-slate-500 text-sm">View history, reprint receipts, and process refunds.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden">
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
        </div>

        {/* List */}
        <div className="flex-1 overflow-auto">
           <table className="w-full text-left text-sm">
             <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0 z-10">
               <tr>
                 <th className="p-4 border-b">Date</th>
                 <th className="p-4 border-b">Order ID</th>
                 <th className="p-4 border-b">Items</th>
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
                   <tr><td colSpan={6} className="p-8 text-center text-slate-400">No orders found.</td></tr>
               )}
             </tbody>
           </table>
        </div>
      </div>

      {/* ORDER DETAIL MODAL */}
      {selectedSale && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
               <div>
                  <h3 className="font-bold text-slate-800">Order #{selectedSale.id.slice(-6)}</h3>
                  <span className="text-xs text-slate-500">{new Date(selectedSale.timestamp).toLocaleString()}</span>
               </div>
               <button onClick={() => setSelectedSale(null)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                
                {/* Status Banner */}
                <div className={`p-3 rounded-lg flex items-center gap-2 mb-6 ${getStatusColor(selectedSale.status)}`}>
                    {selectedSale.status === 'REFUNDED' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
                    <span className="font-bold text-sm">Order Status: {selectedSale.status || 'COMPLETED'}</span>
                </div>

                {/* Items List */}
                <div className="space-y-4">
                  {selectedSale.items.map(item => {
                     const returnedCount = selectedSale.returnedItems?.[item.id] || 0;
                     const remainingQty = item.quantity - returnedCount;
                     const pendingReturnQty = returnDraft[item.id] || 0;
                     
                     return (
                        <div key={item.id} className="flex justify-between items-center border-b border-slate-50 pb-4 last:border-0">
                           <div className="flex-1">
                              <div className="font-bold text-slate-800">{item.name}</div>
                              <div className="text-xs text-slate-500 font-mono">
                                 {CURRENCY}{item.sellPrice.toFixed(2)} x {item.quantity}
                              </div>
                              {returnedCount > 0 && (
                                 <div className="text-xs text-red-500 font-bold mt-1">
                                    {returnedCount} Previously Returned
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
                <div className="mt-6 pt-4 border-t border-slate-200 space-y-2">
                    <div className="flex justify-between text-sm text-slate-500">
                        <span>Subtotal</span>
                        <span>{CURRENCY}{selectedSale.subTotal.toFixed(2)}</span>
                    </div>
                    {selectedSale.discount > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                            <span>Discount</span>
                            <span>-{CURRENCY}{selectedSale.discount.toFixed(2)}</span>
                        </div>
                    )}
                    {selectedSale.tax > 0 && (
                        <div className="flex justify-between text-sm text-slate-500">
                            <span>Tax</span>
                            <span>{CURRENCY}{selectedSale.tax.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-lg font-bold text-slate-900 pt-2">
                        <span>Total Paid</span>
                        <span>{CURRENCY}{selectedSale.total.toFixed(2)}</span>
                    </div>
                </div>

                {/* Refund Summary Panel */}
                {isReturnMode && (
                   <div className="mt-6 bg-red-50 p-4 rounded-xl border border-red-100 animate-fade-in">
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

            {/* Footer Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
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
                     <button className="flex-1 py-3 bg-slate-200 text-slate-800 font-bold rounded-lg hover:bg-slate-300 transition-colors flex items-center justify-center gap-2">
                        <Printer size={18} /> Reprint
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
    </div>
  );
};