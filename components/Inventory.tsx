
import React, { useState, useRef } from 'react';
import { Product, User, Language, StoreSettings } from '../types';
import { Plus, Search, Trash2, Edit2, Save, X, Image as ImageIcon, RefreshCw, Upload, Package, AlertCircle, ChevronLeft, TrendingUp, DollarSign, List, Grid, Check, ArrowRightLeft, Sparkles, Loader2, Heart, Type, Palette, Ruler } from 'lucide-react';
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

const COMMON_SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL', 'Free'];
const COMMON_COLORS = [
    { name: 'Black', hex: '#000000' },
    { name: 'White', hex: '#ffffff' },
    { name: 'Red', hex: '#ef4444' },
    { name: 'Blue', hex: '#3b82f6' },
    { name: 'Green', hex: '#22c55e' },
    { name: 'Yellow', hex: '#eab308' },
    { name: 'Gray', hex: '#64748b' },
    { name: 'Pink', hex: '#ec4899' }
];

// Extract onDeleteCategory and onUpdateCategory from props to fix undefined variable errors
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
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isGeneratingAiImage, setIsGeneratingAiImage] = useState(false);
  const [aiEngine, setAiEngine] = useState<'CLOUDFLARE' | 'HACKCLUB'>('CLOUDFLARE');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<Product>>({
    name: '', sku: '', costPrice: 0, sellPrice: 0, stock: 0, category: 'General', image: '', size: '', color: ''
  });

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
    } else {
      setEditingProduct(null);
      setFormData({ name: '', sku: '', costPrice: 0, sellPrice: 0, stock: 0, category: suggestionCategories[0] || 'General', image: '', size: '', color: '' });
    }
    setIsAddingNewCategory(false);
    setIsModalOpen(true);
  };

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) return;
    if (onAddCategory) {
      onAddCategory(newCategoryName.trim());
      setFormData({ ...formData, category: newCategoryName.trim() });
      setNewCategoryName('');
      setIsAddingNewCategory(false);
    } else {
      setFormData({ ...formData, category: newCategoryName.trim() });
      setIsAddingNewCategory(false);
    }
  };

  const handleGenerateAiImage = async (engine: 'CLOUDFLARE' | 'HACKCLUB') => {
    if (!formData.name) {
      alert("Please enter a product name first to use as an AI prompt.");
      return;
    }
    const configUrl = engine === 'CLOUDFLARE' ? storeSettings?.cloudflareAiUrl : storeSettings?.hackClubAiUrl;
    if (!configUrl) return alert(`${engine} URL not configured in Settings.`);

    setIsGeneratingAiImage(true);
    setAiEngine(engine);
    try {
      let generatedImage = '';
      if (engine === 'CLOUDFLARE') {
        generatedImage = await generateImageWithCloudflare(configUrl, formData.name);
      } else {
        generatedImage = await generateImageWithHackClub(configUrl, formData.name);
      }
      setFormData(prev => ({ ...prev, image: generatedImage }));
    } catch (err) {
      alert("AI Generation failed. Check your Gateway URL.");
    } finally {
      setIsGeneratingAiImage(false);
    }
  };

  const handleSave = () => {
    if (!formData.name || isNaN(Number(formData.sellPrice))) { 
      alert("Product Name and Valid Sale Price are required"); 
      return; 
    }
    const productData = {
      id: editingProduct ? editingProduct.id : Date.now().toString(),
      name: formData.name!,
      sku: formData.sku || `SKU-${Date.now()}`,
      costPrice: Number(formData.costPrice || 0),
      sellPrice: Number(formData.sellPrice),
      stock: Number(formData.stock || 0),
      category: formData.category || 'General',
      image: formData.image || '',
      size: formData.size || '',
      color: formData.color || ''
    } as Product;

    if (editingProduct) onUpdateProduct(productData);
    else onAddProduct(productData);
    setIsModalOpen(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData({ ...formData, image: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

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
                <button onClick={() => setActiveTab('products')} className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'products' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-md' : 'text-slate-500'}`}>Items</button>
                <button onClick={() => setActiveTab('categories')} className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'categories' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-md' : 'text-slate-500'}`}>Categories</button>
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
                 <input type="text" placeholder={t('search')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-14 pr-4 py-4.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.8rem] outline-none shadow-sm font-bold text-sm focus:ring-4 focus:ring-brand-500/10 transition-all dark:text-white" />
             </div>
             {activeTab === 'products' && (
               <div className="flex gap-2">
                  <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="flex-1 md:flex-none px-6 py-4.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.8rem] outline-none shadow-sm font-black text-[10px] uppercase tracking-widest text-slate-600 dark:text-slate-300 focus:ring-4 focus:ring-brand-500/10 appearance-none cursor-pointer pr-12 relative bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM5NGEzYjgiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJtNiA5IDYgNiA2LTYiLz48L3N2Zz4=')] bg-[length:18px] bg-[right_1rem_center] bg-no-repeat">
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
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-black uppercase text-[9px] tracking-[0.25em] sticky top-0 z-10 backdrop-blur-xl">
                     <tr>
                        <th className="p-6 md:p-8">{t('productName')}</th>
                        <th className="p-8 text-right hidden md:table-cell">{t('cost')}</th>
                        <th className="p-6 md:p-8 text-right">{t('price')}</th>
                        <th className="p-8 text-center hidden lg:table-cell">Variant Map</th>
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
                                  {p.size && <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[9px] font-black uppercase text-slate-500">{p.size}</span>}
                                  {p.color && <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[9px] font-black uppercase text-slate-500">{p.color}</span>}
                                  {!p.size && !p.color && <span className="text-[9px] text-slate-300 uppercase italic">No Variants</span>}
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
                        const variants = Array.from(new Set(catProducts.map(p => p.size).filter(Boolean)));
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
                                    {variants.length > 0 && (
                                        <div className="pt-4 border-t border-slate-50 dark:border-slate-700">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Available Sizes</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {variants.map(v => <span key={v} className="px-2 py-0.5 bg-slate-50 dark:bg-slate-900 rounded text-[8px] font-black text-slate-400 border border-slate-100 dark:border-slate-800">{v}</span>)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
          )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-2xl flex items-end md:items-center justify-center ltr:z-[100] rtl:z-[100] p-0 ltr:md:p-4 rtl:md:p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-t-[4rem] md:rounded-[4rem] shadow-2xl overflow-hidden animate-fade-in-up flex flex-col border border-slate-100 dark:border-slate-800 max-h-[95vh] relative">
             <div className="p-8 md:p-12 pb-6 md:pb-8 border-b ltr:border-slate-100 rtl:border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                 <div>
                    <h3 className="text-3xl md:text-4xl font-black text-slate-900 ltr:dark:text-white rtl:dark:text-white tracking-tighter uppercase ltr:italic rtl:italic leading-none">{editingProduct ? t('editProduct') : t('addProduct')}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-2">New Merchandise Entry</p>
                 </div>
                 <button onClick={() => setIsModalOpen(false)} className="bg-white dark:bg-slate-800 p-4 rounded-3xl text-slate-400 hover:text-red-500 transition-all shadow-xl active:scale-90"><X size={28}/></button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-8 md:p-12 space-y-10 ltr:custom-scrollbar rtl:custom-scrollbar">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                     <div className="space-y-8">
                        <div className="space-y-3">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ltr:ml-1 rtl:mr-1">{t('productName')}</label>
                            <input type="text" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full p-5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 ltr:dark:border-slate-700 rtl:dark:border-slate-700 rounded-3xl outline-none focus:border-brand-500 ltr:dark:text-white rtl:dark:text-white font-bold text-xl shadow-inner" placeholder="E.g. Urban Cotton Tee" />
                        </div>
                        
                        {/* Size Selection Protocol */}
                        <div className="space-y-4">
                            <label className="text-[11px] font-black text-slate-400 uppercase ltr:tracking-widest rtl:tracking-widest ltr:ml-1 rtl:mr-1 flex items-center gap-2"><Ruler size={14}/> Variant Size (S, M, L, XL...)</label>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {COMMON_SIZES.map(s => (
                                    <button 
                                        key={s} 
                                        onClick={() => setFormData({...formData, size: s})}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase ltr:tracking-widest rtl:tracking-widest transition-all ${formData.size === s ? 'bg-brand-600 text-white shadow-lg' : 'bg-slate-100 ltr:dark:bg-slate-800 rtl:dark:bg-slate-800 text-slate-400 ltr:hover:bg-slate-200 rtl:hover:bg-slate-200'}`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                            <input type="text" value={formData.size || ''} onChange={e => setFormData({ ...formData, size: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 ltr:dark:border-slate-700 rtl:dark:border-slate-700 rounded-2xl outline-none focus:border-brand-500 ltr:dark:text-white rtl:dark:text-white font-bold text-sm" placeholder="Custom Size..." />
                        </div>

                        {/* Color Selection Protocol */}
                        <div className="space-y-4">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ltr:ml-1 rtl:mr-1 flex items-center gap-2 ltr:gap-2 rtl:gap-2"><Palette size={14}/> Core Merchandise Colour</label>
                            <div className="flex flex-wrap gap-3 mb-3">
                                {COMMON_COLORS.map(c => (
                                    <button 
                                        key={c.name} 
                                        onClick={() => setFormData({...formData, color: c.name})}
                                        title={c.name}
                                        className={`w-10 h-10 rounded-full border-4 transition-all hover:scale-110 active:scale-90 ${formData.color === c.name ? 'border-brand-500 scale-110 shadow-lg' : 'border-white ltr:dark:border-slate-700 rtl:dark:border-slate-700 shadow-sm'}`}
                                        style={{ backgroundColor: c.hex }}
                                    ></button>
                                ))}
                            </div>
                            <input type="text" value={formData.color || ''} onChange={e => setFormData({ ...formData, color: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:border-brand-500 dark:text-white font-bold text-sm" placeholder="Custom Color..." />
                        </div>
                     </div>

                     <div className="space-y-8">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ltr:ml-1 rtl:mr-1">{t('cost')}</label>
                                <div className="relative">
                                    <span className="absolute ltr:left-4 rtl:right-4 top-1/2 -translate-y-1/2 font-black text-slate-300">{CURRENCY}</span>
                                    <input type="number" step="0.01" value={formData.costPrice || ''} onChange={e => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })} className="w-full p-5 ltr:pl-10 rtl:pr-10 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-3xl ltr:dark:text-white rtl:dark:text-white font-black text-xl shadow-inner" placeholder="0.00" />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <label className="text-[11px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-widest ltr:ml-1 rtl:mr-1">{t('price')}</label>
                                <div className="relative">
                                    <span className="absolute ltr:left-4 rtl:right-4 top-1/2 -translate-y-1/2 font-black text-brand-300">{CURRENCY}</span>
                                    <input type="number" step="0.01" value={formData.sellPrice || ''} onChange={e => setFormData({ ...formData, sellPrice: parseFloat(e.target.value) || 0 })} className="w-full p-5 ltr:pl-10 rtl:pr-10 bg-slate-50 dark:bg-slate-800 border-2 border-brand-100 dark:border-brand-900 rounded-3xl ltr:dark:text-white rtl:dark:text-white font-black text-xl text-brand-600 shadow-inner" placeholder="0.00" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ltr:ml-1 rtl:mr-1">{t('image')}</label>
                            <div className="flex flex-col gap-4">
                                <div className="aspect-video bg-slate-50 ltr:dark:bg-slate-800 rtl:dark:bg-slate-800 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden relative ltr:group rtl:group shadow-inner">
                                    {formData.image ? <img src={formData.image} className="w-full h-full object-contain p-6" alt="Preview" /> : <ImageIcon className="opacity-20" size={64} />}
                                    {isGeneratingAiImage && (
                                      <div className="absolute inset-0 bg-brand-600/80 backdrop-blur-md flex flex-col items-center justify-center ltr:text-white rtl:text-white z-20">
                                          <Loader2 size={48} className="animate-spin mb-4" />
                                          <p className="font-black uppercase tracking-widest text-[10px] animate-pulse ltr:animate-pulse rtl:animate-pulse">{t('aiGeneratingImage')}</p>
                                      </div>
                                    )}
                                </div>
                                <div className="flex ltr:gap-2 rtl:gap-2">
                                    <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-4 bg-slate-100 ltr:dark:bg-slate-800 rtl:dark:bg-slate-800 border ltr:border-slate-200 rtl:border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400 font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3"><Upload size={16}/> Hardware Upload</button>
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                                    {storeSettings?.cloudflareAiUrl && (
                                      <button onClick={() => handleGenerateAiImage('CLOUDFLARE')} disabled={isGeneratingAiImage} className="p-4 bg-brand-600 text-white rounded-2xl shadow-lg active:scale-95 ltr:disabled:opacity-50 rtl:disabled:opacity-50"><Sparkles size={20}/></button>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        <div className="space-y-3">
                            <label className="text-[11px] font-black text-slate-400 uppercase ltr:tracking-widest rtl:tracking-widest ltr:ml-1 rtl:mr-1">{t('stock')}</label>
                            <input type="number" value={formData.stock || 0} onChange={e => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })} className="w-full p-6 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-3xl dark:text-white font-black text-3xl shadow-inner ltr:text-center rtl:text-center" />
                        </div>
                     </div>
                 </div>
             </div>

             <div className="p-8 md:p-12 border-t ltr:border-slate-100 rtl:border-slate-100 ltr:dark:border-slate-800 rtl:dark:border-slate-800 bg-slate-50 ltr:dark:bg-slate-900/50 rtl:dark:bg-slate-900/50 flex gap-4">
                 <button onClick={() => setIsModalOpen(false)} className="flex-1 py-5 text-slate-500 font-black uppercase tracking-widest text-[11px] ltr:text-[11px] rtl:text-[11px]">{t('cancel')}</button>
                 <button onClick={handleSave} className="flex-[2] py-5 bg-slate-900 dark:bg-brand-600 text-white font-black uppercase tracking-widest rounded-3xl shadow-2xl ltr:hover:bg-black rtl:hover:bg-black transition-all active:scale-[0.98] text-[11px] flex items-center justify-center ltr:gap-3 rtl:gap-3 ltr:italic rtl:italic">
                    <Save size={20}/> Save Merchandise Data
                 </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
