import React, { useState, useRef } from 'react';
import { Product, User, Language } from '../types';
import { Plus, Search, Trash2, Edit2, Save, X, Image as ImageIcon, RefreshCw, Upload, Package, AlertCircle, ChevronLeft, TrendingUp, DollarSign, List, Grid, Check } from 'lucide-react';
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
              <button onClick={() => handleOpenModal()} className="bg-brand-600 hover:bg-brand-500 text-white px-4 md:px-8 py-3 md:py-4 rounded-2xl flex items-center gap-2 shadow-xl shadow-brand-500/20 transition-all active:scale-95 font-black text-[10px] uppercase tracking-widest">
                  <Plus size={18} strokeWidth={3} /> <span className="hidden sm:inline">{t('addProduct')}</span><span className="sm:hidden">Add</span>
              </button>
            )}
         </div>

         <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <div className="group bg-white dark:bg-slate-900 p-4 md:p-5 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-3 transition-all hover:shadow-xl">
                <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-500 transition-all"><Package size={20}/></div>
                <div>
                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{t('stock')}</div>
                    <div className="text-lg font-black text-slate-900 dark:text-white leading-none">{formatNumber(products.reduce((a,b)=>a+b.stock,0), language)}</div>
                </div>
            </div>
            <div className="group bg-white dark:bg-slate-900 p-4 md:p-5 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-3 transition-all hover:shadow-xl">
                <div className="bg-emerald-50 dark:bg-emerald-900/30 p-2.5 rounded-xl text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all"><DollarSign size={20}/></div>
                <div>
                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Value</div>
                    <div className="text-lg font-black text-slate-900 dark:text-white leading-none">{formatCurrency(totalInvValue, language, CURRENCY)}</div>
                </div>
            </div>
            <div className="hidden lg:flex group bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 items-center gap-3 transition-all hover:shadow-xl">
                <div className="bg-blue-50 dark:bg-blue-900/30 p-2.5 rounded-xl text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all"><TrendingUp size={20}/></div>
                <div>
                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Margin</div>
                    <div className="text-lg font-black text-slate-900 dark:text-white leading-none">{formatCurrency(totalInvValue - totalInvCost, language, CURRENCY)}</div>
                </div>
            </div>
            <div className="group bg-white dark:bg-slate-900 p-4 md:p-5 rounded-3xl shadow-sm border border-red-100 dark:border-red-900/20 flex items-center gap-3 transition-all hover:shadow-xl">
                <div className="bg-red-50 dark:bg-red-900/30 p-2.5 rounded-xl text-red-500 group-hover:bg-red-500 group-hover:text-white transition-all"><AlertCircle size={20}/></div>
                <div>
                    <div className="text-[8px] font-black text-red-400 uppercase tracking-widest mb-0.5">Alerts</div>
                    <div className="text-lg font-black text-red-900 dark:text-red-100 leading-none">{formatNumber(products.filter(p => p.stock < 10).length, language)}</div>
                </div>
            </div>
         </div>
         
         <div className="flex flex-col md:flex-row gap-3">
             <div className="relative flex-1 group">
                 <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={18} />
                 <input type="text" placeholder={t('search')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none shadow-sm font-bold text-sm focus:ring-4 focus:ring-brand-500/10 transition-all dark:text-white" />
             </div>
             <div className="flex gap-2">
                <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="flex-1 md:flex-none px-6 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none shadow-sm font-black text-[10px] uppercase tracking-widest text-slate-600 dark:text-slate-300 focus:ring-4 focus:ring-brand-500/10 appearance-none cursor-pointer pr-10 relative bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM5NGEzYjgiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJtNiA5IDYgNiA2LTYiLz48L3N2Zz4=')] bg-[length:16px] bg-[right_1rem_center] bg-no-repeat">
                    <option value="All">{t('all')}</option>
                    {suggestionCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1 shadow-sm">
                    <button className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-brand-600"><List size={18}/></button>
                    <button className="p-3 text-slate-400 hover:text-slate-600"><Grid size={18}/></button>
                </div>
             </div>
         </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 flex-1 flex flex-col overflow-hidden relative">
          <div className="flex-1 overflow-auto custom-scrollbar">
             <table className="w-full text-left text-sm border-separate border-spacing-0">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-black uppercase text-[9px] tracking-[0.2em] sticky top-0 z-10 backdrop-blur-md">
                   <tr>
                      <th className="p-5 md:p-6">{t('productName')}</th>
                      <th className="p-6 hidden lg:table-cell">{t('category')}</th>
                      <th className="p-6 text-right hidden md:table-cell">{t('cost')}</th>
                      <th className="p-5 md:p-6 text-right">{t('price')}</th>
                      <th className="p-5 md:p-6 text-center">{t('stock')}</th>
                      <th className="p-5 md:p-6 text-right">{t('action')}</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                   {filteredProducts.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 group transition-all">
                         <td className="p-5 md:p-6">
                             <div className="flex items-center gap-4">
                                 <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-50 dark:border-slate-700 shrink-0">
                                    {p.image ? (
                                      <img src={p.image} onError={handleImageError} className="w-full h-full object-cover" alt={p.name} />
                                    ) : (
                                      <ImageIcon className="text-slate-300" size={20} />
                                    )}
                                 </div>
                                 <div className="min-w-0">
                                     <div className="font-black text-slate-900 dark:text-white tracking-tight text-sm md:text-base group-hover:text-brand-600 truncate">{p.name}</div>
                                     <div className="text-[9px] font-bold font-mono text-slate-400 uppercase tracking-widest mt-0.5 truncate">{formatNumber(p.sku, language)}</div>
                                 </div>
                             </div>
                         </td>
                         <td className="p-6 hidden lg:table-cell">
                             <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{p.category}</span>
                         </td>
                         <td className="p-6 text-right font-bold text-slate-400 dark:text-slate-500 hidden md:table-cell">
                            {formatCurrency(p.costPrice, language, CURRENCY)}
                         </td>
                         <td className="p-5 md:p-6 text-right font-black text-brand-600 dark:text-brand-400 text-base md:text-lg">
                            {formatCurrency(p.sellPrice, language, CURRENCY)}
                         </td>
                         <td className="p-5 md:p-6 text-center">
                            <span className={`px-4 py-1.5 rounded-xl text-xs font-black tracking-tight border-2 ${p.stock < 10 ? 'bg-red-50 border-red-100 text-red-600 dark:bg-red-950/20 dark:border-red-900/30' : 'bg-slate-50 border-slate-100 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'}`}>
                                {formatNumber(p.stock, language)}
                            </span>
                         </td>
                         <td className="p-5 md:p-6 text-right">
                             <div className="flex justify-end gap-2">
                                {canEditProduct && (
                                  <button onClick={() => handleOpenModal(p)} className="p-2.5 bg-white dark:bg-slate-800 text-slate-400 hover:text-brand-600 rounded-xl transition-all border border-slate-100 dark:border-slate-700"><Edit2 size={16}/></button>
                                )}
                                {canDeleteProduct && (
                                  <button onClick={() => onDeleteProduct(p.id)} className="p-2.5 bg-white dark:bg-slate-800 text-slate-400 hover:text-red-500 rounded-xl transition-all border border-slate-100 dark:border-slate-700"><Trash2 size={16}/></button>
                                )}
                             </div>
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xl flex items-end md:items-center justify-center z-[70] p-0 md:p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-t-[3rem] md:rounded-[3rem] shadow-2xl overflow-hidden animate-fade-in-up flex flex-col border border-slate-100 dark:border-slate-800 max-h-[92vh]">
             <div className="p-6 md:p-10 pb-4 md:pb-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                 <div>
                    <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">{editingProduct ? t('editProduct') : t('addProduct')}</h3>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Universal Entry Module</p>
                 </div>
                 <button onClick={() => setIsModalOpen(false)} className="bg-white dark:bg-slate-800 p-3 rounded-2xl text-slate-400 hover:text-red-500 transition-all shadow-sm border border-slate-100 dark:border-slate-700"><X size={24}/></button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 custom-scrollbar">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
                     <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('productName')}</label>
                            <input type="text" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:border-brand-500 dark:text-white font-bold text-lg" placeholder="Name" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('sku')}</label>
                            <div className="flex gap-2">
                                <input type="text" value={formData.sku || ''} onChange={e => setFormData({ ...formData, sku: e.target.value })} className="flex-1 p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:border-brand-500 dark:text-white font-mono font-bold" placeholder="Barcode" />
                                <button onClick={generateBarcode} className="p-4 bg-white dark:bg-slate-800 rounded-2xl text-slate-400 hover:text-brand-600 shadow-sm border border-slate-100 dark:border-slate-700"><RefreshCw size={20}/></button>
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('category')}</label>
                            {isAddingNewCategory ? (
                                <div className="flex gap-2 animate-fade-in">
                                    <input 
                                        type="text" 
                                        value={newCategoryName} 
                                        onChange={e => setNewCategoryName(e.target.value)} 
                                        className="flex-1 p-4 bg-slate-50 dark:bg-slate-800 border-2 border-brand-500 rounded-2xl dark:text-white font-bold" 
                                        placeholder="New Category..."
                                        autoFocus
                                    />
                                    <button onClick={handleCreateCategory} className="p-4 bg-brand-600 text-white rounded-2xl active:scale-95"><Check size={20}/></button>
                                    <button onClick={() => setIsAddingNewCategory(false)} className="p-4 bg-slate-100 dark:bg-slate-700 text-slate-400 rounded-2xl active:scale-95"><X size={20}/></button>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <select 
                                        value={formData.category} 
                                        onChange={e => setFormData({ ...formData, category: e.target.value })} 
                                        className="flex-1 p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl dark:text-white font-black text-[10px] uppercase tracking-widest"
                                    >
                                        {suggestionCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <button onClick={() => setIsAddingNewCategory(true)} className="p-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 text-slate-400 hover:text-brand-600 rounded-2xl shadow-sm"><Plus size={20}/></button>
                                </div>
                            )}
                        </div>
                     </div>

                     <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('cost')}</label>
                                <input type="number" step="0.01" value={formData.costPrice || 0} onChange={e => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl dark:text-white font-black text-lg" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-widest ml-1">{t('price')}</label>
                                <input type="number" step="0.01" value={formData.sellPrice || 0} onChange={e => setFormData({ ...formData, sellPrice: parseFloat(e.target.value) || 0 })} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-brand-100 dark:border-brand-900 rounded-2xl dark:text-white font-black text-lg text-brand-600" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('image')}</label>
                            <div className="flex flex-col gap-3">
                                <div className="aspect-video bg-slate-50 dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden relative group">
                                    {formData.image ? (
                                        <>
                                            <img src={formData.image} onError={handleImageError} className="w-full h-full object-contain p-4" alt="Preview" />
                                            <button onClick={() => setFormData({...formData, image: ''})} className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 opacity-30">
                                            <ImageIcon size={48} />
                                            <span className="text-[10px] font-black uppercase">No Image Set</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={formData.image && !formData.image.startsWith('data:') ? formData.image : ''} 
                                        onChange={e => setFormData({ ...formData, image: e.target.value })} 
                                        placeholder={t('imageUrl')} 
                                        className="flex-1 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-mono dark:text-white"
                                    />
                                    <button onClick={() => fileInputRef.current?.click()} className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 hover:text-brand-600 active:scale-95 transition-all"><Upload size={20}/></button>
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                                </div>
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('stock')}</label>
                            <input type="number" value={formData.stock || 0} onChange={e => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl dark:text-white font-black text-2xl shadow-inner" />
                        </div>
                     </div>
                 </div>
             </div>

             <div className="p-6 md:p-10 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex gap-3">
                 <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest rounded-2xl text-[10px]">{t('cancel')}</button>
                 <button onClick={handleSave} className="flex-[2] py-4 bg-slate-900 dark:bg-brand-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-2xl hover:bg-black transition-all active:scale-[0.98] text-[10px] flex items-center justify-center gap-2">
                    <Save size={18}/> {t('saveProduct')}
                 </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};