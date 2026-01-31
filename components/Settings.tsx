
import React, { useState, useRef } from 'react';
import { User, StoreSettings, Language, VendorRequest, Product, Sale, UserRole } from '../types';
import { Save, UserPlus, Trash2, Edit2, X, ShieldCheck, Database, HardDrive, User as UserIcon, ChevronLeft, CheckCircle2, AlertCircle, RefreshCw, Upload, Image as ImageIcon } from 'lucide-react';

interface SettingsProps {
  users: User[];
  vendorRequests: VendorRequest[];
  products: Product[];
  sales: Sale[];
  onAddUser: (u: User) => void;
  onUpdateUser: (u: User) => void;
  onDeleteUser: (id: string) => void;
  onReviewRequest: (id: string, status: 'APPROVED' | 'REJECTED', reason?: string) => void;
  onLogout: () => void;
  currentUser: User;
  storeSettings: StoreSettings;
  onUpdateStoreSettings: (settings: StoreSettings) => void;
  onGoBack: () => void;
  language: Language;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

export const Settings: React.FC<SettingsProps> = ({
  users, onAddUser, onUpdateUser, onDeleteUser,
  currentUser, storeSettings, onUpdateStoreSettings,
  onGoBack, t, products, sales
}) => {
  const [activeTab, setActiveTab] = useState<'store' | 'users' | 'database'>('store');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState<Partial<User>>({
    name: '', username: '', password: '', role: 'STAFF'
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveStoreSettings = () => {
    onUpdateStoreSettings(storeSettings);
    alert('Store settings synchronized successfully.');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => onUpdateStoreSettings({ ...storeSettings, logo: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const handleOpenUserModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setUserFormData(user);
    } else {
      setEditingUser(null);
      setUserFormData({ name: '', username: '', password: '', role: 'STAFF' });
    }
    setIsUserModalOpen(true);
  };

  const handleSaveUser = () => {
    if (!userFormData.name || !userFormData.username || !userFormData.password) {
      alert("All fields are required for operators.");
      return;
    }

    const userData: User = {
      id: editingUser ? editingUser.id : `usr_${Date.now()}`,
      name: userFormData.name!,
      username: userFormData.username!,
      password: userFormData.password!,
      role: (userFormData.role as UserRole) || 'STAFF',
      email: userFormData.email || '',
      vendorId: userFormData.vendorId
    };

    if (editingUser) onUpdateUser(userData);
    else onAddUser(userData);
    
    setIsUserModalOpen(false);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-colors overflow-hidden">
      <div className="bg-white dark:bg-slate-900 p-6 shadow-sm border-b border-slate-100 dark:border-slate-800 shrink-0">
        <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 gap-6">
          <div className="flex items-center gap-4">
            <button onClick={onGoBack} className="p-3 -ml-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-all active:scale-90">
                <ChevronLeft size={28} className="rtl:rotate-180" />
            </button>
            <div>
                <h2 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">{t('settings')}</h2>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mt-1">Global System Configuration</p>
            </div>
          </div>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl shadow-inner">
            <button onClick={() => setActiveTab('store')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'store' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-md' : 'text-slate-400'}`}>{t('storeIdentity')}</button>
            <button onClick={() => setActiveTab('users')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-md' : 'text-slate-400'}`}>{t('operatorAccess')}</button>
            <button onClick={() => setActiveTab('database')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'database' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-md' : 'text-slate-400'}`}>System Data</button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-8 custom-scrollbar">
        <div className="max-w-4xl mx-auto space-y-12 pb-20">
          {activeTab === 'store' && (
            <div className="space-y-10 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-8">
                  <div className="aspect-video rounded-[3rem] bg-slate-50 dark:bg-slate-800 border-4 border-slate-100 dark:border-slate-700 flex items-center justify-center overflow-hidden relative shadow-inner group">
                    {storeSettings.logo ? (
                      <img src={storeSettings.logo} className="w-full h-full object-contain p-8" alt="Store Logo" />
                    ) : (
                      <ImageIcon size={64} className="text-slate-200" />
                    )}
                    <button onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-slate-900/60 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all font-black text-xs uppercase tracking-widest gap-2">
                       <Upload size={20}/> {t('uploadLogo')}
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('businessName')}</label>
                        <input type="text" value={storeSettings.name} onChange={e => onUpdateStoreSettings({...storeSettings, name: e.target.value})} className="w-full p-4 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl font-black text-lg dark:text-white" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('storeAddress')}</label>
                        <textarea value={storeSettings.address} onChange={e => onUpdateStoreSettings({...storeSettings, address: e.target.value})} className="w-full p-4 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl font-bold dark:text-white h-24 resize-none" />
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-50 dark:border-slate-800 pb-4">
                        <ShieldCheck size={20} className="text-emerald-500" />
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Security & Tax</h3>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-black dark:text-white uppercase">Enable Tax Ledger</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Global item taxation</p>
                        </div>
                        <button onClick={() => onUpdateStoreSettings({...storeSettings, taxEnabled: !storeSettings.taxEnabled})} className={`w-14 h-8 rounded-full transition-all relative ${storeSettings.taxEnabled ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                            <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-all ${storeSettings.taxEnabled ? 'right-1' : 'left-1'}`}></div>
                        </button>
                    </div>
                    {storeSettings.taxEnabled && (
                        <div className="grid grid-cols-2 gap-4 animate-fade-in-up">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase">Tax Rate (%)</label>
                                <input type="number" value={storeSettings.taxRate} onChange={e => onUpdateStoreSettings({...storeSettings, taxRate: parseFloat(e.target.value) || 0})} className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl font-black" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase">Tax Name</label>
                                <input type="text" value={storeSettings.taxName} onChange={e => onUpdateStoreSettings({...storeSettings, taxName: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl font-black" />
                            </div>
                        </div>
                    )}
                    <div className="pt-4 border-t border-slate-50 dark:border-slate-800">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Receipt Footer Message</label>
                        <input type="text" value={storeSettings.footerMessage} onChange={e => onUpdateStoreSettings({...storeSettings, footerMessage: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold dark:text-white text-xs" />
                    </div>
                  </div>
                  
                  <button onClick={handleSaveStoreSettings} className="w-full py-5 bg-slate-900 dark:bg-brand-600 text-white rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 flex items-center justify-center gap-3 italic transition-all">
                      <Save size={20}/> {t('syncTerminal')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex justify-between items-center bg-slate-900 text-white p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-10"><UserIcon size={120} /></div>
                <div className="relative z-10">
                    <h3 className="text-3xl font-black uppercase italic tracking-tighter mb-2">Personnel Node</h3>
                    <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">Active Operators: {users.length}</p>
                </div>
                <button onClick={() => handleOpenUserModal()} className="relative z-10 px-8 py-4 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl active:scale-95 transition-all flex items-center gap-3 italic">
                    <UserPlus size={18} /> {t('addNewOperator')}
                </button>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                  <table className="w-full text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-slate-400 font-black uppercase text-[9px] tracking-widest">
                          <tr>
                            <th className="p-8">Identity</th>
                            <th className="p-8 text-center">Node Role</th>
                            <th className="p-8 text-right">Actions</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                          {users.map(u => (
                              <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all">
                                  <td className="p-8">
                                      <div className="flex items-center gap-4">
                                          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center font-black text-slate-400 uppercase italic">{u.name.charAt(0)}</div>
                                          <div>
                                              <div className="font-black text-slate-900 dark:text-white uppercase italic">{u.name}</div>
                                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">@{u.username}</div>
                                          </div>
                                      </div>
                                  </td>
                                  <td className="p-8 text-center">
                                      <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border-2 ${u.role === 'ADMIN' ? 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/20' : 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20'}`}>
                                          {u.role}
                                      </span>
                                  </td>
                                  <td className="p-8 text-right">
                                      <div className="flex justify-end gap-2">
                                          <button onClick={() => handleOpenUserModal(u)} className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-xl hover:text-brand-600 transition-all"><Edit2 size={18}/></button>
                                          {currentUser.id !== u.id && <button onClick={() => onDeleteUser(u.id)} className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-xl hover:text-rose-600 transition-all"><Trash2 size={18}/></button>}
                                      </div>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
            </div>
          )}

          {activeTab === 'database' && (
             <div className="space-y-8 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                            <Database size={24} className="text-brand-600" />
                            <h4 className="text-lg font-black dark:text-white uppercase italic">Inventory Cache</h4>
                        </div>
                        <p className="text-sm font-medium text-slate-500 leading-relaxed">Local catalog data management and synchronization state.</p>
                        <div className="pt-4 flex justify-between items-end">
                            <div>
                                <p className="text-4xl font-black dark:text-white tracking-tighter">{products.length}</p>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Master Records</p>
                            </div>
                            <button className="px-6 py-3 bg-slate-900 dark:bg-brand-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2"><RefreshCw size={14}/> Force Sync</button>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                            <HardDrive size={24} className="text-emerald-500" />
                            <h4 className="text-lg font-black dark:text-white uppercase italic">Sales Ledger</h4>
                        </div>
                        <p className="text-sm font-medium text-slate-500 leading-relaxed">Historical transactional data and audit trails for the current node.</p>
                        <div className="pt-4 flex justify-between items-end">
                            <div>
                                <p className="text-4xl font-black dark:text-white tracking-tighter">{sales.length}</p>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logged Invoices</p>
                            </div>
                            <button className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2">Export CSV</button>
                        </div>
                    </div>
                </div>
                
                <div className="bg-rose-50 dark:bg-rose-950/20 border-2 border-dashed border-rose-200 dark:border-rose-900/40 p-10 rounded-[3.5rem] flex flex-col items-center text-center space-y-6">
                    <AlertCircle size={48} className="text-rose-500" />
                    <div>
                        <h4 className="text-xl font-black text-rose-600 uppercase italic">Factory Reset Node</h4>
                        <p className="text-sm font-medium text-rose-500/80 max-w-md mx-auto mt-2 leading-relaxed">Wiping the local node data will disconnect this terminal from the cloud sync. This action is irreversible.</p>
                    </div>
                    <button className="px-10 py-5 bg-rose-600 text-white rounded-3xl font-black uppercase tracking-widest text-[10px] shadow-xl active:scale-95 transition-all">Destroy Local Ledger</button>
                </div>
             </div>
          )}
        </div>
      </div>

      {isUserModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-2xl z-[120] flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-fade-in-up border border-slate-100 dark:border-slate-800 flex flex-col">
                  <div className="p-10 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                      <div>
                          <h3 className="text-3xl font-black text-slate-900 dark:text-white italic uppercase tracking-tighter">{editingUser ? 'Update Operator' : t('newOperator')}</h3>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Authorization Protocol</p>
                      </div>
                      <button onClick={() => setIsUserModalOpen(false)} className="p-3 bg-white dark:bg-slate-800 text-slate-400 rounded-2xl hover:text-red-500 transition-all"><X size={24}/></button>
                  </div>
                  
                  <div className="p-10 space-y-8">
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('fullLegalName')}</label>
                          <input type="text" value={userFormData.name} onChange={e => setUserFormData({...userFormData, name: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none focus:border-brand-500" />
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('username')}</label>
                            <input type="text" value={userFormData.username} onChange={e => setUserFormData({...userFormData, username: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none focus:border-brand-500" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('accessPassword')}</label>
                            <input type="password" value={userFormData.password} onChange={e => setUserFormData({...userFormData, password: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none focus:border-brand-500" />
                        </div>
                      </div>
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('securityRole')}</label>
                          <select value={userFormData.role} onChange={e => setUserFormData({...userFormData, role: e.target.value as UserRole})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black uppercase text-[10px] tracking-widest dark:text-white outline-none focus:border-brand-500">
                              <option value="STAFF">Staff Operator</option>
                              <option value="MANAGER">Node Manager</option>
                              <option value="ADMIN">System Admin</option>
                              <option value="CASHIER">Cashier Terminal</option>
                          </select>
                      </div>
                  </div>

                  <div className="p-10 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex gap-4">
                      <button onClick={() => setIsUserModalOpen(false)} className="flex-1 py-5 text-slate-500 font-black uppercase tracking-widest text-[10px]">{t('cancel')}</button>
                      <button onClick={handleSaveUser} className="flex-[2] py-5 bg-brand-600 text-white font-black uppercase tracking-widest text-[10px] rounded-[2rem] shadow-xl hover:bg-brand-500 transition-all italic flex items-center justify-center gap-2">
                          <CheckCircle2 size={18} /> {t('authorizeOperator')}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
