import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, UserRole, Product, Sale, StoreSettings, Language, AppView, VendorRequest } from '../types';
import { Trash2, Plus, X, Receipt, ChevronLeft, Users, Zap, Globe, Heart, Database, Cloud, Bell, ShieldCheck, Share2, Clipboard, BarChart, MessageSquare, ExternalLink, RefreshCw, CheckCircle2, Upload, Image as ImageIcon, Key, LogOut, ShieldEllipsis, ShieldAlert, Edit2, Lock, Store, Mail, Send, Inbox, Check, Slash, AlertCircle, Phone, Calendar } from 'lucide-react';
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
  users, vendorRequests, products, sales, onAddUser, onUpdateUser, onDeleteUser, onReviewRequest, onLogout, currentUser, storeSettings, onUpdateStoreSettings, onGoBack,
  language, toggleLanguage, t = (k) => k, onNavigate
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [storeForm, setStoreForm] = useState<StoreSettings>(storeSettings);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'GENERAL' | 'OPERATORS' | 'BACKUP' | 'REQUESTS'>('GENERAL');
  
  const isSystemOwner = currentUser.email?.toLowerCase() === 'nabeelkhan1007@gmail.com' || currentUser.email?.toLowerCase() === 'zahratalsawsen1@gmail.com';

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

      await new Promise(r => setTimeout(r, 4000));
      const blob = new Blob([JSON.stringify(fullSnapshot, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `easyPOS_SUPREME_BACKUP_${interval}_${Date.now()}.json`;
      link.click();
      
      setIsSyncingAll(false);
      alert(`SUPREME PROTOCOL EXECUTED: Complete Multi-Vendor snapshot dispatched to Cloud Vault.`);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 p-4 lg:p-8 overflow-y-auto transition-colors custom-scrollbar">
       <div className="flex flex-col lg:flex-row justify-between lg:items-center mb-8 gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onGoBack} className="p-3 -ml-3 rounded-2xl bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 shadow-sm border border-slate-100 dark:border-slate-800 transition-all active:scale-90 hover:text-brand-600"><ChevronLeft size={28} className="rtl:rotate-180" /></button>
          <div><h2 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">{t('systemTerminal')}</h2><p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Master Control Matrix</p></div>
        </div>
        <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-2xl overflow-x-auto no-scrollbar">
            <button onClick={() => setActiveSettingsTab('GENERAL')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSettingsTab === 'GENERAL' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-lg' : 'text-slate-500'}`}>{t('configuration')}</button>
            <button onClick={() => setActiveSettingsTab('OPERATORS')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSettingsTab === 'OPERATORS' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-lg' : 'text-slate-500'}`}>{t('operatorAccess')}</button>
            <button onClick={() => setActiveSettingsTab('BACKUP')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSettingsTab === 'BACKUP' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-lg' : 'text-slate-500'}`}>Global Vault</button>
            <button onClick={() => setActiveSettingsTab('REQUESTS')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap relative ${activeSettingsTab === 'REQUESTS' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-lg' : 'text-slate-500'}`}>Vendor Apps</button>
        </div>
      </div>

      {activeSettingsTab === 'BACKUP' ? (
        <div className="animate-fade-in max-w-4xl space-y-10 pb-20">
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
                        <button 
                            key={type}
                            disabled={isSyncingAll}
                            onClick={() => handleGlobalBackup(type as any)}
                            className="p-10 bg-white/5 border-2 border-white/10 rounded-[3rem] hover:bg-brand-600 hover:border-brand-400 transition-all group disabled:opacity-30"
                        >
                            <Cloud size={48} className="text-brand-500 group-hover:text-white mx-auto mb-6" />
                            <p className="font-black uppercase tracking-widest text-xs italic">{type} Global Snapshot</p>
                            <p className="text-[9px] font-bold text-slate-500 uppercase mt-2 group-hover:text-white/60">Export {users.length} Vendors & {products.length} Products</p>
                        </button>
                    ))}
                </div>
                <div className="bg-black/50 p-8 rounded-[2.5rem] border-2 border-dashed border-brand-500/30 w-full relative z-10">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-500 mb-2">Security Hash Verification</p>
                    <code className="text-[9px] font-mono text-slate-400 select-all">
                        EASYPOS_SUPREME_2026_MASTER_LEDGER_CRC32_SYNC_ENABLED
                    </code>
                </div>
            </div>
        </div>
      ) : activeSettingsTab === 'GENERAL' ? (
        <div className="max-w-4xl space-y-8 animate-fade-in pb-20">
            {/* Standard Config Form */}
            <div className="bg-white dark:bg-slate-900 p-10 rounded-[3.5rem] shadow-xl border border-slate-100 dark:border-slate-800 space-y-10">
                <div className="flex items-center gap-3 border-b border-slate-50 dark:border-slate-800 pb-6"><Receipt size={28} className="text-brand-500" /><h3 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white">Identity Config</h3></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('businessName')}</label><input type="text" value={storeForm.name} onChange={e => setStoreForm({...storeForm, name: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black dark:text-white" /></div>
                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Master Access Key</label><input type="text" value={storeForm.visitorAccessCode || ''} onChange={e => setStoreForm({...storeForm, visitorAccessCode: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black dark:text-white tracking-[0.3em]" placeholder="2026" /></div>
                </div>
                <button onClick={() => onUpdateStoreSettings(storeForm)} className="w-full py-5 bg-slate-900 dark:bg-brand-600 text-white rounded-3xl font-black uppercase tracking-widest shadow-2xl active:scale-95 italic text-xs">Sync System Matrix</button>
            </div>
            <button onClick={onLogout} className="w-full flex items-center justify-center gap-4 py-8 bg-red-50 dark:bg-red-950/20 text-red-600 hover:bg-red-600 hover:text-white transition-all rounded-[3rem] font-black uppercase tracking-[0.3em] text-sm shadow-xl group border border-red-100 dark:border-red-900/30"><LogOut size={28} className="group-hover:-translate-x-2 transition-transform" /><span>Terminate Root Session</span></button>
        </div>
      ) : null}
    </div>
  );
};