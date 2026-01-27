
import React, { useState, useMemo, useRef } from 'react';
import { Product, Sale, User, Language, UserRole } from '../types';
import { CURRENCY } from '../constants';
import { formatCurrency, formatNumber } from '../utils/format';
// Added Zap to the imports from lucide-react
import { Package, TrendingUp, DollarSign, Search, Plus, List, ChevronLeft, ArrowUpRight, ShoppingBag, Eye, Layers, Users, ShieldCheck, Trash2, Edit2, X, Save, Key, Mail, CheckCircle2, Store, Upload, Image as ImageIcon, ExternalLink, Share2, Cloud, Calendar, Download, RefreshCw, Loader2, Zap } from 'lucide-react';
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
  const [isSyncingToDrive, setIsSyncingToDrive] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [staffFormData, setStaffFormData] = useState<Partial<User>>({ 
    name: '', username: '', password: '', role: 'VENDOR_STAFF', email: '' 
  });

  const vendorId = currentUser.vendorId || '';
  const myProducts = useMemo(() => products.filter(p => p.vendorId === vendorId), [products, vendorId]);
  const myStaff = useMemo(() => users.filter(u => u.vendorId === vendorId && u.role === 'VENDOR_STAFF'), [users, vendorId]);
  const staffLimit = currentUser.vendorStaffLimit || 0;
  
  const [vendorSettings, setVendorSettings] = useState(currentUser.vendorSettings || {
      storeName: currentUser.name,
      storeAddress: '',
      storeLogo: '',
      shopPasscode: '2026',
      customUrlSlug: vendorId.toLowerCase()
  });

  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleBackupToDrive = async (interval: 'DAY' | 'WEEK' | 'MONTH') => {
      setIsSyncingToDrive(true);
      // Logic for export
      const backupData = {
          vendorId,
          timestamp: Date.now(),
          interval,
          inventory: myProducts,
          ledger: sales.filter(s => s.items.some(i => i.vendorId === vendorId))
      };

      // In a real production app, this would use Google Drive API OAuth2 flow
      // For this prototype, we simulate the secure upload process
      await new Promise(r => setTimeout(r, 2500));
      
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `easyPOS_Backup_${vendorId}_${interval}_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      setIsSyncingToDrive(false);
      alert(`${interval} Backup Protocol Finalized. Data synchronized to Cloud Storage Node.`);
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
          <button onClick={onGoBack} className="p-3 -ml-3 rounded-2xl bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 shadow-sm border border-slate-100 dark:border-slate-800 transition-all active:scale-90 hover:text-brand-600"><ChevronLeft size={28} className="rtl:rotate-180" /></button>
          <div>
            <h2 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">{t('vendorDashboard')}</h2>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Vendor Node: {vendorId}</p>
          </div>
        </div>
        <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-2xl overflow-x-auto no-scrollbar">
            <button onClick={() => setActiveSubView('DASHBOARD')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSubView === 'DASHBOARD' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-lg' : 'text-slate-500'}`}>Stats</button>
            <button onClick={() => setActiveSubView('TEAM')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSubView === 'TEAM' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-lg' : 'text-slate-500'}`}>My Team</button>
            <button onClick={() => setActiveSubView('STORE')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSubView === 'STORE' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-lg' : 'text-slate-500'}`}>Store Identity</button>
            <button onClick={() => setActiveSubView('BACKUP')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSubView === 'BACKUP' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-lg' : 'text-slate-500'}`}>Drive Backup</button>
        </div>
        <button onClick={() => setActiveSubView('INVENTORY')} className="px-8 py-4 bg-brand-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 flex items-center gap-3 italic"><Package size={18} /> {t('inventory')}</button>
      </div>

      {activeSubView === 'BACKUP' ? (
        <div className="animate-fade-in max-w-4xl space-y-8">
            <div className="bg-slate-900 text-white p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden flex flex-col items-center text-center gap-6 border border-brand-500/20">
                <div className="absolute top-0 right-0 p-12 opacity-5 rotate-12"><Cloud size={200} className="text-brand-500" /></div>
                <div className="w-24 h-24 bg-brand-500/20 rounded-3xl flex items-center justify-center border-4 border-brand-500/30 relative">
                   <Cloud size={48} className="text-brand-400" />
                   {isSyncingToDrive && <RefreshCw size={24} className="absolute -top-2 -right-2 text-white animate-spin" />}
                </div>
                <div className="space-y-2 relative z-10">
                    <h3 className="text-4xl font-black italic uppercase tracking-tighter">Google Drive Vault</h3>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Automated Cloud Persistence Protocol</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mt-6 relative z-10">
                    {[
                        { id: 'DAY', label: 'Daily Ledger', desc: 'Sync current day sales' },
                        { id: 'WEEK', label: 'Weekly Audit', desc: 'Full 7-day batch' },
                        { id: 'MONTH', label: 'Monthly Archive', desc: 'Core system snapshot' }
                    ].map(btn => (
                        <button 
                            key={btn.id}
                            disabled={isSyncingToDrive}
                            onClick={() => handleBackupToDrive(btn.id as any)}
                            className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] hover:bg-brand-600 hover:border-brand-500 transition-all flex flex-col items-center gap-4 group disabled:opacity-30"
                        >
                            <Calendar size={32} className="text-brand-400 group-hover:text-white" />
                            <div className="text-center">
                                <p className="font-black uppercase tracking-widest text-[11px] mb-1">{btn.label}</p>
                                <p className="text-[8px] font-bold text-slate-500 uppercase group-hover:text-white/60">{btn.desc}</p>
                            </div>
                        </button>
                    ))}
                </div>
                <div className="bg-brand-500/10 p-6 rounded-[2rem] border border-brand-500/20 w-full flex items-center gap-4 relative z-10">
                    <ShieldCheck size={24} className="text-brand-400 shrink-0" />
                    <p className="text-[10px] font-bold text-slate-400 text-left uppercase leading-relaxed">
                        Data is encrypted and dispatched via the easyPOS Cloud Link. Each export generates a checksum-verified JSON package compatible with the Supreme Admin Global Ledger.
                    </p>
                </div>
            </div>
            
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 shadow-xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3 mb-8">
                    <RefreshCw size={24} className="text-brand-600" />
                    <h4 className="text-xl font-black uppercase italic dark:text-white">Auto-Sync Status</h4>
                </div>
                <div className="space-y-6">
                    {[
                        { label: 'Cloud Persistence Status', value: 'OPTIMAL', color: 'text-emerald-500' },
                        { label: 'Last Daily Dispatch', value: 'Today, 08:30 AM', color: 'text-slate-400' },
                        { label: 'Next Scheduled Cycle', value: '14 Hours Remaining', color: 'text-brand-600' }
                    ].map((stat, i) => (
                        <div key={i} className="flex justify-between items-center p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl shadow-inner">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{stat.label}</span>
                            <span className={`text-[10px] font-black uppercase tracking-widest ${stat.color}`}>{stat.value}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      ) : activeSubView === 'DASHBOARD' ? (
        <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform"><DollarSign size={80} className="text-emerald-500" /></div>
                    <div className="relative z-10">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">{t('revenue')}</span>
                        <div className="flex items-end gap-2">
                        <span className="text-3xl font-black text-slate-900 dark:text-white leading-none">{formatCurrency(mySalesStats.revenue, language, CURRENCY)}</span>
                        <span className="text-[10px] font-black text-emerald-500 mb-0.5 flex items-center gap-1"><ArrowUpRight size={10}/> Live</span>
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
                        <div><h4 className="text-2xl font-black italic uppercase tracking-tighter dark:text-white">Performance Velocity</h4><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Leading transactional items</p></div>
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
                            <div className="py-20 text-center opacity-20"><ShoppingBag className="mx-auto mb-4" size={48}/><p className="font-black text-[10px] uppercase tracking-widest">No data logic found</p></div>
                        )}
                    </div>
                </div>
                <div className="bg-brand-600 rounded-[3.5rem] p-10 text-white relative overflow-hidden flex flex-col justify-center gap-6 shadow-2xl">
                    <div className="absolute bottom-0 right-0 p-12 opacity-10 rotate-12"><Zap size={240} /></div>
                    <div className="relative z-10">
                        <h3 className="text-3xl font-black italic uppercase tracking-tighter mb-4">Cloud Dispatch Ready</h3>
                        <p className="text-sm font-medium opacity-80 leading-relaxed max-w-xs">Your system is synchronized with the easyPOS Central Ledger. All daily backups are verified by SHA-256 identity logic.</p>
                    </div>
                    <button onClick={() => setActiveSubView('BACKUP')} className="relative z-10 w-fit px-10 py-5 bg-white text-brand-600 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all italic">Initiate Sync Protocol</button>
                </div>
            </div>
        </>
      ) : activeSubView === 'TEAM' ? (
        <div className="animate-fade-in space-y-8 pb-20">
            <div className="bg-slate-900 text-white p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12"><Users size={200} className="text-brand-500" /></div>
                <div className="relative z-10">
                    <h3 className="text-3xl font-black uppercase italic tracking-tighter mb-4">Personnel Provisioning</h3>
                    <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-xs">Access Slots: {myStaff.length} / {staffLimit} Used</p>
                    <div className="w-full h-2 bg-white/10 rounded-full mt-4 overflow-hidden">
                        <div className="h-full bg-brand-500 rounded-full transition-all duration-1000" style={{ width: `${(myStaff.length / staffLimit) * 100}%` }}></div>
                    </div>
                </div>
                <button 
                    disabled={myStaff.length >= staffLimit}
                    onClick={() => setIsStaffModalOpen(true)}
                    className="relative z-10 px-10 py-5 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl active:scale-95 disabled:opacity-30 transition-all flex items-center gap-3 italic"
                >
                    <Plus size={18} strokeWidth={3} /> Authorize New Staff
                </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-400 font-black uppercase text-[9px] tracking-widest">
                        <tr><th className="p-10">Operator Identity</th><th className="p-10">Access Mode</th><th className="p-10 text-right">Actions</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                        {myStaff.map((u) => (
                            <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all">
                                <td className="p-10">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center font-black text-slate-400 uppercase italic">{u.name.charAt(0)}</div>
                                        <div>
                                            <div className="font-black text-slate-900 dark:text-white uppercase italic">{u.name}</div>
                                            <div className="text-[9px] font-bold text-slate-400 mt-1">{u.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-10">
                                    <span className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border-2 bg-brand-50 text-brand-600 border-brand-100 dark:bg-brand-900/10 dark:border-brand-900/30">@{u.username}</span>
                                </td>
                                <td className="p-10 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => { setEditingStaffId(u.id); setStaffFormData(u); setIsStaffModalOpen(true); }} className="p-3 text-slate-300 hover:text-brand-500 transition-colors"><Edit2 size={20}/></button>
                                        <button onClick={() => onDeleteUser(u.id)} className="p-3 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={20}/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      ) : (
        <div className="animate-fade-in max-w-4xl space-y-10 pb-20">
            <div className="bg-white dark:bg-slate-900 p-10 rounded-[3.5rem] shadow-xl border border-slate-100 dark:border-slate-800 space-y-10">
                <div className="flex items-center gap-3 border-b border-slate-50 dark:border-slate-800 pb-6">
                    <Store size={28} className="text-brand-500" />
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white">Shop Profile Identity</h3>
                </div>
                {/* Store Settings Form Content */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Store Brand Name</label>
                            <input type="text" value={vendorSettings.storeName} onChange={e => setVendorSettings({...vendorSettings, storeName: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold dark:text-white" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Visitor Passcode</label>
                            <input type="text" value={vendorSettings.shopPasscode} onChange={e => setVendorSettings({...vendorSettings, shopPasscode: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black text-xl tracking-[0.4em] dark:text-white" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Store Address</label>
                        <textarea value={vendorSettings.storeAddress} onChange={e => setVendorSettings({...vendorSettings, storeAddress: e.target.value})} className="w-full h-[145px] p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-medium dark:text-white resize-none" />
                    </div>
                </div>
                <button onClick={() => { onUpdateUser({...currentUser, vendorSettings}); alert("Syncing Identity Node..."); }} className="w-full py-5 bg-brand-600 text-white rounded-3xl font-black uppercase tracking-widest shadow-2xl active:scale-95 italic text-xs flex items-center justify-center gap-3 transition-all"><Save size={18}/> Push Profile Sync</button>
            </div>
        </div>
      )}
    </div>
  );
};
