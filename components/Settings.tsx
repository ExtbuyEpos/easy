
import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole, Product, Sale, StoreSettings, Language, AppView } from '../types';
import { Trash2, Plus, X, Receipt, ChevronLeft, Users, Zap, Globe, Heart, Database, Cloud, Bell, ShieldCheck, Share2, Clipboard, BarChart, MessageSquare, ExternalLink, RefreshCw, CheckCircle2, Upload, Image as ImageIcon, Key } from 'lucide-react';
import { formatNumber } from '../utils/format';
import { requestNotificationPermission } from '../services/notificationService';

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
  onNavigate?: (view: AppView) => void;
}

export const Settings: React.FC<SettingsProps> = ({ 
  users, onAddUser, onDeleteUser, currentUser, storeSettings, onUpdateStoreSettings, onGoBack,
  language, toggleLanguage, t = (k) => k, onNavigate
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [storeForm, setStoreForm] = useState<StoreSettings>(storeSettings);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'GENERAL' | 'OPERATORS'>('GENERAL');
  const [userFormData, setUserFormData] = useState<Partial<User>>({ name: '', username: '', password: '', role: 'CASHIER', employeeId: '' });
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [isWaConnected, setIsWaConnected] = useState(localStorage.getItem('easyPOS_whatsappSession') === 'active');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleEnableNotifications = async () => {
    const token = await requestNotificationPermission();
    if (token) {
        setFcmToken(token);
        alert("Push notifications enabled successfully.");
    } else {
        alert("Notification permission denied or FCM not supported.");
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setStoreForm({ ...storeForm, logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard");
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 p-4 lg:p-8 overflow-y-auto transition-colors custom-scrollbar">
       <div className="flex flex-col lg:flex-row justify-between lg:items-center mb-8 gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onGoBack} className="p-3 -ml-3 rounded-2xl bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 shadow-sm transition-all active:scale-90"><ChevronLeft size={28} className="rtl:rotate-180" /></button>
          <div><h2 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">{t('systemTerminal')}</h2><p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">{t('controlConsole')}</p></div>
        </div>
        <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-2xl">
            <button onClick={() => setActiveSettingsTab('GENERAL')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSettingsTab === 'GENERAL' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-lg' : 'text-slate-500'}`}>{t('configuration')}</button>
            <button onClick={() => setActiveSettingsTab('OPERATORS')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSettingsTab === 'OPERATORS' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-lg' : 'text-slate-500'}`}>{t('operatorAccess')}</button>
        </div>
      </div>

      {activeSettingsTab === 'GENERAL' ? (
        <div className="max-w-4xl space-y-8 animate-fade-in pb-20">
            {/* Store Configuration Card */}
            <div className="bg-white dark:bg-slate-900 p-10 rounded-[3.5rem] shadow-xl border border-slate-100 dark:border-slate-800 space-y-10">
                <div className="flex items-center gap-3 border-b border-slate-50 dark:border-slate-800 pb-6"><Receipt size={28} className="text-brand-500" /><h3 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white">{t('storeIdentity')}</h3></div>
                
                {/* Store Branding / Logo Section */}
                <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('storeLogo')}</label>
                    <div className="flex flex-col md:flex-row gap-6 items-center">
                        <div className="w-32 h-32 rounded-[2.5rem] bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow-inner group relative">
                            {storeForm.logo ? (
                                <>
                                    <img src={storeForm.logo} className="w-full h-full object-contain p-4" alt="Store Logo" />
                                    <button 
                                        onClick={() => setStoreForm({...storeForm, logo: ''})} 
                                        className="absolute inset-0 bg-red-600/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 size={24} />
                                    </button>
                                </>
                            ) : (
                                <div className="text-slate-300 dark:text-slate-600 flex flex-col items-center gap-1">
                                    <ImageIcon size={32} strokeWidth={1.5} />
                                    <span className="text-[8px] font-black uppercase tracking-tighter">Branding Layer</span>
                                </div>
                            )}
                        </div>
                        <div className="flex-1 space-y-3 w-full">
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl border border-slate-200 dark:border-slate-700 transition-all font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3"
                            >
                                <Upload size={16} /> {t('uploadLogo')}
                            </button>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest italic leading-relaxed">
                                Square or transparent PNG recommended. This logo will appear at the top of all printed and digital invoices.
                            </p>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('businessName')}</label><input type="text" value={storeForm.name} onChange={e => setStoreForm({...storeForm, name: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black dark:text-white" /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('taxRate')}</label><input type="number" value={storeForm.taxRate} onChange={e => setStoreForm({...storeForm, taxRate: parseFloat(e.target.value) || 0})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black dark:text-white" /></div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-brand-600 uppercase tracking-widest ml-1">{t('visitorAccessCode')}</label>
                        <div className="relative">
                            <input type="text" value={storeForm.visitorAccessCode || ''} onChange={e => setStoreForm({...storeForm, visitorAccessCode: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-brand-100 dark:border-brand-900 rounded-2xl font-black dark:text-white pl-12" placeholder="e.g. 2026" />
                            <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-500" size={18} />
                        </div>
                    </div>
                    <div className="md:col-span-2 space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('storeAddress')}</label><textarea value={storeForm.address} onChange={e => setStoreForm({...storeForm, address: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold dark:text-white h-24 resize-none" /></div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 pt-6">
                    <button onClick={() => onUpdateStoreSettings(storeForm)} className="flex-1 py-5 bg-brand-600 text-white rounded-3xl font-black uppercase tracking-widest shadow-2xl hover:bg-brand-500 transition-all active:scale-95 italic text-xs">{t('syncTerminal')}</button>
                </div>
            </div>

            {/* Cloud Infrastructure Details Card */}
            <div className="bg-slate-900 text-white p-10 rounded-[3.5rem] shadow-2xl border border-white/5 space-y-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-5 rotate-12 transition-transform duration-1000"><Cloud size={200} /></div>
                <div className="flex items-center gap-4 relative z-10 border-b border-white/10 pb-6">
                    <div className="w-14 h-14 bg-brand-500/20 rounded-2xl flex items-center justify-center border border-brand-500/30">
                        <Database size={28} className="text-brand-400" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black uppercase italic tracking-tighter">{t('cloudInfrastructure')}</h3>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">Backend Deployment Environment</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 relative z-10 border-b border-white/10 pb-10">
                    <div className="space-y-1.5">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">{t('projectName')}</span>
                        <div className="font-black text-xl tracking-tighter text-white uppercase italic">easyPOS</div>
                    </div>
                    <div className="space-y-1.5">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">{t('projectId')}</span>
                        <div className="font-mono text-base font-black text-brand-400">extbuy-flutter-ai</div>
                    </div>
                    <div className="space-y-1.5">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">{t('projectNumber')}</span>
                        <div className="font-mono text-base font-black text-slate-300">856022079884</div>
                    </div>
                    <div className="space-y-1.5">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">{t('deploymentStatus')}</span>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]"></div>
                            <span className="font-black text-[10px] uppercase tracking-widest text-emerald-500 italic">Production Node Live</span>
                        </div>
                    </div>
                </div>

                {/* WhatsApp Baileys Engine Card */}
                <div className="pt-6 relative z-10 space-y-6">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                           <MessageSquare size={20} className="text-emerald-400" />
                           <h4 className="text-sm font-black uppercase tracking-widest">WhatsApp Gateway</h4>
                       </div>
                       <div className={`px-3 py-1 text-[8px] font-black rounded-full border ${isWaConnected ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                           {isWaConnected ? 'STABLE PROTOCOL v5.0.0' : 'OFFLINE'}
                       </div>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-1.5">
                           <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Engine Core</span>
                           <div className="font-mono text-base font-black text-slate-300">Baileys Multi-Device</div>
                       </div>
                       <div className="space-y-1.5">
                           <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Bridge Status</span>
                           <div className="flex items-center gap-2">
                               <div className={`w-1.5 h-1.5 rounded-full ${isWaConnected ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                               <span className={`text-[10px] font-black uppercase italic ${isWaConnected ? 'text-emerald-500' : 'text-red-500'}`}>
                                   {isWaConnected ? 'E2E Link Encrypted' : 'Authentication Required'}
                               </span>
                           </div>
                       </div>
                   </div>

                   <button 
                     onClick={() => onNavigate && onNavigate(AppView.BAILEYS_SETUP)}
                     className="w-full flex items-center justify-center gap-3 py-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all font-black uppercase text-[10px] tracking-[0.2em] italic"
                   >
                       <ExternalLink size={16} /> Open Bridge Terminal
                   </button>
                </div>
            </div>

            {/* Language Selection Card */}
            <div className="bg-white dark:bg-slate-900 p-10 rounded-[3.5rem] shadow-xl border border-slate-100 dark:border-slate-800 space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-50 dark:border-slate-800 pb-6">
                    <Globe size={28} className="text-brand-500" />
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white">{t('languageSettings')}</h3>
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('language')}</p>
                        <p className="text-lg font-black dark:text-white uppercase">{language === 'ar' ? 'العربية (Arabic)' : 'English'}</p>
                    </div>
                    <button 
                        onClick={toggleLanguage}
                        className="px-8 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-brand-600 hover:text-white dark:text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-sm transition-all active:scale-95 flex items-center gap-3"
                    >
                        <RefreshCw size={18} />
                        {t('switchLanguage')}
                    </button>
                </div>
            </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-fade-in">
            <div className="p-10 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-900/10">
                <h4 className="text-2xl font-black italic uppercase tracking-tighter dark:text-white">{t('activeOperators')}</h4>
                <button onClick={() => setIsModalOpen(true)} className="px-8 py-4 bg-brand-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 flex items-center gap-3"><Plus size={18} /> {t('addNewOperator')}</button>
            </div>
            <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-400 font-black uppercase text-[9px] tracking-widest"><tr>
                    <th className="p-10">{t('employeeId')}</th><th className="p-10">{t('name')}</th><th className="p-10">{t('role')}</th><th className="p-10 text-right">{t('action')}</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {users.map(u => (
                        <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all">
                            <td className="p-10 font-mono text-xs text-slate-400 font-black">{u.employeeId ? formatNumber(u.employeeId.split('-')[1], language) : '٠'}</td>
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
                <div className="p-10 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50"><h3 className="text-3xl font-black text-slate-900 dark:text-white italic uppercase tracking-tighter">{t('newOperator')}</h3><button onClick={() => setIsModalOpen(false)} className="p-3 bg-white dark:bg-slate-800 text-slate-400 rounded-2xl hover:text-red-500 transition-all"><X size={24}/></button></div>
                <div className="p-10 space-y-6">
                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('fullLegalName')}</label><input type="text" value={userFormData.name} onChange={e => setUserFormData({...userFormData, name: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold dark:text-white" placeholder={t('name')} /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('username')}</label><input type="text" value={userFormData.username} onChange={e => setUserFormData({...userFormData, username: e.target.value.toLowerCase()})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black dark:text-white" placeholder="username" /></div>
                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('securityRole')}</label><select value={userFormData.role} onChange={e => setUserFormData({...userFormData, role: e.target.value as UserRole})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black dark:text-white text-[10px] uppercase tracking-widest"><option value="CASHIER">Cashier</option><option value="MANAGER">Manager</option><option value="STAFF">Inventory Staff</option></select></div>
                    </div>
                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('employeeId')} (Optional)</label><input type="text" value={userFormData.employeeId} onChange={e => setUserFormData({...userFormData, employeeId: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold dark:text-white" placeholder="E.g. EMP-101" /></div>
                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('accessPassword')}</label><input type="password" value={userFormData.password} onChange={e => setUserFormData({...userFormData, password: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold dark:text-white" placeholder="••••••••" /></div>
                </div>
                <div className="p-10 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex gap-4"><button onClick={() => setIsModalOpen(false)} className="flex-1 py-5 text-slate-500 font-black uppercase tracking-widest text-[10px]">{t('cancel')}</button><button onClick={handleAddUserSubmit} className="flex-[2] py-5 bg-brand-600 text-white font-black uppercase tracking-widest text-[10px] rounded-[2rem] shadow-xl hover:bg-brand-500 transition-all">{t('authorizeOperator')}</button></div>
            </div>
        </div>
      )}
    </div>
  );
};
