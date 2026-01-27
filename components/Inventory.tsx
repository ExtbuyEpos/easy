
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

  // Role Permissions Logic
  const canAdd = currentUser?.role === 'ADMIN' || currentUser?.role === 'VENDOR';
  const canDelete = currentUser?.role === 'ADMIN' || currentUser?.role === 'VENDOR';
  const canEditPricesAndMetadata = ['ADMIN', 'MANAGER', 'VENDOR'].includes(currentUser?.role || '');
  const canOnlyAdjustStock = ['STAFF', 'VENDOR_STAFF'].includes(currentUser?.role || '');

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

  useEffect(() => {
    if (useVariants) {
        const total = matrix.reduce((acc, m) => acc + (Number(m.stock) || 0), 0);
        setFormData(prev => ({ ...prev, stock: total }));
    }
  }, [matrix, useVariants]);

  const suggestionCategories = categories.length > 0 ? categories : Array.from(new Set(products.map(p => p.category))).sort();

  const filteredProducts = products.filter(p => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch = p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term);
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
      if (!canAdd) return;
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

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData({ ...formData, image: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const toggleColor = (name: string) => {
    if (canOnlyAdjustStock) return;
    setSelectedColors(prev => prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]);
  };

  const toggleSize = (name: string) => {
    if (canOnlyAdjustStock) return;
    setSelectedSizes(prev => prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-colors">
      <div className="bg-white dark:bg-slate-900 p-6 lg:p-8 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
            <div className="flex items-center gap-4">
               <button onClick={onGoBack} className="p-3 -ml-3 rounded-2xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 shadow-sm border border-slate-100 dark:border-slate-700 transition-all active:scale-90 hover:text-brand-600">
                   <ChevronLeft size={28} className="rtl:rotate-180" />
               </button>
               <div>
                   <h2 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">{t('inventoryMgmt')}</h2>
                   <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mt-1">{t('manageStock')}</p>
               </div>
            </div>
            <div className="flex items-center gap-3">
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                    <button onClick={() => setActiveTab('products')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'products' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-lg' : 'text-slate-400'}`}>Items</button>
                    {onAddCategory && <button onClick={() => setActiveTab('categories')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'categories' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-lg' : 'text-slate-400'}`}>Fئات</button>}
                </div>
                {canAdd && activeTab === 'products' && (
                    <button onClick={() => handleOpenModal()} className="px-8 py-4 bg-brand-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-brand-500/20 active:scale-95 flex items-center gap-3 transition-all italic">
                        <Plus size={18} strokeWidth={3} /> {t('addProduct')}
                    </button>
                )}
            </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
             <div className="relative flex-1 group">
                 <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={20} />
                 <input type="text" placeholder={t('search')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-14 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none shadow-inner font-bold dark:text-white" />
             </div>
             <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-[1.8rem] overflow-x-auto no-scrollbar">
                <button onClick={() => setSelectedCategory('All')} className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedCategory === 'All' ? 'bg-slate-900 dark:bg-brand-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-900'}`}>All</button>
                {suggestionCategories.map(cat => (
                    <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedCategory === cat ? 'bg-slate-900 dark:bg-brand-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-900'}`}>{cat}</button>
                ))}
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-8 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 pb-10">
              {filteredProducts.map(p => (
                  <div key={p.id} onClick={() => handleOpenModal(p)} className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-4 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-2xl transition-all cursor-pointer group flex flex-col relative overflow-hidden">
                      <div className="aspect-square rounded-[1.8rem] bg-slate-50 dark:bg-slate-800 overflow-hidden mb-4 shrink-0 relative">
                          {p.image ? <img src={p.image} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700" alt={p.name} /> : <div className="w-full h-full flex items-center justify-center text-slate-200"><ImageIcon size={48} /></div>}
                          {p.hasVariants && <div className="absolute top-4 left-4 bg-brand-600 text-white text-[8px] font-black px-2 py-1 rounded-lg uppercase shadow-lg flex items-center gap-1"><Layers size={10}/> Variants</div>}
                          {p.stock < 10 && <div className="absolute bottom-4 right-4 bg-red-500 text-white text-[8px] font-black px-2 py-1 rounded-lg uppercase shadow-lg">Low Stock</div>}
                      </div>
                      <div className="flex-1 space-y-2">
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="font-black text-slate-900 dark:text-white uppercase italic tracking-tighter text-sm line-clamp-2 leading-tight">{p.name}</h4>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 shrink-0">{p.category}</span>
                          </div>
                          <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">SKU: {p.sku}</div>
                          <div className="flex justify-between items-end pt-4 mt-auto border-t border-slate-50 dark:border-slate-800">
                             <div>
                                <p className="text-xl font-black text-brand-600 dark:text-brand-400">{formatCurrency(p.sellPrice, language, CURRENCY)}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('stock')}: {formatNumber(p.stock, language)}</p>
                             </div>
                             <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400 group-hover:bg-brand-600 group-hover:text-white transition-all"><Edit2 size={16}/></div>
                          </div>
                      </div>
                  </div>
              ))}
          </div>
      </div>

      {isModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-2xl z-[120] flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-[4rem] shadow-2xl overflow-hidden animate-fade-in-up border border-slate-100 dark:border-slate-800 flex flex-col max-h-[95vh]">
                  <div className="p-10 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                      <div>
                          <h3 className="text-3xl font-black text-slate-900 dark:text-white italic uppercase tracking-tighter">{editingProduct ? 'Product Intelligence' : 'New Intake Node'}</h3>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Audit and Catalog Management</p>
                      </div>
                      <div className="flex items-center gap-4">
                         {editingProduct && canDelete && (
                            <button onClick={() => { onDeleteProduct(editingProduct.id); setIsModalOpen(false); }} className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={24}/></button>
                         )}
                         <button onClick={() => setIsModalOpen(false)} className="p-4 bg-white dark:bg-slate-800 text-slate-400 rounded-2xl hover:text-red-500 transition-all shadow-sm"><X size={24}/></button>
                      </div>
                  </div>

                  <div className="p-10 overflow-y-auto space-y-12 custom-scrollbar">
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                          <div className="lg:col-span-4 space-y-8">
                             <div className="aspect-square rounded-[3rem] bg-slate-50 dark:bg-slate-800 border-4 border-slate-100 dark:border-slate-700 flex items-center justify-center overflow-hidden relative shadow-inner group">
                                {formData.image ? (
                                    <>
                                        <img src={formData.image} className="w-full h-full object-cover" />
                                        {!canOnlyAdjustStock && <button onClick={() => setFormData({...formData, image: ''})} className="absolute inset-0 bg-red-600/60 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all"><X size={48}/></button>}
                                    </>
                                ) : <ImageIcon size={80} strokeWidth={1} className="text-slate-200" />}
                             </div>
                             {!canOnlyAdjustStock && (
                                <button onClick={() => fileInputRef.current?.click()} className="w-full py-5 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[2rem] font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 shadow-sm hover:bg-slate-50 transition-all">
                                    <Upload size={18}/> {t('uploadImage')}
                                </button>
                             )}
                             <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                          </div>

                          <div className="lg:col-span-8 space-y-10">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                  <div className="space-y-1">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('productName')}</label>
                                      <input type="text" readOnly={canOnlyAdjustStock || !canEditPricesAndMetadata} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black text-lg dark:text-white" placeholder="Product Identifier" />
                                  </div>
                                  <div className="space-y-1">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('category')}</label>
                                      <select disabled={canOnlyAdjustStock || !canEditPricesAndMetadata} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full p-5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black uppercase text-[10px] tracking-widest dark:text-white">
                                          {suggestionCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                      </select>
                                  </div>
                                  <div className="space-y-1">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('sku')}</label>
                                      <input type="text" readOnly={canOnlyAdjustStock || !canEditPricesAndMetadata} value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-mono dark:text-white" placeholder="BARCODE-ID" />
                                  </div>
                                  <div className="space-y-1">
                                      <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest ml-1">{t('price')}</label>
                                      <div className="relative">
                                          <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={20} />
                                          <input type="number" readOnly={canOnlyAdjustStock || !canEditPricesAndMetadata} value={formData.sellPrice} onChange={e => setFormData({...formData, sellPrice: parseFloat(e.target.value) || 0})} className="w-full p-4 pl-12 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black text-xl text-emerald-500 outline-none" />
                                      </div>
                                  </div>
                              </div>

                              <div className="p-8 bg-slate-900 rounded-[3rem] space-y-6">
                                  <div className="flex justify-between items-center border-b border-white/5 pb-4">
                                      <div className="flex items-center gap-3">
                                          <Package size={20} className="text-amber-500" />
                                          <h4 className="text-xs font-black uppercase tracking-widest text-white">Stock Allocation</h4>
                                      </div>
                                      {!canOnlyAdjustStock && (
                                          <button onClick={() => setUseVariants(!useVariants)} className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border-2 transition-all ${useVariants ? 'bg-amber-600 text-white border-amber-500' : 'bg-transparent text-slate-500 border-white/10'}`}>
                                              {useVariants ? 'Multi-Variant System' : 'Single Unit Mode'}
                                          </button>
                                      )}
                                  </div>

                                  {!useVariants ? (
                                      <div className="flex items-center gap-8">
                                          <div className="flex-1 space-y-1">
                                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Base Physical Units</label>
                                              <input type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: parseInt(e.target.value) || 0})} className="w-full p-4 bg-black/40 border-2 border-white/10 rounded-2xl font-black text-white text-2xl outline-none focus:border-amber-500 transition-all" />
                                          </div>
                                          <div className="flex-1 space-y-1">
                                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Unit Cost Price</label>
                                              <input type="number" readOnly={canOnlyAdjustStock || !canEditPricesAndMetadata} value={formData.costPrice} onChange={e => setFormData({...formData, costPrice: parseFloat(e.target.value) || 0})} className="w-full p-4 bg-black/40 border-2 border-white/10 rounded-2xl font-black text-white text-2xl outline-none" />
                                          </div>
                                      </div>
                                  ) : (
                                      <div className="space-y-8">
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                              <div className="space-y-4">
                                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selected Colors</label>
                                                  <div className="flex flex-wrap gap-2">
                                                      {COMMON_COLORS.map(c => (
                                                          <button key={c.name} onClick={() => toggleColor(c.name)} className={`px-3 py-1.5 rounded-xl border-2 text-[10px] font-black uppercase transition-all ${selectedColors.includes(c.name) ? 'bg-amber-600 text-white border-amber-500 shadow-lg' : 'bg-black/40 text-slate-500 border-white/5'}`}>{c.name}</button>
                                                      ))}
                                                  </div>
                                              </div>
                                              <div className="space-y-4">
                                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selected Sizes</label>
                                                  <div className="flex flex-wrap gap-2">
                                                      {COMMON_SIZES.map(s => (
                                                          <button key={s} onClick={() => toggleSize(s)} className={`px-3 py-1.5 rounded-xl border-2 text-[10px] font-black uppercase transition-all ${selectedSizes.includes(s) ? 'bg-amber-600 text-white border-amber-500 shadow-lg' : 'bg-black/40 text-slate-500 border-white/5'}`}>{s}</button>
                                                      ))}
                                                  </div>
                                              </div>
                                          </div>
                                          
                                          {matrix.length > 0 && (
                                              <div className="bg-black/50 rounded-3xl overflow-hidden border border-white/5">
                                                  <table className="w-full text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                                      <thead className="bg-white/5"><tr><th className="p-4 text-left">Variation</th><th className="p-4 text-center">Physical Count</th></tr></thead>
                                                      <tbody className="divide-y divide-white/5">
                                                          {matrix.map((v, i) => (
                                                              <tr key={i}>
                                                                  <td className="p-4 text-white italic">{v.color} / {v.size}</td>
                                                                  <td className="p-2">
                                                                      <input type="number" value={v.stock} onChange={e => {
                                                                          const newMatrix = [...matrix];
                                                                          newMatrix[i].stock = parseInt(e.target.value) || 0;
                                                                          setMatrix(newMatrix);
                                                                      }} className="w-full bg-black/40 border-2 border-white/10 rounded-xl p-2 text-center text-amber-500 font-black" />
                                                                  </td>
                                                              </tr>
                                                          ))}
                                                      </tbody>
                                                  </table>
                                              </div>
                                          )}
                                      </div>
                                  )}
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="p-10 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex gap-4 shrink-0">
                      <button onClick={() => setIsModalOpen(false)} className="flex-1 py-5 text-slate-500 font-black uppercase tracking-widest text-[10px]">{t('cancel')}</button>
                      <button onClick={handleSave} className="flex-[2] py-5 bg-brand-600 text-white font-black uppercase tracking-widest text-[10px] rounded-[2rem] shadow-2xl shadow-brand-500/20 hover:bg-brand-500 transition-all italic flex items-center justify-center gap-3">
                          <CheckCircle2 size={18}/> {editingProduct ? 'Commit Changes' : 'Launch Product'}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
