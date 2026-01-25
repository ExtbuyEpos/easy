import React, { useState, useEffect, useRef } from 'react';
import { Product, Language } from '../types';
import { Minus, Plus, Save, Search, ChevronLeft } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, onSnapshot } from 'firebase/firestore';
import { formatNumber } from '../utils/format';

interface StockCheckProps {
  products: Product[];
  onUpdateStock: (id: string, newStock: number) => void;
  onGoBack?: () => void;
  language: Language;
}

interface ScannedItem { product: Product; systemStock: number; physicalCount: number; }
interface StockHistoryItem { id: string; timestamp: number; sku: string; name: string; oldStock: number; newStock: number; variance: number; }

export const StockCheck: React.FC<StockCheckProps> = ({ products, onUpdateStock, onGoBack, language }) => {
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
    } else { alert("Not found"); setSkuInput(''); }
  };

  const handleCommitStock = async (item: ScannedItem) => {
      if (window.confirm(`Update stock?`)) {
          onUpdateStock(item.product.id, item.physicalCount);
          const rec = { timestamp: Date.now(), sku: item.product.sku, name: item.product.name, oldStock: item.systemStock, newStock: item.physicalCount, variance: item.physicalCount - item.systemStock };
          if (db) await addDoc(collection(db, 'stock_history'), rec);
          else {
            const h = [{ id: Date.now().toString(), ...rec }, ...history];
            setHistory(h);
            localStorage.setItem('easyPOS_stockHistory', JSON.stringify(h));
          }
          setSessionList(prev => prev.map(i => i.product.id === item.product.id ? { ...i, systemStock: item.physicalCount } : i));
      }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-colors">
      <div className="bg-white dark:bg-slate-900 p-6 shadow-sm border-b border-slate-100 dark:border-slate-800">
          <div className="flex justify-between items-center mb-8 gap-4">
            <div className="flex items-center gap-4">
                <button onClick={onGoBack} className="p-3 -ml-3 rounded-2xl bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 shadow-sm transition-all active:scale-90" title="Go Back">
                    <ChevronLeft size={28} className="rtl:rotate-180" />
                </button>
                <div>
                    <h2 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">Auditing</h2>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mt-1">Physical Inventory Jurd</p>
                </div>
            </div>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                <button onClick={() => setActiveTab('scan')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'scan' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-md' : 'text-slate-400'}`}>Scan</button>
                <button onClick={() => setActiveTab('history')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-md' : 'text-slate-400'}`}>History</button>
            </div>
          </div>
          {activeTab === 'scan' && (
             <form onSubmit={handleScan} className="relative w-full max-w-2xl mx-auto">
                <input ref={inputRef} type="text" value={skuInput} onChange={(e) => setSkuInput(e.target.value)} placeholder="SCAN BARCODE..." className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 text-slate-800 dark:text-white rounded-3xl p-5 pl-14 focus:border-brand-500 outline-none font-mono text-xl shadow-inner" autoFocus />
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
             </form>
          )}
      </div>
      <div className="flex-1 overflow-auto p-4 md:p-8 custom-scrollbar">
          {activeTab === 'scan' ? (
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-400 font-black uppercase text-[9px] tracking-widest">
                        <tr><th className="p-6">Product</th><th className="p-6 text-center">System</th><th className="p-6 text-center">Physical</th><th className="p-6 text-right">Action</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                        {sessionList.map((item) => (
                            <tr key={item.product.id}>
                                <td className="p-6"><div className="font-black text-slate-800 dark:text-slate-100">{item.product.name}</div></td>
                                <td className="p-6 text-center font-bold text-slate-400">{formatNumber(item.systemStock, language)}</td>
                                <td className="p-6">
                                    <div className="flex items-center justify-center gap-3">
                                        <button onClick={() => setSessionList(prev => prev.map(i => i.product.id === item.product.id ? {...i, physicalCount: Math.max(0, i.physicalCount - 1)} : i))} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl"><Minus size={14}/></button>
                                        <input type="number" value={item.physicalCount} onChange={(e) => setSessionList(prev => prev.map(i => i.product.id === item.product.id ? {...i, physicalCount: parseInt(e.target.value) || 0} : i))} className="w-12 text-center font-black dark:text-white bg-transparent" />
                                        <button onClick={() => setSessionList(prev => prev.map(i => i.product.id === item.product.id ? {...i, physicalCount: i.physicalCount + 1} : i))} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl"><Plus size={14}/></button>
                                    </div>
                                </td>
                                <td className="p-6 text-right"><button onClick={() => handleCommitStock(item)} className="p-4 bg-brand-600 text-white rounded-2xl active:scale-95 transition-all"><Save size={20}/></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          ) : (
             <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                 <table className="w-full text-left">
                     <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-400 font-black uppercase text-[9px] tracking-widest">
                         <tr><th className="p-6">Date</th><th className="p-6">Product</th><th className="p-6 text-right">Adjustment</th></tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                        {history.map(h => (
                           <tr key={h.id} className="text-sm">
                              <td className="p-6 text-slate-400">{new Date(h.timestamp).toLocaleString()}</td>
                              <td className="p-6 font-bold dark:text-white">{h.name}</td>
                              <td className={`p-6 text-right font-black ${h.variance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{h.variance > 0 ? '+' : ''}{h.variance}</td>
                           </tr>
                        ))}
                     </tbody>
                 </table>
             </div>
          )}
      </div>
    </div>
  );
};