
import React, { useState, useRef, useEffect } from 'react';
import { User, UserRole, Product, Sale, StoreSettings, Language } from '../types';
import { Trash2, Plus, X, Receipt, Image as ImageIcon, ChevronLeft, Shield, Users, Fingerprint, Zap, Globe, Heart } from 'lucide-react';

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
  const [storeForm, setStoreForm] = useState<StoreSettings>(storeSettings);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'GENERAL' | 'OPERATORS'>('GENERAL');
  const [userFormData, setUserFormData] = useState<Partial<User>>({ name: '', username: '', password: '', role: 'CASHIER', employeeId: '' });

  const handleAddUserSubmit = () => {
      if(!userFormData.name || !userFormData.username || !userFormData.password) return alert("Required fields missing.");
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

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 p-4 lg:p-8 overflow-y-auto transition-colors">
       <div className="flex flex-col lg:flex-row justify-between lg:items-center mb-8 gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onGoBack} className="p-3 -ml-3 rounded-2xl bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 shadow-sm transition-all active:scale-90"><ChevronLeft size={28} className="rtl:rotate-180" /></button>
          <div><h2 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">System Terminal</h2><p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Control Console</p></div>
        </div>
        <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-2xl">
            <button onClick={() => setActiveSettingsTab('GENERAL')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSettingsTab === 'GENERAL' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-lg' : 'text-slate-500'}`}>Configuration</button>
            <button onClick={() => setActiveSettingsTab('OPERATORS')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSettingsTab === 'OPERATORS' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-lg' : 'text-slate-500'}`}>Operator Access</button>
        </div>
      </div>

      {activeSettingsTab === 'GENERAL' ? (
        <div className="max-w-4xl bg-white dark:bg-slate-900 p-10 rounded-[3.5rem] shadow-xl border border-slate-100 dark:border-slate-800 space-y-10 animate-fade-in">
            <div className="flex items-center gap-3 border-b border-slate-50 dark:border-slate-800 pb-6"><Receipt size={28} className="text-brand-500" /><h3 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white">Store Identity</h3></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Business Name</label><input type="text" value={storeForm.name} onChange={e => setStoreForm({...storeForm, name: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black dark:text-white" /></div>
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tax Rate (%)</label><input type="number" value={storeForm.taxRate} onChange={e => setStoreForm({...storeForm, taxRate: parseFloat(e.target.value) || 0})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black dark:text-white" /></div>
                <div className="md:col-span-2 space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Store Address</label><textarea value={storeForm.address} onChange={e => setStoreForm({...storeForm, address: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold dark:text-white h-24 resize-none" /></div>
            </div>

            <div className="pt-6">
                <div className="flex items-center gap-3 border-b border-slate-50 dark:border-slate-800 pb-6 mb-6">
                    <Zap size={28} className="text-brand-500" />
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white">Image Generation Engines</h3>
                </div>
                <div className="space-y-8">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('cfAiUrl')}</label>
                        <div className="relative">
                            <input 
                                type="url" 
                                value={storeForm.cloudflareAiUrl || ''} 
                                onChange={e => setStoreForm({...storeForm, cloudflareAiUrl: e.target.value})} 
                                className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold dark:text-white pl-12" 
                                placeholder={t('cfAiPlaceholder')} 
                            />
                            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                        </div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-2 italic">Requires Cloudflare Workers AI integration.</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-2">
                            <Heart size={12} className="fill-rose-400" /> {t('hcAiUrl')} (Hack Club)
                        </label>
                        <div className="relative">
                            <input 
                                type="url" 
                                value={storeForm.hackClubAiUrl || ''} 
                                onChange={e => setStoreForm({...storeForm, hackClubAiUrl: e.target.value})} 
                                className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold dark:text-white pl-12" 
                                placeholder={t('hcAiPlaceholder')} 
                            />
                            <Zap className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-300" size={20} />
                        </div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-2 italic">Unlimited free image generation for educational/youth projects.</p>
                    </div>
                </div>
            </div>

            <button onClick={() => onUpdateStoreSettings(storeForm)} className="px-10 py-5 bg-brand-600 text-white rounded-3xl font-black uppercase tracking-widest shadow-2xl hover:bg-brand-500 transition-all active:scale-95 italic text-xs">Sync Terminal Settings</button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-fade-in">
            <div className="p-10 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-900/10">
                <h4 className="text-2xl font-black italic uppercase tracking-tighter dark:text-white">Active Terminal Operators</h4>
                <button onClick={() => setIsModalOpen(true)} className="px-8 py-4 bg-brand-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 flex items-center gap-3"><Plus size={18} /> Add New Operator</button>
            </div>
            <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-400 font-black uppercase text-[9px] tracking-widest"><tr>
                    <th className="p-10">Employee ID</th><th className="p-10">Name</th><th className="p-10">Role</th><th className="p-10 text-right">Actions</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {users.map(u => (
                        <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all">
                            <td className="p-10 font-mono text-xs text-slate-400 font-black">{u.employeeId || 'SYS-ID'}</td>
                            <td className="p-10 font-black text-slate-900 dark:text-white">{u.name} <span className="block text-[9px] text-slate-400 uppercase tracking-widest mt-1">@{u.username}</span></td>
                            <td className="p-10"><span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border-2 ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-600 border-purple-200' : 'bg-brand-100 text-brand-600 border-brand-200'}`}>{u.role}</span></td>
                            <td className="p-10 text-right">{u.id !== currentUser.id && <button onClick={() => onDeleteUser(u.id)} className="p-3 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={20}/></button>}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-2xl flex items-center justify-center z-[120] p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[4rem] shadow-2xl overflow-hidden animate-fade-in-up border border-slate-100 dark:border-slate-800">
                <div className="p-10 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50"><h3 className="text-3xl font-black text-slate-900 dark:text-white italic uppercase tracking-tighter">New Operator</h3><button onClick={() => setIsModalOpen(false)} className="p-3 bg-white dark:bg-slate-800 text-slate-400 rounded-2xl hover:text-red-500 transition-all"><X size={24}/></button></div>
                <div className="p-10 space-y-6">
                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Legal Name</label><input type="text" value={userFormData.name} onChange={e => setUserFormData({...userFormData, name: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold dark:text-white" placeholder="Operator Name" /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Username</label><input type="text" value={userFormData.username} onChange={e => setUserFormData({...userFormData, username: e.target.value.toLowerCase()})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black dark:text-white" placeholder="username" /></div>
                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Security Role</label><select value={userFormData.role} onChange={e => setUserFormData({...userFormData, role: e.target.value as UserRole})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black dark:text-white text-[10px] uppercase tracking-widest"><option value="CASHIER">Cashier</option><option value="MANAGER">Manager</option><option value="STAFF">Inventory Staff</option></select></div>
                    </div>
                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Employee ID (Optional)</label><input type="text" value={userFormData.employeeId} onChange={e => setUserFormData({...userFormData, employeeId: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold dark:text-white" placeholder="E.g. EMP-101" /></div>
                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Access Password</label><input type="password" value={userFormData.password} onChange={e => setUserFormData({...userFormData, password: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold dark:text-white" placeholder="••••••••" /></div>
                </div>
                <div className="p-10 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex gap-4"><button onClick={() => setIsModalOpen(false)} className="flex-1 py-5 text-slate-500 font-black uppercase tracking-widest text-[10px]">Cancel</button><button onClick={handleAddUserSubmit} className="flex-[2] py-5 bg-brand-600 text-white font-black uppercase tracking-widest text-[10px] rounded-[2rem] shadow-xl hover:bg-brand-500 transition-all">Authorize Operator</button></div>
            </div>
        </div>
      )}
    </div>
  );
};
