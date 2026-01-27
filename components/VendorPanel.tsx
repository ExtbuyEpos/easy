
import React, { useState, useMemo } from 'react';
import { Product, Sale, User, Language, UserRole } from '../types';
import { CURRENCY } from '../constants';
import { formatCurrency, formatNumber } from '../utils/format';
import { Package, TrendingUp, DollarSign, Search, Plus, List, ChevronLeft, ArrowUpRight, ShoppingBag, Eye, Layers, Users, ShieldCheck, Trash2, Edit2, X, Save, Key, Mail, CheckCircle2 } from 'lucide-react';
import { Inventory } from './Inventory';

interface VendorPanelProps {
  products: Product[];
  sales: Sale[];
  users: User[];
  currentUser: User;
  onAddProduct: (p: Product) => void;
  onUpdateProduct: (p: Product) => void;
  onDeleteProduct: (id: string) => void;
  onBulkUpdateProduct: (products: Product[]) => void;
  onAddUser: (u: User) => void;
  onUpdateUser: (u: User) => void;
  onDeleteUser: (id: string) => void;
  language: Language;
  t: (key: string) => string;
  onGoBack?: () => void;
}

export const VendorPanel: React.FC<VendorPanelProps> = ({
  products, sales, users, currentUser, onAddProduct, onUpdateProduct, onDeleteProduct, onBulkUpdateProduct, 
  onAddUser, onUpdateUser, onDeleteUser, language, t, onGoBack
}) => {
  const [activeSubView, setActiveSubView] = useState<'DASHBOARD' | 'INVENTORY' | 'TEAM'>('DASHBOARD');
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [staffFormData, setStaffFormData] = useState<Partial<User>>({ 
    name: '', username: '', password: '', role: 'VENDOR_STAFF', email: '' 
  });

  const vendorId = currentUser.vendorId || '';
  const myProducts = useMemo(() => products.filter(p => p.vendorId === vendorId), [products, vendorId]);
  const myStaff = useMemo(() => users.filter(u => u.vendorId === vendorId && u.role === 'VENDOR_STAFF'), [users, vendorId]);
  const staffLimit = currentUser.vendorStaffLimit || 0;
  
  const mySalesStats = useMemo(() => {
    let revenue = 0;
    let unitsSold = 0;
    const filteredSales = sales.filter(s => {
      const hasMyProduct = s.items.some(item => item.vendorId === vendorId);
      if (hasMyProduct) {
        s.items.forEach(item => {
          if (item.vendorId === vendorId) {
            revenue += item.sellPrice * item.quantity;
            unitsSold += item.quantity;
          }
        });
      }
      return hasMyProduct;
    });

    return { revenue, unitsSold, transactions: filteredSales.length };
  }, [sales, vendorId]);

  const topSelling = useMemo(() => {
    const counts: Record<string, { name: string, qty: number, rev: number }> = {};
    sales.forEach(s => {
      s.items.forEach(item => {
        if (item.vendorId === vendorId) {
          if (!counts[item.id]) counts[item.id] = { name: item.name, qty: 0, rev: 0 };
          counts[item.id].qty += item.quantity;
          counts[item.id].rev += item.sellPrice * item.quantity;
        }
      });
    });
    return Object.values(counts).sort((a,b) => b.qty - a.qty).slice(0, 5);
  }, [sales, vendorId]);

  const handleOpenStaffModal = (staff?: User) => {
    if (staff) {
        setEditingStaffId(staff.id);
        setStaffFormData({ name: staff.name, username: staff.username, password: staff.password, email: staff.email });
    } else {
        if (myStaff.length >= staffLimit) {
            alert(`Staff limit reached (${staffLimit}). Contact Admin to increase your quota.`);
            return;
        }
        setEditingStaffId(null);
        setStaffFormData({ name: '', username: '', password: '', role: 'VENDOR_STAFF', email: '' });
    }
    setIsStaffModalOpen(true);
  };

  const handleStaffSubmit = () => {
    if (!staffFormData.name || !staffFormData.username) return alert("Required fields missing.");
    if (editingStaffId) {
        const target = myStaff.find(s => s.id === editingStaffId);
        if (target) onUpdateUser({ ...target, ...staffFormData as User });
    } else {
        onAddUser({ ...staffFormData, id: Date.now().toString(), vendorId, role: 'VENDOR_STAFF' } as User);
    }
    setIsStaffModalOpen(false);
  };

  if (activeSubView === 'INVENTORY') {
    return (
      <Inventory 
        products={myProducts}
        onAddProduct={(p) => onAddProduct({ ...p, vendorId })}
        onUpdateProduct={onUpdateProduct}
        onDeleteProduct={onDeleteProduct}
        onBulkUpdateProduct={onBulkUpdateProduct}
        onGoBack={() => setActiveSubView('DASHBOARD')}
        currentUser={currentUser}
        language={language}
        t={t}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 p-4 lg:p-8 overflow-y-auto custom-scrollbar transition-colors">
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 gap-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={onGoBack} 
            className="p-3 -ml-3 rounded-2xl bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 shadow-sm border border-slate-100 dark:border-slate-800 transition-all active:scale-90 hover:text-brand-600"
          >
            <ChevronLeft size={28} className="rtl:rotate-180" />
          </button>
          <div>
            <h2 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">{t('vendorDashboard')}</h2>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Vendor ID: {vendorId || 'Standalone'}</p>
          </div>
        </div>
        <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-2xl">
            <button onClick={() => setActiveSubView('DASHBOARD')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubView === 'DASHBOARD' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-lg' : 'text-slate-500'}`}>Stats</button>
            <button onClick={() => setActiveSubView('TEAM')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubView === 'TEAM' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-lg' : 'text-slate-500'}`}>My Team</button>
        </div>
        <button onClick={() => setActiveSubView('INVENTORY')} className="px-8 py-4 bg-brand-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 flex items-center gap-3 italic">
          <Package size={18} /> {t('inventory')}
        </button>
      </div>

      {activeSubView === 'DASHBOARD' ? (
        <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform"><DollarSign size={80} className="text-emerald-500" /></div>
                <div className="relative z-10">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">{t('revenue')}</span>
                    <div className="flex items-end gap-2">
                    <span className="text-3xl font-black text-slate-900 dark:text-white leading-none">{formatCurrency(mySalesStats.revenue, language, CURRENCY)}</span>
                    <span className="text-[10px] font-black text-emerald-500 mb-0.5 flex items-center gap-1"><ArrowUpRight size={10}/> Total</span>
                    </div>
                </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform"><ShoppingBag size={80} className="text-amber-500" /></div>
                <div className="relative z-10">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Units Sold</span>
                    <div className="flex items-end gap-2">
                    <span className="text-3xl font-black text-slate-900 dark:text-white leading-none">{mySalesStats.unitsSold}</span>
                    <span className="text-[10px] font-black text-slate-400 mb-0.5 uppercase">Items</span>
                    </div>
                </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform"><Layers size={80} className="text-brand-500" /></div>
                <div className="relative z-10">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">{t('stock')} Portfolio</span>
                    <div className="flex items-end gap-2">
                    <span className="text-3xl font-black text-slate-900 dark:text-white leading-none">{myProducts.length}</span>
                    <span className="text-[10px] font-black text-slate-400 mb-0.5 uppercase">SKU(s)</span>
                    </div>
                </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="p-10 border-b border-slate-50 dark:border-slate-800 bg-slate-50/30 flex justify-between items-center">
                    <div><h4 className="text-2xl font-black italic uppercase tracking-tighter dark:text-white">Velocity Analytics</h4><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Your top moving items</p></div>
                    <TrendingUp className="text-brand-500" />
                </div>
                <div className="p-8 space-y-6">
                    {topSelling.map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800 rounded-[2rem] hover:scale-[1.02] transition-transform shadow-sm">
                        <div className="flex items-center gap-5">
                        <div className="w-12 h-12 bg-brand-600 text-white rounded-2xl flex items-center justify-center font-black text-sm shadow-lg">{i+1}</div>
                        <div>
                            <p className="font-black text-sm uppercase dark:text-white truncate max-w-[150px]">{p.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{p.qty} Sold</p>
                        </div>
                        </div>
                        <div className="text-right">
                        <p className="font-black text-lg text-brand-600">{formatCurrency(p.rev, language, CURRENCY)}</p>
                        </div>
                    </div>
                    ))}
                    {topSelling.length === 0 && (
                    <div className="py-20 text-center opacity-20"><ShoppingBag className="mx-auto mb-4" size={48}/><p className="font-black text-[10px] uppercase tracking-widest">No sales recorded yet</p></div>
                    )}
                </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="p-10 border-b border-slate-50 dark:border-slate-800 bg-slate-50/30 flex justify-between items-center">
                    <div><h4 className="text-2xl font-black italic uppercase tracking-tighter dark:text-white">Low Stock Watch</h4><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Requiring replenishment</p></div>
                    <Package className="text-rose-500" />
                </div>
                <div className="p-8 space-y-6">
                    {myProducts.filter(p => p.stock < 10).map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-5 bg-red-50 dark:bg-red-950/20 rounded-[2rem] border border-red-100 dark:border-red-900/30">
                        <div className="flex items-center gap-5">
                        <div className="w-12 h-12 bg-red-600 text-white rounded-2xl flex items-center justify-center font-black text-sm shadow-lg"><Eye size={20}/></div>
                        <div>
                            <p className="font-black text-sm uppercase dark:text-red-100 truncate max-w-[150px]">{p.name}</p>
                            <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Stock: {p.stock}</p>
                        </div>
                        </div>
                        <button onClick={() => setActiveSubView('INVENTORY')} className="px-5 py-2.5 bg-red-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-md">Restock</button>
                    </div>
                    ))}
                    {myProducts.filter(p => p.stock < 10).length === 0 && (
                    <div className="py-20 text-center opacity-20"><Package className="mx-auto mb-4" size={48}/><p className="font-black text-[10px] uppercase tracking-widest">All stock healthy</p></div>
                    )}
                </div>
                </div>
            </div>
        </>
      ) : (
        <div className="animate-fade-in space-y-8">
            <div className="bg-slate-900 text-white p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12"><Users size={200} className="text-brand-500" /></div>
                <div className="relative z-10">
                    <h3 className="text-3xl font-black uppercase italic tracking-tighter mb-4">Team Provisioning</h3>
                    <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-xs">Access Quota: {myStaff.length} / {staffLimit} Nodes Used</p>
                    <div className="w-full h-2 bg-white/10 rounded-full mt-4 overflow-hidden">
                        <div className="h-full bg-brand-500 rounded-full transition-all duration-1000" style={{ width: `${(myStaff.length / staffLimit) * 100}%` }}></div>
                    </div>
                </div>
                <button 
                    disabled={myStaff.length >= staffLimit}
                    onClick={() => handleOpenStaffModal()}
                    className="relative z-10 px-10 py-5 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-3 italic"
                >
                    <Plus size={18} strokeWidth={3} /> Add Staff Operator
                </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-left border-separate border-spacing-0">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-400 font-black uppercase text-[9px] tracking-widest sticky top-0 z-10 backdrop-blur-md">
                        <tr>
                            <th className="p-10">Operator Identity</th>
                            <th className="p-10">Access Node</th>
                            <th className="p-10 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                        {myStaff.map((u) => (
                            <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all">
                                <td className="p-10">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center font-black text-slate-400 uppercase italic shadow-sm">{u.name.charAt(0)}</div>
                                        <div>
                                            <div className="font-black text-slate-900 dark:text-white uppercase italic">{u.name}</div>
                                            <div className="text-[9px] font-bold text-slate-400 mt-1 uppercase">{u.email || 'No Linked Email'}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-10">
                                    <span className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border-2 bg-brand-50 text-brand-600 border-brand-100 dark:bg-brand-900/10 dark:border-brand-900/30">@{u.username}</span>
                                </td>
                                <td className="p-10 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => handleOpenStaffModal(u)} className="p-3 text-slate-300 hover:text-brand-500 transition-colors"><Edit2 size={20}/></button>
                                        <button onClick={() => onDeleteUser(u.id)} className="p-3 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={20}/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {myStaff.length === 0 && (
                            <tr>
                                <td colSpan={3} className="p-32 text-center">
                                    <div className="flex flex-col items-center justify-center opacity-20 text-slate-400 gap-4">
                                        <Users size={80} strokeWidth={1} />
                                        <p className="font-black text-[10px] uppercase tracking-[0.5em] italic">No Staff Operators Created</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {isStaffModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-2xl flex items-center justify-center z-[120] p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[4rem] shadow-2xl overflow-hidden animate-fade-in-up border border-slate-100 dark:border-slate-800 flex flex-col">
                <div className="p-10 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <div>
                        <h3 className="text-3xl font-black text-slate-900 dark:text-white italic uppercase tracking-tighter">{editingStaffId ? 'Update Staff' : 'New Staff Provision'}</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Vendor Network Node</p>
                    </div>
                    <button onClick={() => setIsStaffModalOpen(false)} className="p-3 bg-white dark:bg-slate-800 text-slate-400 rounded-2xl hover:text-red-500 transition-all"><X size={24}/></button>
                </div>
                <div className="p-10 space-y-6">
                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('fullLegalName')}</label><input type="text" value={staffFormData.name} onChange={e => setStaffFormData({...staffFormData, name: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold dark:text-white" placeholder="Staff Name" /></div>
                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Staff Email</label><div className="relative"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/><input type="email" value={staffFormData.email} onChange={e => setStaffFormData({...staffFormData, email: e.target.value})} className="w-full p-4 pl-12 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold dark:text-white" placeholder="staff@vendor.com" /></div></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('username')}</label><input type="text" value={staffFormData.username} onChange={e => setStaffFormData({...staffFormData, username: e.target.value.toLowerCase()})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl font-black dark:text-white" placeholder="username" /></div>
                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Access Pin</label><input type="password" value={staffFormData.password} onChange={e => setStaffFormData({...staffFormData, password: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold dark:text-white" placeholder="••••" /></div>
                    </div>
                </div>
                <div className="p-10 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex gap-4">
                    <button onClick={() => setIsStaffModalOpen(false)} className="flex-1 py-5 text-slate-500 font-black uppercase tracking-widest text-[10px]">{t('cancel')}</button>
                    <button onClick={handleStaffSubmit} className="flex-[2] py-5 bg-brand-600 text-white font-black uppercase tracking-widest text-[10px] rounded-[2rem] shadow-xl hover:bg-brand-500 transition-all flex items-center justify-center gap-2 italic">
                        <CheckCircle2 size={18}/> {editingStaffId ? 'Save Node' : 'Provision Staff'}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
