
import React, { useState, useEffect, useRef } from 'react';
import { Product, Language } from '../types';
import { Minus, Plus, Save, Search, ChevronLeft, CheckCircle, Trash2, AlertCircle, Download } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, onSnapshot, writeBatch, doc } from 'firebase/firestore';
import { formatNumber } from '../utils/format';

interface StockCheckProps {
  products: Product[];
  onUpdateStock: (id: string, newStock: number) => void;
  onBulkUpdateProducts?: (updatedProducts: Product[]) => void;
  onGoBack?: () => void;
  language: Language;
}

interface ScannedItem { product: Product; systemStock: number; physicalCount: number; }
interface StockHistoryItem { id: string; timestamp: number; sku: string; name: string; oldStock: number; newStock: number; variance: number; }

export const StockCheck: React.FC<StockCheckProps> = ({ products, onUpdateStock, onBulkUpdateProducts, onGoBack, language }) => {
  const [activeTab, setActiveTab] = useState<'scan' | 'history'>('scan');
  const [skuInput, setSkuInput] = useState('');
  const [sessionList, setSessionList] = useState<ScannedItem[]>([]);
  const [history, setHistory] = useState<StockHistoryItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (db) {
        return onSnapshot(collection(db, 'stock_history'), (snapshot) => {
            setHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StockHistoryItem)).sort((a,b) => b.timestamp - a.timestamp));
        });
    } else {
        const saved = localStorage.getItem('easyPOS_stockHistory');
        if(saved) setHistory(JSON.parse(saved));
    }
  }, []);

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!skuInput.trim()) return;
    const product = products.find(p => p.sku.toLowerCase() === skuInput.trim().toLowerCase());
    if (product) {
      setSessionList(prev => {
        const existing = prev.find(item => item.product.id === product.id);
        if (existing) return prev.map(item => item.product.id === product.id ? { ...item, physicalCount: item.physicalCount + 1 } : item);
        return [{ product, systemStock: product.stock, physicalCount: 1 }, ...prev];
      });
      setSkuInput('');
    } else { 
        alert("Product with this SKU not found in local catalog."); 
        setSkuInput(''); 
    }
  };

  const handleCommitStock = async (item: ScannedItem) => {
      if (window.confirm(`Update stock for ${item.product.name}?`)) {
          onUpdateStock(item.product.id, item.physicalCount);
          const rec = { 
            timestamp: Date.now(), 
            sku: item.product.sku, 
            name: item.product.name, 
            oldStock: item.systemStock, 
            newStock: item.physicalCount, 
            variance: item.physicalCount - item.systemStock 
          };
          if (db) await addDoc(collection(db, 'stock_history'), rec);
          else {
            const h = [{ id: Date.now().toString(), ...rec }, ...history];
            setHistory(h);
            localStorage.setItem('easyPOS_stockHistory', JSON.stringify(h));
          }
          setSessionList(prev => prev.filter(i => i.product.id !== item.product.id));
      }
  };

  const handleCommitAll = async () => {
    if (sessionList.length === 0) return;
    
    if (window.confirm(`Are you sure you want to commit physical counts for all ${sessionList.length} scanned items? This will update your system inventory levels immediately.`)) {
        const batch = db ? writeBatch(db) : null;
        const updatedProducts: Product[] = [];
        const historyRecords: any[] = [];
        
        for (const item of sessionList) {
            const variance = item.physicalCount - item.systemStock;
            const rec = { 
                timestamp: Date.now(), 
                sku: item.product.sku, 
                name: item.product.name, 
                oldStock: item.systemStock, 
                newStock: item.physicalCount, 
                variance 
            };
            
            if (batch) {
                batch.update(doc(db!, 'products', item.product.id), { stock: item.physicalCount });
                batch.set(doc(collection(db!, 'stock_history')), rec);
            } else {
                updatedProducts.push({ ...item.product, stock: item.physicalCount });
                historyRecords.push({ id: Date.now().toString() + Math.random(), ...rec });
            }
            
            // Still call individual updates if we don't have a bulk handler to ensure consistency
            if (!onBulkUpdateProducts) {
                onUpdateStock(item.product.id, item.physicalCount);
            }
        }

        if (batch) {
            await batch.commit();
        } else {
            if (onBulkUpdateProducts) {
                onBulkUpdateProducts(updatedProducts);
            }
            const newHistory = [...historyRecords, ...history];
            setHistory(newHistory);
            localStorage.setItem('easyPOS_stockHistory', JSON.stringify(newHistory));
        }

        setSessionList([]);
        alert("Bulk stock adjustment completed successfully.");
    }
  };

  const handleDownloadHistory = () => {
    if (history.length === 0) {
      alert("No history available to export.");
      return;
    }
    
    // CSV Construction
    const headers = ['Date', 'Time', 'SKU', 'Product Name', 'System Stock', 'Physical Count', 'Variance'];
    const rows = history.map(h => [
      new Date(h.timestamp).toLocaleDateString(),
      new Date(h.timestamp).toLocaleTimeString(),
      h.sku,
      `"${h.name.replace(/"/g, '""')}"`, // Handle quotes in CSV
      h.oldStock.toString(),
      h.newStock.toString(),
      h.variance.toString()
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `stock_audit_history_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const removeFromSession = (id: string) => {
    setSessionList(prev => prev.filter(i => i.product.id !== id));
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-colors">
      <div className="bg-white dark:bg-slate-900 p-6 shadow-sm border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 gap-6">
            <div className="flex items-center gap-4">
                <button onClick={onGoBack} className="p-3 -ml-3 rounded-2xl bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 shadow-sm transition-all active:scale-90" title="Go Back">
                    <ChevronLeft size={28} className="rtl:rotate-180" />
                </button>
                <div>
                    <h2 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">Auditing</h2>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mt-1">Physical Inventory Jurd</p>
                </div>
            </div>
            <div className="flex items-center gap-3">
                {activeTab === 'history' && history.length > 0 && (
                  <button 
                    onClick={handleDownloadHistory}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all active:scale-95 shadow-lg"
                  >
                    <Download size={16} /> Download CSV
                  </button>
                )}
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl shadow-inner">
                    <button onClick={() => setActiveTab('scan')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'scan' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-md' : 'text-slate-400'}`}>Current Scan</button>
                    <button onClick={() => setActiveTab('history')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-md' : 'text-slate-400'}`}>Audit History</button>
                </div>
            </div>
          </div>
          {activeTab === 'scan' && (
             <form onSubmit={handleScan} className="relative w-full max-w-2xl mx-auto group">
                <input ref={inputRef} type="text" value={skuInput} onChange={(e) => setSkuInput(e.target.value)} placeholder="SCAN BARCODE TO START..." className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 text-slate-800 dark:text-white rounded-3xl p-6 pl-16 focus:border-brand-500 outline-none font-mono text-2xl shadow-inner transition-all" autoFocus />
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={28} />
             </form>
          )}
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-8 custom-scrollbar">
          {activeTab === 'scan' ? (
            <div className="space-y-6">
                {sessionList.length > 0 && (
                    <div className="flex justify-between items-center bg-brand-600 p-6 rounded-[2rem] text-white shadow-xl animate-fade-in">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Bulk Audit Session</p>
                            <h3 className="text-xl font-black italic">{sessionList.length} Item(s) Ready for Commitment</h3>
                        </div>
                        <button onClick={handleCommitAll} className="px-8 py-4 bg-white text-brand-600 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-3 shadow-2xl active:scale-95 transition-all">
                            <CheckCircle size={20} /> Commit All Now
                        </button>
                    </div>
                )}

                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-400 font-black uppercase text-[9px] tracking-widest sticky top-0 z-10 backdrop-blur-md">
                            <tr>
                                <th className="p-8">Product Name</th>
                                <th className="p-8 text-center">System Stock</th>
                                <th className="p-8 text-center">Physical Count</th>
                                <th className="p-8 text-center">Variance</th>
                                <th className="p-8 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {sessionList.map((item) => {
                                const variance = item.physicalCount - item.systemStock;
                                return (
                                    <tr key={item.product.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all group">
                                        <td className="p-8">
                                            <div className="font-black text-slate-800 dark:text-slate-100 text-lg">{item.product.name}</div>
                                            <div className="text-[10px] font-mono font-black text-slate-400 mt-1 uppercase">SKU: {item.product.sku}</div>
                                        </td>
                                        <td className="p-8 text-center font-bold text-slate-400 text-lg">{formatNumber(item.systemStock, language)}</td>
                                        <td className="p-8">
                                            <div className="flex items-center justify-center gap-4 bg-slate-50 dark:bg-slate-800 p-2 rounded-2xl border border-slate-100 dark:border-slate-700">
                                                <button onClick={() => setSessionList(prev => prev.map(i => i.product.id === item.product.id ? {...i, physicalCount: Math.max(0, i.physicalCount - 1)} : i))} className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-700 text-slate-400 rounded-xl shadow-sm hover:text-red-500 transition-all"><Minus size={16}/></button>
                                                <input type="number" value={item.physicalCount} onChange={(e) => setSessionList(prev => prev.map(i => i.product.id === item.product.id ? {...i, physicalCount: parseInt(e.target.value) || 0} : i))} className="w-16 text-center font-black text-xl dark:text-white bg-transparent outline-none" />
                                                <button onClick={() => setSessionList(prev => prev.map(i => i.product.id === item.product.id ? {...i, physicalCount: i.physicalCount + 1} : i))} className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-700 text-slate-400 rounded-xl shadow-sm hover:text-brand-600 transition-all"><Plus size={16}/></button>
                                            </div>
                                        </td>
                                        <td className="p-8 text-center">
                                            <span className={`px-4 py-2 rounded-xl text-sm font-black ${variance === 0 ? 'text-slate-300' : variance > 0 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20' : 'bg-red-50 text-red-600 dark:bg-red-950/20'}`}>
                                                {variance > 0 ? '+' : ''}{variance}
                                            </span>
                                        </td>
                                        <td className="p-8 text-right">
                                            <div className="flex justify-end gap-3">
                                                <button onClick={() => handleCommitStock(item)} className="p-4 bg-slate-900 dark:bg-slate-700 text-white rounded-2xl hover:bg-emerald-600 transition-all shadow-lg active:scale-95" title="Save Individual"><Save size={20}/></button>
                                                <button onClick={() => removeFromSession(item.product.id)} className="p-4 bg-white dark:bg-slate-800 text-slate-300 hover:text-red-500 rounded-2xl transition-all border border-slate-100 dark:border-slate-700 shadow-sm"><Trash2 size={20}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {sessionList.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-32 text-center">
                                        <div className="flex flex-col items-center justify-center opacity-20 text-slate-400 gap-4">
                                            <Search size={80} strokeWidth={1} />
                                            <p className="font-black text-[10px] uppercase tracking-[0.5em] italic">Ready for Scanning</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
          ) : (
             <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-fade-in-up">
                 <table className="w-full text-left">
                     <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-400 font-black uppercase text-[9px] tracking-widest sticky top-0 z-10 backdrop-blur-md">
                         <tr><th className="p-8">Audit Date & Time</th><th className="p-8">Product Information</th><th className="p-8 text-center">System</th><th className="p-8 text-center">Physical</th><th className="p-8 text-right">Adjustment</th></tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                        {history.map(h => (
                           <tr key={h.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all">
                              <td className="p-8">
                                  <div className="font-black text-slate-900 dark:text-white">{new Date(h.timestamp).toLocaleDateString()}</div>
                                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{new Date(h.timestamp).toLocaleTimeString()}</div>
                              </td>
                              <td className="p-8 font-black dark:text-white">
                                  <div className="text-lg">{h.name}</div>
                                  <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mt-1">SKU: {h.sku}</div>
                              </td>
                              <td className="p-8 text-center font-bold text-slate-400">{h.oldStock}</td>
                              <td className="p-8 text-center font-black text-slate-900 dark:text-white">{h.newStock}</td>
                              <td className={`p-8 text-right font-black text-2xl ${h.variance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{h.variance > 0 ? '+' : ''}{h.variance}</td>
                           </tr>
                        ))}
                        {history.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-32 text-center">
                                    <div className="flex flex-col items-center justify-center opacity-20 text-slate-400 gap-4">
                                        <AlertCircle size={80} strokeWidth={1} />
                                        <p className="font-black text-[10px] uppercase tracking-[0.5em] italic">No Audit History Logged</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                     </tbody>
                 </table>
             </div>
          )}
      </div>
    </div>
  );
};
