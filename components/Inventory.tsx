import React, { useState, useRef } from 'react';
import { Product } from '../types';
import { Plus, Search, Trash2, Edit2, Save, X, Image as ImageIcon, RefreshCw, Upload } from 'lucide-react';
import { CURRENCY } from '../constants';

interface InventoryProps {
  products: Product[];
  onAddProduct: (p: Product) => void;
  onUpdateProduct: (p: Product) => void;
  onDeleteProduct: (id: string) => void;
}

export const Inventory: React.FC<InventoryProps> = ({ products, onAddProduct, onUpdateProduct, onDeleteProduct }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<Product>>({
    name: '', sku: '', costPrice: 0, sellPrice: 0, stock: 0, category: '', image: ''
  });

  // Extract unique categories for suggestions
  const categories = Array.from(new Set(products.map(p => p.category))).sort();

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.includes(searchTerm) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData(product);
    } else {
      setEditingProduct(null);
      setFormData({ 
        name: '', 
        sku: '', 
        costPrice: 0, 
        sellPrice: 0, 
        stock: 0, 
        category: '',
        image: ''
      });
    }
    setIsModalOpen(true);
  };

  const generateBarcode = () => {
    // Generate a random 13-digit number (EAN-13 style simulation)
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
    
    // Auto-generate SKU if empty
    let finalSku = formData.sku;
    if (!finalSku) {
       const timestamp = Date.now().toString().slice(-6);
       const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
       finalSku = `880${timestamp}${random}`.slice(0, 13);
    }

    const productData = {
      id: editingProduct ? editingProduct.id : Date.now().toString(),
      name: formData.name!,
      sku: finalSku,
      costPrice: Number(formData.costPrice),
      sellPrice: Number(formData.sellPrice),
      stock: Number(formData.stock),
      category: formData.category || 'General',
      image: formData.image
    } as Product;

    if (editingProduct) {
      onUpdateProduct(productData);
    } else {
      onAddProduct(productData);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Inventory Management</h2>
          <p className="text-slate-500">Manage stock levels, pricing, images, and barcodes.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-all"
        >
          <Plus size={20} /> Add Product
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search by Name, SKU, or Category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0 z-10">
              <tr>
                <th className="p-4 border-b w-16">Image</th>
                <th className="p-4 border-b">SKU / Barcode</th>
                <th className="p-4 border-b">Product Name</th>
                <th className="p-4 border-b">Category</th>
                <th className="p-4 border-b text-right">Cost</th>
                <th className="p-4 border-b text-right">Price</th>
                <th className="p-4 border-b text-right">Stock</th>
                <th className="p-4 border-b text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map(product => {
                const margin = product.sellPrice > 0 ? ((product.sellPrice - product.costPrice) / product.sellPrice * 100).toFixed(1) : '0';
                return (
                  <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center border border-slate-200">
                        {product.image ? (
                          <img src={product.image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon size={16} className="text-slate-400" />
                        )}
                      </div>
                    </td>
                    <td className="p-4 font-mono text-slate-500 text-xs">{product.sku}</td>
                    <td className="p-4 font-medium text-slate-900">{product.name}</td>
                    <td className="p-4 text-slate-600">
                      <span className="px-2 py-1 bg-slate-100 rounded-full text-xs">{product.category}</span>
                    </td>
                    <td className="p-4 text-right text-slate-500">{CURRENCY}{product.costPrice.toFixed(2)}</td>
                    <td className="p-4 text-right font-medium text-slate-900">{CURRENCY}{product.sellPrice.toFixed(2)}</td>
                    <td className={`p-4 text-right font-bold ${product.stock < 10 ? 'text-red-500' : 'text-green-600'}`}>
                      {product.stock}
                    </td>
                    <td className="p-4 flex justify-center gap-2">
                      <button onClick={() => handleOpenModal(product)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => onDeleteProduct(product.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredProducts.length === 0 && (
            <div className="p-8 text-center text-slate-400">
              No products found. Add some inventory to get started.
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-bold text-slate-800">{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Image Upload Section */}
                <div className="w-full md:w-1/3 flex flex-col gap-3">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Product Image</label>
                  <div 
                    className="aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-all relative overflow-hidden group"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {formData.image ? (
                      <>
                        <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                           <Edit2 className="text-white" />
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-4">
                        <Upload className="mx-auto text-slate-400 mb-2" size={32} />
                        <span className="text-xs text-slate-400">Click to upload</span>
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
                  {formData.image && (
                     <button 
                       onClick={(e) => { e.stopPropagation(); setFormData({...formData, image: ''}) }}
                       className="text-xs text-red-500 hover:text-red-700 text-center"
                     >
                       Remove Image
                     </button>
                  )}
                </div>

                {/* Form Fields Section */}
                <div className="w-full md:w-2/3 space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Product Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
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
                        className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                        placeholder="Select or type..."
                      />
                      <datalist id="category-suggestions">
                        {categories.map(cat => (
                          <option key={cat} value={cat} />
                        ))}
                      </datalist>
                    </div>
                    
                    <div className="space-y-1">
                       <label className="text-xs font-semibold text-slate-500 uppercase">Barcode / SKU</label>
                       <div className="flex gap-2">
                         <input
                          type="text"
                          value={formData.sku}
                          onChange={e => setFormData({ ...formData, sku: e.target.value })}
                          className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none font-mono text-sm"
                          placeholder="Auto-generated if empty"
                        />
                        <button 
                          onClick={generateBarcode}
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg"
                          title="Generate Random Barcode"
                        >
                          <RefreshCw size={18} />
                        </button>
                       </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 uppercase">Cost</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.costPrice}
                        onChange={e => setFormData({ ...formData, costPrice: parseFloat(e.target.value) })}
                        className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 uppercase">Price</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.sellPrice}
                        onChange={e => setFormData({ ...formData, sellPrice: parseFloat(e.target.value) })}
                        className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 uppercase">Stock</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.stock}
                        onChange={e => setFormData({ ...formData, stock: parseInt(e.target.value) })}
                        className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-200 rounded-lg font-medium">Cancel</button>
              <button onClick={handleSave} className="px-6 py-2.5 bg-brand-600 text-white hover:bg-brand-700 rounded-lg flex items-center gap-2 shadow-sm font-bold">
                <Save size={18} /> Save Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};