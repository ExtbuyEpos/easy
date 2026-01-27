
import React, { useState, useRef, useEffect } from 'react';
import { Product, User, Language, StoreSettings, ProductVariant } from '../types';
import { Plus, Search, Trash2, Edit2, Save, X, Image as ImageIcon, RefreshCw, Upload, Package, AlertCircle, ChevronLeft, TrendingUp, DollarSign, List, Grid, Check, ArrowRightLeft, Sparkles, Loader2, Heart, Type, Palette, Ruler, Layers, Settings2, CheckCircle2 } from 'lucide-react';
import { CURRENCY } from '../constants';
import { formatNumber, formatCurrency } from '../utils/format';
import { generateImageWithCloudflare } from '../services/cloudflareAiService';
import { generateImageWithHackClub } from '../services/hackClubAiService';

interface InventoryProps {
  products: Product[];
  categories?: string[];
  onAddProduct: (p: Product) => void;
  onUpdateProduct: (p: Product) => void;
  onBulkUpdateProduct: (products: Product[]) => void;
  onDeleteProduct: (id: string) => void;
  onAddCategory?: (category: string) => void;
  onUpdateCategory?: (oldCategory: string, newCategory: string) => void;
  onDeleteCategory?: (category: string) => void;
  initialTab?: 'products' | 'categories';
  onGoBack?: () => void;
  t?: (key: string) => string;
  currentUser?: User;
  language: Language;
  storeSettings?: StoreSettings;
}

const COMMON_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL', 'Free', '28', '30', '32', '34', '36', '38', '40', '42'];
const COMMON_COLORS = [
    { name: 'Black', hex: '#000000' },
    { name: 'White', hex: '#ffffff' },
    { name: 'Red', hex: '#ef4444' },
    { name: 'Blue', hex: '#3b82f6' },
    { name: 'Green', hex: '#22c55e' },
    { name: 'Yellow', hex: '#eab308' },
    { name: 'Gray', hex: '#64748b' },
    { name: 'Pink', hex: '#ec4899' },
    { name: 'Navy', hex: '#1e3a8a' },
    { name: 'Orange', hex: '#f97316' },
    { name: 'Purple', hex: '#a855f7' },
    { name: 'Brown', hex: '#78350f' },
    { name: 'Beige', hex: '#f5f5dc' },
    { name: 'Maroon', hex: '#800000' },
    { name: 'Teal', hex: '#14b8a6' },
    { name: 'Lime', hex: '#84cc16' }
];

