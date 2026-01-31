
import React, { useState, useMemo, useRef } from 'react';
import { Product, Sale, User, Language } from '../types';
import { CURRENCY } from '../constants';
import { formatCurrency, formatNumber } from '../utils/format';
import { Package, TrendingUp, DollarSign, Search, Plus, List, ChevronLeft, ArrowUpRight, ShoppingBag, Layers, Users, ShieldCheck, Trash2, Edit2, X, Save, Key, Mail, Store, Cloud, Calendar, RefreshCw, Loader2, Zap, UserCheck } from 'lucide-react';
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
  const [activeSubView, setActiveSubView] = useState<'DASHBOARD' | 'INVENTORY' | 'TEAM' | 'STORE' | 'BACKUP'>('DASHBOARD');
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [lastProvisionedStaff, setLastProvisionedStaff] = useState<User | null>(null);
  const [staffFormData, setStaffFormData] = useState<Partial<User>>({ 
    name: '', username: '', password: '', role: 'VENDOR_STAFF', email: '' 
  });

  const vendorId = currentUser.vendorId || '';
  const myProducts = useMemo(() => products.filter(p => p.vendorId === vendorId), [products, vendorId]);
  const myStaff = useMemo(() => users.filter(u => u.vendorId === vendorId && u.role === 'VENDOR_STAFF'), [users, vendorId]);
  const staffLimit = currentUser.vendorStaffLimit || 5;

  const generateStaffId = () => {
      const count = myStaff.length + 1;
      return `${vendorId}-STF-${count.toString().padStart(3, '0')}`;
  };

  const generateStaffPassword = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleSaveStaff = () => {
    if (!staffFormData.name) {
        alert("Staff name is required.");
        return;
    }
    
    const autoUsername = generateStaffId();
    const autoPwd = generateStaffPassword();

    const staffData: User = {
        id: editingStaffId || `stf_${Date.now()}`,
        name: staffFormData.name!,
        username: editingStaffId ? staffFormData.username! : autoUsername,
        password: editingStaffId ? staffFormData.password! : autoPwd,
        role: 'VENDOR_STAFF',
        email: staffFormData.email || '',
        vendorId: vendorId
    };

    if (editingStaffId) onUpdateUser(staffData);
    else {
        onAddUser(staffData);
        setLastProvisionedStaff(staffData);
        console.log(`[TEAM] Dispatched staff credentials for ${staffData.name} via Simulated SMS/Email.`);
    }
    
    setIsStaffModalOpen(false);
    setStaffFormData({ name: '', username: '', password: '', role: 'VENDOR_STAFF', email: '' });
  };

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

  if (activeSubView === 'INVENTORY') {
    return <Inventory products={myProducts} onAddProduct={(p) => onAddProduct({ ...p, vendorId })} onUpdateProduct={onUpdateProduct} onDeleteProduct={onDeleteProduct} onBulkUpdateProduct={onBulkUpdateProduct} onGoBack={() => setActiveSubView('DASHBOARD')} currentUser={currentUser} language={language} t={t} />;
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 p-4 lg:p-8 overflow-y-auto custom-scrollbar transition-colors">
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 gap-6">
        <div className="flex items-center gap-4">
          <button onClick={onGoBack} className="p-3 -ml-3 rounded-2xl bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 shadow-sm border border-slate-100 dark:border-slate-800 transition-all active:scale-90 hover:text-brand-600"><ChevronLeft size={28} className="rtl:rotate-180" /></button>
          <div><h2 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">{t('vendorDashboard')}</h2><p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Vendor Node: {vendorId}</p></div>
        </div>
        <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-2xl overflow-x-auto no-scrollbar">
            <button onClick={() => setActiveSubView('DASHBOARD')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSubView === 'DASHBOARD' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-lg' : 'text-slate-500'}`}>Stats</button>
            <button onClick={() => setActiveSubView('TEAM')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSubView === 'TEAM' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-lg' : 'text-slate-500'}`}>My Team</button>
            <button onClick={() => setActiveSubView('STORE')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSubView === 'STORE' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-lg' : 'text-slate-500'}`}>Identity</button>
        </div>
        <button onClick={() => setActiveSubView('INVENTORY')} className="px-8 py-4 bg-brand-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 flex items-center gap-3 italic"><Package size={18} /> {t('inventory')}</button>
      </div>

      {activeSubView === 'DASHBOARD' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform"><DollarSign size={80} className="text-emerald-500" /></div>
                <div className="relative z-10">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">My Revenue</span>
                    <div className="flex items-end gap-2"><span className="text-3xl font-black text-slate-900 dark:text-white leading-none">{formatCurrency(mySalesStats.revenue, language, CURRENCY)}</span></div>
                </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform"><ShoppingBag size={80} className="text-amber-500" /></div>
                <div className="relative z-10">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Items Sold</span>
                    <div className="flex items-end gap-2"><span className="text-3xl font-black text-slate-900 dark:text-white leading-none">{mySalesStats.unitsSold}</span></div>
                </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform"><Layers size={80} className="text-brand-500" /></div>
                <div className="relative z-10">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Local Stock</span>
                    <div className="flex items-end gap-2"><span className="text-3xl font-black text-slate-900 dark:text-white leading-none">{myProducts.length}</span></div>
                </div>
            </div>
        </div>
      ) : activeSubView === 'TEAM' ? (
        <div className="animate-fade-in space-y-8 pb-20">
            {lastProvisionedStaff && (
                <div className="bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-500 p-8 rounded-[2.5rem] animate-fade-in-up relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><UserCheck size={120} className="text-blue-500"/></div>
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <h4 className="text-blue-600 font-black uppercase tracking-widest text-xs flex items-center gap-2 italic"><Zap size={14}/> Staff Node Provisioned</h4>
                            <p className="text-blue-700 dark:text-blue-400 font-bold mt-2 text-sm">Security credentials sent to <b>{lastProvisionedStaff.name}</b></p>
                            <div className="mt-6 flex flex-wrap gap-4">
                                <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-blue-200">
                                    <span className="text-[9px] font-black uppercase text-slate-400 block">Operator ID</span>
                                    <span className="text-sm font-black dark:text-white font-mono">{lastProvisionedStaff.username}</span>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-blue-200">
                                    <span className="text-[9px] font-black uppercase text-slate-400 block">Passkey</span>
                                    <span className="text-sm font-black dark:text-white font-mono">{lastProvisionedStaff.password}</span>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setLastProvisionedStaff(null)} className="p-2 text-blue-500 hover:text-red-500 transition-colors"><X size={24}/></button>
                    </div>
                </div>
            )}

            <div className="bg-slate-900 text-white p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-8 border-4 border-brand-500/20">
                <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12"><Users size={200} className="text-brand-500" /></div>
                <div className="relative z-10">
                    <h3 className="text-3xl font-black uppercase italic tracking-tighter mb-4">Personnel Provisioning</h3>
                    <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-xs">Access Slots: {myStaff.length} / {staffLimit} Used</p>
                </div>
                <button disabled={myStaff.length >= staffLimit} onClick={() => { setEditingStaffId(null); setIsStaffModalOpen(true); }} className="relative z-10 px-10 py-5 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl active:scale-95 disabled:opacity-30 transition-all flex items-center gap-3 italic">
                    <Plus size={18} strokeWidth={3} /> Authorize New Staff
                </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-400 font-black uppercase text-[9px] tracking-widest">
                        <tr><th className="p-10">Staff Identity</th><th className="p-10">Access Identifier</th><th className="p-10 text-right">Actions</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                        {myStaff.map((u) => (
                            <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all">
                                <td className="p-10">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center font-black text-slate-400 uppercase italic">{u.name.charAt(0)}</div>
                                        <div><div className="font-black text-slate-900 dark:text-white uppercase italic">{u.name}</div><div className="text-[9px] font-bold text-slate-400 mt-1">{u.email}</div></div>
                                    </div>
                                </td>
                                <td className="p-10"><span className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border-2 bg-brand-50 text-brand-600 border-brand-100 dark:bg-brand-900/10 dark:border-brand-900/30">@{u.username}</span></td>
                                <td className="p-10 text-right"><div className="flex justify-end gap-2"><button onClick={() => { setEditingStaffId(u.id); setStaffFormData(u); setIsStaffModalOpen(true); }} className="p-3 text-slate-300 hover:text-brand-500 transition-colors"><Edit2 size={20}/></button><button onClick={() => onDeleteUser(u.id)} className="p-3 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={20}/></button></div></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      ) : null}

      {isStaffModalOpen && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-[120] flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-fade-in-up border border-white/10 flex flex-col">
                  <div className="p-8 border-b border-white/5 flex justify-between items-center bg-slate-900 text-white">
                      <div><h3 className="text-2xl font-black italic uppercase tracking-tighter">{editingStaffId ? 'Update Identity' : 'Staff Authorization'}</h3><p className="text-[9px] font-black text-brand-400 uppercase tracking-widest mt-1">Personnel Node Setup</p></div>
                      <button onClick={() => setIsStaffModalOpen(false)} className="p-2 bg-white/5 rounded-xl hover:text-red-500"><X size={24}/></button>
                  </div>
                  <div className="p-8 space-y-5">
                      <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Legal Name</label><input type="text" value={staffFormData.name} onChange={e => setStaffFormData({...staffFormData, name: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold dark:text-white" /></div>
                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Email (for credentials)</label>
                          <input type="email" value={staffFormData.email} onChange={e => setStaffFormData({...staffFormData, email: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold dark:text-white" placeholder="staff@vendor.com" />
                      </div>
                      
                      {!editingStaffId && (
                          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-center">
                              <p className="text-[10px] font-black text-slate-400 uppercase italic">System will automatically generate Operator ID and Passkey on Sync</p>
                          </div>
                      )}

                      {editingStaffId && (
                          <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Staff Access ID</label><input type="text" value={staffFormData.username} onChange={e => setStaffFormData({...staffFormData, username: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold dark:text-white" /></div>
                              <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Passkey</label><input type="password" value={staffFormData.password} onChange={e => setStaffFormData({...staffFormData, password: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold dark:text-white" /></div>
                          </div>
                      )}
                  </div>
                  <div className="p-8 bg-slate-50 dark:bg-slate-900/50 border-t border-white/5"><button onClick={handleSaveStaff} className="w-full py-5 bg-brand-600 text-white rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 italic">Sync Staff Profile</button></div>
              </div>
          </div>
      )}
    </div>
  );
};
