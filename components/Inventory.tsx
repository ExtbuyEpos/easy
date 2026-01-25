import React, { useState, useRef } from 'react';
import { Product, User, Language } from '../types';
import { Plus, Search, Trash2, Edit2, Save, X, Image as ImageIcon, RefreshCw, Upload, Package, AlertCircle, ChevronLeft, TrendingUp, DollarSign, List, Grid, Check, ArrowRightLeft } from 'lucide-react';
import { CURRENCY } from '../constants';
import { formatNumber, formatCurrency } from '../utils/format';

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
}

export const Inventory: React.FC<InventoryProps> = ({ 
  products, categories = [], onAddProduct, onUpdateProduct, onDeleteProduct,
  onAddCategory, initialTab = 'products', onGoBack, t = (k) => k,
  currentUser, language
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<Product>>({
    name: '', sku: '', costPrice: 0, sellPrice: 0, stock: 0, category: 'General', image: ''
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
      setFormData({ ...product, image: product.image || '' });
    } else {
      setEditingProduct(null);
      setFormData({ name: '', sku: '', costPrice: 0, sellPrice: 0, stock: 0, category: suggestionCategories[0] || 'General', image: '' });
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

  const generateBarcode = () => {
    setFormData(prev => ({ ...prev, sku: `880${Date.now().toString().slice(-10)}` }));
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
      image: formData.image || ''
    } as Product;

    if (editingProduct) onUpdateProduct(productData);
    else onAddProduct(productData);
    setIsModalOpen(false);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = 'https://via.placeholder.com/150?text=No+Image';
    e.currentTarget.onerror = null; 
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const calculateMargin = (cost: number, sell: number) => {
      if (sell <= 0) return 0;
      return ((sell - cost) / sell) * 100;
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
                    <h2 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">{t('inventory')}</h2>
                    <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.3em] opacity-60 mt-1">Management & Audit Control</p>
                </div>
            </div>
            {canAddProduct && (
              <button onClick={() => handleOpenModal()} className="bg-brand-600 hover:bg-brand-500 text-white px-4 md:px-8 py-3 md:py-4 rounded-2xl flex items-center gap-2 shadow-xl shadow-brand-500/20 transition-all active:scale-95 font-black text-[10px] uppercase tracking-widest italic">
                  <Plus size={18} strokeWidth={3} /> <span className="hidden sm:inline">{t('addProduct')}</span><span className="sm:hidden">Add</span>
              </button>
            )}
         </div>

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
                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Valuation</div>
                    <div className="text-lg font-black text-slate-900 dark:text-white leading-none">{formatCurrency(totalInvValue, language, CURRENCY)}</div>
                </div>
            </div>
            <div className="hidden lg:flex group bg-white dark:bg-slate-900 p-5 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 items-center gap-4 transition-all hover:shadow-2xl">
                <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-2xl text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all"><TrendingUp size={22}/></div>
                <div>
                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Potential Profit</div>
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
         
         <div className="flex flex-col md:flex-row gap-3">
             <div className="relative flex-1 group">
                 <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={20} />
                 <input type="text" placeholder={t('search')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-14 pr-4 py-4.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.8rem] outline-none shadow-sm font-bold text-sm focus:ring-4 focus:ring-brand-500/10 transition-all dark:text-white" />
             </div>
             <div className="flex gap-2">
                <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="flex-1 md:flex-none px-6 py-4.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.8rem] outline-none shadow-sm font-black text-[10px] uppercase tracking-widest text-slate-600 dark:text-slate-300 focus:ring-4 focus:ring-brand-500/10 appearance-none cursor-pointer pr-12 relative bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM5NGEzYjgiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJtNiA5IDYgNiA2LTYiLz48L3N2Zz4=')] bg-[length:18px] bg-[right_1rem_center] bg-no-repeat">
                    <option value="All">{t('all')}</option>
                    {suggestionCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.8rem] p-1.5 shadow-sm">
                    <button className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-brand-600"><List size={18}/></button>
                    <button className="p-3 text-slate-400 hover:text-slate-600"><Grid size={18}/></button>
                </div>
             </div>
         </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 flex-1 flex flex-col overflow-hidden relative">
          <div className="flex-1 overflow-auto custom-scrollbar">
             <table className="w-full text-left text-sm border-separate border-spacing-0">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-black uppercase text-[9px] tracking-[0.25em] sticky top-0 z-10 backdrop-blur-xl">
                   <tr>
                      <th className="p-6 md:p-8">{t('productName')}</th>
                      <th className="p-8 text-right hidden md:table-cell">{t('cost')}</th>
                      <th className="p-6 md:p-8 text-right">{t('price')}</th>
                      <th className="p-8 text-center hidden lg:table-cell">Margin %</th>
                      <th className="p-6 md:p-8 text-center">{t('stock')}</th>
                      <th className="p-6 md:p-8 text-right">{t('action')}</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                   {filteredProducts.map(p => {
                      const margin = calculateMargin(p.costPrice, p.sellPrice);
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 group transition-all">
                          <td className="p-6 md:p-8">
                              <div className="flex items-center gap-5">
                                  <div className="w-14 h-14 md:w-20 md:h-20 rounded-[1.8rem] bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-50 dark:border-slate-700 shrink-0 shadow-sm">
                                      {p.image ? (
                                        <img src={p.image} onError={handleImageError} className="w-full h-full object-cover" alt={p.name} />
                                      ) : (
                                        <ImageIcon className="text-slate-300" size={24} />
                                      )}
                                  </div>
                                  <div className="min-w-0">
                                      <div className="font-black text-slate-900 dark:text-white tracking-tighter text-base md:text-lg group-hover:text-brand-600 transition-colors truncate">{p.name}</div>
                                      <div className="text-[10px] font-black font-mono text-slate-400 uppercase tracking-widest mt-1 truncate">{formatNumber(p.sku, language)}</div>
                                  </div>
                              </div>
                          </td>
                          <td className="p-8 text-right font-bold text-slate-400 dark:text-slate-500 hidden md:table-cell">
                              {formatCurrency(p.costPrice, language, CURRENCY)}
                          </td>
                          <td className="p-6 md:p-8 text-right font-black text-brand-600 dark:text-brand-400 text-lg md:text-xl">
                              {formatCurrency(p.sellPrice, language, CURRENCY)}
                          </td>
                          <td className="p-8 text-center hidden lg:table-cell">
                              <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${margin > 40 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20' : margin > 20 ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/20' : 'bg-slate-50 text-slate-500 dark:bg-slate-800'}`}>
                                  {formatNumber(margin, language)}%
                              </span>
                          </td>
                          <td className="p-6 md:p-8 text-center">
                              <span className={`px-5 py-2 rounded-2xl text-xs font-black tracking-tight border-2 ${p.stock < 10 ? 'bg-red-50 border-red-100 text-red-600 dark:bg-red-950/20 dark:border-red-900/30' : 'bg-slate-50 border-slate-100 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'}`}>
                                  {formatNumber(p.stock, language)}
                              </span>
                          </td>
                          <td className="p-6 md:p-8 text-right">
                              <div className="flex justify-end gap-3">
                                  {canEditProduct && (
                                    <button onClick={() => handleOpenModal(p)} className="p-3 bg-white dark:bg-slate-800 text-slate-400 hover:text-brand-600 rounded-2xl transition-all border border-slate-100 dark:border-slate-700 shadow-sm active:scale-90"><Edit2 size={18}/></button>
                                  )}
                                  {canDeleteProduct && (
                                    <button onClick={() => onDeleteProduct(p.id)} className="p-3 bg-white dark:bg-slate-800 text-slate-400 hover:text-red-500 rounded-2xl transition-all border border-slate-100 dark:border-slate-700 shadow-sm active:scale-90"><Trash2 size={18}/></button>
                                  )}
                              </div>
                          </td>
                        </tr>
                      );
                   })}
                </tbody>
             </table>
          </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-2xl flex items-end md:items-center justify-center z-[100] p-0 md:p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-t-[4rem] md:rounded-[4rem] shadow-2xl overflow-hidden animate-fade-in-up flex flex-col border border-slate-100 dark:border-slate-800 max-h-[95vh] relative">
             <div className="p-8 md:p-12 pb-6 md:pb-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                 <div>
                    <h3 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">{editingProduct ? t('editProduct') : t('addProduct')}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-2">Unified Inventory Control Module</p>
                 </div>
                 <button onClick={() => setIsModalOpen(false)} className="bg-white dark:bg-slate-800 p-4 rounded-3xl text-slate-400 hover:text-red-500 transition-all shadow-xl border border-slate-100 dark:border-slate-700 active:scale-90"><X size={28}/></button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-8 md:p-12 space-y-10 custom-scrollbar">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                     <div className="space-y-8">
                        <div className="space-y-3">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('productName')}</label>
                            <input type="text" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full p-5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-3xl outline-none focus:border-brand-500 dark:text-white font-bold text-xl shadow-inner" placeholder="E.g. Premium Engine Oil" />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('sku')}</label>
                            <div className="flex gap-3">
                                <input type="text" value={formData.sku || ''} onChange={e => setFormData({ ...formData, sku: e.target.value })} className="flex-1 p-5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-3xl outline-none focus:border-brand-500 dark:text-white font-mono font-black tracking-wider text-lg" placeholder="Barcode ID" />
                                <button onClick={generateBarcode} className="p-5 bg-white dark:bg-slate-800 rounded-3xl text-slate-400 hover:text-brand-600 shadow-xl border border-slate-100 dark:border-slate-700 active:scale-90 transition-all"><RefreshCw size={24}/></button>
                            </div>
                        </div>
                        
                        <div className="space-y-3">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('category')}</label>
                            {isAddingNewCategory ? (
                                <div className="flex gap-3 animate-fade-in">
                                    <input 
                                        type="text" 
                                        value={newCategoryName} 
                                        onChange={e => setNewCategoryName(e.target.value)} 
                                        className="flex-1 p-5 bg-slate-50 dark:bg-slate-800 border-2 border-brand-500 rounded-3xl dark:text-white font-bold text-lg" 
                                        placeholder="New Category Name"
                                        autoFocus
                                    />
                                    <button onClick={handleCreateCategory} className="p-5 bg-brand-600 text-white rounded-3xl active:scale-90 shadow-xl"><Check size={24}/></button>
                                    <button onClick={() => setIsAddingNewCategory(false)} className="p-5 bg-slate-100 dark:bg-slate-700 text-slate-400 rounded-3xl active:scale-90"><X size={24}/></button>
                                </div>
                            ) : (
                                <div className="flex gap-3">
                                    <select 
                                        value={formData.category} 
                                        onChange={e => setFormData({ ...formData, category: e.target.value })} 
                                        className="flex-1 p-5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-3xl dark:text-white font-black text-[11px] uppercase tracking-[0.2em] appearance-none"
                                    >
                                        {suggestionCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <button onClick={() => setIsAddingNewCategory(true)} className="p-5 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 text-slate-400 hover:text-brand-600 rounded-3xl shadow-xl active:scale-90 transition-all"><Plus size={24}/></button>
                                </div>
                            )}
                        </div>
                     </div>

                     <div className="space-y-8">
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
                            <div className="flex flex-col gap-4">
                                <div className="aspect-video bg-slate-50 dark:bg-slate-800 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden relative group shadow-inner">
                                    {formData.image ? (
                                        <>
                                            <img src={formData.image} onError={handleImageError} className="w-full h-full object-contain p-6" alt="Preview" />
                                            <button onClick={() => setFormData({...formData, image: ''})} className="absolute top-4 right-4 p-3 bg-red-500 text-white rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity shadow-xl"><Trash2 size={20}/></button>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center gap-3 opacity-20">
                                            <ImageIcon size={64} />
                                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Drop Media Layer</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-3">
                                    <input 
                                        type="text" 
                                        value={formData.image && !formData.image.startsWith('data:') ? formData.image : ''} 
                                        onChange={e => setFormData({ ...formData, image: e.target.value })} 
                                        placeholder="Paste Public Image URL..." 
                                        className="flex-1 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-[11px] font-mono dark:text-white shadow-inner"
                                    />
                                    <button onClick={() => fileInputRef.current?.click()} className="p-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-slate-400 hover:text-brand-600 active:scale-90 transition-all shadow-lg"><Upload size={24}/></button>
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                                </div>
                            </div>
                        </div>
                        
                        <div className="space-y-3">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('stock')}</label>
                            <input type="number" value={formData.stock || 0} onChange={e => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })} className="w-full p-6 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-3xl dark:text-white font-black text-3xl shadow-inner text-center" />
                        </div>
                     </div>
                 </div>
             </div>

             <div className="p-8 md:p-12 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex gap-4">
                 <button onClick={() => setIsModalOpen(false)} className="flex-1 py-5 text-slate-500 dark:text-slate-400 font-black uppercase tracking-[0.3em] rounded-3xl text-[11px] hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95">{t('cancel')}</button>
                 <button onClick={handleSave} className="flex-[2] py-5 bg-slate-900 dark:bg-brand-600 text-white font-black uppercase tracking-[0.3em] rounded-3xl shadow-2xl hover:bg-black transition-all active:scale-[0.98] text-[11px] flex items-center justify-center gap-3 italic">
                    <Save size={20}/> {t('saveProduct')}
                 </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};