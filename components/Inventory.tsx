import React, { useState, useRef, useEffect } from 'react';
import { Product, User } from '../types';
import { Plus, Search, Trash2, Edit2, Save, X, Image as ImageIcon, RefreshCw, Upload, Package, AlertCircle, ChevronLeft, TrendingUp, DollarSign, List, Grid } from 'lucide-react';
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
  currentUser?: User;
}

export const Inventory: React.FC<InventoryProps> = ({ 
  products, categories = [], onAddProduct, onUpdateProduct, onBulkUpdateProduct, onDeleteProduct,
  onAddCategory, onUpdateCategory, onDeleteCategory, initialTab = 'products', onGoBack, t = (k) => k,
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState<'products' | 'categories'>(initialTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
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
      setFormData({
        ...product,
        image: product.image || ''
      });
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
    e.currentTarget.src = 'https://via.placeholder.com/150?text=Invalid+URL';
    e.currentTarget.onerror = null; 
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 p-4 lg:p-8 overflow-hidden transition-colors">
      
      {/* Dynamic Header */}
      <div className="flex flex-col gap-6 mb-8 shrink-0">
         <div className="flex justify-between items-center">
             <div className="flex items-center gap-4">
                <button onClick={onGoBack} className="p-3 -ml-3 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-all active:scale-90">
                    <ChevronLeft size={28} />
                </button>
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">Inventory Console</h2>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mt-1">Real-Time Stock Audit & Control</p>
                </div>
            </div>
            {canAddProduct && (
              <button onClick={() => handleOpenModal()} className="bg-brand-600 hover:bg-brand-500 text-white px-8 py-4 rounded-[2rem] flex items-center gap-3 shadow-2xl shadow-brand-500/20 transition-all active:scale-95 font-black text-xs uppercase tracking-widest border border-brand-400/20">
                  <Plus size={20} strokeWidth={3} /> New Product
              </button>
            )}
         </div>

         {/* Stats Cards */}
         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="group bg-white dark:bg-slate-900 p-5 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-4 transition-all hover:shadow-xl">
                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-500 transition-all"><Package size={22}/></div>
                <div>
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Stock</div>
                    <div className="text-xl font-black text-slate-900 dark:text-white leading-none">{products.reduce((a,b)=>a+b.stock,0)}</div>
                </div>
            </div>
            <div className="group bg-white dark:bg-slate-900 p-5 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-4 transition-all hover:shadow-xl">
                <div className="bg-emerald-50 dark:bg-emerald-900/30 p-3 rounded-2xl text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all"><DollarSign size={22}/></div>
                <div>
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Retail Value</div>
                    <div className="text-xl font-black text-slate-900 dark:text-white leading-none">{CURRENCY}{totalInvValue.toLocaleString()}</div>
                </div>
            </div>
            <div className="group bg-white dark:bg-slate-900 p-5 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-4 transition-all hover:shadow-xl">
                <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-2xl text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all"><TrendingUp size={22}/></div>
                <div>
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Potential Margin</div>
                    <div className="text-xl font-black text-slate-900 dark:text-white leading-none">{CURRENCY}{(totalInvValue - totalInvCost).toLocaleString()}</div>
                </div>
            </div>
            <div className="group bg-white dark:bg-slate-900 p-5 rounded-[2rem] shadow-sm border border-red-100 dark:border-red-900/20 flex items-center gap-4 transition-all hover:shadow-xl">
                <div className="bg-red-50 dark:bg-red-900/30 p-3 rounded-2xl text-red-500 group-hover:bg-red-500 group-hover:text-white transition-all"><AlertCircle size={22}/></div>
                <div>
                    <div className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-1">Low Stock Alerts</div>
                    <div className="text-xl font-black text-red-900 dark:text-red-100 leading-none">{products.filter(p => p.stock < 10).length}</div>
                </div>
            </div>
         </div>
         
         {/* Filter Console */}
         <div className="flex flex-col md:flex-row gap-4">
             <div className="relative flex-1 group">
                 <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={20} />
                 <input type="text" placeholder="Search by name, SKU, or category..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-14 pr-4 py-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] outline-none shadow-sm font-bold text-sm focus:ring-4 focus:ring-brand-500/10 transition-all dark:text-white" />
             </div>
             <div className="flex gap-2">
                <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="px-8 py-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] outline-none shadow-sm font-black text-xs uppercase tracking-widest text-slate-600 dark:text-slate-300 focus:ring-4 focus:ring-brand-500/10 appearance-none cursor-pointer pr-12 relative bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM5NGEzYjgiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJtNiA5IDYgNiA2LTYiLz48L3N2Zz4=')] bg-[length:20px] bg-[right_1.5rem_center] bg-no-repeat">
                    <option value="All">All Categories</option>
                    {suggestionCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-1.5 shadow-sm">
                    <button className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full text-brand-600"><List size={20}/></button>
                    <button className="p-3 text-slate-400 hover:text-slate-600"><Grid size={20}/></button>
                </div>
             </div>
         </div>
      </div>

      {/* Main Table Area */}
      <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 flex-1 flex flex-col overflow-hidden transition-all relative">
          <div className="flex-1 overflow-auto custom-scrollbar">
             <table className="w-full text-left text-sm border-separate border-spacing-0">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-black uppercase text-[10px] tracking-[0.25em] sticky top-0 z-10 backdrop-blur-md border-b border-slate-100">
                   <tr>
                      <th className="p-6">Product Details</th>
                      <th className="p-6">Category</th>
                      <th className="p-6 text-right">Cost Basis</th>
                      <th className="p-6 text-right">Sale Price</th>
                      <th className="p-6 text-center">In Stock</th>
                      <th className="p-6 text-right">Actions</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                   {filteredProducts.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 group transition-all duration-300">
                         <td className="p-6">
                             <div className="flex items-center gap-5">
                                 <div className="w-16 h-16 rounded-[24px] bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border-2 border-slate-50 dark:border-slate-700 group-hover:scale-105 transition-transform">
                                    {p.image ? (
                                      <img 
                                        src={p.image} 
                                        onError={handleImageError} 
                                        className="w-full h-full object-cover" 
                                        alt={p.name}
                                      />
                                    ) : (
                                      <ImageIcon className="text-slate-300" size={24} />
                                    )}
                                 </div>
                                 <div>
                                     <div className="font-black text-slate-900 dark:text-white tracking-tight text-base group-hover:text-brand-600 transition-colors">{p.name}</div>
                                     <div className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest mt-0.5">{p.sku}</div>
                                 </div>
                             </div>
                         </td>
                         <td className="p-6">
                             <span className="px-4 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{p.category}</span>
                         </td>
                         <td className="p-6 text-right font-bold text-slate-400 dark:text-slate-500">{CURRENCY}{p.costPrice.toFixed(2)}</td>
                         <td className="p-6 text-right font-black text-brand-600 dark:text-brand-400 text-lg">{CURRENCY}{p.sellPrice.toFixed(2)}</td>
                         <td className="p-6 text-center">
                            <div className="flex flex-col items-center">
                                <span className={`px-5 py-1.5 rounded-2xl text-xs font-black tracking-tight border-2 ${p.stock < 10 ? 'bg-red-50 border-red-100 text-red-600 dark:bg-red-950/20 dark:border-red-900/30' : 'bg-slate-50 border-slate-100 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'}`}>{p.stock}</span>
                                {p.stock < 10 && <span className="text-[8px] font-black uppercase text-red-400 mt-1 tracking-widest animate-pulse">Critical</span>}
                            </div>
                         </td>
                         <td className="p-6 text-right">
                             <div className="flex justify-end gap-3">
                                {canEditProduct && (
                                  <button onClick={() => handleOpenModal(p)} className="p-3 bg-white dark:bg-slate-800 text-slate-400 hover:text-brand-600 hover:shadow-lg rounded-[1.2rem] transition-all border border-slate-100 dark:border-slate-700"><Edit2 size={18}/></button>
                                )}
                                {canDeleteProduct && (
                                  <button onClick={() => onDeleteProduct(p.id)} className="p-3 bg-white dark:bg-slate-800 text-slate-400 hover:text-red-500 hover:shadow-lg rounded-[1.2rem] transition-all border border-slate-100 dark:border-slate-700"><Trash2 size={18}/></button>
                                )}
                             </div>
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
             {filteredProducts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-32 text-slate-400">
                    <div className="p-10 bg-slate-50 dark:bg-slate-800 rounded-[3rem] mb-6 opacity-40">
                        <Search size={80} strokeWidth={1}/>
                    </div>
                    <p className="font-black uppercase tracking-[0.3em] text-xs">No matching inventory records</p>
                </div>
             )}
          </div>
      </div>

      {/* Advanced Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xl flex items-center justify-center z-[70] p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.4)] overflow-hidden animate-fade-in-up flex flex-col border border-slate-100 dark:border-slate-800">
             <div className="p-10 pb-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                 <div>
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">{editingProduct ? 'Update Item' : 'Create Record'}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-1.5">Master Inventory v2.0</p>
                 </div>
                 <button onClick={() => setIsModalOpen(false)} className="bg-white dark:bg-slate-800 p-3 rounded-2xl text-slate-400 hover:text-red-500 hover:rotate-90 transition-all duration-300 shadow-sm border border-slate-100 dark:border-slate-700"><X size={24}/></button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                     <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Product Description</label>
                            <input type="text" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full p-5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[2rem] outline-none focus:border-brand-500 dark:text-white font-bold text-lg shadow-inner transition-all" placeholder="Enter product name..." />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Universal SKU / Barcode</label>
                            <div className="flex gap-3">
                                <input type="text" value={formData.sku || ''} onChange={e => setFormData({ ...formData, sku: e.target.value })} className="flex-1 p-5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[2rem] outline-none focus:border-brand-500 dark:text-white font-mono font-bold shadow-inner transition-all" placeholder="Scan or Manual Entry" />
                                <button onClick={generateBarcode} className="p-5 bg-white dark:bg-slate-800 rounded-[2rem] text-slate-400 hover:text-brand-600 transition-all shadow-sm border border-slate-100 dark:border-slate-700 active:scale-90"><RefreshCw size={24}/></button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Inventory Category</label>
                            <input list="cats-modal" value={formData.category || 'General'} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full p-5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[2rem] outline-none focus:border-brand-500 dark:text-white font-black text-xs uppercase tracking-widest shadow-inner transition-all" />
                            <datalist id="cats-modal">{suggestionCategories.map(c => <option key={c} value={c} />)}</datalist>
                        </div>
                     </div>

                     <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cost Basis</label>
                                <div className="relative">
                                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 font-bold">{CURRENCY}</span>
                                    <input type="number" step="0.01" value={formData.costPrice || 0} onChange={e => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })} className="w-full p-5 pl-10 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[2rem] outline-none focus:border-brand-500 dark:text-white font-black text-xl shadow-inner transition-all" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-widest ml-1">Retail Price</label>
                                <div className="relative">
                                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-brand-400 font-bold">{CURRENCY}</span>
                                    <input type="number" step="0.01" value={formData.sellPrice || 0} onChange={e => setFormData({ ...formData, sellPrice: parseFloat(e.target.value) || 0 })} className="w-full p-5 pl-10 bg-slate-50 dark:bg-slate-800 border-2 border-brand-100 dark:border-brand-900 rounded-[2rem] outline-none focus:border-brand-500 dark:text-white font-black text-xl text-brand-600 shadow-inner transition-all" />
                                </div>
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Media Assets</label>
                           <div className="flex flex-col gap-4">
                              <div className="relative aspect-video rounded-[2.5rem] bg-slate-50 dark:bg-slate-800 border-4 border-dashed border-slate-100 dark:border-slate-700 flex items-center justify-center overflow-hidden group shadow-inner">
                                 {formData.image ? (
                                    <>
                                       <img src={formData.image} onError={handleImageError} className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500" alt="Preview" />
                                       <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                           <button onClick={() => setFormData({...formData, image: ''})} className="bg-red-500 text-white p-4 rounded-full shadow-2xl hover:scale-110 active:scale-90 transition-all"><Trash2 size={24}/></button>
                                       </div>
                                    </>
                                 ) : (
                                    <div className="flex flex-col items-center text-slate-300 pointer-events-none">
                                       <ImageIcon size={64} strokeWidth={1} className="opacity-40" />
                                       <span className="text-[9px] font-black uppercase mt-4 tracking-[0.3em] opacity-60">Null Media Payload</span>
                                    </div>
                                 )}
                              </div>
                              <div className="flex gap-3">
                                 <input type="text" value={formData.image || ''} onChange={e => setFormData({ ...formData, image: e.target.value })} className="flex-1 p-5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[2rem] outline-none focus:border-brand-500 dark:text-white text-[10px] font-mono shadow-inner transition-all" placeholder="Paste remote URL or Base64..." />
                                 <button onClick={() => fileInputRef.current?.click()} className="p-5 bg-white dark:bg-slate-800 rounded-[2rem] text-slate-400 hover:text-brand-600 transition-all shadow-sm border border-slate-100 dark:border-slate-700 active:scale-90"><Upload size={24}/></button>
                                 <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if(f){ const r = new FileReader(); r.onloadend = () => { setFormData(p => ({...p, image: r.result as string})); if (fileInputRef.current) fileInputRef.current.value = ''; }; r.readAsDataURL(f); } }} />
                              </div>
                           </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Audit Count (On Hand)</label>
                            <input type="number" value={formData.stock || 0} onChange={e => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })} className="w-full p-5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[2rem] outline-none focus:border-brand-500 dark:text-white font-black text-2xl shadow-inner transition-all" />
                        </div>
                     </div>
                 </div>
             </div>

             <div className="p-10 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex gap-4">
                 <button onClick={() => setIsModalOpen(false)} className="flex-1 py-5 text-slate-500 dark:text-slate-400 font-black uppercase tracking-[0.2em] hover:bg-slate-200 dark:hover:bg-slate-800 rounded-[2rem] transition-all text-[10px]">Cancel</button>
                 <button onClick={handleSave} className="flex-[2] py-5 bg-slate-900 dark:bg-brand-600 text-white font-black uppercase tracking-[0.2em] rounded-[2rem] shadow-2xl hover:bg-black dark:hover:bg-brand-500 transition-all active:scale-[0.98] text-[10px] border border-white/10 flex items-center justify-center gap-3">
                    <Save size={18}/> Commit Product Instance
                 </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};