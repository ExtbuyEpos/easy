import React, { useState, useRef, useEffect } from 'react';
import { Product } from '../types';
import { Plus, Search, Trash2, Edit2, Save, X, Image as ImageIcon, RefreshCw, Upload, Package, AlertCircle, ChevronLeft, TrendingUp, DollarSign } from 'lucide-react';
import { CURRENCY } from '../constants';

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
}

export const Inventory: React.FC<InventoryProps> = ({ 
  products, categories = [], onAddProduct, onUpdateProduct, onBulkUpdateProduct, onDeleteProduct,
  onAddCategory, onUpdateCategory, onDeleteCategory, initialTab = 'products', onGoBack, t = (k) => k
}) => {
  const [activeTab, setActiveTab] = useState<'products' | 'categories'>(initialTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<Product>>({
    name: '', sku: '', costPrice: 0, sellPrice: 0, stock: 0, category: '', image: ''
  });

  const totalInvCost = products.reduce((acc, p) => acc + (p.costPrice * p.stock), 0);
  const totalInvValue = products.reduce((acc, p) => acc + (p.sellPrice * p.stock), 0);

  const suggestionCategories = categories.length > 0 ? categories : Array.from(new Set(products.map(p => p.category))).sort();

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.includes(searchTerm);
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData(product);
    } else {
      setEditingProduct(null);
      setFormData({ name: '', sku: '', costPrice: 0, sellPrice: 0, stock: 0, category: 'General', image: '' });
    }
    setIsModalOpen(true);
  };

  const generateBarcode = () => {
    setFormData(prev => ({ ...prev, sku: `880${Date.now().toString().slice(-10)}` }));
  };

  const handleSave = () => {
    if (!formData.name || !formData.sellPrice) { alert("Name and Sale Price are required"); return; }
    const productData = {
      id: editingProduct ? editingProduct.id : Date.now().toString(),
      name: formData.name!,
      sku: formData.sku || `SKU-${Date.now()}`,
      costPrice: Number(formData.costPrice || 0),
      sellPrice: Number(formData.sellPrice),
      stock: Number(formData.stock || 0),
      category: formData.category || 'General',
      image: formData.image
    } as Product;

    if (editingProduct) onUpdateProduct(productData);
    else onAddProduct(productData);
    setIsModalOpen(false);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 p-4 lg:p-6 overflow-hidden transition-colors">
      
      <div className="flex flex-col gap-4 mb-6 shrink-0">
         <div className="flex justify-between items-center">
             <div className="flex items-center gap-3">
                <button onClick={onGoBack} className="p-2 -ml-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors">
                    <ChevronLeft size={24} />
                </button>
                <div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Inventory</h2>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest opacity-60">Stock & Price Control</p>
                </div>
            </div>
            <button onClick={() => handleOpenModal()} className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2 shadow-lg transition-all active:scale-95 font-black text-sm uppercase tracking-widest">
                <Plus size={20} /> Add Item
            </button>
         </div>

         {/* Summary Stats Widget */}
         <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-4">
                <div className="bg-slate-100 dark:bg-slate-800 p-2.5 rounded-xl text-slate-500"><Package size={20}/></div>
                <div><div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Items</div><div className="text-lg font-black text-slate-900 dark:text-white leading-none">{products.length}</div></div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-4">
                <div className="bg-emerald-50 dark:bg-emerald-900/30 p-2.5 rounded-xl text-emerald-600"><DollarSign size={20}/></div>
                <div><div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Stock Value</div><div className="text-lg font-black text-slate-900 dark:text-white leading-none">{CURRENCY}{totalInvValue.toLocaleString()}</div></div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 hidden md:flex items-center gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/30 p-2.5 rounded-xl text-blue-600"><TrendingUp size={20}/></div>
                <div><div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Cost</div><div className="text-lg font-black text-slate-900 dark:text-white leading-none">{CURRENCY}{totalInvCost.toLocaleString()}</div></div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 hidden md:flex items-center gap-4">
                <div className="bg-amber-50 dark:bg-amber-900/30 p-2.5 rounded-xl text-amber-600"><AlertCircle size={20}/></div>
                <div><div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Low Stock</div><div className="text-lg font-black text-slate-900 dark:text-white leading-none">{products.filter(p => p.stock < 10).length}</div></div>
            </div>
         </div>
         
         <div className="flex flex-col md:flex-row gap-3">
             <div className="relative flex-1">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                 <input type="text" placeholder="Search by name or SKU..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[22px] outline-none shadow-sm font-medium focus:ring-2 focus:ring-brand-500" />
             </div>
             <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="px-6 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[22px] outline-none shadow-sm font-bold text-slate-600 dark:text-slate-300">
                 <option value="All">All Categories</option>
                 {suggestionCategories.map(c => <option key={c} value={c}>{c}</option>)}
             </select>
         </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-800 flex-1 flex flex-col overflow-hidden transition-colors">
          <div className="flex-1 overflow-auto custom-scrollbar">
             <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-black uppercase text-[10px] tracking-[0.15em] sticky top-0 z-10">
                   <tr>
                      <th className="p-5">Product</th>
                      <th className="p-5 text-right">Cost Price</th>
                      <th className="p-5 text-right">Sale Price</th>
                      <th className="p-5 text-center">Stock</th>
                      <th className="p-5 text-right">Actions</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                   {filteredProducts.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 group transition-colors">
                         <td className="p-5">
                             <div className="flex items-center gap-4">
                                 <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700">
                                    {p.image ? <img src={p.image} className="w-full h-full object-cover" /> : <ImageIcon className="text-slate-300" />}
                                 </div>
                                 <div>
                                     <div className="font-black text-slate-900 dark:text-white tracking-tight">{p.name}</div>
                                     <div className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest">{p.sku}</div>
                                 </div>
                             </div>
                         </td>
                         <td className="p-5 text-right font-bold text-slate-500 dark:text-slate-400">{CURRENCY}{p.costPrice.toFixed(2)}</td>
                         <td className="p-5 text-right font-black text-brand-600 dark:text-brand-400">{CURRENCY}{p.sellPrice.toFixed(2)}</td>
                         <td className="p-5 text-center">
                            <span className={`px-4 py-1 rounded-full text-xs font-black tracking-tight ${p.stock < 10 ? 'bg-red-50 dark:bg-red-900/20 text-red-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}>{p.stock}</span>
                         </td>
                         <td className="p-5 text-right">
                             <div className="flex justify-end gap-2">
                                <button onClick={() => handleOpenModal(p)} className="p-3 text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-xl transition-all"><Edit2 size={18} /></button>
                                <button onClick={() => onDeleteProduct(p.id)} className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"><Trash2 size={18} /></button>
                             </div>
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
             {filteredProducts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <Search size={64} className="opacity-10 mb-4" />
                    <p className="font-black uppercase tracking-widest text-xs">No items found</p>
                </div>
             )}
          </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-fade-in flex flex-col border border-slate-100 dark:border-slate-800">
             <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/30">
                 <div><h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">{editingProduct ? 'Edit Product' : 'Add Item'}</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Inventory Management</p></div>
                 <button onClick={() => setIsModalOpen(false)} className="bg-slate-200 dark:bg-slate-700 p-2.5 rounded-full text-slate-600 dark:text-slate-300 hover:rotate-90 transition-all duration-300"><X size={24}/></button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-8 space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Product Title</label>
                            <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:border-brand-500 dark:text-white font-bold" placeholder="e.g. Engine Oil 1L" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">SKU / Barcode</label>
                            <div className="flex gap-2">
                                <input type="text" value={formData.sku} onChange={e => setFormData({ ...formData, sku: e.target.value })} className="flex-1 p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:border-brand-500 dark:text-white font-mono" placeholder="Scan or Type" />
                                <button onClick={generateBarcode} className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-500 hover:text-brand-600 transition-colors shadow-sm"><RefreshCw size={20}/></button>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Category</label>
                            <input list="cats" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:border-brand-500 dark:text-white font-bold" />
                            <datalist id="cats">{suggestionCategories.map(c => <option key={c} value={c} />)}</datalist>
                        </div>
                     </div>

                     <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Cost Price</label>
                                <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{CURRENCY}</span><input type="number" step="0.01" value={formData.costPrice} onChange={e => setFormData({ ...formData, costPrice: parseFloat(e.target.value) })} className="w-full p-4 pl-8 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:border-brand-500 dark:text-white font-black" /></div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-widest ml-1">Sale Price</label>
                                <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-400 font-bold">{CURRENCY}</span><input type="number" step="0.01" value={formData.sellPrice} onChange={e => setFormData({ ...formData, sellPrice: parseFloat(e.target.value) })} className="w-full p-4 pl-8 bg-slate-50 dark:bg-slate-800 border-2 border-brand-100 dark:border-brand-900 rounded-2xl outline-none focus:border-brand-500 dark:text-white font-black text-brand-600" /></div>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Current Stock Level</label>
                            <input type="number" value={formData.stock} onChange={e => setFormData({ ...formData, stock: parseInt(e.target.value) })} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:border-brand-500 dark:text-white font-black text-xl" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Image URL or Base64</label>
                            <div className="flex gap-2">
                                <input type="text" value={formData.image} onChange={e => setFormData({ ...formData, image: e.target.value })} className="flex-1 p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:border-brand-500 dark:text-white text-xs" placeholder="https://..." />
                                <div onClick={() => fileInputRef.current?.click()} className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-500 hover:text-brand-600 cursor-pointer shadow-sm"><Upload size={20}/></div>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if(f){ const r = new FileReader(); r.onloadend = () => setFormData(p => ({...p, image: r.result as string})); r.readAsDataURL(f); } }} />
                            </div>
                        </div>
                     </div>
                 </div>
             </div>

             <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex gap-4">
                 <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-slate-600 dark:text-slate-400 font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-800 rounded-2xl transition-colors">Cancel</button>
                 <button onClick={handleSave} className="flex-[2] py-4 bg-slate-900 dark:bg-brand-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl hover:bg-black dark:hover:bg-brand-500 transition-all active:scale-[0.98]">Save Product Record</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};