import React, { useState, useRef, useEffect } from 'react';
import { User, UserRole, Product, Sale, StoreSettings, Language } from '../types';
import { Trash2, Plus, Save, X, Database, Receipt, Image as ImageIcon, LogOut, ChevronLeft, Languages, Cloud } from 'lucide-react';
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
  const [storeMessage, setStoreMessage] = useState<string | null>(null);
  const [firebaseConfigStr, setFirebaseConfigStr] = useState('');

  const [formData, setFormData] = useState({ name: '', username: '', password: '', role: 'STAFF' as UserRole });

  useEffect(() => {
    setStoreForm(storeSettings);
    const existing = localStorage.getItem('easyPOS_firebaseConfig');
    if(existing) setFirebaseConfigStr(existing);
  }, [storeSettings]);

  const handleSaveFirebase = () => {
      if(saveFirebaseConfig(firebaseConfigStr)) {
          alert("Firebase Config Saved! Reloading...");
          window.location.reload();
      } else alert("Invalid JSON format.");
  };

  const handleClearFirebase = () => {
      if(window.confirm("Revert to local mode?")) {
          clearFirebaseConfig();
          window.location.reload();
      }
  };

  const handleSaveStoreSettings = () => {
    onUpdateStoreSettings(storeForm);
    setStoreMessage("Settings committed.");
    setTimeout(() => setStoreMessage(null), 3000);
  };

  const handleBackup = async () => {
    const zip = new JSZip();
    zip.file("dump.json", JSON.stringify({ users, products, sales, storeSettings }));
    const content = await zip.generateAsync({ type: "blob" });
    const a = document.createElement('a');
    a.href = window.URL.createObjectURL(content);
    a.download = `easyPOS_Master_Backup.zip`;
    a.click();
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 p-4 lg:p-8 overflow-y-auto transition-colors custom-scrollbar">
       <div className="flex flex-col lg:flex-row justify-between lg:items-center mb-8 gap-4">
        <div className="flex items-center gap-4">
          <button onClick={onGoBack} className="p-3 -ml-3 rounded-2xl bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 shadow-sm transition-all active:scale-90" title="Go Back">
              <ChevronLeft size={28} className="rtl:rotate-180" />
          </button>
           <div>
             <h2 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">System</h2>
             <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mt-1">Global Configuration Console</p>
           </div>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-slate-900 dark:bg-brand-600 text-white px-6 py-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95 font-black text-xs uppercase tracking-widest">
            <Plus size={20} /> Add Operator
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
        <div className="space-y-8">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
                <h3 className="font-black text-slate-800 dark:text-white mb-6 flex items-center gap-3 uppercase italic tracking-tighter"><Languages size={22} className="text-brand-500"/> Regional</h3>
                <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                    <button onClick={() => language !== 'en' && toggleLanguage()} className={`py-3 rounded-xl text-xs font-black uppercase transition-all ${language === 'en' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-sm' : 'text-slate-400'}`}>EN</button>
                    <button onClick={() => language !== 'ar' && toggleLanguage()} className={`py-3 rounded-xl text-xs font-black uppercase transition-all ${language === 'ar' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-sm' : 'text-slate-400'}`}>AR</button>
                </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
                <h3 className="font-black text-slate-800 dark:text-white mb-6 flex items-center gap-3 uppercase italic tracking-tighter"><Cloud size={22} className="text-orange-500"/> Cloud</h3>
                <textarea value={firebaseConfigStr} onChange={e => setFirebaseConfigStr(e.target.value)} className="w-full h-32 p-4 text-[10px] font-mono bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-3xl outline-none mb-4 dark:text-white" placeholder='{"apiKey": "..."}' />
                <button onClick={handleSaveFirebase} className="w-full bg-orange-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all">Connect</button>
            </div>
        </div>

        <div className="lg:col-span-2 space-y-8">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
                <h3 className="font-black text-slate-800 dark:text-white mb-8 flex items-center gap-3 uppercase italic tracking-tighter text-xl"><Receipt size={24} className="text-brand-500"/> Identity</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                    <div className="space-y-6">
                        <div onClick={() => logoInputRef.current?.click()} className="aspect-video border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl bg-slate-50 dark:bg-slate-800/50 flex flex-col items-center justify-center cursor-pointer overflow-hidden">
                            {storeForm.logo ? <img src={storeForm.logo} className="h-full w-full object-contain p-4" alt="logo" /> : <ImageIcon className="text-slate-300" size={40} />}
                        </div>
                        <input type="text" value={storeForm.name} onChange={e => setStoreForm({...storeForm, name: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold dark:text-white" placeholder="Store Name" />
                    </div>
                    <div className="space-y-6">
                        <textarea value={storeForm.address} onChange={e => setStoreForm({...storeForm, address: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold dark:text-white h-32 resize-none" placeholder="Store Address" />
                        <input type="text" value={storeForm.footerMessage} onChange={e => setStoreForm({...storeForm, footerMessage: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold dark:text-white" placeholder="Receipt Footer" />
                    </div>
                </div>
                <div className="flex flex-col md:flex-row gap-4 pt-8 border-t border-slate-50 dark:border-slate-800">
                    <button onClick={handleSaveStoreSettings} className="px-12 py-5 bg-brand-600 text-white rounded-3xl font-black uppercase tracking-widest shadow-xl hover:bg-brand-500 transition-all active:scale-95 text-xs">Save Settings</button>
                    <button onClick={handleBackup} className="px-6 py-5 bg-slate-900 dark:bg-slate-800 text-white rounded-3xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3"><Database size={18} /> Master Backup</button>
                    {storeMessage && <span className="text-xs font-black text-emerald-600 uppercase self-center">{storeMessage}</span>}
                </div>
            </div>
        </div>
      </div>
      <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if(f){ const r = new FileReader(); r.onloadend = () => setStoreForm(p => ({...p, logo: r.result as string})); r.readAsDataURL(f); } }} />
    </div>
  );
};