
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, UserRole, Product, Sale, StoreSettings, Language, AppView, VendorRequest } from '../types';
import { Trash2, Plus, X, Receipt, ChevronLeft, Users, Zap, Globe, Database, Cloud, ShieldCheck, RefreshCw, Key, LogOut, Store, Mail, Check, AlertCircle, Save, Edit2, ShieldAlert, Copy, CheckCircle2 } from 'lucide-react';
import { formatNumber } from '../utils/format';

interface SettingsProps {
  users: User[];
  vendorRequests: VendorRequest[];
  products: Product[];
  sales: Sale[];
  onAddUser: (u: User) => void;
  onUpdateUser: (u: User) => void;
  onDeleteUser: (id: string) => void;
  onReviewRequest: (requestId: string, status: 'APPROVED' | 'REJECTED', reason?: string) => void;
  onLogout: () => void;
  currentUser: User;
  storeSettings: StoreSettings;
  onUpdateStoreSettings: (settings: StoreSettings) => void;
  onGoBack?: () => void;
  language: Language;
  toggleLanguage: () => void;
  t?: (key: string) => string;
  onNavigate?: (view: AppView) => void;
}

export const Settings: React.FC<SettingsProps> = ({ 
  users, products, sales, onAddUser, onUpdateUser, onDeleteUser, onLogout, currentUser, storeSettings, onUpdateStoreSettings, onGoBack,
  language, t = (k) => k
}) => {
  const [activeSettingsTab, setActiveSettingsTab] = useState<'GENERAL' | 'VENDORS' | 'BACKUP'>('GENERAL');
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [storeForm, setStoreForm] = useState<StoreSettings>(storeSettings);
  const [lastCreatedVendor, setLastCreatedVendor] = useState<User | null>(null);
  
  const [vendorFormData, setVendorFormData] = useState<Partial<User>>({
    name: '', email: '', username: '', password: '', role: 'VENDOR', vendorStaffLimit: 5
  });

  const isSupremeAdmin = currentUser.email?.toLowerCase() === 'nabeelkhan1007@gmail.com';
  const allVendors = useMemo(() => users.filter(u => u.role === 'VENDOR'), [users]);

  const generateSecurePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let pwd = "";
    for (let i = 0; i < 12; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    return pwd;
  };

  const handleCreateVendor = () => {
    if (!vendorFormData.name || !vendorFormData.email || !vendorFormData.username) {
        alert("All fields are required for Vendor Initialization.");
        return;
    }
    const autoPwd = generateSecurePassword();
    const vendorId = `VND-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    
    const newVendor: User = {
        id: `vdr_${Date.now()}`,
        name: vendorFormData.name!,
        username: vendorFormData.username!,
        password: autoPwd,
        role: 'VENDOR',
        email: vendorFormData.email!,
        vendorId: vendorId,
        vendorStaffLimit: vendorFormData.vendorStaffLimit || 5,
        vendorSettings: {
            storeName: vendorFormData.name!,
            storeAddress: '',
            shopPasscode: '2026',
            customUrlSlug: vendorFormData.username!
        }
    };
    onAddUser(newVendor);
    setLastCreatedVendor(newVendor);
    // Simulation of sending email
    console.log(`[SYSTEM] Dispatching Vendor Credentials to ${newVendor.email}...`);
    setIsVendorModalOpen(false);
    setVendorFormData({ name: '', email: '', username: '', password: '', role: 'VENDOR', vendorStaffLimit: 5 });
  };

  const handleGlobalBackup = async (interval: 'DAY' | 'WEEK' | 'MONTH') => {
      setIsSyncingAll(true);
      const fullSnapshot = {
          protocol: 'SUPREME_ADMIN_GLOBAL_LEDGER',
          timestamp: Date.now(),
          interval,
          environment: 'PRODUCTION_MAINFRAME',
          globalUsers: users,
          globalInventory: products,
          globalLedger: sales
      };
      await new Promise(r => setTimeout(r, 3000));
      const blob = new Blob([JSON.stringify(fullSnapshot, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `easyPOS_SUPREME_BACKUP_${Date.now()}.json`;
      link.click();
      setIsSyncingAll(false);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 p-4 lg:p-8 overflow-y-auto transition-colors custom-scrollbar">
       <div className="flex flex-col lg:flex-row justify-between lg:items-center mb-8 gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onGoBack} className="p-3 -ml-3 rounded-2xl bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 shadow-sm border border-slate-100 dark:border-slate-800 transition-all active:scale-90 hover:text-brand-600"><ChevronLeft size={28} className="rtl:rotate-180" /></button>
          <div>
              <h2 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">System Terminal</h2>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Master Control Matrix</p>
          </div>
        </div>
        <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-2xl overflow-x-auto no-scrollbar">
            <button onClick={() => setActiveSettingsTab('GENERAL')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSettingsTab === 'GENERAL' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-lg' : 'text-slate-500'}`}>Core Settings</button>
            {isSupremeAdmin && (
                <button onClick={() => setActiveSettingsTab('VENDORS')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSettingsTab === 'VENDORS' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-lg' : 'text-slate-500'}`}>Manage Vendors</button>
            )}
            <button onClick={() => setActiveSettingsTab('BACKUP')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSettingsTab === 'BACKUP' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-lg' : 'text-slate-500'}`}>Global Vault</button>
        </div>
      </div>

      {activeSettingsTab === 'VENDORS' ? (
        <div className="space-y-8 animate-fade-in pb-20">
            {lastCreatedVendor && (
                <div className="bg-emerald-50 dark:bg-emerald-950/20 border-2 border-emerald-500 p-8 rounded-[2.5rem] animate-fade-in-up relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><CheckCircle2 size={120} /></div>
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <h4 className="text-emerald-600 font-black uppercase tracking-widest text-xs flex items-center gap-2 italic"><Zap size={14}/> Node Initialization Successful</h4>
                            <p className="text-emerald-700 dark:text-emerald-400 font-bold mt-2 text-sm">Credentials have been dispatched to <b>{lastCreatedVendor.email}</b></p>
                            <div className="mt-6 flex flex-wrap gap-4">
                                <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-emerald-200">
                                    <span className="text-[9px] font-black uppercase text-slate-400 block">Username</span>
                                    <span className="text-sm font-black dark:text-white">{lastCreatedVendor.username}</span>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-emerald-200">
                                    <span className="text-[9px] font-black uppercase text-slate-400 block">Auto-Passkey</span>
                                    <span className="text-sm font-black dark:text-white font-mono">{lastCreatedVendor.password}</span>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-emerald-200">
                                    <span className="text-[9px] font-black uppercase text-slate-400 block">Vendor ID</span>
                                    <span className="text-sm font-black dark:text-white font-mono">{lastCreatedVendor.vendorId}</span>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setLastCreatedVendor(null)} className="p-2 text-emerald-500 hover:text-red-500 transition-colors"><X size={24}/></button>
                    </div>
                </div>
            )}

            <div className="bg-slate-900 text-white p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-8 border-4 border-brand-500/20">
                <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12"><Store size={200} className="text-brand-500" /></div>
                <div className="relative z-10">
                    <h3 className="text-3xl font-black uppercase italic tracking-tighter mb-4">Vendor Ecosystem</h3>
                    <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-xs">Total Registered Nodes: {allVendors.length}</p>
                </div>
                <button onClick={() => setIsVendorModalOpen(true)} className="relative z-10 px-10 py-5 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl active:scale-95 transition-all flex items-center gap-3 italic">
                    <Plus size={18} strokeWidth={3} /> Create New Vendor Node
                </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-400 font-black uppercase text-[9px] tracking-widest">
                        <tr><th className="p-10">Business Identity</th><th className="p-10">Vendor ID</th><th className="p-10">Staff Limit</th><th className="p-10 text-right">Actions</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                        {allVendors.map((u) => (
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
                                    <span className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border-2 bg-brand-50 text-brand-600 border-brand-100 dark:bg-brand-900/10 dark:border-brand-900/30 font-mono">{u.vendorId}</span>
                                </td>
                                <td className="p-10 font-black text-slate-500">{u.vendorStaffLimit || 5} Slots</td>
                                <td className="p-10 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => onDeleteUser(u.id)} className="p-3 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={20}/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      ) : activeSettingsTab === 'BACKUP' ? (
        <div className="max-w-4xl space-y-10 animate-fade-in pb-20">
            <div className="bg-slate-900 text-white p-14 rounded-[4rem] shadow-2xl relative overflow-hidden flex flex-col items-center text-center gap-10 border-8 border-brand-500/20">
                <div className="absolute top-0 right-0 p-12 opacity-10 rotate-45"><ShieldCheck size={400} className="text-brand-500" /></div>
                <div className="relative z-10 w-32 h-32 bg-brand-600 rounded-[2.5rem] flex items-center justify-center shadow-[0_0_80px_rgba(14,165,233,0.4)]">
                    {isSyncingAll ? <RefreshCw size={64} className="animate-spin" /> : <Database size={64} />}
                </div>
                <div className="relative z-10 space-y-4">
                    <h3 className="text-5xl font-black italic uppercase tracking-tighter">SUPREME GLOBAL VAULT</h3>
                    <p className="text-brand-400 font-black uppercase tracking-[0.5em] text-sm">System-Wide Multi-Vendor Backup Protocol</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full relative z-10">
                    {['DAY', 'WEEK', 'MONTH'].map(type => (
                        <button key={type} disabled={isSyncingAll} onClick={() => handleGlobalBackup(type as any)} className="p-10 bg-white/5 border-2 border-white/10 rounded-[3rem] hover:bg-brand-600 hover:border-brand-400 transition-all group disabled:opacity-30">
                            <Cloud size={48} className="text-brand-500 group-hover:text-white mx-auto mb-6" />
                            <p className="font-black uppercase tracking-widest text-xs italic">{type} Dispatch</p>
                        </button>
                    ))}
                </div>
            </div>
        </div>
      ) : (
        <div className="max-w-4xl space-y-8 animate-fade-in pb-20">
            <div className="bg-white dark:bg-slate-900 p-10 rounded-[3.5rem] shadow-xl border border-slate-100 dark:border-slate-800 space-y-10">
                <div className="flex items-center gap-3 border-b border-slate-50 dark:border-slate-800 pb-6"><Receipt size={28} className="text-brand-500" /><h3 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white">Identity Config</h3></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('businessName')}</label><input type="text" value={storeForm.name} onChange={e => setStoreForm({...storeForm, name: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black dark:text-white" /></div>
                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tax Rate (%)</label><input type="number" value={storeForm.taxRate} onChange={e => setStoreForm({...storeForm, taxRate: parseFloat(e.target.value) || 0})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black dark:text-white" /></div>
                </div>
                <button onClick={() => onUpdateStoreSettings(storeForm)} className="w-full py-5 bg-slate-900 dark:bg-brand-600 text-white rounded-3xl font-black uppercase tracking-widest shadow-2xl active:scale-95 italic text-xs">Sync System Matrix</button>
            </div>
            <button onClick={onLogout} className="w-full flex items-center justify-center gap-4 py-8 bg-red-50 dark:bg-red-950/20 text-red-600 hover:bg-red-600 hover:text-white transition-all rounded-[3rem] font-black uppercase tracking-[0.3em] text-sm shadow-xl group border border-red-100 dark:border-red-900/30"><LogOut size={28} className="group-hover:-translate-x-2 transition-transform" /><span>Terminate Root Session</span></button>
        </div>
      )}

      {isVendorModalOpen && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-[120] flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[4rem] shadow-2xl overflow-hidden animate-fade-in-up border border-white/10 flex flex-col">
                  <div className="p-10 border-b border-white/5 flex justify-between items-center bg-slate-900 text-white">
                      <div>
                          <h3 className="text-3xl font-black italic uppercase tracking-tighter">Vendor Initialization</h3>
                          <p className="text-[10px] font-black text-brand-400 uppercase tracking-widest mt-1">Multi-Vendor Deployment Protocol</p>
                      </div>
                      <button onClick={() => setIsVendorModalOpen(false)} className="p-3 bg-white/5 rounded-2xl hover:text-red-500 transition-all"><X size={24}/></button>
                  </div>
                  <div className="p-10 space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Business Name</label><input type="text" value={vendorFormData.name} onChange={e => setVendorFormData({...vendorFormData, name: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold dark:text-white" /></div>
                          <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vendor Username</label><input type="text" value={vendorFormData.username} onChange={e => setVendorFormData({...vendorFormData, username: e.target.value.toLowerCase()})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold dark:text-white" /></div>
                      </div>
                      <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Admin Email Address</label><input type="email" value={vendorFormData.email} onChange={e => setVendorFormData({...vendorFormData, email: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold dark:text-white" /></div>
                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Auto-Generated Password</label><div className="w-full p-4 bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl font-black text-sm text-slate-400 italic">Secure Passkey Created on Deploy</div></div>
                          <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Staff Access Limit</label><input type="number" value={vendorFormData.vendorStaffLimit} onChange={e => setVendorFormData({...vendorFormData, vendorStaffLimit: parseInt(e.target.value) || 5})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold dark:text-white" /></div>
                      </div>
                  </div>
                  <div className="p-10 bg-slate-50 dark:bg-slate-900/50 border-t border-white/5">
                      <button onClick={handleCreateVendor} className="w-full py-6 bg-brand-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 italic"><Zap size={20}/> Deploy Vendor Node</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
