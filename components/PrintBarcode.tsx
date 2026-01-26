
import React, { useState, useEffect, useMemo } from 'react';
import { Product, StoreSettings, Language } from '../types';
import { CURRENCY } from '../constants';
import { Search, Printer, Trash2, Plus, Minus, ChevronLeft, QrCode, X, Layers, AlertCircle, Info, Maximize, LayoutGrid } from 'lucide-react';
import QRCode from 'qrcode';
import { formatNumber, formatCurrency } from '../utils/format';

interface PrintBarcodeProps {
  products: Product[];
  storeSettings: StoreSettings;
  onGoBack: () => void;
  language: Language;
  t: (key: string) => string;
}

interface QueuedLabel {
  product: Product;
  quantity: number;
}

type LabelSize = 'small' | 'medium' | 'large';

export const PrintBarcode: React.FC<PrintBarcodeProps> = ({ products, storeSettings, onGoBack, language, t }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [queue, setQueue] = useState<QueuedLabel[]>([]);
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
  const [labelSize, setLabelSize] = useState<LabelSize>('medium');

  const filteredProducts = useMemo(() => 
    products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 10)
  , [products, searchTerm]);

  const addToQueue = (product: Product) => {
    setQueue(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setQueue(prev => prev.map(item => 
      item.product.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
    ));
  };

  const removeFromQueue = (id: string) => {
    setQueue(prev => prev.filter(item => item.product.id !== id));
  };

  const clearQueue = () => {
    if (confirm(t('clearQueue') + '?')) setQueue([]);
  };

  useEffect(() => {
    const generateCodes = async () => {
      const codes: Record<string, string> = {};
      for (const item of queue) {
        if (!qrCodes[item.product.sku]) {
          try {
            const url = await QRCode.toDataURL(item.product.sku, { 
              margin: 0, 
              width: 256,
              color: { dark: '#000000', light: '#ffffff' }
            });
            codes[item.product.sku] = url;
          } catch (e) {
            console.error(e);
          }
        } else {
          codes[item.product.sku] = qrCodes[item.product.sku];
        }
      }
      setQrCodes(codes);
    };
    generateCodes();
  }, [queue]);

  const handlePrint = () => {
    window.print();
  };

  const labelsToPrint = queue.flatMap(item => 
    Array(item.quantity).fill(item.product)
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-all overflow-hidden">
      {/* UI Elements - Hidden on Print */}
      <div className="flex flex-col h-full no-print overflow-hidden">
        <div className="p-6 md:p-8 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
            <div className="flex items-center gap-4">
              <button onClick={onGoBack} className="p-3 -ml-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-all active:scale-90">
                <ChevronLeft size={28} className="rtl:rotate-180" />
              </button>
              <div>
                <h2 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">{t('printBarcodeTitle')}</h2>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mt-1">Full Frame Label Architect</p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4 w-full lg:w-auto">
              {/* Size Selector */}
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
                {(['small', 'medium', 'large'] as LabelSize[]).map((size) => (
                  <button 
                    key={size}
                    onClick={() => setLabelSize(size)}
                    className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${labelSize === size ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-md' : 'text-slate-400'}`}
                  >
                    {size}
                  </button>
                ))}
              </div>

              <button 
                onClick={clearQueue} 
                disabled={queue.length === 0}
                className="px-6 py-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-red-500 transition-all active:scale-95 disabled:opacity-20"
              >
                {t('clearQueue')}
              </button>
              
              <button 
                onClick={handlePrint} 
                disabled={queue.length === 0}
                className="px-10 py-4 bg-slate-900 dark:bg-brand-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 italic"
              >
                <Printer size={18} /> {t('generateLabels')}
              </button>
            </div>
          </div>

          <div className="relative group max-w-2xl mx-auto">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={20} />
            <input 
              type="text" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={t('searchProducts')} 
              className="w-full pl-16 pr-6 py-5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[2rem] outline-none focus:border-brand-500 font-bold dark:text-white transition-all shadow-inner" 
            />
            
            {searchTerm && filteredProducts.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-3 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden z-[100] animate-fade-in-up">
                {filteredProducts.map(p => (
                  <button 
                    key={p.id} 
                    onClick={() => { addToQueue(p); setSearchTerm(''); }}
                    className="w-full p-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-all border-b border-slate-50 dark:border-slate-800 last:border-0 group"
                  >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center font-black text-slate-400 text-xs">{p.sku.slice(-4)}</div>
                        <div className="text-left">
                            <p className="font-black text-slate-800 dark:text-white text-sm">{p.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formatCurrency(p.sellPrice, language, CURRENCY)}</p>
                        </div>
                    </div>
                    <Plus size={20} className="text-slate-300 group-hover:text-brand-600 transition-colors" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6 md:p-12 custom-scrollbar">
          <div className="max-w-5xl mx-auto space-y-8">
            <div className="flex items-center justify-between text-slate-400">
               <div className="flex items-center gap-3">
                  <Layers size={20} /><h3 className="text-[11px] font-black uppercase tracking-[0.3em]">{t('printQueue')} ({labelsToPrint.length} labels)</h3>
               </div>
               <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                  <LayoutGrid size={14} /> Viewport Visualization
               </div>
            </div>

            {queue.length === 0 ? (
              <div className="py-24 flex flex-col items-center justify-center text-center space-y-6 opacity-30">
                  <div className="w-40 h-40 bg-slate-100 dark:bg-slate-900 rounded-[4rem] flex items-center justify-center text-slate-400 shadow-inner"><QrCode size={80} strokeWidth={1}/></div>
                  <p className="font-black text-[10px] uppercase tracking-[0.5em] italic">Queue Empty. Search to deploy.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                  {queue.map(item => (
                    <div key={item.product.id} className="bg-white dark:bg-slate-900 p-6 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-2xl transition-all flex flex-col group relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700"></div>
                        
                        <div className="flex items-center gap-5 mb-6 relative">
                            <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 shadow-lg border border-slate-100 dark:border-slate-700">
                               {qrCodes[item.product.sku] ? (
                                 <img src={qrCodes[item.product.sku]} className="w-full h-full object-contain" />
                               ) : <QrCode className="text-slate-200" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-black text-slate-900 dark:text-white truncate uppercase italic text-sm">{item.product.name}</h4>
                                <p className="text-[10px] font-black text-brand-600 uppercase tracking-[0.2em] mt-1">{formatCurrency(item.product.sellPrice, language, CURRENCY)}</p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between relative mt-auto pt-4 border-t border-slate-50 dark:border-slate-800">
                            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 p-2 rounded-2xl border border-slate-100 dark:border-slate-700">
                                <button onClick={() => updateQuantity(item.product.id, -1)} className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-red-500 active:scale-90 transition-all shadow-sm"><Minus size={16}/></button>
                                <span className="font-black text-sm dark:text-white w-6 text-center">{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.product.id, 1)} className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-brand-600 active:scale-90 transition-all shadow-sm"><Plus size={16}/></button>
                            </div>
                            <button onClick={() => removeFromQueue(item.product.id)} className="w-12 h-12 flex items-center justify-center bg-red-50 text-red-300 hover:bg-red-500 hover:text-white rounded-2xl transition-all"><Trash2 size={20}/></button>
                        </div>
                    </div>
                  ))}
              </div>
            )}
            
            <div className="bg-slate-900 text-white p-8 rounded-[3.5rem] shadow-2xl relative overflow-hidden flex flex-col md:flex-row gap-8 items-center border border-white/5">
                <div className="absolute top-0 left-0 w-64 h-64 bg-brand-500/10 rounded-full blur-[80px] -translate-x-1/2 -translate-y-1/2"></div>
                <div className="w-20 h-20 bg-white/10 rounded-[2.5rem] flex items-center justify-center shrink-0"><Info className="text-brand-400" size={40} /></div>
                <div className="flex-1 text-center md:text-left">
                   <h5 className="text-xl font-black uppercase italic tracking-tighter mb-2">Printing Protocol</h5>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                     The <span className="text-brand-400">"Full Frame"</span> layout is optimized for thermal printers and high-resolution label sheets. 
                     Ensure your system print dialogue has "Margins" set to <span className="text-white">None</span> and "Scale" set to <span className="text-white">100%</span>.
                   </p>
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* Printing Only Layout - Professional Full Frame Look */}
      <div className="hidden print:block bg-white p-0">
         <style>{`
           @media print {
             @page { margin: 0; size: auto; }
             body { margin: 0; padding: 0; background: white; }
             .print-grid {
               display: grid;
               grid-template-columns: ${labelSize === 'small' ? 'repeat(4, 1fr)' : labelSize === 'large' ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)'};
               gap: 2mm;
               padding: 5mm;
             }
             .barcode-label {
               border: 1px solid #000;
               padding: 3mm;
               display: flex;
               flex-direction: column;
               align-items: center;
               justify-content: space-between;
               text-align: center;
               page-break-inside: avoid;
               height: ${labelSize === 'small' ? '30mm' : labelSize === 'large' ? '50mm' : '40mm'};
               box-sizing: border-box;
               position: relative;
               background: white;
             }
             .label-company {
               font-size: 8pt;
               font-weight: 900;
               text-transform: uppercase;
               letter-spacing: 0.05em;
               border-bottom: 0.5pt solid #000;
               width: 100%;
               padding-bottom: 1mm;
               margin-bottom: 1mm;
               overflow: hidden;
               white-space: nowrap;
               text-overflow: ellipsis;
             }
             .label-product {
               font-size: 7pt;
               font-weight: 700;
               text-transform: uppercase;
               line-height: 1;
               margin-bottom: 1mm;
               display: -webkit-box;
               -webkit-line-clamp: 2;
               -webkit-box-orient: vertical;
               overflow: hidden;
               height: 16pt;
             }
             .label-qr {
               flex: 1;
               display: flex;
               align-items: center;
               justify-content: center;
               max-height: 50%;
               width: 100%;
             }
             .label-qr img {
               height: 100%;
               width: auto;
               object-fit: contain;
             }
             .label-footer {
               width: 100%;
               display: flex;
               justify-content: space-between;
               align-items: flex-end;
               margin-top: 1mm;
               border-top: 0.5pt solid #000;
               padding-top: 1mm;
             }
             .label-sku {
               font-family: monospace;
               font-size: 6pt;
               font-weight: 900;
             }
             .label-price {
               font-size: 10pt;
               font-weight: 900;
               background: #000;
               color: #fff;
               padding: 0 1.5mm;
               border-radius: 1mm;
             }
           }
         `}</style>
         <div className="print-grid">
           {labelsToPrint.map((product, idx) => (
             <div key={`${product.id}-${idx}`} className="barcode-label">
                <div className="label-company">{storeSettings.name}</div>
                <div className="label-product">{product.name}</div>
                <div className="label-qr">
                    {qrCodes[product.sku] && (
                        <img src={qrCodes[product.sku]} alt="QR" />
                    )}
                </div>
                <div className="label-footer">
                    <div className="label-sku">{product.sku}</div>
                    <div className="label-price">{formatCurrency(product.sellPrice, language, CURRENCY)}</div>
                </div>
             </div>
           ))}
         </div>
      </div>
    </div>
  );
};