export const Inventory: React.FC<InventoryProps> = ({ 
  products, categories = [], onAddProduct, onUpdateProduct, onDeleteProduct,
  onAddCategory, onUpdateCategory, onDeleteCategory, initialTab = 'products', onGoBack, t = (k) => k,
  currentUser, language, storeSettings
}) => {
  const [activeTab, setActiveTab] = useState<'products' | 'categories'>(initialTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isGeneratingAiImage, setIsGeneratingAiImage] = useState(false);
  const [aiEngine, setAiEngine] = useState<'CLOUDFLARE' | 'HACKCLUB'>('CLOUDFLARE');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Variant Matrix state
  const [useVariants, setUseVariants] = useState(false);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [matrix, setMatrix] = useState<ProductVariant[]>([]);

  // Custom additions
  const [customColors, setCustomColors] = useState<{name: string, hex: string}[]>([]);
  const [customSizes, setCustomSizes] = useState<string[]>([]);
  const [isAddingCustomColor, setIsAddingCustomColor] = useState(false);
  const [isAddingCustomSize, setIsAddingCustomSize] = useState(false);
  const [newColorInput, setNewColorInput] = useState({ name: '', hex: '#6366f1' });
  const [newSizeInput, setNewSizeInput] = useState('');

  const [formData, setFormData] = useState<Partial<Product>>({
    name: '', sku: '', costPrice: 0, sellPrice: 0, stock: 0, category: 'General', image: '', size: '', color: ''
  });

  // Re-generate matrix when colors or sizes change
  useEffect(() => {
    if (useVariants) {
        const newMatrix: ProductVariant[] = [];
        selectedColors.forEach(color => {
            selectedSizes.forEach(size => {
                const existing = matrix.find(m => m.color === color && m.size === size);
                newMatrix.push({ color, size, stock: existing ? existing.stock : 0 });
            });
        });
        setMatrix(newMatrix);
    }
  }, [selectedColors, selectedSizes, useVariants]);

  // Sync total stock from matrix
  useEffect(() => {
    if (useVariants) {
        const total = matrix.reduce((acc, m) => acc + (Number(m.stock) || 0), 0);
        setFormData(prev => ({ ...prev, stock: total }));
    }
  }, [matrix, useVariants]);

  const canAddProduct = currentUser?.role === 'ADMIN';
  const canDeleteProduct = currentUser?.role === 'ADMIN';
  const canEditProduct = ['ADMIN', 'MANAGER', 'STAFF'].includes(currentUser?.role || '');

  const totalInvCost = products.reduce((acc, p) => acc + (p.costPrice * p.stock), 0);
  const totalInvValue = products.reduce((acc, p) => acc + (p.sellPrice * p.stock), 0);

  const suggestionCategories = categories.length > 0 ? categories : Array.from(new Set(products.map(p => p.category))).sort();

  const filteredProducts = products.filter(p => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch = p.name.toLowerCase().includes(term) || p.sku.includes(term);
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({ ...product, image: product.image || '', size: product.size || '', color: product.color || '' });
      setUseVariants(!!product.hasVariants);
      if (product.hasVariants && product.variants) {
          setMatrix(product.variants);
          const pColors = Array.from(new Set(product.variants.map(v => v.color)));
          const pSizes = Array.from(new Set(product.variants.map(v => v.size)));
          setSelectedColors(pColors);
          setSelectedSizes(pSizes);
          
          // Add any non-common variants to custom lists
          const pCustomColors = pColors.filter(pc => !COMMON_COLORS.some(cc => cc.name === pc)).map(c => ({ name: c, hex: '#cccccc' }));
          const pCustomSizes = pSizes.filter(ps => !COMMON_SIZES.includes(ps));
          setCustomColors(pCustomColors);
          setCustomSizes(pCustomSizes);
      } else {
          setMatrix([]);
          setSelectedColors([]);
          setSelectedSizes([]);
          setCustomColors([]);
          setCustomSizes([]);
      }
    } else {
      setEditingProduct(null);
      setFormData({ name: '', sku: '', costPrice: 0, sellPrice: 0, stock: 0, category: suggestionCategories[0] || 'General', image: '', size: '', color: '' });
      setUseVariants(false);
      setMatrix([]);
      setSelectedColors([]);
      setSelectedSizes([]);
      setCustomColors([]);
      setCustomSizes([]);
    }
    setIsAddingCustomColor(false);
    setIsAddingCustomSize(false);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.name || isNaN(Number(formData.sellPrice))) { 
      alert("Product Name and Valid Sale Price are required"); 
      return; 
    }
    
    const productData = {
      ...formData,
      id: editingProduct ? editingProduct.id : Date.now().toString(),
      sku: formData.sku || `SKU-${Date.now()}`,
      costPrice: Number(formData.costPrice || 0),
      sellPrice: Number(formData.sellPrice),
      stock: Number(formData.stock || 0),
      hasVariants: useVariants,
      variants: useVariants ? matrix : undefined,
    } as Product;

    if (editingProduct) onUpdateProduct(productData);
    else onAddProduct(productData);
    setIsModalOpen(false);
  };

  const toggleColor = (name: string) => {
    setSelectedColors(prev => prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]);
  };

  const toggleSize = (name: string) => {
    setSelectedSizes(prev => prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]);
  };

  const addCustomColor = () => {
    if (!newColorInput.name.trim()) return;
    const exists = [...COMMON_COLORS, ...customColors].some(c => c.name.toLowerCase() === newColorInput.name.toLowerCase());
    if (exists) {
        toggleColor(newColorInput.name);
    } else {
        setCustomColors(prev => [...prev, newColorInput]);
        setSelectedColors(prev => [...prev, newColorInput.name]);
    }
    setNewColorInput({ name: '', hex: '#6366f1' });
    setIsAddingCustomColor(false);
  };

  const addCustomSize = () => {
    if (!newSizeInput.trim()) return;
    const exists = [...COMMON_SIZES, ...customSizes].some(s => s.toLowerCase() === newSizeInput.toLowerCase());
    if (exists) {
        toggleSize(newSizeInput);
    } else {
        setCustomSizes(prev => [...prev, newSizeInput]);
        setSelectedSizes(prev => [...prev, newSizeInput]);
    }
    setNewSizeInput('');
    setIsAddingCustomSize(false);
  };

  const updateMatrixStock = (color: string, size: string, value: string) => {
    const qty = parseInt(value) || 0;
    setMatrix(prev => prev.map(m => (m.color === color && m.size === size) ? { ...m, stock: qty } : m));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData({ ...formData, image: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const allColors = [...COMMON_COLORS, ...customColors];
  const allSizes = [...COMMON_SIZES, ...customSizes];

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 p-4 lg:p-8 overflow-hidden transition-colors">
      <div className="flex flex-col gap-6 mb-8 shrink-0">
         <div className="flex justify-between items-center">
             <div className="flex items-center gap-4">
                <button onClick={onGoBack} className="p-3 -ml-3 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-all active:scale-90" title="Go Back">
                    <ChevronLeft size={28} className="rtl:rotate-180" />
                </button>
                <div>
                    <h2 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">{activeTab === 'products' ? t('inventory') : t('categoryList')}</h2>
                    <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.3em] opacity-60 mt-1">Management & Audit Control</p>
                </div>
            </div>
            <div className="flex gap-3">
              <div className="hidden sm:flex bg-slate-200 dark:bg-slate-800 p-1 rounded-2xl">
                <button onClick={() => setActiveTab('products')} className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'products' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-md' : 'text-slate-50'}`}>Items</button>
                <button onClick={() => setActiveTab('categories')} className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'categories' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-md' : 'text-slate-50'}`}>Categories</button>
              </div>
              {canAddProduct && (
                <button onClick={() => handleOpenModal()} className="bg-brand-600 hover:bg-brand-500 text-white px-4 md:px-8 py-3 md:py-4 rounded-2xl flex items-center gap-2 shadow-xl shadow-brand-500/20 transition-all active:scale-95 font-black text-[10px] uppercase tracking-widest italic">
                    <Plus size={18} strokeWidth={3} /> <span className="hidden sm:inline">{t('addProduct')}</span><span className="sm:hidden">Add</span>
                </button>
              )}
            </div>
         </div>

         {activeTab === 'products' && (
           <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <div className="group bg-white dark:bg-slate-900 p-4 md:p-5 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-4 transition-all hover:shadow-2xl">
                  <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-500 transition-all"><Package size={22}/></div>
                  <div>
                      <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{t('stock')}</div>
                      <div className="text-lg font-black text-slate-900 dark:text-white leading-none">{formatNumber(products.reduce((a,b)=>a+b.stock,0), language)}</div>
                  </div>
              </div>
              <div className="group bg-white dark:bg-slate-900 p-4 md:p-5 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-4 transition-all hover:shadow-2xl">
                  <div className="bg-emerald-50 dark:bg-emerald-900/30 p-3 rounded-2xl text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all"><DollarSign size={22}/></div>
                  <div>
                      <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Asset Value</div>
                      <div className="text-lg font-black text-slate-900 dark:text-white leading-none">{formatCurrency(totalInvValue, language, CURRENCY)}</div>
                  </div>
              </div>
              <div className="hidden lg:flex group bg-white dark:bg-slate-900 p-5 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 items-center gap-4 transition-all hover:shadow-2xl">
                  <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-2xl text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all"><TrendingUp size={22}/></div>
                  <div>
                      <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Estimated ROI</div>
                      <div className="text-lg font-black text-slate-900 dark:text-white leading-none">{formatCurrency(totalInvValue - totalInvCost, language, CURRENCY)}</div>
                  </div>
              </div>
              <div className="group bg-white dark:bg-slate-900 p-4 md:p-5 rounded-[2rem] shadow-sm border border-red-100 dark:border-red-900/20 flex items-center gap-4 transition-all hover:shadow-2xl">
                  <div className="bg-red-50 dark:bg-red-950/30 p-3 rounded-2xl text-red-500 group-hover:bg-red-500 group-hover:text-white transition-all"><AlertCircle size={22}/></div>
                  <div>
                      <div className="text-[8px] font-black text-red-400 uppercase tracking-widest mb-0.5">Low Stock</div>
                      <div className="text-lg font-black text-red-900 dark:text-red-100 leading-none">{formatNumber(products.filter(p => p.stock < 10).length, language)}</div>
                  </div>
              </div>
           </div>
         )}
         
         <div className="flex flex-col md:flex-row gap-3">
             <div className="relative flex-1 group">
                 <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={20} />
                 <input type="text" placeholder={t('search')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-14 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.8rem] outline-none shadow-sm font-bold text-sm focus:ring-4 focus:ring-brand-500/10 transition-all dark:text-white" />
             </div>
             {activeTab === 'products' && (
               <div className="flex gap-2">
                  <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="flex-1 md:flex-none px-6 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.8rem] outline-none shadow-sm font-black text-[10px] uppercase tracking-widest text-slate-600 dark:text-slate-300 focus:ring-4 focus:ring-brand-500/10 appearance-none cursor-pointer pr-12 relative bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM5NGEzYjgiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJtNiA5IDYgNiA2LTYiLz48L3N2Zz4=')] bg-[length:18px] bg-[right_1rem_center] bg-no-repeat">
                      <option value="All">{t('all')}</option>
                      {suggestionCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
               </div>
             )}
         </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 flex-1 flex flex-col overflow-hidden relative transition-all">
          {activeTab === 'products' ? (
            <div className="flex-1 overflow-auto custom-scrollbar animate-fade-in">
               <table className="w-full text-left text-sm border-separate border-spacing-0">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-black uppercase text-[9px] tracking-widest sticky top-0 z-10 backdrop-blur-xl">
                     <tr>
                        <th className="p-6 md:p-8">{t('productName')}</th>
                        <th className="p-8 text-right hidden md:table-cell">{t('cost')}</th>
                        <th className="p-6 md:p-8 text-right">{t('price')}</th>
                        <th className="p-8 text-center hidden lg:table-cell">Inventory Type</th>
                        <th className="p-6 md:p-8 text-center">{t('stock')}</th>
                        <th className="p-6 md:p-8 text-right">{t('action')}</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                     {filteredProducts.map(p => (
                          <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 group transition-all">
                            <td className="p-6 md:p-8">
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 md:w-20 md:h-20 rounded-[1.8rem] bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-50 dark:border-slate-700 shrink-0 shadow-sm">
                                        {p.image ? <img src={p.image} className="w-full h-full object-cover" alt={p.name} /> : <ImageIcon className="text-slate-300" size={24} />}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-black text-slate-900 dark:text-white tracking-tighter text-base md:text-lg truncate">{p.name}</div>
                                        <div className="text-[10px] font-black font-mono text-slate-400 uppercase tracking-widest mt-1 truncate">{p.sku}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="p-8 text-right font-bold text-slate-400 dark:text-slate-500 hidden md:table-cell">{formatCurrency(p.costPrice, language, CURRENCY)}</td>
                            <td className="p-6 md:p-8 text-right font-black text-brand-600 dark:text-brand-400 text-lg md:text-xl">{formatCurrency(p.sellPrice, language, CURRENCY)}</td>
                            <td className="p-8 text-center hidden lg:table-cell">
                                <div className="flex flex-wrap justify-center gap-2">
                                  {p.hasVariants ? (
                                    <span className="px-3 py-1 bg-brand-50 dark:bg-brand-900/30 rounded-lg text-[9px] font-black uppercase text-brand-600 flex items-center gap-1.5"><Layers size={10}/> Matrix Stock ({p.variants?.length})</span>
                                  ) : (
                                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[9px] font-black uppercase text-slate-400">Single SKU</span>
                                  )}
                                </div>
                            </td>
                            <td className="p-6 md:p-8 text-center">
                                <span className={`px-5 py-2 rounded-2xl text-xs font-black tracking-tight border-2 ${p.stock < 10 ? 'bg-red-50 border-red-100 text-red-600' : 'bg-slate-50 border-slate-100 text-slate-600 dark:bg-slate-800 dark:border-slate-700'}`}>{formatNumber(p.stock, language)}</span>
                            </td>
                            <td className="p-6 md:p-8 text-right">
                                <div className="flex justify-end gap-3">
                                    {canEditProduct && <button onClick={() => handleOpenModal(p)} className="p-3 text-slate-400 hover:text-brand-600 transition-all"><Edit2 size={18}/></button>}
                                    {canDeleteProduct && <button onClick={() => onDeleteProduct(p.id)} className="p-3 text-slate-400 hover:text-red-500 transition-all"><Trash2 size={18}/></button>}
                                </div>
                            </td>
                          </tr>
                     ))}
                  </tbody>
               </table>
            </div>
          ) : (
            <div className="flex-1 overflow-auto p-8 animate-fade-in custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {suggestionCategories.map(cat => {
                        const catProducts = products.filter(p => p.category === cat);
                        const stockCount = catProducts.reduce((a,b) => a + b.stock, 0);
                        return (
                            <div key={cat} className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-2xl transition-all group">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="w-14 h-14 bg-brand-50 dark:bg-brand-900/20 rounded-2xl flex items-center justify-center text-brand-600 group-hover:scale-110 transition-transform"><List size={28}/></div>
                                    {onDeleteCategory && cat !== 'General' && (
                                        <button onClick={() => onDeleteCategory(cat)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                                    )}
                                </div>
                                <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter mb-2">{cat}</h4>
                                <div className="space-y-4">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        <span>Inventory Depth</span>
                                        <span className="text-slate-600 dark:text-slate-200">{catProducts.length} SKU(s)</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        <span>Stock Units</span>
                                        <span className="text-emerald-500">{stockCount} Units</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
          )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl flex items-end md:items-center justify-center z-[100] p-0 md:p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-6xl rounded-t-[4rem] md:rounded-[4rem] shadow-2xl overflow-hidden animate-fade-in-up flex flex-col border border-slate-100 dark:border-slate-800 max-h-[98vh] relative">
             <div className="p-8 md:p-10 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                 <div>
                    <h3 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">{editingProduct ? t('editProduct') : t('addProduct')}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-2">Professional Merchandise Entry</p>
                 </div>
                 <div className="flex items-center gap-4">
                    <button onClick={() => setUseVariants(!useVariants)} className={`px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center gap-3 border-2 ${useVariants ? 'bg-brand-600 text-white border-brand-500 shadow-xl' : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-slate-700'}`}>
                        <Layers size={16}/> {useVariants ? 'Variant Mode Active' : 'Enable Variant Matrix'}
                    </button>
                    <button onClick={() => setIsModalOpen(false)} className="bg-white dark:bg-slate-800 p-4 rounded-3xl text-slate-400 hover:text-red-500 transition-all shadow-xl active:scale-90"><X size={24}/></button>
                 </div>
             </div>
             
             <div className="flex-1 overflow-y-auto p-8 md:p-10 space-y-10 custom-scrollbar">
                 <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                     
                     {/* Left Core Data Column */}
                     <div className="xl:col-span-4 space-y-8">
                        <div className="space-y-3">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('productName')}</label>
                            <input type="text" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full p-5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-3xl outline-none focus:border-brand-500 dark:text-white font-bold text-xl shadow-inner" placeholder="E.g. Urban Cotton Tee" />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('cost')}</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-300">{CURRENCY}</span>
                                    <input type="number" step="0.01" value={formData.costPrice || ''} onChange={e => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })} className="w-full p-5 pl-10 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-3xl dark:text-white font-black text-xl shadow-inner" placeholder="0.00" />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <label className="text-[11px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-widest ml-1">{t('price')}</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-brand-300">{CURRENCY}</span>
                                    <input type="number" step="0.01" value={formData.sellPrice || ''} onChange={e => setFormData({ ...formData, sellPrice: parseFloat(e.target.value) || 0 })} className="w-full p-5 pl-10 bg-slate-50 dark:bg-slate-800 border-2 border-brand-100 dark:border-brand-900 rounded-3xl dark:text-white font-black text-xl text-brand-600 shadow-inner" placeholder="0.00" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('image')}</label>
                            <div className="aspect-square bg-slate-50 dark:bg-slate-800 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden relative group shadow-inner">
                                {formData.image ? <img src={formData.image} className="w-full h-full object-contain p-6" alt="Preview" /> : <ImageIcon className="opacity-20" size={64} />}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 backdrop-blur-sm">
                                    <button onClick={() => fileInputRef.current?.click()} className="p-4 bg-white rounded-2xl text-slate-900 shadow-xl hover:scale-110 transition-transform"><Upload size={24}/></button>
                                    {storeSettings?.cloudflareAiUrl && <button onClick={() => generateImageWithCloudflare(storeSettings.cloudflareAiUrl!, formData.name || 'product')} className="p-4 bg-brand-600 rounded-2xl text-white shadow-xl hover:scale-110 transition-transform"><Sparkles size={24}/></button>}
                                </div>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('stock')}</label>
                            <input type="number" readOnly={useVariants} value={formData.stock || 0} onChange={e => !useVariants && setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })} className={`w-full p-6 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-3xl dark:text-white font-black text-3xl shadow-inner text-center ${useVariants ? 'opacity-50 grayscale' : ''}`} />
                            {useVariants && <p className="text-[9px] font-black text-center text-brand-500 uppercase tracking-widest">Stock is locked to variant sum</p>}
                        </div>
                     </div>

                     {/* Right Variants Column */}
                     <div className="xl:col-span-8 space-y-10">
                        {!useVariants ? (
                            <div className="h-full bg-slate-50 dark:bg-slate-800/40 rounded-[3.5rem] border-2 border-dashed border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center p-12 text-center opacity-40">
                                <Settings2 size={80} strokeWidth={1} className="mb-6"/>
                                <h4 className="text-xl font-black uppercase italic text-slate-400">Single Entry Mode</h4>
                                <p className="text-xs font-medium max-w-xs mt-2">Standard product with fixed stock. Switch to Variant Matrix to manage complex inventory with multiple colors and sizes.</p>
                            </div>
                        ) : (
                            <div className="space-y-10 animate-fade-in">
                                {/* Step 1: Color Selection */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center text-white text-[10px] font-black">1</div>
                                            <label className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2"><Palette size={14}/> Define Available Colours</label>
                                        </div>
                                        <button onClick={() => setIsAddingCustomColor(true)} className="flex items-center gap-2 text-[10px] font-black text-brand-600 uppercase tracking-widest hover:underline italic"><Plus size={14}/> Add More Colour</button>
                                    </div>

                                    {isAddingCustomColor && (
                                        <div className="p-6 bg-brand-50 dark:bg-brand-900/10 rounded-[2rem] border border-brand-100 dark:border-brand-900/30 flex flex-col md:flex-row gap-4 animate-fade-in-down">
                                            <div className="flex-1 space-y-2">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Colour Name</label>
                                                <input type="text" value={newColorInput.name} onChange={e => setNewColorInput({...newColorInput, name: e.target.value})} className="w-full p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:border-brand-500 font-bold text-sm" placeholder="E.g. Emerald Gold" />
                                            </div>
                                            <div className="w-full md:w-32 space-y-2">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Hex Code</label>
                                                <input type="color" value={newColorInput.hex} onChange={e => setNewColorInput({...newColorInput, hex: e.target.value})} className="w-full h-11 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-1 cursor-pointer" />
                                            </div>
                                            <div className="flex items-end gap-2">
                                                <button onClick={addCustomColor} className="p-3.5 bg-brand-600 text-white rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all"><Check size={18}/></button>
                                                <button onClick={() => setIsAddingCustomColor(false)} className="p-3.5 bg-slate-200 text-slate-500 rounded-xl hover:bg-slate-300 transition-all"><X size={18}/></button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex flex-wrap gap-3 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-inner max-h-48 overflow-y-auto custom-scrollbar">
                                        {allColors.map(c => (
                                            <button 
                                                key={c.name} 
                                                onClick={() => toggleColor(c.name)}
                                                className={`flex items-center gap-3 px-4 py-2 rounded-2xl border-2 transition-all active:scale-95 ${selectedColors.includes(c.name) ? 'bg-white dark:bg-slate-900 border-brand-500 shadow-md' : 'bg-transparent border-transparent opacity-60'}`}
                                            >
                                                <div className="w-5 h-5 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: c.hex }}></div>
                                                <span className="text-[10px] font-black uppercase tracking-widest dark:text-white">{c.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Step 2: Size Selection */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center text-white text-[10px] font-black">2</div>
                                            <label className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2"><Ruler size={14}/> Define Available Sizes</label>
                                        </div>
                                        <button onClick={() => setIsAddingCustomSize(true)} className="flex items-center gap-2 text-[10px] font-black text-brand-600 uppercase tracking-widest hover:underline italic"><Plus size={14}/> Add More Size</button>
                                    </div>

                                    {isAddingCustomSize && (
                                        <div className="p-6 bg-brand-50 dark:bg-brand-900/10 rounded-[2rem] border border-brand-100 dark:border-brand-900/30 flex gap-4 animate-fade-in-down">
                                            <div className="flex-1 space-y-2">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Size Label</label>
                                                <input type="text" value={newSizeInput} onChange={e => setNewSizeInput(e.target.value)} className="w-full p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:border-brand-500 font-bold text-sm" placeholder="E.g. 6XL or 44" />
                                            </div>
                                            <div className="flex items-end gap-2">
                                                <button onClick={addCustomSize} className="p-3.5 bg-brand-600 text-white rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all"><Check size={18}/></button>
                                                <button onClick={() => setIsAddingCustomSize(false)} className="p-3.5 bg-slate-200 text-slate-500 rounded-xl hover:bg-slate-300 transition-all"><X size={18}/></button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex flex-wrap gap-2 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-inner max-h-48 overflow-y-auto custom-scrollbar">
                                        {allSizes.map(s => (
                                            <button 
                                                key={s} 
                                                onClick={() => toggleSize(s)}
                                                className={`px-5 py-3 rounded-2xl border-2 transition-all active:scale-95 text-[10px] font-black uppercase tracking-widest ${selectedSizes.includes(s) ? 'bg-brand-600 text-white border-brand-500 shadow-lg' : 'bg-white dark:bg-slate-900 text-slate-400 border-transparent shadow-sm'}`}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Step 3: Matrix Grid */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center text-white text-[10px] font-black">3</div>
                                        <label className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2"><Grid size={14}/> Stock Matrix (Quantities)</label>
                                    </div>
                                    
                                    {selectedColors.length > 0 && selectedSizes.length > 0 ? (
                                        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 overflow-hidden shadow-2xl overflow-x-auto custom-scrollbar">
                                            <table className="w-full text-left">
                                                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-400 font-black uppercase text-[9px] tracking-widest">
                                                    <tr>
                                                        <th className="p-6 sticky left-0 bg-slate-50 dark:bg-slate-800 z-10">Variant Mapping</th>
                                                        {selectedSizes.map(s => <th key={s} className="p-6 text-center">{s}</th>)}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                                    {selectedColors.map(color => (
                                                        <tr key={color} className="group">
                                                            <td className="p-6 bg-slate-50/30 dark:bg-slate-800/30 sticky left-0 z-10 backdrop-blur-md">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-6 h-6 rounded-full border border-black/10" style={{ backgroundColor: allColors.find(c=>c.name === color)?.hex || '#cccccc' }}></div>
                                                                    <span className="font-black text-[11px] uppercase dark:text-white whitespace-nowrap">{color}</span>
                                                                </div>
                                                            </td>
                                                            {selectedSizes.map(size => {
                                                                const v = matrix.find(m => m.color === color && m.size === size);
                                                                return (
                                                                    <td key={size} className="p-2">
                                                                        <input 
                                                                            type="number" 
                                                                            value={v?.stock || 0}
                                                                            onChange={e => updateMatrixStock(color, size, e.target.value)}
                                                                            className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-brand-500 rounded-2xl text-center font-black text-lg outline-none transition-all dark:text-white min-w-[80px]"
                                                                        />
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="p-12 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[2.5rem] flex flex-col items-center justify-center text-center opacity-30">
                                            <Layers size={40} className="mb-4 text-slate-400"/>
                                            <p className="text-[10px] font-black uppercase tracking-widest">Select at least one color and size to generate matrix</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                     </div>
                 </div>
             </div>

             <div className="p-8 md:p-10 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex gap-4">
                 <button onClick={() => setIsModalOpen(false)} className="flex-1 py-5 text-slate-500 font-black uppercase tracking-widest text-[11px]">{t('cancel')}</button>
                 <button onClick={handleSave} className="flex-[2] py-5 bg-slate-900 dark:bg-brand-600 text-white font-black uppercase tracking-widest rounded-3xl shadow-2xl hover:bg-black transition-all active:scale-[0.98] text-[11px] flex items-center justify-center gap-3 italic">
                    <Save size={20}/> {editingProduct ? 'Commit Merchandise Updates' : 'Authorize New Product Entry'}
                 </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
