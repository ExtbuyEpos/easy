
import React, { useState, useRef, useEffect } from 'react';
import { User, UserRole, Product, Sale, StoreSettings, Language } from '../types';
import { Trash2, Plus, Save, X, Database, Receipt, Image as ImageIcon, LogOut, ChevronLeft, Languages, Cloud, UserCheck, Shield, Users, Fingerprint } from 'lucide-react';
import JSZip from 'jszip';
import { saveFirebaseConfig, clearFirebaseConfig } from '../firebase';

interface SettingsProps {
  users: User[];
  products: Product[];
  sales: Sale[];
  onAddUser: (u: User) => void;
  onDeleteUser: (id: string) => void;
  currentUser: User;
  storeSettings: StoreSettings;
  onUpdateStoreSettings: (settings: StoreSettings) => void;
  onGoBack?: () => void;
  language: Language;
  toggleLanguage: () => void;
  t?: (key: string) => string;
}

export const Settings: React.FC<SettingsProps> = ({ 
  users, products, sales, onAddUser, onDeleteUser, currentUser, storeSettings, onUpdateStoreSettings, onGoBack,
  language, toggleLanguage, t = (k) => k
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [storeForm, setStoreForm] = useState<StoreSettings>(storeSettings);
  const [firebaseConfigStr, setFirebaseConfigStr] = useState('');
  const [activeSettingsTab, setActiveSettingsTab] = useState<'GENERAL' | 'OPERATORS'>('GENERAL');

  const [userFormData, setUserFormData] = useState<Partial<User>>({ 
    name: '', username: '', password: '', role: 'CASHIER' as UserRole, employeeId: '' 
  });

  useEffect(() => {
    setStoreForm(storeSettings);
    const existing = localStorage.getItem('easyPOS_firebaseConfig');
    if(existing) setFirebaseConfigStr(existing);
  }, [storeSettings]);

  const handleSaveFirebase = () => {
      if(saveFirebaseConfig(firebaseConfigStr)) {
          alert("Firebase Config Saved! System Restart Required.");
          window.location.reload();
      } else alert("Invalid JSON format.");
  };

  const handleAddUserSubmit = () => {
      if(!userFormData.name || !userFormData.username || !userFormData.password) {
          alert("All fields are required for new operator creation.");
          return;
      }
      const newUser: User = {
          id: Date.now().toString(),
          name: userFormData.name,
          username: userFormData.username,
          password: userFormData.password,
          role: userFormData.role as UserRole,
          employeeId: userFormData.employeeId || `EMP-${Math.floor(Math.random() * 9000) + 1000}`
      };
      onAddUser(newUser);
      setIsModalOpen(false);
      setUserFormData({ name: '', username: '', password: '', role: 'CASHIER', employeeId: '' });
  };

  const getRoleBadgeColor = (role: UserRole) => {
      switch(role) {
          case 'ADMIN': return 'bg-purple-100 text-purple-600 border-purple-200';
          case 'MANAGER': return 'bg-blue-100 text-blue-600 border-blue-200';
          case 'CASHIER': return 'bg-brand-100 text-brand-600 border-brand-200';
          default: return 'bg-slate-100 text-slate-600 border-slate-200';
      }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 p-4 lg:p-8 overflow-y-auto transition-colors custom-scrollbar">
       <div className="flex flex-col lg:flex-row justify-between lg:items-center mb-8 gap-4">
        <div className="flex items-center gap-4">
          <button onClick={onGoBack} className="p-3 -ml-3 rounded-2xl bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 shadow-sm transition-all active:scale-90" title="Go Back">
              <ChevronLeft size={28} className="rtl:rotate-180" />
          </button>
           <div>
             <h2 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">System Terminal</h2>
             <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mt-1">Central Configuration Console</p>
           </div>
        </div>
        
        <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-2xl">
            <button onClick={() => setActiveSettingsTab('GENERAL')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSettingsTab === 'GENERAL' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-lg' : 'text-slate-500'}`}>Configuration</button>
            <button onClick={() => setActiveSettingsTab('OPERATORS')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSettingsTab === 'OPERATORS' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-lg' : 'text-slate-500'}`}>Operator Access</button>
        </div>
      </div>

      {activeSettingsTab === 'GENERAL' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-20 animate-fade-in">
          {/* Identity & Receipt Setup */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-10 rounded-[3.5rem] shadow-xl border border-slate-100 dark:border-slate-800 space-y-10">
              <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800 pb-8">
                <div>
                   <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter flex items-center gap-3">
                      <Receipt size={28} className="text-brand-500" /> Identity Logic
                   </h3>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Configure your business outward brand</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                      <div onClick={() => logoInputRef.current?.click()} className="aspect-video border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl bg-slate-50 dark:bg-slate-800/50 flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all hover:border-brand-500 group relative">
                          {storeForm.logo ? (
                            <img src={storeForm.logo} className="h-full w-full object-contain p-4" alt="logo" />
                          ) : (
                            <>
                                <ImageIcon className="text-slate-300 group-hover:scale-110 transition-transform" size={48} />
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-4 italic">Drop Brand Asset</span>
                            </>
                          )}
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Business Name</label>
                        <input type="text" value={storeForm.name} onChange={e => setStoreForm({...storeForm, name: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black text-lg dark:text-white" placeholder="Store Name" />
                      </div>
                  </div>
                  <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Physical Address</label>
                        <textarea value={storeForm.address} onChange={e => setStoreForm({...storeForm, address: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold dark:text-white h-32 resize-none text-sm" placeholder="Store Address" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Receipt Footer</label>
                        <input type="text" value={storeForm.footerMessage} onChange={e => setStoreForm({...storeForm, footerMessage: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold dark:text-white" placeholder="Footer Thank You Note" />
                      </div>
                  </div>
              </div>

              {/* Tax Settings */}
              <div className="pt-10 border-t border-slate-50 dark:border-slate-800">
                  <div className="flex items-center gap-3 mb-8">
                     <Shield size={24} className="text-orange-500" />
                     <h4 className="text-lg font-black uppercase italic tracking-tighter dark:text-white text-slate-800">Tax & Regulatory Compliance</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-between border border-slate-100 dark:border-slate-700">
                         <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Enable VAT/Tax</span>
                         <input type="checkbox" checked={storeForm.taxEnabled} onChange={e => setStoreForm({...storeForm, taxEnabled: e.target.checked})} className="w-6 h-6 accent-brand-600 cursor-pointer" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Tax Rate (%)</label>
                        <input type="number" disabled={!storeForm.taxEnabled} value={storeForm.taxRate} onChange={e => setStoreForm({...storeForm, taxRate: parseFloat(e.target.value) || 0})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black text-lg dark:text-white disabled:opacity-30" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Tax Label</label>
                        <input type="text" disabled={!storeForm.taxEnabled} value={storeForm.taxName} onChange={e => setStoreForm({...storeForm, taxName: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black text-lg dark:text-white disabled:opacity-30" />
                      </div>
                  </div>
              </div>

              <div className="pt-8 flex justify-end">
                <button onClick={() => onUpdateStoreSettings(storeForm)} className="px-12 py-5 bg-brand-600 text-white rounded-3xl font-black uppercase tracking-widest shadow-2xl hover:bg-brand-500 transition-all active:scale-95 text-xs italic">
                    Synchronize System Settings
                </button>
              </div>
          </div>

          <div className="lg:col-span-4 space-y-8">
              {/* Cloud Bridge */}
              <div className="bg-slate-900 p-10 rounded-[3.5rem] shadow-xl text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-5"><Cloud size={140} /></div>
                  <h3 className="font-black text-white mb-8 flex items-center gap-3 uppercase italic tracking-tighter text-xl"><Cloud size={24} className="text-orange-500"/> Cloud Relay</h3>
                  <textarea value={firebaseConfigStr} onChange={e => setFirebaseConfigStr(e.target.value)} className="w-full h-44 p-5 text-[10px] font-mono bg-black/40 border-2 border-slate-800 rounded-3xl outline-none mb-6 text-emerald-400" placeholder='{"apiKey": "Paste Firebase Config JSON Here..."}' />
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={handleSaveFirebase} className="bg-orange-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">Initialize</button>
                    <button onClick={() => { if(confirm("Revert?")) { clearFirebaseConfig(); window.location.reload(); } }} className="bg-slate-800 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">Local Mode</button>
                  </div>
              </div>

              {/* Data Utility */}
              <div className="bg-white dark:bg-slate-900 p-10 rounded-[3.5rem] shadow-xl border border-slate-100 dark:border-slate-800">
                  <h3 className="font-black text-slate-800 dark:text-white mb-8 flex items-center gap-3 uppercase italic tracking-tighter text-xl"><Database size={24} className="text-brand-500"/> System Utilities</h3>
                  <button onClick={async () => {
                      const zip = new JSZip();
                      zip.file("pos_dump.json", JSON.stringify({ products, sales, storeSettings }));
                      const content = await zip.generateAsync({ type: "blob" });
                      const a = document.createElement('a'); a.href = URL.createObjectURL(content); a.download = `Terminal_Master_Backup_${Date.now()}.zip`; a.click();
                  }} className="w-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white py-5 rounded-3xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all shadow-sm">
                      <Database size={20} /> Master Backup Export
                  </button>
              </div>
          </div>
        </div>
      ) : (
        /* User Management Console */
        <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-20">
                <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                    <div className="p-10 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-900/10">
                        <div>
                            <h4 className="text-2xl font-black italic uppercase tracking-tighter dark:text-white">Active Terminal Operators</h4>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Staff Access & Role Management</p>
                        </div>
                        <button onClick={() => setIsModalOpen(true)} className="px-8 py-4 bg-brand-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 flex items-center gap-3">
                            <Plus size={18} /> Add New Operator
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-separate border-spacing-0">
                            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-400 font-black uppercase text-[9px] tracking-[0.3em]">
                                <tr>
                                    <th className="p-10">ID / Ref</th>
                                    <th className="p-10">Employee Name</th>
                                    <th className="p-10">Username</th>
                                    <th className="p-10 text-center">Security Level</th>
                                    <th className="p-10 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                {users.map(u => (
                                    <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all group">
                                        <td className="p-10 font-mono text-xs text-slate-400 font-black">{u.employeeId || 'SYS-ID'}</td>
                                        <td className="p-10">
                                            <div className="font-black text-slate-900 dark:text-white text-base">{u.name}</div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Status: Active</div>
                                        </td>
                                        <td className="p-10 font-bold text-slate-600 dark:text-slate-300">@{u.username}</td>
                                        <td className="p-10 text-center">
                                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border-2 ${getRoleBadgeColor(u.role)}`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="p-10 text-right">
                                            {u.id !== currentUser.id && u.role !== 'ADMIN' && (
                                                <button onClick={() => onDeleteUser(u.id)} className="p-3 text-slate-300 hover:text-red-500 transition-colors active:scale-90"><Trash2 size={20}/></button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Operator Insights */}
                <div className="lg:col-span-4 space-y-8">
                   <div className="bg-slate-900 p-10 rounded-[3.5rem] shadow-xl text-white relative overflow-hidden">
                       <div className="absolute top-0 right-0 p-8 opacity-10"><Users size={120} /></div>
                       <h3 className="text-xl font-black uppercase italic tracking-tighter mb-6">Staff Control Logic</h3>
                       <div className="space-y-6">
                           <div className="flex gap-4 items-start">
                               <div className="w-10 h-10 rounded-2xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-brand-500 shrink-0"><Shield size={20}/></div>
                               <div>
                                   <p className="font-black text-[10px] uppercase tracking-widest text-white mb-1">Granular Permissions</p>
                                   <p className="text-[10px] text-slate-400 leading-relaxed font-bold">Assign roles to restrict access to reports, inventory, or global settings.</p>
                               </div>
                           </div>
                           <div className="flex gap-4 items-start">
                               <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shrink-0"><Fingerprint size={20}/></div>
                               <div>
                                   <p className="font-black text-[10px] uppercase tracking-widest text-white mb-1">Traceability Audit</p>
                                   <p className="text-[10px] text-slate-400 leading-relaxed font-bold">Every transaction and stock adjustment is logged with the operator's ID.</p>
                               </div>
                           </div>
                       </div>
                   </div>
                </div>
            </div>
        </div>
      )}

      {/* Add User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-2xl flex items-center justify-center z-[120] p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[4rem] shadow-2xl overflow-hidden animate-fade-in-up border border-slate-100 dark:border-slate-800">
                <div className="p-10 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white italic uppercase tracking-tighter">New Operator</h3>
                    <button onClick={() => setIsModalOpen(false)} className="p-3 bg-white dark:bg-slate-800 text-slate-400 rounded-2xl hover:text-red-500 transition-all"><X size={24}/></button>
                </div>
                <div className="p-10 space-y-6">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Legal Name</label>
                        <input type="text" value={userFormData.name} onChange={e => setUserFormData({...userFormData, name: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold dark:text-white" placeholder="Operator Name" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unique Username</label>
                            <input type="text" value={userFormData.username} onChange={e => setUserFormData({...userFormData, username: e.target.value.toLowerCase()})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black dark:text-white" placeholder="username" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Security Role</label>
                            <select value={userFormData.role} onChange={e => setUserFormData({...userFormData, role: e.target.value as UserRole})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black dark:text-white text-[10px] uppercase tracking-widest">
                                <option value="STAFF">Staff (Inventory)</option>
                                <option value="CASHIER">Cashier (POS Only)</option>
                                <option value="MANAGER">Manager (Audit + Inventory)</option>
                            </select>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Access Password</label>
                        <input type="password" value={userFormData.password} onChange={e => setUserFormData({...userFormData, password: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold dark:text-white" placeholder="••••••••" />
                    </div>
                </div>
                <div className="p-10 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex gap-4">
                    <button onClick={() => setIsModalOpen(false)} className="flex-1 py-5 text-slate-500 font-black uppercase tracking-widest text-[10px]">Cancel</button>
                    <button onClick={handleAddUserSubmit} className="flex-[2] py-5 bg-slate-900 dark:bg-brand-600 text-white font-black uppercase tracking-widest text-[10px] rounded-[2rem] shadow-xl hover:bg-black transition-all">Authorize Operator</button>
                </div>
            </div>
        </div>
      )}
      
      <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if(f){ const r = new FileReader(); r.onloadend = () => setStoreForm(p => ({...p, logo: r.result as string})); r.readAsDataURL(f); } }} />
    </div>
  );
};
