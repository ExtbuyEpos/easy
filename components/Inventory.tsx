import React, { useState, useRef } from 'react';
import { Product } from '../types';
import { Plus, Search, Trash2, Edit2, Save, X, Image as ImageIcon, RefreshCw, Upload, Tag, Layers, CheckSquare } from 'lucide-react';
import { CURRENCY } from '../constants';

interface InventoryProps {
  products: Product[];
  onAddProduct: (p: Product) => void;
  onUpdateProduct: (p: Product) => void;
  onBulkUpdateProduct: (products: Product[]) => void;
  onDeleteProduct: (id: string) => void;
}

export const Inventory: React.FC<InventoryProps> = ({ products, onAddProduct, onUpdateProduct, onBulkUpdateProduct, onDeleteProduct }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bulk Edit State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<'SET' | 'ADD' | 'REMOVE'>('SET');
  const [bulkValue, setBulkValue] = useState<number>(0);

  const [formData, setFormData] = useState<Partial<Product>>({
    name: '', sku: '', costPrice: 0, sellPrice: 0, stock: 0, category: '', image: '', tags: []
  });
  const [tagInput, setTagInput] = useState('');

  // Extract unique categories for suggestions
  const categories = Array.from(new Set(products.map(p => p.category))).sort();

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.includes(searchTerm) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.tags && p.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
  );

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

  return (
    <div className="flex flex-col h-full bg-slate-50 p-4 lg:p-6 overflow-hidden">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Inventory</h2>
          <p className="text-slate-500 text-sm">Manage stock levels, pricing, images.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
          {selectedIds.size > 0 && (
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="flex-1 lg:flex-none bg-slate-800 hover:bg-slate-900 text-white px-3 py-2 rounded-lg flex items-center justify-center gap-2 shadow-sm text-sm"
            >
              <Layers size={16} /> Bulk Edit ({selectedIds.size})
            </button>
          )}
          <button
            onClick={() => handleOpenModal()}
            className="flex-1 lg:flex-none bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 shadow-sm"
          >
            <Plus size={20} /> <span className="hidden md:inline">Add Product</span><span className="md:hidden">Add</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden">
        <div className="p-3 border-b border-slate-100 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0 z-10">
              <tr>
                <th className="p-4 border-b w-10">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-gray-300"
                    checked={filteredProducts.length > 0 && selectedIds.size === filteredProducts.length}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="p-4 border-b hidden sm:table-cell">Image</th>
                <th className="p-4 border-b">Product</th>
                <th className="p-4 border-b text-right">Price</th>
                <th className="p-4 border-b text-right">Stock</th>
                <th className="p-4 border-b text-center w-20">Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map(product => {
                const isSelected = selectedIds.has(product.id);
                return (
                  <tr key={product.id} className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-slate-50' : ''}`}>
                    <td className="p-4">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-gray-300"
                        checked={isSelected}
                        onChange={() => handleSelectOne(product.id)}
                      />
                    </td>
                    <td className="p-4 hidden sm:table-cell">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center border border-slate-200">
                        {product.image ? (
                          <img src={product.image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon size={16} className="text-slate-400" />
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-slate-900 truncate max-w-[150px]">{product.name}</div>
                      <div className="text-xs text-slate-400 font-mono">{product.sku}</div>
                    </td>
                    <td className="p-4 text-right font-medium text-slate-900">{CURRENCY}{product.sellPrice.toFixed(2)}</td>
                    <td className={`p-4 text-right font-bold ${product.stock < 10 ? 'text-red-500' : 'text-green-600'}`}>
                      {product.stock}
                    </td>
                    <td className="p-4 text-center">
                      <button onClick={() => handleOpenModal(product)} className="text-blue-600 p-2 hover:bg-blue-50 rounded">
                        <Edit2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredProducts.length === 0 && (
            <div className="p-8 text-center text-slate-400">No products found.</div>
          )}
        </div>
      </div>

      {/* Add/Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 lg:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            
            <div className="p-4 lg:p-6 overflow-y-auto">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Image Upload Section */}
                <div className="w-full md:w-1/3 flex flex-col gap-3">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Image</label>
                  <div 
                    className="aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center cursor-pointer relative overflow-hidden group"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {formData.image ? (
                      <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center p-4">
                        <Upload className="mx-auto text-slate-400 mb-2" size={24} />
                        <span className="text-xs text-slate-400">Upload</span>
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
                <div className="w-full md:w-2/3 space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Product Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full p-2.5 border border-slate-200 rounded-lg"
                      placeholder="e.g. Premium Coffee"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 uppercase">Category</label>
                      <input
                        type="text"
                        list="category-suggestions"
                        value={formData.category}
                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                        className="w-full p-2.5 border border-slate-200 rounded-lg"
                      />
                      <datalist id="category-suggestions">
                        {categories.map(cat => (
                          <option key={cat} value={cat} />
                        ))}
                      </datalist>
                    </div>
                    
                    <div className="space-y-1">
                       <label className="text-xs font-semibold text-slate-500 uppercase">SKU / Barcode</label>
                       <div className="flex gap-2">
                         <input
                          type="text"
                          value={formData.sku}
                          onChange={e => setFormData({ ...formData, sku: e.target.value })}
                          className="w-full p-2.5 border border-slate-200 rounded-lg font-mono text-sm"
                          placeholder="Auto"
                        />
                        <button 
                          onClick={generateBarcode}
                          className="p-2 bg-slate-100 rounded-lg text-slate-600"
                        >
                          <RefreshCw size={18} />
                        </button>
                       </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 uppercase">Cost</label>
                      <input
                        type="number"
                        value={formData.costPrice}
                        onChange={e => setFormData({ ...formData, costPrice: parseFloat(e.target.value) })}
                        className="w-full p-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 uppercase">Price</label>
                      <input
                        type="number"
                        value={formData.sellPrice}
                        onChange={e => setFormData({ ...formData, sellPrice: parseFloat(e.target.value) })}
                        className="w-full p-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 uppercase">Stock</label>
                      <input
                        type="number"
                        value={formData.stock}
                        onChange={e => setFormData({ ...formData, stock: parseInt(e.target.value) })}
                        className="w-full p-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 lg:p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-200 rounded-lg font-medium">Cancel</button>
              <button onClick={handleSave} className="px-6 py-2.5 bg-brand-600 text-white hover:bg-brand-700 rounded-lg flex items-center gap-2 font-bold">
                <Save size={18} /> Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};