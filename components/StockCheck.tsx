import React, { useState, useEffect, useRef } from 'react';
import { Product } from '../types';
import { ScanLine, CheckCircle, AlertTriangle, Save, RefreshCw, History, Trash2, Plus, Minus, Search, ArrowRight } from 'lucide-react';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface StockCheckProps {
  products: Product[];
  onUpdateStock: (id: string, newStock: number) => void;
}

interface ScannedItem {
  product: Product;
  systemStock: number;
  physicalCount: number;
}

export const StockCheck: React.FC<StockCheckProps> = ({ products, onUpdateStock }) => {
  const [skuInput, setSkuInput] = useState('');
  // We store the session list here
  const [sessionList, setSessionList] = useState<ScannedItem[]>([]);
  const [lastScannedId, setLastScannedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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

  const handleCommitStock = (item: ScannedItem) => {
      if (window.confirm(`Update stock for "${item.product.name}" from ${item.systemStock} to ${item.physicalCount}?`)) {
          onUpdateStock(item.product.id, item.physicalCount);
          // Update the list to reflect the new system stock (so variance becomes 0)
          setSessionList(prev => prev.map(i => {
              if (i.product.id === item.product.id) {
                  return { ...i, systemStock: item.physicalCount };
              }
              return i;
          }));
      }
  };

  const handleClearSession = () => {
      if (window.confirm("Clear all scanned items?")) {
          setSessionList([]);
      }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Header & Input Section */}
      <div className="bg-white p-6 shadow-sm border-b border-slate-200 shrink-0 z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <ScanLine className="text-brand-600" /> Stock Check
                </h2>
                <p className="text-slate-500 text-sm">Scan items to build a count list. Items auto-increment on scan.</p>
            </div>
            <div className="flex gap-2">
                <button 
                  onClick={() => setSessionList([])} 
                  className="text-slate-400 hover:text-red-500 text-sm font-medium px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
                >
                    Clear List
                </button>
            </div>
          </div>

          <form onSubmit={handleScan} className="relative w-full max-w-3xl mx-auto">
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
      </div>

      {/* The List Section */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
          {sessionList.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <ScanLine size={64} className="mb-4 opacity-20" />
                  <p className="text-lg font-medium">Ready to scan</p>
                  <p className="text-sm">Scanned items will appear here line by line.</p>
              </div>
          ) : (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
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
      </div>
      
      {/* Session Summary Footer */}
      {sessionList.length > 0 && (
          <div className="bg-white border-t border-slate-200 p-4 flex flex-col md:flex-row justify-between items-center gap-4 text-sm shrink-0">
              <div className="text-slate-500">
                  Total Items Scanned: <span className="font-bold text-slate-900">{sessionList.reduce((acc, item) => acc + item.physicalCount, 0)}</span>
              </div>
              <div className="flex gap-2">
                  <button className="px-4 py-2 border border-slate-300 text-slate-600 font-bold rounded-lg hover:bg-slate-50">
                      Export CSV
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};