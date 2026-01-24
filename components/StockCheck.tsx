import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { ScanLine, CheckCircle, AlertTriangle, Save, RefreshCw } from 'lucide-react';

interface StockCheckProps {
  products: Product[];
  onUpdateStock: (id: string, newStock: number) => void;
}

export const StockCheck: React.FC<StockCheckProps> = ({ products, onUpdateStock }) => {
  const [skuInput, setSkuInput] = useState('');
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [adjustedStock, setAdjustedStock] = useState<number>(0);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    const product = products.find(p => p.sku === skuInput);
    if (product) {
      setScannedProduct(product);
      setAdjustedStock(product.stock);
      setMessage(null);
    } else {
      setScannedProduct(null);
      setMessage({ type: 'error', text: 'Product not found. Try again.' });
    }
    setSkuInput('');
  };

  const handleSaveCorrection = () => {
    if (scannedProduct) {
      onUpdateStock(scannedProduct.id, adjustedStock);
      setMessage({ type: 'success', text: `Stock updated for ${scannedProduct.name}` });
      setScannedProduct(null);
    }
  };

  return (
    <div className="p-8 h-full bg-slate-50 flex flex-col items-center justify-center">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <div className="bg-brand-100 text-brand-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <ScanLine size={32} />
          </div>
          <h2 className="text-3xl font-bold text-slate-800">Stock Check & Correction</h2>
          <p className="text-slate-500 mt-2">Scan an item to verify availability and correct inventory counts.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="p-8 bg-slate-900">
            <form onSubmit={handleScan} className="relative">
              <input 
                type="text" 
                value={skuInput}
                onChange={(e) => setSkuInput(e.target.value)}
                placeholder="Click here and Scan Barcode..."
                className="w-full bg-slate-800 border-2 border-slate-700 text-white rounded-xl p-4 pl-12 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all font-mono text-lg"
                autoFocus
              />
              <ScanLine className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500" />
            </form>
          </div>

          <div className="p-8 min-h-[300px] flex flex-col items-center justify-center">
            {message && (
              <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {message.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                {message.text}
              </div>
            )}

            {!scannedProduct ? (
              <div className="text-center text-slate-400">
                <RefreshCw size={48} className="mx-auto mb-4 opacity-20" />
                <p>Waiting for scan...</p>
              </div>
            ) : (
              <div className="w-full animate-fade-in">
                <div className="flex justify-between items-start mb-8 pb-8 border-b border-slate-100">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800">{scannedProduct.name}</h3>
                    <p className="text-slate-500 font-mono mt-1">SKU: {scannedProduct.sku}</p>
                    <span className="inline-block mt-2 px-2 py-1 bg-slate-100 rounded text-xs text-slate-600">{scannedProduct.category}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-400">Current System Stock</div>
                    <div className={`text-4xl font-bold ${scannedProduct.stock < 10 ? 'text-red-500' : 'text-slate-800'}`}>
                      {scannedProduct.stock}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-xl">
                  <label className="block text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">Correction: Physical Count</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="number" 
                      value={adjustedStock}
                      onChange={(e) => setAdjustedStock(parseInt(e.target.value) || 0)}
                      className="flex-1 p-4 text-2xl font-bold text-center border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                    <button 
                      onClick={handleSaveCorrection}
                      className="bg-brand-600 hover:bg-brand-700 text-white px-8 py-4 rounded-xl font-bold shadow-md transition-all flex items-center gap-2"
                    >
                      <Save size={20} /> Update Stock
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
