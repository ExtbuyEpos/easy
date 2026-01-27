
import React, { useState, useEffect, useMemo } from 'react';
import { Product, StoreSettings, Language } from '../types';
import { CURRENCY } from '../constants';
import { Search, Printer, Trash2, Plus, Minus, ChevronLeft, QrCode, X, Layers, AlertCircle, Info, Maximize, LayoutGrid, Eye, Settings2, Check, Palette, Type, Smartphone } from 'lucide-react';
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
type LabelTheme = 'minimal' | 'modern' | 'classic' | 'highvis';

export const PrintBarcode: React.FC<PrintBarcodeProps> = ({ products, storeSettings, onGoBack, language, t }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [queue, setQueue] = useState<QueuedLabel[]>([]);
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
  const [labelSize, setLabelSize] = useState<LabelSize>('medium');
  const [labelTheme, setLabelTheme] = useState<LabelTheme>('modern');
  const [accentColor, setAccentColor] = useState('#000000');
  
  // Field customizers
  const [showPrice, setShowPrice] = useState(true);
  const [showSKU, setShowSKU] = useState(true);
  const [showCompany, setShowCompany] = useState(true);
  const [showBorder, setShowBorder] = useState(true);
  const [customNote, setCustomNote] = useState('Premium Quality');

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

  const [previewQr, setPreviewQr] = useState<string>('');

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

  useEffect(() => {
    QRCode.toDataURL('SAMPLE-SKU-123', { margin: 0, width: 256 }).then(setPreviewQr);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const labelsToPrint = queue.flatMap(item => 
    Array(item.quantity).fill(item.product)
  );

  const getLabelDimensions = (size: LabelSize) => {
    switch(size) {
      case 'small': return { w: '140px', h: '160px', scale: 0.7 };
      case 'large': return { w: '260px', h: '300px', scale: 1.2 };
      default: return { w: '200px', h: '240px', scale: 1 };
    }
  };

  const dims = getLabelDimensions(labelSize);

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
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mt-1">Professional Thermal Architect</p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4 w-full lg:w-auto">
              <button onClick={clearQueue} disabled={queue.length === 0} className="px-6 py-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-red-500 transition-all active:scale-95 disabled:opacity-20">
                {t('clearQueue')}
              </button>
              <button onClick={handlePrint} disabled={queue.length === 0} className="px-10 py-4 bg-slate-900 dark:bg-brand-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 italic">
                <Printer size={18} /> {t('generateLabels')}
              </button>
            </div>
          </div>

          <div className="relative group max-w-2xl mx-auto">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={20} />
            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder={t('searchProducts')} className="w-full pl-16 pr-6 py-5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[2rem] outline-none focus:border-brand-500 font-bold dark:text-white transition-all shadow-inner text-sm" />
            
            {searchTerm && filteredProducts.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-3 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden z-[100] animate-fade-in-up">
                {filteredProducts.map(p => (
                  <button key={p.id} onClick={() => { addToQueue(p); setSearchTerm(''); }} className="w-full p-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-all border-b border-slate-50 dark:border-slate-800 last:border-0 group">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center font-black text-slate-400 text-xs">{p.sku.slice(-4)}</div>
                        <div className="text-left"><p className="font-black text-slate-800 dark:text-white text-sm">{p.name}</p><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formatCurrency(p.sellPrice, language, CURRENCY)}</p></div>
                    </div>
                    <Plus size={20} className="text-slate-300 group-hover:text-brand-600 transition-colors" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6 md:p-12 custom-scrollbar">
          <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-12 gap-10">
            
            {/* Left: Toggles and Preview */}
            <div className="xl:col-span-5 space-y-8">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-8">
                <div className="flex items-center gap-3 border-b border-slate-50 dark:border-slate-800 pb-4">
                  <Settings2 size={20} className="text-brand-500" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Blueprint Config</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 block">Size & Layout</label>
                      <div className="flex bg-slate-50 dark:bg-slate-800 p-1 rounded-2xl border border-slate-100 dark:border-slate-700">
                        {(['small', 'medium', 'large'] as LabelSize[]).map((size) => (
                          <button key={size} onClick={() => setLabelSize(size)} className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${labelSize === size ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-md' : 'text-slate-400'}`}>
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 block">Visual Theme</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['minimal', 'modern', 'classic', 'highvis'] as LabelTheme[]).map((theme) => (
                          <button key={theme} onClick={() => setLabelTheme(theme)} className={`py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border-2 ${labelTheme === theme ? 'bg-brand-600 text-white border-brand-500' : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-slate-700'}`}>
                            {theme}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 block">Price Tag Accent</label>
                      <div className="flex gap-2">
                        {['#000000', '#ef4444', '#3b82f6', '#10b981', '#f59e0b'].map(color => (
                          <button key={color} onClick={() => setAccentColor(color)} className={`w-8 h-8 rounded-full border-4 transition-all ${accentColor === color ? 'border-brand-500 scale-110' : 'border-white dark:border-slate-700 shadow-sm'}`} style={{ backgroundColor: color }}></button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 block">Data Layers</label>
                    {[
                      { id: 'company', label: 'Company Brand', state: showCompany, setter: setShowCompany },
                      { id: 'sku', label: 'SKU Identifier', state: showSKU, setter: setShowSKU },
                      { id: 'price', label: 'Financial Price', state: showPrice, setter: setShowPrice },
                      { id: 'border', label: 'Label Border', state: showBorder, setter: setShowBorder }
                    ].map(field => (
                      <button key={field.id} onClick={() => field.setter(!field.state)} className={`w-full flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all ${field.state ? 'bg-brand-50/50 dark:bg-brand-900/10 border-brand-500 text-brand-600' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-400'}`}>
                        <span className="text-[10px] font-black uppercase tracking-widest">{field.label}</span>
                        <div className={`w-5 h-5 rounded-lg flex items-center justify-center border-2 transition-all ${field.state ? 'bg-brand-500 border-brand-500 text-white' : 'border-slate-300 dark:border-slate-700'}`}>
                          {field.state && <Check size={12} strokeWidth={4} />}
                        </div>
                      </button>
                    ))}
                    <div className="pt-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Custom Footnote</label>
                        <input type="text" value={customNote} onChange={e => setCustomNote(e.target.value)} className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold dark:text-white" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic Preview Box */}
              <div className="bg-slate-900 p-8 rounded-[3.5rem] shadow-2xl relative overflow-hidden flex flex-col items-center justify-center text-center border border-white/5 min-h-[440px]">
                <div className="absolute top-6 left-8 flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]"></div>
                   <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 italic tracking-[0.2em]">Blueprint_Live</span>
                </div>
                
                {/* Scaled Label Component */}
                <div 
                  className={`bg-white text-black flex flex-col items-center p-4 transition-all duration-500 shadow-[0_0_40px_rgba(255,255,255,0.1)] ${showBorder ? 'border border-slate-200' : ''}`}
                  style={{ 
                    width: dims.w, 
                    height: dims.h,
                    transform: `scale(${dims.scale})`,
                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                  }}
                >
                  {labelTheme === 'modern' ? (
                     <div className="w-full h-full flex flex-col justify-between">
                        {showCompany && <div className="text-[9px] font-black uppercase tracking-widest text-center border-b border-slate-100 pb-1 mb-1">{storeSettings.name}</div>}
                        <div className="text-[10px] font-black text-center leading-tight line-clamp-2 uppercase">Sample Product X1000</div>
                        <div className="flex-1 flex items-center justify-center p-2"><img src={previewQr} className="max-h-full max-w-full mix-blend-multiply" /></div>
                        <div className="flex flex-col items-center gap-1">
                            {showSKU && <div className="text-[7px] font-mono font-bold opacity-40">#SKU-SAMPLE-123</div>}
                            {showPrice && <div className="w-full py-1 text-center font-black text-xs text-white rounded-lg" style={{ backgroundColor: accentColor }}>$149.00</div>}
                        </div>
                     </div>
                  ) : labelTheme === 'highvis' ? (
                    <div className="w-full h-full flex flex-col">
                        <div className="bg-black text-white w-full py-1 text-[8px] font-black uppercase text-center mb-1">{storeSettings.name}</div>
                        <div className="flex-1 flex items-center justify-between gap-2">
                            <div className="flex-1 text-left">
                                <div className="text-[11px] font-black uppercase leading-tight line-clamp-3">Sample Product Name Logic 2.0</div>
                                {showSKU && <div className="text-[7px] font-mono mt-1 opacity-50">#SKU-001</div>}
                            </div>
                            <div className="w-16 h-16 shrink-0"><img src={previewQr} className="w-full h-full mix-blend-multiply" /></div>
                        </div>
                        {showPrice && <div className="text-xl font-black text-center mt-1 border-t-2 border-black pt-1" style={{ color: accentColor }}>$149.00</div>}
                        <div className="text-[6px] font-bold text-center uppercase mt-1 opacity-40 tracking-[0.2em]">{customNote}</div>
                    </div>
                  ) : labelTheme === 'minimal' ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                        <div className="w-24 h-24"><img src={previewQr} className="w-full h-full mix-blend-multiply" /></div>
                        <div className="text-center">
                            <div className="text-[10px] font-black uppercase truncate w-32">Sample Item</div>
                            {showPrice && <div className="text-sm font-black" style={{ color: accentColor }}>$149.00</div>}
                        </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col justify-between border-[0.5pt] border-black p-2">
                        <div className="text-center font-black text-[9px] uppercase">{storeSettings.name}</div>
                        <div className="border-y-[0.5pt] border-black py-1 my-1 text-center font-bold text-[8px] uppercase">PRODUCT LABEL</div>
                        <div className="flex-1 flex items-center justify-center p-1"><img src={previewQr} className="max-h-full mix-blend-multiply" /></div>
                        <div className="flex justify-between items-end border-t-[0.5pt] border-black pt-1">
                            <div className="text-[7px] font-mono">{showSKU ? 'SKU-001' : ''}</div>
                            {showPrice && <div className="text-xs font-black" style={{ color: accentColor }}>$149.00</div>}
                        </div>
                    </div>
                  )}
                </div>

                <div className="mt-10 space-y-2 opacity-50">
                  <p className="text-[10px] font-black text-brand-400 uppercase tracking-widest italic">Simulation Context: {labelTheme.toUpperCase()}</p>
                  <p className="text-[8px] text-slate-500 font-bold uppercase max-w-[200px] mx-auto opacity-60 italic">Preview represents physical thermal-transfer rendering accuracy.</p>
                </div>
              </div>
            </div>

            {/* Right: Actual Queue */}
            <div className="xl:col-span-7 space-y-6">
              <div className="flex items-center justify-between text-slate-400 px-2">
                 <div className="flex items-center gap-3">
                    <Layers size={20} className="text-brand-500" /><h3 className="text-[11px] font-black uppercase tracking-[0.3em]">{t('printQueue')} ({labelsToPrint.length} labels)</h3>
                 </div>
                 <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-40 italic">
                    <Smartphone size={14} /> Responsive List
                 </div>
              </div>

              {queue.length === 0 ? (
                <div className="py-32 bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center space-y-6 opacity-30">
                    <div className="w-40 h-40 bg-slate-50 dark:bg-slate-950 rounded-full flex items-center justify-center text-slate-300 shadow-inner"><QrCode size={80} strokeWidth={1}/></div>
                    <p className="font-black text-[10px] uppercase tracking-[0.5em] italic">Search and Select Items to Add to Queue</p>
                </div>
              ) : (
                <div className="space-y-4 animate-fade-in pb-20">
                    {queue.map(item => (
                      <div key={item.product.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-2xl transition-all flex flex-col md:flex-row items-center justify-between group gap-6">
                          <div className="flex items-center gap-6 flex-1 min-w-0">
                              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center overflow-hidden shrink-0 shadow-inner border border-slate-100 dark:border-slate-700">
                                 {qrCodes[item.product.sku] ? (
                                   <img src={qrCodes[item.product.sku]} className="w-full h-full object-contain p-2" />
                                 ) : <QrCode className="text-slate-200" />}
                              </div>
                              <div className="min-w-0">
                                  <h4 className="font-black text-slate-900 dark:text-white truncate uppercase italic text-base">{item.product.name}</h4>
                                  <div className="flex items-center gap-3 mt-1">
                                    <span className="text-[10px] font-black text-brand-600 uppercase tracking-widest">{formatCurrency(item.product.sellPrice, language, CURRENCY)}</span>
                                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                    <span className="text-[10px] font-mono text-slate-400 uppercase">#{item.product.sku}</span>
                                  </div>
                              </div>
                          </div>

                          <div className="flex items-center gap-6 shrink-0 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-3xl border border-slate-100 dark:border-slate-700">
                              <div className="flex items-center gap-4 px-2">
                                  <button onClick={() => updateQuantity(item.product.id, -1)} className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-red-500 active:scale-90 transition-all shadow-sm"><Minus size={16}/></button>
                                  <span className="font-black text-lg dark:text-white w-6 text-center">{item.quantity}</span>
                                  <button onClick={() => updateQuantity(item.product.id, 1)} className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-brand-600 active:scale-90 transition-all shadow-sm"><Plus size={16}/></button>
                              </div>
                              <button onClick={() => removeFromQueue(item.product.id)} className="w-12 h-12 flex items-center justify-center bg-white dark:bg-slate-700 text-slate-300 hover:text-red-500 rounded-2xl transition-all shadow-sm border border-slate-100 dark:border-slate-600"><Trash2 size={20}/></button>
                          </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Printing Only Layout */}
      <div className="hidden print:block bg-white p-0">
         <style>{`
           @media print {
             @page { margin: 0; size: auto; }
             body { margin: 0; padding: 0; background: white; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
             .print-grid {
               display: grid;
               grid-template-columns: ${labelSize === 'small' ? 'repeat(4, 1fr)' : labelSize === 'large' ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)'};
               gap: 2mm;
               padding: 5mm;
             }
             .barcode-label {
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
               ${showBorder ? 'border: 0.5pt solid #000;' : ''}
             }
             .label-inner { width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: space-between; }
             .label-company { font-size: 7pt; font-weight: 900; text-transform: uppercase; border-bottom: 0.5pt solid #000; padding-bottom: 1mm; margin-bottom: 1mm; }
             .label-product { font-size: 7pt; font-weight: 700; text-transform: uppercase; line-height: 1; margin-bottom: 1mm; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
             .label-qr { flex: 1; display: flex; align-items: center; justify-content: center; min-height: 0; }
             .label-qr img { max-height: 100%; max-width: 100%; object-fit: contain; }
             .label-footer { width: 100%; display: flex; justify-content: space-between; align-items: flex-end; margin-top: 1mm; border-top: 0.5pt solid #000; padding-top: 1mm; }
             .label-sku { font-family: monospace; font-size: 6pt; font-weight: 900; }
             .label-price { font-size: 9pt; font-weight: 900; background: ${accentColor}; color: white; padding: 0 1.5mm; border-radius: 0.5mm; }
           }
         `}</style>
         <div className="print-grid">
           {labelsToPrint.map((product, idx) => (
             <div key={`${product.id}-${idx}`} className="barcode-label">
                <div className="label-inner">
                    {showCompany && <div className="label-company">{storeSettings.name}</div>}
                    <div className="label-product">{product.name}</div>
                    <div className="label-qr">
                        {qrCodes[product.sku] && (
                            <img src={qrCodes[product.sku]} alt="QR" />
                        )}
                    </div>
                    <div className="label-footer">
                        <div className="label-sku">{showSKU ? product.sku : ''}</div>
                        {showPrice && <div className="label-price">{formatCurrency(product.sellPrice, language, CURRENCY)}</div>}
                    </div>
                </div>
             </div>
           ))}
         </div>
      </div>
    </div>
  );
};
