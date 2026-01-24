import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { ScanLine, CheckCircle, AlertTriangle, Save, RefreshCw, History, FileText, FileSpreadsheet, Download } from 'lucide-react';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface StockCheckProps {
  products: Product[];
  onUpdateStock: (id: string, newStock: number) => void;
}

interface StockHistoryLog {
  id: string;
  timestamp: number;
  productName: string;
  sku: string;
  oldStock: number;
  newStock: number;
  variance: number;
}

export const StockCheck: React.FC<StockCheckProps> = ({ products, onUpdateStock }) => {
  const [skuInput, setSkuInput] = useState('');
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [adjustedStock, setAdjustedStock] = useState<number>(0);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [history, setHistory] = useState<StockHistoryLog[]>([]);

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
      const variance = adjustedStock - scannedProduct.stock;
      
      // Add to history
      const log: StockHistoryLog = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        productName: scannedProduct.name,
        sku: scannedProduct.sku,
        oldStock: scannedProduct.stock,
        newStock: adjustedStock,
        variance: variance
      };
      setHistory([log, ...history]);

      // Update actual stock
      onUpdateStock(scannedProduct.id, adjustedStock);
      
      setMessage({ type: 'success', text: `Stock updated for ${scannedProduct.name}` });
      setScannedProduct(null);
    }
  };

  const handleExportPDF = () => {
    if (history.length === 0) {
        alert("No history to export");
        return;
    }
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Stock Check History", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);

    const tableData = history.map(log => [
        new Date(log.timestamp).toLocaleTimeString(),
        log.sku,
        log.productName,
        log.oldStock,
        log.newStock,
        log.variance > 0 ? `+${log.variance}` : log.variance
    ]);

    autoTable(doc, {
        head: [['Time', 'SKU', 'Product', 'Old Stock', 'Physical Count', 'Variance']],
        body: tableData,
        startY: 30,
        theme: 'grid',
        headStyles: { fillColor: [40, 40, 40] }
    });

    doc.save("stock_check_report.pdf");
  };

  const handleExportExcel = () => {
    if (history.length === 0) {
        alert("No history to export");
        return;
    }
    const ws = XLSX.utils.json_to_sheet(history.map(log => ({
        Date: new Date(log.timestamp).toLocaleDateString(),
        Time: new Date(log.timestamp).toLocaleTimeString(),
        SKU: log.sku,
        Product: log.productName,
        SystemStock: log.oldStock,
        PhysicalCount: log.newStock,
        Variance: log.variance
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stock Corrections");
    XLSX.writeFile(wb, "stock_check_report.xlsx");
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto">
      <div className="p-8 pb-0 shrink-0">
          <div className="text-center mb-8">
            <div className="bg-brand-100 text-brand-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
              <ScanLine size={32} />
            </div>
            <h2 className="text-3xl font-bold text-slate-800">Stock Check & Correction</h2>
            <p className="text-slate-500 mt-2">Scan an item to verify availability and correct inventory counts.</p>
          </div>
      </div>

      <div className="px-4 md:px-8 pb-8 flex-1 flex flex-col items-center">
        {/* Scanner Card */}
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden mb-8 shrink-0">
          <div className="p-6 md:p-8 bg-slate-900">
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

          <div className="p-6 md:p-8 min-h-[250px] flex flex-col items-center justify-center bg-white">
            {message && (
              <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 w-full animate-fade-in ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
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

                <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                  <label className="block text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">Correction: Physical Count</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="number" 
                      value={adjustedStock}
                      onChange={(e) => setAdjustedStock(parseInt(e.target.value) || 0)}
                      className="flex-1 p-4 text-2xl font-bold text-center border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                      onFocus={(e) => e.target.select()}
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

        {/* History Section */}
        {history.length > 0 && (
          <div className="w-full max-w-4xl animate-fade-in pb-10">
             <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                    <History size={20} /> Session Corrections
                </h3>
                <div className="flex gap-2">
                    <button 
                      onClick={handleExportPDF}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-colors text-sm font-medium shadow-sm"
                    >
                        <FileText size={16} /> PDF
                    </button>
                    <button 
                      onClick={handleExportExcel}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-green-50 hover:text-green-600 hover:border-green-100 transition-colors text-sm font-medium shadow-sm"
                    >
                        <FileSpreadsheet size={16} /> Excel
                    </button>
                </div>
             </div>

             <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                            <tr>
                                <th className="p-4 w-24">Time</th>
                                <th className="p-4">Product</th>
                                <th className="p-4 text-right">System</th>
                                <th className="p-4 text-right">Physical</th>
                                <th className="p-4 text-right">Variance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {history.map(log => (
                                <tr key={log.id} className="hover:bg-slate-50">
                                    <td className="p-4 text-slate-500 font-mono text-xs">
                                        {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </td>
                                    <td className="p-4">
                                        <div className="font-bold text-slate-700">{log.productName}</div>
                                        <div className="text-xs text-slate-400 font-mono">{log.sku}</div>
                                    </td>
                                    <td className="p-4 text-right text-slate-500">{log.oldStock}</td>
                                    <td className="p-4 text-right font-bold text-slate-800">{log.newStock}</td>
                                    <td className="p-4 text-right">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                            log.variance === 0 
                                            ? 'bg-slate-100 text-slate-500' 
                                            : log.variance > 0 
                                                ? 'bg-green-100 text-green-600' 
                                                : 'bg-red-100 text-red-600'
                                        }`}>
                                            {log.variance > 0 ? '+' : ''}{log.variance}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};