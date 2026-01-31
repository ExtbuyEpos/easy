
import React, { useState, useMemo, useRef } from 'react';
import { Product, Sale, User, Language, VendorSettings } from '../types';
import { CURRENCY } from '../constants';
import { formatCurrency, formatNumber } from '../utils/format';
import { Package, TrendingUp, DollarSign, Search, Plus, List, ChevronLeft, ArrowUpRight, ShoppingBag, Layers, Users, ShieldCheck, Trash2, Edit2, X, Save, Key, Mail, Store, Cloud, Calendar, RefreshCw, Loader2, Zap, UserCheck, ShieldAlert, MapPin, Type, Copy } from 'lucide-react';
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

  const [storeFormData, setStoreFormData] = useState<VendorSettings>(currentUser.vendorSettings || {
    storeName: currentUser.name,
    storeAddress: '',
    shopPasscode: '2026',
    customUrlSlug: currentUser.vendorId || ''
  });

  const vendorId = currentUser.vendorId || '';
  const myProducts = useMemo(() => products.filter(p => p.vendorId === vendorId), [products, vendorId]);
  const myStaff = useMemo(() => users.filter(u => u.vendorId === vendorId && u.role === 'VENDOR_STAFF'), [users, vendorId]);
  const staffLimit = currentUser.vendorStaffLimit || 5;

  const handleUpdateStore = () => {
    onUpdateUser({
        ...currentUser,
        name: storeFormData.storeName,
        vendorSettings: storeFormData
    });
    alert("Store profile synchronized successfully.");
  };

  const generateStaffUsername = () => {
      // Logic: VendorSuffix + Index
      const suffix = vendorId.split('-')[1] || vendorId.slice(-4);
      const index = (myStaff.length + 1).toString().padStart(3, '0');
      return `STF-${suffix}-${index}`.toLowerCase();
  };

  const generateStaffPassword = () => {
    // Logic: 6-digit random code
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleSaveStaff = () => {
    if (!staffFormData.name) {
        alert("Staff name is required.");
        return;
    }
    
    // Auto-generate credentials for new staff
    const isNew = !editingStaffId;
    const finalUsername = isNew ? generateStaffUsername() : staffFormData.username!;
    const finalPassword = isNew ? generateStaffPassword() : staffFormData.password!;

    const staffData: User = {
        id: editingStaffId || `stf_${Date.now()}`,
        name: staffFormData.name!.trim(),
        username: finalUsername,
        password: finalPassword,
        role: 'VENDOR_STAFF',
        email: staffFormData.email?.trim() || '',
        vendorId: vendorId
    };

    if (editingStaffId) {
        onUpdateUser(staffData);
    } else {
        onAddUser(staffData);
        setLastProvisionedStaff(staffData); // Trigger Credential Card view
    }
    
    setIsStaffModalOpen(false);
    setStaffFormData({ name: '', username: '', password: '', role: 'VENDOR_STAFF', email: '' });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
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
    <div className="flex flex-col h-[100svh] bg-slate-50 dark:bg-slate-950 p-4 lg:p-8 overflow-y-auto custom-scrollbar transition-colors">
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 md:mb-8 gap-6">
        <div className="flex items-center gap-4">
          <button onClick={onGoBack} className="p-2.5 -ml-2.5 rounded-xl bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 shadow-sm border border-slate-100 dark:border-slate-800 transition-all active:scale-90 hover:text-brand-600"><ChevronLeft size={24} className="rtl:rotate-180" /></button>
          <div className="min-w-0">
            <h2 className="text-lg md:text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none truncate">{storeFormData.storeName || t('vendorDashboard')}</h2>
            <p className="text-slate-500 text-[8px] font-black uppercase tracking-widest mt-1">Static Node: {vendorId}</p>
          </div>
        </div>
        <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl overflow-x-auto no-scrollbar shrink-0">
            {/* Corrected typo: replaced setActiveTab with setActiveSubView */}
            <button onClick={() => setActiveSubView('DASHBOARD')} className={`px-4 py-2.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSubView === 'DASHBOARD' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-sm' : 'text-slate-500'}`}>Stats</button>
            <button onClick={() => setActiveSubView('TEAM')} className={`px-4 py-2.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSubView === 'TEAM' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-sm' : 'text-slate-500'}`}>Team</button>
            <button onClick={() => setActiveSubView('STORE')} className={`px-4 py-2.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSubView === 'STORE' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-sm' : 'text-slate-500'}`}>Node</button>
        </div>
        <button onClick={() => setActiveSubView('INVENTORY')} className="px-6 py-3.5 bg-brand-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg active:scale-95 flex items-center justify-center gap-2 italic"><Package size={16} /> {t('inventory')}</button>
      </div>

      {activeSubView === 'DASHBOARD' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-10 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform"><DollarSign size={64} className="text-emerald-500" /></div>
                <div className="relative z-10">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">My Revenue</span>
                    <div className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-none tracking-tighter">{formatCurrency(mySalesStats.revenue, language, CURRENCY)}</div>
                </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform"><ShoppingBag size={64} className="text-amber-500" /></div>
                <div className="relative z-10">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Units Sold</span>
                    <div className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-none tracking-tighter">{mySalesStats.unitsSold}</div>
                </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform"><Layers size={64} className="text-brand-500" /></div>
                <div className="relative z-10">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Catalog Size</span>
                    <div className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-none tracking-tighter">{myProducts.length} Items</div>
                </div>
            </div>
        </div>
      ) : activeSubView === 'TEAM' ? (
        <div className="animate-fade-in space-y-6 md:space-y-8 pb-20">
            {lastProvisionedStaff && (
                <div className="bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-500 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] animate-fade-in-up relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5"><UserCheck size={120} className="text-blue-500"/></div>
                    <div className="flex justify-between items-start relative z-10">
                        <div className="w-full">
                            <h4 className="text-blue-600 font-black uppercase tracking-widest text-[9px] flex items-center gap-2 italic"><Zap size={14}/> Provisioning ACK: {lastProvisionedStaff.name}</h4>
                            
                            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-blue-200 flex items-center justify-between shadow-sm">
                                    <div className="min-w-0">
                                        <span className="text-[8px] font-black uppercase text-slate-400 block mb-0.5">Operator ID</span>
                                        <span className="text-base font-black dark:text-white font-mono truncate block">{lastProvisionedStaff.username}</span>
                                    </div>
                                    <button onClick={() => copyToClipboard(lastProvisionedStaff.username)} className="p-2 bg-blue-50 dark:bg-slate-800 text-blue-600 rounded-lg hover:scale-110 transition-transform shrink-0"><Copy size={16}/></button>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-blue-200 flex items-center justify-between shadow-sm">
                                    <div className="min-w-0">
                                        <span className="text-[8px] font-black uppercase text-slate-400 block mb-0.5">System Passkey</span>
                                        <span className="text-base font-black dark:text-white font-mono truncate block">{lastProvisionedStaff.password}</span>
                                    </div>
                                    <button onClick={() => lastProvisionedStaff.password && copyToClipboard(lastProvisionedStaff.password)} className="p-2 bg-blue-50 dark:bg-slate-800 text-blue-600 rounded-lg hover:scale-110 transition-transform shrink-0"><Copy size={16}/></button>
                                </div>
                            </div>
                            
                            <p className="text-[8px] font-bold text-blue-400 uppercase tracking-widest mt-4 italic">* Provide these credentials to the operator for cloud node access.</p>
                        </div>
                        <button onClick={() => setLastProvisionedStaff(null)} className="p-2 text-blue-500 hover:text-red-500 transition-colors ml-4"><X size={20}/></button>
                    </div>
                </div>
            )}

            <div className="bg-slate-900 text-white p-6 md:p-10 rounded-[2rem] md:rounded-[3.5rem] shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6 border-2 border-brand-500/20">
                <div className="absolute top-0 right-0 p-12 opacity-5 rotate-12 hidden md:block"><Users size={160} className="text-brand-500" /></div>
                <div className="relative z-10 text-center md:text-left">
                    <h3 className="text-xl md:text-3xl font-black uppercase italic tracking-tighter mb-1">Team Provisioning</h3>
                    <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[8px] md:text-[10px]">Access Slots: {myStaff.length} / {staffLimit} Used</p>
                </div>
                <button disabled={myStaff.length >= staffLimit} onClick={() => { setEditingStaffId(null); setIsStaffModalOpen(true); }} className="relative z-10 w-full md:w-auto px-8 py-4 bg-brand-600 hover:bg-brand-500 text-white rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[9px] shadow-2xl active:scale-95 disabled:opacity-30 transition-all flex items-center justify-center gap-3 italic">
                    <Plus size={16} strokeWidth={3} /> Add New Operator
                </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[2rem] md:rounded-[3.5rem] shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-400 font-black uppercase text-[8px] md:text-[9px] tracking-widest">
                            <tr><th className="p-4 md:p-8">Staff Identity</th><th className="p-4 md:p-8">Access ID</th><th className="p-4 md:p-8 text-right">Actions</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {myStaff.map((u) => (
                                <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all">
                                    <td className="p-4 md:p-8">
                                        <div className="flex items-center gap-3 md:gap-4">
                                            <div className="w-8 h-8 md:w-10 md:h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center font-black text-slate-400 uppercase italic text-[10px] md:text-sm">{u.name.charAt(0)}</div>
                                            <div className="min-w-0">
                                                <div className="font-black text-slate-900 dark:text-white uppercase italic text-xs md:text-sm truncate">{u.name}</div>
                                                <div className="text-[7px] md:text-[9px] font-bold text-slate-400 truncate uppercase mt-0.5">{u.email || 'No Email Record'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 md:p-8"><span className="px-2 md:px-4 py-1 rounded-full text-[7px] md:text-[9px] font-black uppercase tracking-widest border bg-brand-50 text-brand-600 border-brand-100 dark:bg-brand-950/20 font-mono">@{u.username}</span></td>
                                    <td className="p-4 md:p-8 text-right"><div className="flex justify-end gap-1 md:gap-2"><button onClick={() => { setEditingStaffId(u.id); setStaffFormData(u); setIsStaffModalOpen(true); }} className="p-2 md:p-3 text-slate-300 hover:text-brand-500 transition-colors"><Edit2 size={16}/></button><button onClick={() => onDeleteUser(u.id)} className="p-2 md:p-3 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button></div></td>
                                </tr>
                            ))}
                            {myStaff.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="p-16 text-center text-slate-300 font-black uppercase tracking-[0.4em] text-[8px] italic opacity-20">No Personnel Records Found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      ) : activeSubView === 'STORE' ? (
          <div className="animate-fade-in max-w-4xl mx-auto space-y-6 md:space-y-8 pb-20">
              <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[2rem] md:rounded-[3.5rem] border border-slate-100 dark:border-slate-800 shadow-xl space-y-6 md:space-y-10">
                  <div className="flex items-center gap-4 border-b border-slate-50 dark:border-slate-800 pb-6 md:pb-8">
                      <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-brand-600/10 flex items-center justify-center text-brand-600"><Store size={24}/></div>
                      <div>
                          <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">Node Identity</h3>
                          <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Virtual Shop Setup</p>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                      <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('businessName')}</label>
                          <div className="relative">
                            <Type className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                            <input type="text" value={storeFormData.storeName} onChange={e => setStoreFormData({...storeFormData, storeName: e.target.value})} className="w-full p-3.5 pl-10 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl font-bold dark:text-white outline-none focus:border-brand-500 text-sm" placeholder="Node Name" />
                          </div>
                      </div>
                      <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Vendor Node ID</label>
                          <div className="relative">
                            <ShieldAlert className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                            <input type="text" readOnly value={vendorId} className="w-full p-3.5 pl-10 bg-slate-100 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl font-black text-slate-400 outline-none text-xs" />
                          </div>
                      </div>
                  </div>

                  <div className="space-y-1">
                      <label className="text-[9px] font-black text-emerald-500 uppercase tracking-widest ml-1">Visitor Passcode (Security)</label>
                      <div className="relative">
                          <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={20} />
                          <input type="password" value={storeFormData.shopPasscode} onChange={e => setStoreFormData({...storeFormData, shopPasscode: e.target.value})} className="w-full p-4 pl-12 bg-emerald-50 dark:bg-emerald-950/20 border-2 border-emerald-100 dark:border-emerald-900/30 rounded-xl font-black text-2xl tracking-[0.5em] text-emerald-600 outline-none focus:border-emerald-500" placeholder="••••" maxLength={4} />
                      </div>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1 ml-1 leading-relaxed">Required for Visitor Portal authentication.</p>
                  </div>

                  <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('storeAddress')}</label>
                      <div className="relative">
                          <MapPin className="absolute left-3.5 top-4 text-slate-300" size={16} />
                          <textarea value={storeFormData.storeAddress} onChange={e => setStoreFormData({...storeFormData, storeAddress: e.target.value})} className="w-full p-3.5 pl-10 h-20 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl font-bold dark:text-white outline-none focus:border-brand-500 resize-none text-xs" placeholder="Physical Store Address..." />
                      </div>
                  </div>

                  <button onClick={handleUpdateStore} className="w-full py-4.5 bg-brand-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 italic hover:bg-brand-500">
                      <RefreshCw size={16}/> Sync Node Profile
                  </button>
              </div>
          </div>
      ) : null}

      {isStaffModalOpen && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-[120] flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2rem] md:rounded-[3rem] shadow-2xl overflow-hidden animate-fade-in-up border border-white/10 flex flex-col max-h-[90vh]">
                  <div className="p-6 md:p-8 border-b border-white/5 flex justify-between items-center bg-slate-900 text-white">
                      <div><h3 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter leading-none">{editingStaffId ? 'Update Node' : 'Provision Staff'}</h3><p className="text-[7px] md:text-[9px] font-black text-brand-400 uppercase tracking-widest mt-1">Team Hub Initialization</p></div>
                      <button onClick={() => setIsStaffModalOpen(false)} className="p-2 bg-white/5 rounded-lg hover:text-red-500"><X size={20}/></button>
                  </div>
                  <div className="p-6 md:p-8 space-y-4 md:space-y-6 overflow-y-auto custom-scrollbar">
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Legal Name</label><input type="text" value={staffFormData.name} onChange={e => setStaffFormData({...staffFormData, name: e.target.value})} className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl font-bold dark:text-white outline-none focus:border-brand-500 text-sm" /></div>
                      <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Email</label>
                          <input type="email" value={staffFormData.email} onChange={e => setStaffFormData({...staffFormData, email: e.target.value})} className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl font-bold dark:text-white outline-none focus:border-brand-500 text-sm" placeholder="staff@business.com" />
                      </div>
                      
                      {!editingStaffId && (
                          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-center">
                              <p className="text-[8px] font-black text-slate-400 uppercase italic leading-relaxed">The system will generate a secure Access ID and random Passkey upon commitment.</p>
                          </div>
                      )}

                      {editingStaffId && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Operator ID</label><input type="text" value={staffFormData.username} onChange={e => setStaffFormData({...staffFormData, username: e.target.value})} className="w-full p-3 bg-slate-100 dark:bg-slate-950 border border-slate-200 rounded-xl font-mono text-xs text-slate-500 outline-none" readOnly /></div>
                              <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Passkey</label><input type="password" value={staffFormData.password} onChange={e => setStaffFormData({...staffFormData, password: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl font-bold dark:text-white outline-none focus:border-brand-500 text-sm" /></div>
                          </div>
                      )}
                  </div>
                  <div className="p-6 md:p-8 bg-slate-50 dark:bg-slate-900/50 border-t border-white/5"><button onClick={handleSaveStaff} className="w-full py-4.5 bg-brand-600 text-white rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl active:scale-95 italic hover:bg-brand-500 transition-all flex items-center justify-center gap-2"><Zap size={16}/> {editingStaffId ? 'Sync Node' : 'Initialize Operator'}</button></div>
              </div>
          </div>
      )}
    </div>
  );
};
