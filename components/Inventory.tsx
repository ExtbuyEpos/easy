import React, { useState, useRef, useEffect } from 'react';
import { Product } from '../types';
import { Plus, Search, Trash2, Edit2, Save, X, Image as ImageIcon, RefreshCw, Upload, Tag, Layers, CheckSquare, MoreHorizontal, Filter, List, Package, AlertCircle } from 'lucide-react';
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
}

export const Inventory: React.FC<InventoryProps> = ({ 
  products, 
  categories = [], 
  onAddProduct, 
  onUpdateProduct, 
  onBulkUpdateProduct, 
  onDeleteProduct,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  initialTab = 'products'
}) => {
  const [activeTab, setActiveTab] = useState<'products' | 'categories'>(initialTab);
  
  // Update active tab if initialTab prop changes
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All'); // Category Filter State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Category Edit State
  const [editingCategory, setEditingCategory] = useState<{ original: string, current: string } | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Bulk Edit State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<'SET' | 'ADD' | 'REMOVE'>('SET');
  const [bulkValue, setBulkValue] = useState<number>(0);

  // Low Stock Config
  const [lowStockThreshold, setLowStockThreshold] = useState(10);

  const [formData, setFormData] = useState<Partial<Product>>({
    name: '', sku: '', costPrice: 0, sellPrice: 0, stock: 0, category: '', image: '', tags: []
  });
  const [tagInput, setTagInput] = useState('');

  // Use the categories prop for suggestions, fallback to unique from products if empty
  const suggestionCategories = categories.length > 0 ? categories : Array.from(new Set(products.map(p => p.category))).sort();

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.sku.includes(searchTerm) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.tags && p.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())));
    
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const filteredCategories = suggestionCategories.filter(c => c.toLowerCase().includes(searchTerm.toLowerCase()));

  // Selection Handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = new Set(filteredProducts.map(p => p.id));
      setSelectedIds(allIds);
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkSave = () => {
    const productsToUpdate = products.filter(p => selectedIds.has(p.id));
    const updatedProducts = productsToUpdate.map(p => {
      let newStock = p.stock;
      if (bulkAction === 'SET') newStock = bulkValue;
      if (bulkAction === 'ADD') newStock = p.stock + bulkValue;
      if (bulkAction === 'REMOVE') newStock = Math.max(0, p.stock - bulkValue);
      
      return { ...p, stock: newStock };
    });

    onBulkUpdateProduct(updatedProducts);
    setIsBulkModalOpen(false);
    setSelectedIds(new Set());
    setBulkValue(0);
  };

  // Regular Edit Handlers
  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData(product);
      setTagInput(product.tags ? product.tags.join(', ') : '');
    } else {
      setEditingProduct(null);
      setFormData({ 
        name: '', 
        sku: '', 
        costPrice: 0, 
        sellPrice: 0, 
        stock: 0, 
        category: '',
        image: '',
        tags: []
      });
      setTagInput('');
    }
    setIsModalOpen(true);
  };

  const generateBarcode = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    const barcode = `880${timestamp}${random}`.slice(0, 13);
    setFormData(prev => ({ ...prev, sku: barcode }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (!formData.name) {
      alert("Product Name is required");
      return;
    }
    
    let finalSku = formData.sku;
    if (!finalSku) {
       const timestamp = Date.now().toString().slice(-6);
       const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
       finalSku = `880${timestamp}${random}`.slice(0, 13);
    }

    const finalTags = tagInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const productData = {
      id: editingProduct ? editingProduct.id : Date.now().toString(),
      name: formData.name!,
      sku: finalSku,
      costPrice: Number(formData.costPrice),
      sellPrice: Number(formData.sellPrice),
      stock: Number(formData.stock),
      category: formData.category || 'General',
      image: formData.image,
      tags: finalTags
    } as Product;

    if (editingProduct) {
      onUpdateProduct(productData);
    } else {
      onAddProduct(productData);
    }
    setIsModalOpen(false);
  };

  // Category Handlers
  const handleStartEditCategory = (cat: string) => {
    setEditingCategory({ original: cat, current: cat });
  };

  const handleSaveCategory = () => {
    if (editingCategory && onUpdateCategory) {
       onUpdateCategory(editingCategory.original, editingCategory.current);
       setEditingCategory(null);
    }
  };

  const handleCreateCategory = () => {
    if (newCategoryName.trim() && onAddCategory) {
      onAddCategory(newCategoryName.trim());
      setNewCategoryName('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 p-4 lg:p-6 overflow-hidden relative">
      
      {/* Top Header & Actions */}
      <div className="flex flex-col gap-4 mb-4 shrink-0">
         <div className="flex flex-wrap justify-between items-center gap-2">
             <div>
                <h2 className="text-xl md:text-2xl font-bold text-slate-800">Inventory Management</h2>
                <p className="text-slate-500 text-xs md:text-sm hidden md:block">Manage stock levels, pricing, images, and categories.</p>
            </div>
            {activeTab === 'products' ? (
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-transform text-sm font-bold"
                >
                    <Plus size={18} /> Add Product
                </button>
            ) : (
                <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="New Category..."
                      className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-32 md:w-auto"
                    />
                    <button
                        onClick={handleCreateCategory}
                        disabled={!newCategoryName.trim()}
                        className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-transform disabled:opacity-50 text-sm font-bold"
                    >
                        <Plus size={18} /> Add
                    </button>
                </div>
            )}
         </div>

         <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex gap-2 overflow-x-auto">
                <button 
                  onClick={() => setActiveTab('products')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-bold transition-all whitespace-nowrap ${activeTab === 'products' ? 'bg-white text-brand-600 border-b-2 border-brand-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Package size={18} /> Products
                </button>
                <button 
                  onClick={() => setActiveTab('categories')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-bold transition-all whitespace-nowrap ${activeTab === 'categories' ? 'bg-white text-brand-600 border-b-2 border-brand-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <List size={18} /> Categories
                </button>
            </div>
            
            <div className="flex flex-col md:flex-row gap-2 md:items-center flex-1 md:max-w-2xl justify-end">
                 {activeTab === 'products' && (
                     <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm self-start md:self-auto">
                         <span className="text-xs font-bold text-slate-500 whitespace-nowrap flex items-center gap-1">
                             <AlertCircle size={14} className="text-red-400"/> Low Stock Alert:
                         </span>
                         <input 
                           type="number" 
                           min="0"
                           value={lowStockThreshold}
                           onChange={(e) => setLowStockThreshold(Number(e.target.value))}
                           className="w-12 text-sm font-bold text-center border-b border-slate-300 focus:outline-none focus:border-brand-500 text-slate-700"
                         />
                     </div>
                 )}
                 
                 {/* Category Filter */}
                 {activeTab === 'products' && (
                     <div className="relative">
                         <select
                             value={selectedCategory}
                             onChange={(e) => setSelectedCategory(e.target.value)}
                             className="w-full md:w-auto appearance-none bg-white border border-slate-200 text-slate-700 py-2 pl-3 pr-8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer font-medium"
                         >
                             <option value="All">All Categories</option>
                             {suggestionCategories.map(cat => (
                                 <option key={cat} value={cat}>{cat}</option>
                             ))}
                         </select>
                         <Filter className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                     </div>
                 )}

                 <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder={activeTab === 'products' ? "Search products..." : "Search categories..."}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm bg-white"
                    />
                 </div>
            </div>
         </div>

         {/* Bulk Actions Bar (Only visible when items selected in Products tab) */}
         {activeTab === 'products' && selectedIds.size > 0 && (
            <div className="bg-slate-800 text-white p-3 rounded-lg flex items-center justify-between animate-fade-in shadow-lg">
                <div className="flex items-center gap-2">
                    <CheckSquare size={16} className="text-brand-400"/>
                    <span className="text-sm font-bold">{selectedIds.size} Selected</span>
                </div>
                <button 
                  onClick={() => setIsBulkModalOpen(true)}
                  className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded text-xs font-bold transition-colors"
                >
                    Bulk Edit
                </button>
            </div>
         )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden">
        {activeTab === 'products' ? (
          /* --- PRODUCTS TAB CONTENT --- */
          <div className="flex-1 overflow-auto bg-slate-50">
            {/* Desktop Table Header */}
            <div className="hidden md:flex bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10 text-sm">
               <div className="p-4 w-12 text-center">
                  <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-gray-300 focus:ring-brand-500"
                      checked={filteredProducts.length > 0 && selectedIds.size === filteredProducts.length}
                      onChange={handleSelectAll}
                  />
               </div>
               <div className="p-4 w-20">Image</div>
               <div className="p-4 flex-1">Product Details</div>
               <div className="p-4 w-32 text-right">Price</div>
               <div className="p-4 w-24 text-center">Stock</div>
               <div className="p-4 w-20 text-center">Edit</div>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredProducts.map(product => {
                  const isSelected = selectedIds.has(product.id);
                  const isLowStock = product.stock <= lowStockThreshold;

                  return (
                    <div key={product.id} className={`group bg-white hover:bg-slate-50 transition-colors ${isSelected ? 'bg-blue-50/50' : ''}`}>
                      {/* Desktop Row Layout */}
                      <div className="hidden md:flex items-center">
                          <div className="p-4 w-12 text-center">
                              <input 
                                  type="checkbox" 
                                  className="w-4 h-4 rounded border-gray-300 focus:ring-brand-500"
                                  checked={isSelected}
                                  onChange={() => handleSelectOne(product.id)}
                              />
                          </div>
                          <div className="p-4 w-20">
                              <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden border border-slate-200 relative">
                                  {product.image ? (
                                      <img src={product.image} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                      <ImageIcon className="w-full h-full p-2 text-slate-300" />
                                  )}
                              </div>
                          </div>
                          <div className="p-4 flex-1">
                              <div className="flex items-center gap-2">
                                  <div className="font-bold text-slate-800">{product.name}</div>
                                  {isLowStock && (
                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title={`Low Stock (Below ${lowStockThreshold})`}></div>
                                  )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded">{product.sku}</span>
                                  <span className="text-[10px] text-slate-400 uppercase tracking-wide px-1.5 py-0.5 border border-slate-100 rounded-full">{product.category}</span>
                              </div>
                          </div>
                          <div className="p-4 w-32 text-right font-medium text-slate-900">
                              {CURRENCY}{product.sellPrice.toFixed(2)}
                          </div>
                          <div className="p-4 w-24 text-center">
                              <div className={`inline-block px-2 py-1 rounded text-sm font-bold ${isLowStock ? 'text-red-600 bg-red-50 border border-red-100' : 'text-green-600'}`}>
                                 {product.stock}
                              </div>
                          </div>
                          <div className="p-4 w-20 text-center">
                              <button onClick={() => handleOpenModal(product)} className="text-slate-400 hover:text-brand-600 transition-colors p-2">
                                  <Edit2 size={16} />
                              </button>
                          </div>
                      </div>

                      {/* Mobile Card Layout - UPDATED for better touch targets */}
                      <div className="md:hidden p-4 relative border-b border-slate-50 last:border-0 active:bg-slate-50 transition-colors">
                          <div className="flex gap-4">
                              {/* Selection Area - Larger Touch Target */}
                              <div className="absolute top-0 left-0 bottom-0 w-12 z-0" onClick={() => handleSelectOne(product.id)}></div>
                              
                              <div className="relative z-10 pt-1">
                                  <input 
                                      type="checkbox" 
                                      className="w-5 h-5 rounded border-gray-300 focus:ring-brand-500 bg-white shadow-sm"
                                      checked={isSelected}
                                      onChange={() => handleSelectOne(product.id)}
                                  />
                              </div>

                              <div className="w-20 h-20 shrink-0 rounded-lg bg-slate-100 overflow-hidden border border-slate-200 relative">
                                  {product.image ? (
                                      <img src={product.image} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                      <ImageIcon className="w-full h-full p-4 text-slate-300" />
                                  )}
                              </div>

                              <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                                  <div>
                                      <div className="flex justify-between items-start gap-2">
                                          <h3 className="font-bold text-slate-800 text-sm leading-tight line-clamp-2">
                                              {product.name}
                                          </h3>
                                          {isLowStock && <div className="w-2 h-2 shrink-0 rounded-full bg-red-500 animate-pulse mt-1"></div>}
                                      </div>
                                      <div className="text-xs text-slate-500 font-mono mt-1">{product.sku}</div>
                                  </div>
                                  
                                  <div className="flex justify-between items-end mt-2">
                                      <div className="text-lg font-bold text-slate-900 leading-none">{CURRENCY}{product.sellPrice.toFixed(2)}</div>
                                      <div className="flex items-center gap-3">
                                          <span className={`text-xs font-bold ${isLowStock ? 'text-red-600' : 'text-green-600'}`}>
                                              {product.stock} Stock
                                          </span>
                                          <button 
                                            onClick={() => handleOpenModal(product)} 
                                            className="bg-slate-100 text-slate-500 p-2 rounded-lg active:bg-brand-50 active:text-brand-600 transition-colors"
                                          >
                                              <Edit2 size={16} />
                                          </button>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                    </div>
                  );
              })}
            </div>
            
            {filteredProducts.length === 0 && (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                      <Search size={32} className="opacity-50" />
                  </div>
                  <p>No products found.</p>
              </div>
            )}
          </div>
        ) : (
          /* --- CATEGORIES TAB CONTENT --- */
          <div className="flex-1 overflow-auto bg-slate-50">
             <div className="hidden md:flex bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10 text-sm">
                <div className="p-4 flex-1">Category Name</div>
                <div className="p-4 w-32 text-center">Items Count</div>
                <div className="p-4 w-32 text-right">Actions</div>
             </div>
             
             <div className="divide-y divide-slate-100">
                {filteredCategories.map(cat => {
                   const count = products.filter(p => p.category === cat).length;
                   const isEditing = editingCategory?.original === cat;

                   return (
                     <div key={cat} className="group bg-white hover:bg-slate-50 transition-colors flex items-center p-4">
                        <div className="flex-1 font-bold text-slate-800">
                           {isEditing ? (
                             <div className="flex items-center gap-2 max-w-sm">
                                <input 
                                  autoFocus
                                  type="text" 
                                  value={editingCategory.current}
                                  onChange={e => setEditingCategory({...editingCategory, current: e.target.value})}
                                  className="w-full px-2 py-1 border border-brand-500 rounded focus:outline-none"
                                />
                                <button onClick={handleSaveCategory} className="text-green-600 p-2 hover:bg-green-50 rounded"><Save size={18}/></button>
                                <button onClick={() => setEditingCategory(null)} className="text-red-600 p-2 hover:bg-red-50 rounded"><X size={18}/></button>
                             </div>
                           ) : (
                             <span>{cat}</span>
                           )}
                        </div>
                        <div className="w-32 text-center hidden md:block">
                           <span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold text-slate-600">{count} Items</span>
                        </div>
                        {/* Mobile Count */}
                        <div className="md:hidden mr-4">
                           <span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold text-slate-600">{count}</span>
                        </div>
                        
                        <div className="w-auto md:w-32 text-right flex justify-end gap-2">
                           {!isEditing && (
                             <>
                               <button 
                                 onClick={() => handleStartEditCategory(cat)}
                                 className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors"
                               >
                                  <Edit2 size={18} />
                               </button>
                               <button 
                                 onClick={() => onDeleteCategory && onDeleteCategory(cat)}
                                 className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                               >
                                  <Trash2 size={18} />
                               </button>
                             </>
                           )}
                        </div>
                     </div>
                   );
                })}
             </div>
             
             {filteredCategories.length === 0 && (
                <div className="p-12 text-center text-slate-400 flex flex-col items-center">
                    <List size={32} className="opacity-20 mb-4" />
                    <p>No categories found.</p>
                </div>
             )}
          </div>
        )}
      </div>

      {/* Add/Edit Product Modal - Full Screen on Mobile */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 md:p-4">
          <div className="bg-white w-full h-full md:h-auto md:max-h-[90vh] md:max-w-2xl md:rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-fade-in">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="text-lg font-bold text-slate-800">{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="bg-slate-200 p-2 rounded-full text-slate-600 hover:bg-slate-300"><X size={20} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-32 md:pb-6">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Image Upload Section */}
                <div className="w-full md:w-1/3 flex flex-col gap-3">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Product Image</label>
                  <div 
                    className="aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center cursor-pointer relative overflow-hidden group hover:border-brand-400 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {formData.image ? (
                      <>
                        <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-white text-xs font-bold">Change Image</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-4">
                        <div className="bg-white p-3 rounded-full shadow-sm inline-block mb-3">
                            <Upload className="text-brand-500" size={24} />
                        </div>
                        <span className="text-xs text-slate-400 block font-medium">Tap to Upload</span>
                      </div>
                    )}
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleImageUpload}
                    />
                  </div>
                </div>

                {/* Form Fields Section */}
                <div className="w-full md:w-2/3 space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Product Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                      placeholder="e.g. Premium Coffee"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase">Category</label>
                      <input
                        type="text"
                        list="category-suggestions"
                        value={formData.category}
                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-brand-500"
                        placeholder="Select or Type..."
                      />
                      <datalist id="category-suggestions">
                        {suggestionCategories.map(cat => (
                          <option key={cat} value={cat} />
                        ))}
                      </datalist>
                    </div>
                    
                    <div className="space-y-1.5">
                       <label className="text-xs font-bold text-slate-500 uppercase">SKU / Barcode</label>
                       <div className="flex gap-2">
                         <input
                          type="text"
                          value={formData.sku}
                          onChange={e => setFormData({ ...formData, sku: e.target.value })}
                          className="w-full p-3 border border-slate-200 rounded-xl font-mono text-sm outline-none focus:border-brand-500"
                          placeholder="Auto"
                        />
                        <button 
                          onClick={generateBarcode}
                          className="px-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition-colors"
                          title="Generate Random SKU"
                        >
                          <RefreshCw size={18} />
                        </button>
                       </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase">Cost</label>
                      <input
                        type="number"
                        value={formData.costPrice}
                        onChange={e => setFormData({ ...formData, costPrice: parseFloat(e.target.value) })}
                        className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-brand-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase">Price</label>
                      <input
                        type="number"
                        value={formData.sellPrice}
                        onChange={e => setFormData({ ...formData, sellPrice: parseFloat(e.target.value) })}
                        className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-brand-500 font-bold text-slate-800"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase">Stock</label>
                      <input
                        type="number"
                        value={formData.stock}
                        onChange={e => setFormData({ ...formData, stock: parseInt(e.target.value) })}
                        className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-white border-t border-slate-100 flex gap-3 shrink-0 pb-safe fixed bottom-0 left-0 right-0 md:static">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3.5 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition-colors border border-slate-200 md:border-transparent">Cancel</button>
              <button onClick={handleSave} className="flex-[2] py-3.5 bg-brand-600 text-white hover:bg-brand-700 rounded-xl flex items-center justify-center gap-2 font-bold shadow-lg shadow-brand-200 transition-all active:scale-[0.98]">
                <Save size={20} /> Save Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Edit Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
             <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in">
                 <div className="p-4 border-b border-slate-100 bg-slate-50">
                     <h3 className="font-bold text-slate-800">Bulk Update Stock</h3>
                     <p className="text-xs text-slate-500">Updating {selectedIds.size} products</p>
                 </div>
                 <div className="p-6 space-y-4">
                     <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
                         {(['SET', 'ADD', 'REMOVE'] as const).map(action => (
                             <button
                                key={action}
                                onClick={() => setBulkAction(action)}
                                className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${bulkAction === action ? 'bg-white shadow text-brand-600' : 'text-slate-500'}`}
                             >
                                 {action}
                             </button>
                         ))}
                     </div>
                     
                     <div className="space-y-1">
                         <label className="text-xs font-bold text-slate-500 uppercase">Quantity Value</label>
                         <input 
                            type="number" 
                            min="0"
                            value={bulkValue}
                            onChange={(e) => setBulkValue(parseInt(e.target.value))}
                            className="w-full p-3 border border-slate-200 rounded-lg text-lg font-bold text-center focus:ring-2 focus:ring-brand-500 outline-none"
                         />
                     </div>

                     <button 
                        onClick={handleBulkSave}
                        className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-800 transition-colors"
                     >
                         Apply Update
                     </button>
                     <button 
                        onClick={() => setIsBulkModalOpen(false)}
                        className="w-full text-slate-500 py-2 text-sm font-medium"
                     >
                         Cancel
                     </button>
                 </div>
             </div>
        </div>
      )}
    </div>
  );
};