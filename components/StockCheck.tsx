import React, { useState, useEffect, useRef } from 'react';
import { Product } from '../types';
import { ScanLine, CheckCircle, AlertTriangle, Save, RefreshCw, History as HistoryIcon, Trash2, Plus, Minus, Search, ArrowRight, Download, FileSpreadsheet, Calendar } from 'lucide-react';
import * as XLSX from "xlsx";
import { db } from '../firebase';
import { collection, addDoc, onSnapshot, deleteDoc, doc, writeBatch } from 'firebase/firestore';

interface StockCheckProps {
  products: Product[];
  onUpdateStock: (id: string, newStock: number) => void;
}

interface ScannedItem {
  product: Product;
  systemStock: number;
  physicalCount: number;
}

interface StockHistoryItem {
    id: string;
    timestamp: number;
    sku: string;
    name: string;
    oldStock: number;
    newStock: number;
    variance: number;
}

type Tab = 'scan' | 'history';

export const StockCheck: React.FC<StockCheckProps> = ({ products, onUpdateStock }) => {
  const [activeTab, setActiveTab] = useState<Tab>('scan');
  const [skuInput, setSkuInput] = useState('');
  
  // Session List (Current Scan)
  const [sessionList, setSessionList] = useState<ScannedItem[]>([]);
  const [lastScannedId, setLastScannedId] = useState<string | null>(null);
  
  // History List (Persisted via Firestore or Local)
  const [history, setHistory] = useState<StockHistoryItem[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);

  // Subscribe to Stock History
  useEffect(() => {
    if (db) {
        const unsubscribe = onSnapshot(collection(db, 'stock_history'), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StockHistoryItem));
            setHistory(data.sort((a,b) => b.timestamp - a.timestamp));
        });
        return () => unsubscribe();
    } else {
        // Local Fallback (Not persisted in this demo version effectively without LS key, but assuming session)
        // If critical, could add localStorage for history too.
        const saved = localStorage.getItem('easyPOS_stockHistory');
        if(saved) setHistory(JSON.parse(saved));
    }
  }, []);

  // Persist history locally if !db
  useEffect(() => {
      if (!db && history.length > 0) {
          localStorage.setItem('easyPOS_stockHistory', JSON.stringify(history));
      }
  }, [history]);

  // Focus input when switching to scan tab
  useEffect(() => {
    if (activeTab === 'scan') {
        inputRef.current?.focus();
    }
  }, [activeTab]);

  const playSuccessSound = () => {
    // Optional: Simple beep logic could go here
  };

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!skuInput.trim()) return;

    const term = skuInput.trim().toLowerCase();
    
    // Find product by SKU or Name
    const product = products.find(p => 
        p.sku.toLowerCase() === term || 
        p.name.toLowerCase() === term
    );

    if (product) {
      setSessionList(prev => {
        const existingIndex = prev.findIndex(item => item.product.id === product.id);
        
        if (existingIndex >= 0) {
            // Item exists in list, increment count
            const newList = [...prev];
            newList[existingIndex] = {
                ...newList[existingIndex],
                physicalCount: newList[existingIndex].physicalCount + 1
            };
            return newList;
        } else {
            // New item to list
            return [{
                product: product,
                systemStock: product.stock,
                physicalCount: 1 // Start with 1 on first scan
            }, ...prev];
        }
      });
      setLastScannedId(product.id);
      setSkuInput('');
      playSuccessSound();
    } else {
      alert("Product not found!");
      setSkuInput('');
    }
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
      setSessionList(prev => prev.map(item => {
          if (item.product.id === productId) {
              return { ...item, physicalCount: Math.max(0, item.physicalCount + delta) };
          }
          return item;
      }));
  };

  const handleManualCountChange = (productId: string, val: string) => {
      const num = parseInt(val);
      if (!isNaN(num)) {
        setSessionList(prev => prev.map(item => {
            if (item.product.id === productId) {
                return { ...item, physicalCount: num };
            }
            return item;
        }));
      }
  };

  const handleRemoveFromList = (productId: string) => {
      setSessionList(prev => prev.filter(item => item.product.id !== productId));
  };

  const handleCommitStock = async (item: ScannedItem) => {
      if (window.confirm(`Update stock for "${item.product.name}" from ${item.systemStock} to ${item.physicalCount}?`)) {
          // 1. Update Actual Product Stock
          onUpdateStock(item.product.id, item.physicalCount);

          // 2. Add to History Log
          const historyRecord = {
              id: Date.now().toString(), // fallback ID
              timestamp: Date.now(),
              sku: item.product.sku,
              name: item.product.name,
              oldStock: item.systemStock,
              newStock: item.physicalCount,
              variance: item.physicalCount - item.systemStock
          };
          
          if (db) {
              try {
                  const { id, ...data } = historyRecord;
                  await addDoc(collection(db, 'stock_history'), data);
              } catch(e) {
                  console.error("Failed to save stock history", e);
              }
          } else {
              setHistory(prev => [historyRecord, ...prev]);
          }

          // 3. Update the session list to reflect the new system stock (so variance becomes 0)
          setSessionList(prev => prev.map(i => {
              if (i.product.id === item.product.id) {
                  return { ...i, systemStock: item.physicalCount };
              }
              return i;
          }));
      }
  };

  const handleClearHistory = async () => {
    if (window.confirm("Are you sure you want to delete the entire history log? This cannot be undone.")) {
        if (db) {
            const batch = writeBatch(db);
            history.forEach(h => {
                batch.delete(doc(db, 'stock_history', h.id));
            });
            await batch.commit();
        } else {
            setHistory([]);
            localStorage.removeItem('easyPOS_stockHistory');
        }
    }
  };

  const handleExportSessionCSV = () => {
     if (sessionList.length === 0) return;
     
     const data = sessionList.map(item => ({
       SKU: item.product.sku,
       Name: item.product.name,
       SystemStock: item.systemStock,
       PhysicalCount: item.physicalCount,
       Variance: item.physicalCount - item.systemStock
     }));
     
     const ws = XLSX.utils.json_to_sheet(data);
     const wb = XLSX.utils.book_new();
     XLSX.utils.book_append_sheet(wb, ws, "Stock Check Session");
     XLSX.writeFile(wb, "stock_check_session.csv");
  };

  const handleExportHistoryCSV = () => {
    if (history.length === 0) return;

    const data = history.map(item => ({
        Date: new Date(item.timestamp).toLocaleDateString(),
        Time: new Date(item.timestamp).toLocaleTimeString(),
        SKU: item.sku,
        'Item Name': item.name,
        'System Stock': item.oldStock,
        'Physical Count': item.newStock,
        Variance: item.variance
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stock History");
    XLSX.writeFile(wb, `stock_history_log_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      
      {/* Header Section */}
      <div className="bg-white p-6 shadow-sm border-b border-slate-200 shrink-0 z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <ScanLine className="text-brand-600" /> Stock Check
                </h2>
                <p className="text-slate-500 text-sm">Perform physical inventory counts and track adjustments.</p>
            </div>
            
            {/* View Switcher */}
            <div className="bg-slate-100 p-1 rounded-lg flex gap-1">
                <button 
                   onClick={() => setActiveTab('scan')}
                   className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'scan' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <ScanLine size={16} /> Scanner
                </button>
                <button 
                   onClick={() => setActiveTab('history')}
                   className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'history' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <HistoryIcon size={16} /> History Log
                </button>
            </div>
          </div>

          {activeTab === 'scan' && (
             <form onSubmit={handleScan} className="relative w-full max-w-3xl mx-auto animate-fade-in">
                <input 
                    ref={inputRef}
                    type="text" 
                    value={skuInput}
                    onChange={(e) => setSkuInput(e.target.value)}
                    placeholder="Scan Barcode or Type SKU + Enter..."
                    className="w-full bg-slate-100 border-2 border-slate-200 text-slate-800 rounded-xl p-4 pl-12 focus:outline-none focus:border-brand-500 focus:bg-white transition-all font-mono text-lg shadow-inner"
                    autoFocus
                />
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <button type="submit" className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-slate-900 text-white p-2 rounded-lg hover:bg-slate-800">
                    <ArrowRight size={20} />
                </button>
             </form>
          )}

          {activeTab === 'history' && (
              <div className="flex justify-between items-center animate-fade-in bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="text-sm text-slate-500">
                      <strong>{history.length}</strong> adjustment records found.
                  </div>
                  <div className="flex gap-2">
                      <button 
                        onClick={handleClearHistory}
                        disabled={history.length === 0}
                        className="text-slate-400 hover:text-red-500 px-3 py-2 text-sm font-bold disabled:opacity-50"
                      >
                          Clear Log
                      </button>
                      <button 
                        onClick={handleExportHistoryCSV}
                        disabled={history.length === 0}
                        className="flex items-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                      >
                          <Download size={16} /> Download History
                      </button>
                  </div>
              </div>
          )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
          
          {/* SCANNER TAB CONTENT */}
          {activeTab === 'scan' && (
            <>
                {sessionList.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 animate-fade-in">
                        <ScanLine size={64} className="mb-4 opacity-20" />
                        <p className="text-lg font-medium">Ready to scan</p>
                        <p className="text-sm">Scanned items will appear here line by line.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="p-4">Product Details</th>
                                    <th className="p-4 text-center">System Stock</th>
                                    <th className="p-4 text-center">Scanned Count</th>
                                    <th className="p-4 text-center">Variance</th>
                                    <th className="p-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {sessionList.map((item) => {
                                    const variance = item.physicalCount - item.systemStock;
                                    const isRecent = item.product.id === lastScannedId;
                                    
                                    return (
                                        <tr key={item.product.id} className={`transition-colors ${isRecent ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}>
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    {item.product.image && (
                                                        <img src={item.product.image} alt="" className="w-10 h-10 rounded-md object-cover border border-slate-200" />
                                                    )}
                                                    <div>
                                                        <div className="font-bold text-slate-800">{item.product.name}</div>
                                                        <div className="text-xs text-slate-400 font-mono">{item.product.sku}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className="text-slate-500 font-mono text-lg">{item.systemStock}</span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button onClick={() => handleUpdateQuantity(item.product.id, -1)} className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600"><Minus size={14} /></button>
                                                    <input 
                                                        type="number" 
                                                        value={item.physicalCount}
                                                        onChange={(e) => handleManualCountChange(item.product.id, e.target.value)}
                                                        className="w-16 text-center font-bold text-lg border border-slate-200 rounded py-1 focus:ring-2 focus:ring-brand-500 outline-none"
                                                    />
                                                    <button onClick={() => handleUpdateQuantity(item.product.id, 1)} className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600"><Plus size={14} /></button>
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`px-3 py-1 rounded-full font-bold text-sm ${
                                                    variance === 0 
                                                    ? 'bg-slate-100 text-slate-500' 
                                                    : variance > 0 
                                                        ? 'bg-green-100 text-green-700' 
                                                        : 'bg-red-100 text-red-700'
                                                }`}>
                                                    {variance > 0 ? '+' : ''}{variance}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {variance !== 0 && (
                                                        <button 
                                                            onClick={() => handleCommitStock(item)}
                                                            className="flex items-center gap-1 bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-colors"
                                                        >
                                                            <Save size={14} /> Update
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={() => handleRemoveFromList(item.product.id)}
                                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </>
          )}

          {/* HISTORY TAB CONTENT */}
          {activeTab === 'history' && (
             <>
                {history.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 animate-fade-in">
                        <HistoryIcon size={64} className="mb-4 opacity-20" />
                        <p className="text-lg font-medium">No history found</p>
                        <p className="text-sm">Adjustments made in the scanner will appear here.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="p-4">Date/Time</th>
                                    <th className="p-4">Product</th>
                                    <th className="p-4 text-right">Old Stock</th>
                                    <th className="p-4 text-right">New Stock</th>
                                    <th className="p-4 text-center">Variance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {history.map((record) => (
                                    <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 text-slate-500">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14} />
                                                <span className="font-bold text-slate-700">{new Date(record.timestamp).toLocaleDateString()}</span>
                                            </div>
                                            <div className="text-xs pl-6">{new Date(record.timestamp).toLocaleTimeString()}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-bold text-slate-800">{record.name}</div>
                                            <div className="text-xs text-slate-400 font-mono">{record.sku}</div>
                                        </td>
                                        <td className="p-4 text-right text-slate-500">{record.oldStock}</td>
                                        <td className="p-4 text-right font-bold text-slate-800">{record.newStock}</td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                record.variance > 0 
                                                ? 'bg-green-100 text-green-700' 
                                                : record.variance < 0 
                                                    ? 'bg-red-100 text-red-700' 
                                                    : 'bg-slate-100 text-slate-500'
                                            }`}>
                                                {record.variance > 0 ? '+' : ''}{record.variance}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
             </>
          )}

      </div>
      
      {/* Session Summary Footer (Only on Scan Tab) */}
      {activeTab === 'scan' && sessionList.length > 0 && (
          <div className="bg-white border-t border-slate-200 p-4 flex flex-col md:flex-row justify-between items-center gap-4 text-sm shrink-0">
              <div className="text-slate-500">
                  Total Items Scanned: <span className="font-bold text-slate-900">{sessionList.reduce((acc, item) => acc + item.physicalCount, 0)}</span>
              </div>
              <div className="flex gap-2">
                  <button 
                    onClick={() => setSessionList([])} 
                    className="text-red-500 hover:text-red-700 px-3 py-2 font-bold transition-colors"
                  >
                      Clear Scanner
                  </button>
                  <button 
                    onClick={handleExportSessionCSV}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
                  >
                      <Download size={16} /> Export Session CSV
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};