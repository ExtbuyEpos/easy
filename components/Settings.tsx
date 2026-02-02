
import React, { useState, useRef } from 'react';
import { User, StoreSettings, Language, VendorRequest, Product, Sale, UserRole } from '../types';
import { Save, UserPlus, Trash2, Edit2, X, ShieldCheck, Database, HardDrive, User as UserIcon, ChevronLeft, CheckCircle2, AlertCircle, RefreshCw, Upload, Image as ImageIcon, Store, Key, Loader2 } from 'lucide-react';
import { uploadImage } from '../firebase';

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
  const [isUploading, setIsUploading] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState<Partial<User>>({
    name: '', username: '', password: '', role: 'STAFF', vendorId: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveStoreSettings = () => {
    onUpdateStoreSettings(storeSettings);
    alert('Store settings synchronized successfully.');
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      try {
        const publicUrl = await uploadImage(file, 'branding');
        onUpdateStoreSettings({ ...storeSettings, logo: publicUrl });
      } catch (err) {
        alert("Upload failed.");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleOpenUserModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setUserFormData(user);
    } else {
      setEditingUser(null);
      setUserFormData({ name: '', username: '', password: '', role: 'STAFF', vendorId: '' });
    }
    setIsUserModalOpen(true);
  };

  const handleSaveUser = () => {
    if (!userFormData.name || !userFormData.username || !userFormData.password) {
      alert("All fields are required for operators.");
      return;
    }

    const role = (userFormData.role as UserRole) || 'STAFF';
    let finalVendorId = userFormData.vendorId;

    // Admin-Side Vendor Creation Logic: Auto-generate ID if missing
    if (role === 'VENDOR' && !finalVendorId && !editingUser) {
        const randomString = Math.random().toString(36).substring(2, 8).toUpperCase();
        finalVendorId = `VND-${randomString}`;
    }

    const userData: User = {
      id: editingUser ? editingUser.id : `usr_${Date.now()}`,
      name: userFormData.name!,
      username: userFormData.username!.toLowerCase().trim(),
      password: userFormData.password!,
      role: role,
      email: userFormData.email || '',
      vendorId: finalVendorId,
      // Initialize vendor-specific identity if role is VENDOR
      vendorSettings: role === 'VENDOR' ? (editingUser?.vendorSettings || {
          storeName: userFormData.name!,
          storeAddress: '',
          shopPasscode: '2026',
          customUrlSlug: finalVendorId?.toLowerCase() || ''
      }) : undefined,
      vendorStaffLimit: role === 'VENDOR' ? (editingUser?.vendorStaffLimit || 10) : undefined
    };

    if (editingUser) onUpdateUser(userData);
    else onAddUser(userData);
    
    setIsUserModalOpen(false);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-colors overflow-hidden">
      <div className="bg-white dark:bg-slate-900 p-4 md:p-6 shadow-sm border-b border-slate-100 dark:border-slate-800 shrink-0">
        <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 md:mb-8 gap-4">
          <div className="flex items-center gap-3">
            <button onClick={onGoBack} className="p-2 -ml-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-all active:scale-90">
                <ChevronLeft size={24} className="rtl:rotate-180" />
            </button>
            <div>
                <h2 className="text-lg md:text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">{t('settings')}</h2>
                <p className="text-slate-500 text-[8px] font-black uppercase tracking-[0.3em] opacity-60 mt-1">Admin Console</p>
            </div>
          </div>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shadow-inner overflow-x-auto no-scrollbar">
            <button onClick={() => setActiveTab('store')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'store' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-sm' : 'text-slate-400'}`}>{t('storeIdentity')}</button>
            <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'users' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-sm' : 'text-slate-400'}`}>{t('operatorAccess')}</button>
            <button onClick={() => setActiveTab('database')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'database' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-sm' : 'text-slate-400'}`}>Node Data</button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-8 custom-scrollbar">
        <div className="max-w-4xl mx-auto space-y-8 md:space-y-12 pb-20">
          {activeTab === 'store' && (
            <div className="space-y-6 md:space-y-10 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                <div className="space-y-6">
                  <div className="aspect-video rounded-[2rem] md:rounded-[3rem] bg-slate-50 dark:bg-slate-800 border-4 border-slate-100 dark:border-slate-700 flex items-center justify-center overflow-hidden relative shadow-inner group">
                    {storeSettings.logo ? (
                      <img src={storeSettings.logo} className="w-full h-full object-contain p-4 md:p-8" alt="Store Logo" />
                    ) : isUploading ? (
                      <Loader2 className="animate-spin text-brand-500" size={32} />
                    ) : (
                      <ImageIcon size={48} className="text-slate-200" />
                    )}
                    <button disabled={isUploading} onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-slate-900/60 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all font-black text-[10px] uppercase tracking-widest gap-2">
                       {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16}/>} {t('uploadLogo')}
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('businessName')}</label>
                        <input type="text" value={storeSettings.name} onChange={e => onUpdateStoreSettings({...storeSettings, name: e.target.value})} className="w-full p-3.5 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-xl font-black text-base dark:text-white" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('storeAddress')}</label>
                        <textarea value={storeSettings.address} onChange={e => onUpdateStoreSettings({...storeSettings, address: e.target.value})} className="w-full p-3.5 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-xl font-bold dark:text-white h-20 resize-none text-sm" />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-5">
                    <div className="flex items-center gap-3 border-b border-slate-50 dark:border-slate-800 pb-3">
                        <ShieldCheck size={18} className="text-emerald-500" />
                        <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-400">Security & Tax</h3>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-black dark:text-white uppercase">Enable Tax Ledger</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Global item taxation</p>
                        </div>
                        <button onClick={() => onUpdateStoreSettings({...storeSettings, taxEnabled: !storeSettings.taxEnabled})} className={`w-12 h-7 rounded-full transition-all relative ${storeSettings.taxEnabled ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                            <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-all ${storeSettings.taxEnabled ? 'right-1' : 'left-1'}`}></div>
                        </button>
                    </div>
                    {storeSettings.taxEnabled && (
                        <div className="grid grid-cols-2 gap-3 animate-fade-in-up">
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase">Rate %</label>
                                <input type="number" value={storeSettings.taxRate} onChange={e => onUpdateStoreSettings({...storeSettings, taxRate: parseFloat(e.target.value) || 0})} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg font-black text-xs" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase">Label</label>
                                <input type="text" value={storeSettings.taxName} onChange={e => onUpdateStoreSettings({...storeSettings, taxName: e.target.value})} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg font-black text-xs" />
                            </div>
                        </div>
                    )}
                    <div className="pt-3 border-t border-slate-50 dark:border-slate-800">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Receipt Note</label>
                        <input type="text" value={storeSettings.footerMessage} onChange={e => onUpdateStoreSettings({...storeSettings, footerMessage: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold dark:text-white text-[10px]" />
                    </div>
                  </div>
                  
                  <button onClick={handleSaveStoreSettings} className="w-full py-4 bg-slate-900 dark:bg-brand-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg active:scale-95 flex items-center justify-center gap-3 italic transition-all">
                      <Save size={18}/> {t('syncTerminal')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6 md:space-y-8 animate-fade-in">
              <div className="flex flex-col md:flex-row justify-between items-center bg-slate-900 text-white p-6 md:p-10 rounded-[2rem] md:rounded-[3.5rem] shadow-2xl relative overflow-hidden gap-6">
                <div className="absolute top-0 right-0 p-12 opacity-10 hidden md:block"><UserIcon size={120} /></div>
                <div className="relative z-10 text-center md:text-left">
                    <h3 className="text-xl md:text-3xl font-black uppercase italic tracking-tighter mb-1">Personnel Hub</h3>
                    <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[8px] md:text-[10px]">Active Node Operators: {users.length}</p>
                </div>
                <button onClick={() => handleOpenUserModal()} className="relative z-10 w-full md:w-auto px-6 md:px-8 py-3.5 md:py-4 bg-brand-600 hover:bg-brand-500 text-white rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[9px] md:text-[10px] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 italic">
                    <UserPlus size={18} /> {t('addNewOperator')}
                </button>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-[2rem] md:rounded-[3.5rem] shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-400 font-black uppercase text-[8px] md:text-[9px] tracking-widest">
                            <tr>
                                <th className="p-4 md:p-8">Identity</th>
                                <th className="p-4 md:p-8 text-center">Node Role</th>
                                <th className="p-4 md:p-8 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {users.map(u => (
                                <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all">
                                    <td className="p-4 md:p-8">
                                        <div className="flex items-center gap-3 md:gap-4">
                                            <div className="w-8 h-8 md:w-12 md:h-12 bg-slate-100 dark:bg-slate-800 rounded-lg md:rounded-2xl flex items-center justify-center font-black text-slate-400 uppercase italic text-xs md:text-base">{u.name.charAt(0)}</div>
                                            <div className="min-w-0">
                                                <div className="font-black text-slate-900 dark:text-white uppercase italic text-xs md:text-sm truncate">{u.name}</div>
                                                <div className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-2">
                                                    @{u.username} {u.vendorId && <span className="text-brand-500 font-mono">[{u.vendorId}]</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 md:p-8 text-center">
                                        <span className={`px-2 md:px-4 py-1 rounded-full text-[7px] md:text-[9px] font-black uppercase tracking-widest border ${u.role === 'ADMIN' ? 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/20' : u.role === 'VENDOR' ? 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/20' : 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20'}`}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className="p-4 md:p-8 text-right">
                                        <div className="flex justify-end gap-1 md:gap-2">
                                            <button onClick={() => handleOpenUserModal(u)} className="p-2 md:p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-lg hover:text-brand-600 transition-all"><Edit2 size={16}/></button>
                                            {currentUser.id !== u.id && <button onClick={() => onDeleteUser(u.id)} className="p-2 md:p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-lg hover:text-rose-600 transition-all"><Trash2 size={16}/></button>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                  </div>
              </div>
            </div>
          )}

          {activeTab === 'database' && (
             <div className="space-y-6 md:space-y-8 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                    <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                        <div className="flex items-center gap-3">
                            <Database size={20} className="text-brand-600" />
                            <h4 className="text-base font-black dark:text-white uppercase italic">Inventory Cache</h4>
                        </div>
                        <div className="pt-2 flex justify-between items-end">
                            <div>
                                <p className="text-3xl font-black dark:text-white tracking-tighter">{products.length}</p>
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Master Records</p>
                            </div>
                            <button className="px-4 py-2 bg-slate-900 dark:bg-brand-600 text-white rounded-xl font-black text-[8px] uppercase tracking-widest flex items-center gap-2"><RefreshCw size={12}/> Sync</button>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                        <div className="flex items-center gap-3">
                            <HardDrive size={20} className="text-emerald-500" />
                            <h4 className="text-base font-black dark:text-white uppercase italic">Sales Ledger</h4>
                        </div>
                        <div className="pt-2 flex justify-between items-end">
                            <div>
                                <p className="text-3xl font-black dark:text-white tracking-tighter">{sales.length}</p>
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Invoices</p>
                            </div>
                            <button className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 rounded-xl font-black text-[8px] uppercase tracking-widest">Export CSV</button>
                        </div>
                    </div>
                </div>
             </div>
          )}
        </div>
      </div>

      {isUserModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-2xl z-[120] flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2rem] md:rounded-[3rem] shadow-2xl overflow-hidden animate-fade-in-up border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh]">
                  <div className="p-6 md:p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                      <div>
                          <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white italic uppercase tracking-tighter">{editingUser ? 'Update Node' : t('newOperator')}</h3>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Personnel Authorization</p>
                      </div>
                      <button onClick={() => setIsUserModalOpen(false)} className="p-2 md:p-3 bg-white dark:bg-slate-800 text-slate-400 rounded-xl hover:text-red-500 transition-all"><X size={20}/></button>
                  </div>
                  
                  <div className="p-6 md:p-10 space-y-6 md:space-y-8 overflow-y-auto custom-scrollbar">
                      <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('fullLegalName')}</label>
                          <input type="text" value={userFormData.name} onChange={e => setUserFormData({...userFormData, name: e.target.value})} className="w-full p-3 md:p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl md:rounded-2xl font-bold dark:text-white outline-none focus:border-brand-500 text-sm" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('username')}</label>
                            <input type="text" value={userFormData.username} onChange={e => setUserFormData({...userFormData, username: e.target.value})} className="w-full p-3 md:p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl md:rounded-2xl font-bold dark:text-white outline-none focus:border-brand-500 text-sm" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('accessPassword')}</label>
                            <input type="password" value={userFormData.password} onChange={e => setUserFormData({...userFormData, password: e.target.value})} className="w-full p-3 md:p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl md:rounded-2xl font-bold dark:text-white outline-none focus:border-brand-500 text-sm" />
                        </div>
                      </div>
                      <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('securityRole')}</label>
                          <select value={userFormData.role} onChange={e => setUserFormData({...userFormData, role: e.target.value as UserRole})} className="w-full p-3 md:p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl md:rounded-2xl font-black uppercase text-[9px] tracking-widest dark:text-white outline-none focus:border-brand-500">
                              <option value="STAFF">Staff Operator</option>
                              <option value="MANAGER">Manager</option>
                              <option value="ADMIN">System Admin</option>
                              <option value="VENDOR">Vendor Node Owner</option>
                              <option value="CASHIER">Cashier Terminal</option>
                          </select>
                      </div>

                      {userFormData.role === 'VENDOR' && (
                          <div className="p-4 md:p-6 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-2xl md:rounded-3xl space-y-4 animate-fade-in">
                              <div className="flex items-center gap-3">
                                  <Store className="text-blue-600" size={18} />
                                  <h4 className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Vendor Node ID</h4>
                              </div>
                              <div className="space-y-1">
                                  <input type="text" value={userFormData.vendorId} onChange={e => setUserFormData({...userFormData, vendorId: e.target.value.toUpperCase()})} className="w-full p-3 bg-white dark:bg-slate-800 rounded-lg md:rounded-xl font-mono text-xs md:text-sm dark:text-white border border-blue-100 outline-none" placeholder="LEAVE BLANK FOR AUTO-GEN" />
                                  <p className="text-[7px] md:text-[8px] text-blue-400 font-bold uppercase tracking-widest mt-1 text-center">Randomized ID assigned on Sync if blank</p>
                              </div>
                          </div>
                      )}
                  </div>

                  <div className="p-6 md:p-10 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex gap-3 md:gap-4 shrink-0">
                      <button onClick={() => setIsUserModalOpen(false)} className="flex-1 py-4 text-slate-500 font-black uppercase tracking-widest text-[9px]">{t('cancel')}</button>
                      <button onClick={handleSaveUser} className="flex-[2] py-4 bg-brand-600 text-white font-black uppercase tracking-widest text-[9px] rounded-xl md:rounded-2xl shadow-xl hover:bg-brand-500 transition-all italic flex items-center justify-center gap-2">
                          <CheckCircle2 size={16} /> {t('authorizeOperator')}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
