
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, UserRole, Product, Sale, StoreSettings, Language, AppView, VendorRequest } from '../types';
// Add missing Phone import from lucide-react
import { Trash2, Plus, X, Receipt, ChevronLeft, Users, Zap, Globe, Heart, Database, Cloud, Bell, ShieldCheck, Share2, Clipboard, BarChart, MessageSquare, ExternalLink, RefreshCw, CheckCircle2, Upload, Image as ImageIcon, Key, LogOut, ShieldEllipsis, ShieldAlert, Edit2, Lock, Store, Mail, Send, Inbox, Check, Slash, AlertCircle, Phone } from 'lucide-react';
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

export interface ExtendedStoreSettings extends StoreSettings {
    adminPassword?: string;
}

export const Settings: React.FC<SettingsProps> = ({ 
  users, vendorRequests, onAddUser, onUpdateUser, onDeleteUser, onReviewRequest, onLogout, currentUser, storeSettings, onUpdateStoreSettings, onGoBack,
  language, toggleLanguage, t = (k) => k, onNavigate
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDispatchAnim, setShowDispatchAnim] = useState(false);
  const [dispatchType, setDispatchType] = useState<'WELCOME' | 'REJECTION'>('WELCOME');
  const [targetEmail, setTargetEmail] = useState('');
  
  const [storeForm, setStoreForm] = useState<ExtendedStoreSettings>(storeSettings);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'GENERAL' | 'OPERATORS' | 'REQUESTS'>('GENERAL');
  
  const [rejectionModal, setRejectionModal] = useState<{ id: string, email: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const [editingOperatorId, setEditingOperatorId] = useState<string | null>(null);
  const [userFormData, setUserFormData] = useState<Partial<User>>({ 
    name: '', username: '', password: '', role: 'CASHIER', employeeId: '', vendorId: '', email: '', vendorStaffLimit: 5,
    vendorSettings: { storeName: '', storeAddress: '', shopPasscode: '2026', customUrlSlug: '', storeLogo: '' }
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const vendorLogoInputRef = useRef<HTMLInputElement>(null);

  const SYSTEM_OWNER_EMAIL = 'zahratalsawsen1@gmail.com';
  const isSystemOwner = currentUser.email?.toLowerCase() === SYSTEM_OWNER_EMAIL;

  const vendorOwners = useMemo(() => users.filter(u => u.role === 'VENDOR'), [users]);

  const generateVendorId = () => {
    return 'VND-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleRoleChange = (role: UserRole) => {
    let updates: Partial<User> = { role };
    if (role === 'VENDOR' && !userFormData.vendorId) {
      const vId = generateVendorId();
      updates.vendorId = vId;
      updates.vendorSettings = { 
        storeName: userFormData.name || '', 
        storeAddress: '', 
        shopPasscode: '2026', 
        customUrlSlug: vId.toLowerCase(), 
        storeLogo: '' 
      };
    } else if (role === 'VENDOR_STAFF') {
      updates.vendorId = '';
    } else {
      updates.vendorId = '';
    }
    setUserFormData(prev => ({ ...prev, ...updates }));
  };

  const handleSelectVendor = (vId: string) => {
      const vendor = vendorOwners.find(v => v.vendorId === vId);
      if (vendor) {
          setUserFormData(prev => ({ ...prev, vendorId: vendor.vendorId }));
      }
  };

  const handleOpenOperatorModal = (user?: User) => {
      if (user) {
          if (user.role === 'ADMIN' && !isSystemOwner && user.id !== currentUser.id) {
              alert("CRITICAL: Access Denied. Only the System Owner can modify other Administrators.");
              return;
          }
          setEditingOperatorId(user.id);
          setUserFormData({
              name: user.name,
              username: user.username,
              password: user.password || '',
              role: user.role,
              employeeId: user.employeeId || '',
              vendorId: user.vendorId || '',
              email: user.email || '',
              vendorStaffLimit: user.vendorStaffLimit || 5,
              vendorSettings: user.vendorSettings || { storeName: '', storeAddress: '', shopPasscode: '2026', customUrlSlug: '', storeLogo: '' }
          });
      } else {
          setEditingOperatorId(null);
          setUserFormData({ 
            name: '', username: '', password: '', role: 'CASHIER', employeeId: '', 
            vendorId: '', email: '', vendorStaffLimit: 5,
            vendorSettings: { storeName: '', storeAddress: '', shopPasscode: '2026', customUrlSlug: '', storeLogo: '' }
          });
      }
      setIsModalOpen(true);
  };

  const handleUserSubmit = () => {
      if(!userFormData.name || !userFormData.username) return alert("Required fields missing.");
      if (userFormData.role === 'VENDOR_STAFF' && !userFormData.vendorId) {
          alert("A Vendor ID must be selected for Vendor Staff.");
          return;
      }

      const isNewVendor = !editingOperatorId && userFormData.role === 'VENDOR';
      if (editingOperatorId) {
          const targetUser = users.find(u => u.id === editingOperatorId);
          if (targetUser) onUpdateUser({ ...targetUser, ...userFormData as User });
      } else {
          onAddUser({ ...userFormData, id: Date.now().toString() } as User);
      }
      
      if (isNewVendor && userFormData.email) {
          setDispatchType('WELCOME');
          setTargetEmail(userFormData.email);
          setShowDispatchAnim(true);
          setTimeout(() => { setShowDispatchAnim(false); setIsModalOpen(false); }, 3000);
      } else {
          setIsModalOpen(false);
      }
  };

  const handleApprove = (req: VendorRequest) => {
      setDispatchType('WELCOME');
      setTargetEmail(req.email);
      setShowDispatchAnim(true);
      setTimeout(() => {
          onReviewRequest(req.id, 'APPROVED');
          setShowDispatchAnim(false);
      }, 3000);
  };

  const handleRejectSubmit = () => {
      if (!rejectionModal || !rejectionReason.trim()) return;
      setDispatchType('REJECTION');
      setTargetEmail(rejectionModal.email);
      setShowDispatchAnim(true);
      setTimeout(() => {
          onReviewRequest(rejectionModal.id, 'REJECTED', rejectionReason);
          setShowDispatchAnim(false);
          setRejectionModal(null);
          setRejectionReason('');
      }, 3000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setStoreForm({ ...storeForm, logo: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const handleVendorLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && userFormData.vendorSettings) {
      const reader = new FileReader();
      reader.onloadend = () => setUserFormData({ 
          ...userFormData, 
          vendorSettings: { ...userFormData.vendorSettings!, storeLogo: reader.result as string } 
      });
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 p-4 lg:p-8 overflow-y-auto transition-colors custom-scrollbar">
       
       {showDispatchAnim && (
            <div className="fixed inset-0 z-[200] bg-slate-900/95 backdrop-blur-xl flex flex-col items-center justify-center text-white space-y-8 animate-fade-in">
                <div className={`w-32 h-32 rounded-full flex items-center justify-center animate-bounce shadow-2xl ${dispatchType === 'WELCOME' ? 'bg-brand-600 shadow-brand-500/50' : 'bg-red-600 shadow-red-500/50'}`}>
                    {dispatchType === 'WELCOME' ? <Send size={48} /> : <AlertCircle size={48} />}
                </div>
                <div className="text-center space-y-3">
                    <h4 className="text-4xl font-black italic uppercase tracking-tighter">
                        {dispatchType === 'WELCOME' ? 'Provisioning Access' : 'Dispatching Notice'}
                    </h4>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.4em]">Sending encrypted protocol to {targetEmail}</p>
                </div>
                <div className="w-64 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-white animate-[progress_3s_ease-in-out]"></div>
                </div>
            </div>
        )}

       <div className="flex flex-col lg:flex-row justify-between lg:items-center mb-8 gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={onGoBack} 
            className="p-3 -ml-3 rounded-2xl bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 shadow-sm border border-slate-100 dark:border-slate-800 transition-all active:scale-90 hover:text-brand-600" 
          >
            <ChevronLeft size={28} className="rtl:rotate-180" />
          </button>
          <div><h2 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">{t('systemTerminal')}</h2><p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">{t('controlConsole')}</p></div>
        </div>
        <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-2xl overflow-x-auto no-scrollbar">
            <button onClick={() => setActiveSettingsTab('GENERAL')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSettingsTab === 'GENERAL' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-lg' : 'text-slate-500'}`}>{t('configuration')}</button>
            <button onClick={() => setActiveSettingsTab('OPERATORS')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSettingsTab === 'OPERATORS' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-lg' : 'text-slate-500'}`}>{t('operatorAccess')}</button>
            <button onClick={() => setActiveSettingsTab('REQUESTS')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap relative ${activeSettingsTab === 'REQUESTS' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-lg' : 'text-slate-500'}`}>
                Vendor Requests
                {vendorRequests.filter(r => r.status === 'PENDING').length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[8px] flex items-center justify-center border-2 border-white dark:border-slate-800 animate-pulse">
                        {vendorRequests.filter(r => r.status === 'PENDING').length}
                    </span>
                )}
            </button>
        </div>
      </div>

      {activeSettingsTab === 'GENERAL' ? (
        <div className="max-w-4xl space-y-8 animate-fade-in pb-20">
            <div className="bg-slate-900 text-white p-10 rounded-[3.5rem] shadow-2xl border border-brand-500/20 space-y-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12"><ShieldEllipsis size={200} className="text-brand-500" /></div>
                <div className="flex items-center gap-4 relative z-10 border-b border-white/10 pb-6">
                    <div className="w-14 h-14 bg-brand-500/20 rounded-2xl flex items-center justify-center border border-brand-500/30"><Zap size={28} className="text-brand-400" /></div>
                    <div>
                        <h3 className="text-2xl font-black uppercase italic tracking-tighter">easyPOS Security Node</h3>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Master Access Keys</p>
                    </div>
                </div>
                <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] ml-1">Visitor Access Code</label>
                        <div className="relative group">
                            <input type="text" value={storeForm.visitorAccessCode || ''} onChange={e => setStoreForm({...storeForm, visitorAccessCode: e.target.value})} className="w-full p-4 bg-black/40 border-2 border-white/10 rounded-2xl font-black text-white text-xl tracking-[0.3em] outline-none pl-12" placeholder="2026" />
                            <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-500" size={20} />
                        </div>
                    </div>
                    {isSystemOwner && (
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] ml-1">Master Admin Password</label>
                            <div className="relative group">
                                <input type="password" value={storeForm.adminPassword || ''} onChange={e => setStoreForm({...storeForm, adminPassword: e.target.value})} className="w-full p-4 bg-black/40 border-2 border-emerald-500/20 rounded-2xl font-black text-white text-xl outline-none pl-12" placeholder="••••••••" />
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={20} />
                            </div>
                        </div>
                    )}
                </div>
                <button onClick={() => onUpdateStoreSettings(storeForm)} className="px-10 py-5 bg-brand-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl hover:bg-brand-500 transition-all active:scale-95 flex items-center justify-center gap-3 italic"><RefreshCw size={16} /> Sync easyPOS Matrix</button>
            </div>

            <div className="bg-white dark:bg-slate-900 p-10 rounded-[3.5rem] shadow-xl border border-slate-100 dark:border-slate-800 space-y-10">
                <div className="flex items-center gap-3 border-b border-slate-50 dark:border-slate-800 pb-6"><Receipt size={28} className="text-brand-500" /><h3 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white">{t('storeIdentity')}</h3></div>
                <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('storeLogo')}</label>
                    <div className="flex gap-6 items-center">
                        <div className="w-32 h-32 rounded-[2.5rem] bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0 group relative shadow-inner">
                            {storeForm.logo ? (
                                <>
                                    <img src={storeForm.logo} className="w-full h-full object-contain p-4" alt="Logo" />
                                    <button onClick={() => setStoreForm({...storeForm, logo: ''})} className="absolute inset-0 bg-red-600/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={24}/></button>
                                </>
                            ) : <ImageIcon size={32} className="text-slate-300" />}
                        </div>
                        <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-slate-200 dark:border-slate-700 hover:bg-slate-200 transition-all flex items-center justify-center gap-3"><Upload size={16}/> {t('uploadLogo')}</button>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('businessName')}</label><input type="text" value={storeForm.name} onChange={e => setStoreForm({...storeForm, name: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black dark:text-white" /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('taxRate')}</label><input type="number" value={storeForm.taxRate} onChange={e => setStoreForm({...storeForm, taxRate: parseFloat(e.target.value) || 0})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black dark:text-white" /></div>
                    <div className="md:col-span-2 space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('storeAddress')}</label><textarea value={storeForm.address} onChange={e => setStoreForm({...storeForm, address: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold dark:text-white h-24 resize-none" /></div>
                </div>
                <button onClick={() => onUpdateStoreSettings(storeForm)} className="w-full py-5 bg-slate-900 dark:bg-brand-600 text-white rounded-3xl font-black uppercase tracking-widest shadow-2xl hover:bg-black transition-all active:scale-95 italic text-xs">{t('syncTerminal')}</button>
            </div>
            <div className="pt-12"><button onClick={onLogout} className="w-full flex items-center justify-center gap-4 py-8 bg-red-50 dark:bg-red-950/20 text-red-600 hover:bg-red-600 hover:text-white transition-all rounded-[3rem] font-black uppercase tracking-[0.3em] text-sm shadow-xl group border border-red-100 dark:border-red-900/30"><LogOut size={28} className="group-hover:-translate-x-2 transition-transform" /><span>Terminate Session & Logout</span></button></div>
        </div>
      ) : activeSettingsTab === 'OPERATORS' ? (
        <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-fade-in">
            <div className="p-10 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-900/10">
                <div><h4 className="text-2xl font-black italic uppercase tracking-tighter dark:text-white">{t('activeOperators')}</h4><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Authorized personnel ledger</p></div>
                <button onClick={() => handleOpenOperatorModal()} className="px-8 py-4 bg-brand-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 flex items-center gap-3"><Plus size={18} /> {t('addNewOperator')}</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-400 font-black uppercase text-[9px] tracking-widest"><tr><th className="p-10">{t('employeeId')}</th><th className="p-10">{t('name')}</th><th className="p-10">{t('role')}</th><th className="p-10 text-right">{t('action')}</th></tr></thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                      {users.map(u => (
                          <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all">
                              <td className="p-10 font-mono text-xs text-slate-400 font-black">{u.employeeId || 'N/A'}</td>
                              <td className="p-10 font-black text-slate-900 dark:text-white">
                                  <div className="flex items-center gap-2">
                                      {u.name} 
                                      {u.role === 'ADMIN' && <ShieldCheck size={14} className="text-emerald-500" />}
                                      {(u.role === 'VENDOR' || u.role === 'VENDOR_STAFF') && <Store size={14} className="text-brand-500" />}
                                  </div>
                                  <span className="block text-[9px] text-slate-400 uppercase tracking-widest mt-1">@{u.username}</span>
                                  {u.vendorId && <span className="block text-[8px] text-brand-600 font-black uppercase tracking-widest">ID: {u.vendorId}</span>}
                              </td>
                              <td className="p-10"><span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border-2 ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-600 border-purple-200' : u.role === 'VENDOR' ? 'bg-amber-100 text-amber-600 border-amber-200' : 'bg-brand-100 text-brand-600 border-brand-200'}`}>{u.role}</span></td>
                              <td className="p-10 text-right">
                                  <div className="flex justify-end gap-2">
                                      <button onClick={() => handleOpenOperatorModal(u)} className="p-3 text-slate-300 hover:text-brand-500 transition-colors"><Edit2 size={20}/></button>
                                      {u.id !== currentUser.id && (isSystemOwner || u.role !== 'ADMIN') && (
                                          <button onClick={() => onDeleteUser(u.id)} className="p-3 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={20}/></button>
                                      )}
                                  </div>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
            </div>
        </div>
      ) : (
        <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {vendorRequests.map(req => (
                    <div key={req.id} className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-2xl transition-all group flex flex-col relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-125 transition-transform"><Inbox size={80} /></div>
                        <div className="flex justify-between items-start mb-6">
                            <span className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-[0.2em] border-2 ${req.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-100' : req.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                {req.status}
                            </span>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{new Date(req.timestamp).toLocaleDateString()}</span>
                        </div>
                        <div className="flex-1 space-y-4">
                            <div>
                                <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">{req.storeName}</h4>
                                <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest mt-1">Applicant: {req.name}</p>
                            </div>
                            <div className="space-y-2">
                                <p className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400"><Mail size={14}/> {req.email}</p>
                                <p className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400"><Phone size={14}/> {req.phone}</p>
                            </div>
                            {req.description && (
                                <p className="text-xs font-medium text-slate-400 dark:text-slate-500 leading-relaxed italic line-clamp-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">"{req.description}"</p>
                            )}
                            {req.rejectionReason && (
                                <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-2xl">
                                    <p className="text-[8px] font-black text-red-600 uppercase tracking-widest mb-1">Denial Reason</p>
                                    <p className="text-xs font-bold text-red-400 italic">"{req.rejectionReason}"</p>
                                </div>
                            )}
                        </div>
                        {req.status === 'PENDING' && (
                            <div className="mt-8 pt-6 border-t border-slate-50 dark:border-slate-800 flex gap-3">
                                <button onClick={() => handleApprove(req)} className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[9px] tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-500 transition-all shadow-lg active:scale-95"><Check size={14}/> Authorize</button>
                                <button onClick={() => setRejectionModal({ id: req.id, email: req.email })} className="flex-1 py-4 bg-white dark:bg-slate-800 text-red-600 border border-red-100 dark:border-red-900/30 rounded-2xl font-black uppercase text-[9px] tracking-widest flex items-center justify-center gap-2 hover:bg-red-50 transition-all active:scale-95"><Slash size={14}/> Deny</button>
                            </div>
                        )}
                    </div>
                ))}
                {vendorRequests.length === 0 && (
                    <div className="col-span-full py-40 flex flex-col items-center justify-center opacity-20 text-slate-400">
                        <Inbox size={100} strokeWidth={1}/>
                        <p className="font-black text-sm uppercase tracking-[0.5em] italic mt-6">No Applications Received</p>
                    </div>
                )}
            </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectionModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-2xl z-[210] flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[4rem] shadow-2xl overflow-hidden animate-fade-in-up border border-slate-100 dark:border-slate-800">
                  <div className="p-10 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-red-50/50 dark:bg-red-900/10">
                      <div>
                          <h3 className="text-3xl font-black text-slate-900 dark:text-white italic uppercase tracking-tighter">Denial Protocol</h3>
                          <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mt-1">Specify authorization failure reasons</p>
                      </div>
                      <button onClick={() => setRejectionModal(null)} className="p-3 bg-white dark:bg-slate-800 text-slate-400 rounded-2xl hover:text-red-500 transition-all"><X size={24}/></button>
                  </div>
                  <div className="p-10 space-y-6">
                      <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Protocol Failure Reason</label>
                          <textarea 
                              value={rejectionReason}
                              onChange={e => setRejectionReason(e.target.value)}
                              className="w-full h-40 p-6 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-3xl outline-none focus:border-red-500 font-bold dark:text-white resize-none shadow-inner"
                              placeholder="E.g. Valid trade license missing / Invalid contact matrix..."
                          />
                      </div>
                      <div className="bg-red-50 dark:bg-red-950/20 p-5 rounded-2xl border border-red-100 dark:border-red-900/30 flex items-start gap-4">
                          <AlertCircle className="text-red-600 shrink-0" size={20}/>
                          <p className="text-[10px] font-bold text-red-400 uppercase leading-relaxed">
                              This reason will be dispatched to the applicant via automated email dispatch. Be professional and specific.
                          </p>
                      </div>
                  </div>
                  <div className="p-10 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex gap-4">
                      <button onClick={() => setRejectionModal(null)} className="flex-1 py-5 text-slate-500 font-black uppercase tracking-widest text-[10px]">Abort</button>
                      <button onClick={handleRejectSubmit} className="flex-[2] py-5 bg-red-600 text-white font-black uppercase tracking-widest text-[10px] rounded-[2rem] shadow-xl hover:bg-red-500 transition-all italic flex items-center justify-center gap-3">
                          <Slash size={18}/> Commit Denial Notice
                      </button>
                  </div>
              </div>
          </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-2xl flex items-center justify-center z-[120] p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[4rem] shadow-2xl overflow-hidden animate-fade-in-up border border-slate-100 dark:border-slate-800 flex flex-col relative max-h-[95vh]">
                
                <div className="p-10 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                    <div>
                        <h3 className="text-3xl font-black text-slate-900 dark:text-white italic uppercase tracking-tighter">{editingOperatorId ? 'Update Operator' : t('newOperator')}</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Identity Access Provisioning</p>
                    </div>
                    <button onClick={() => setIsModalOpen(false)} className="p-3 bg-white dark:bg-slate-800 text-slate-400 rounded-2xl hover:text-red-500 transition-all"><X size={24}/></button>
                </div>
                
                <div className="p-10 space-y-10 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                           <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-50 pb-2">Core Identity</h4>
                           <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('fullLegalName')}</label>
                                    <input type="text" value={userFormData.name} onChange={e => setUserFormData({...userFormData, name: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold dark:text-white" placeholder={t('name')} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Work Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                        <input type="email" value={userFormData.email} onChange={e => setUserFormData({...userFormData, email: e.target.value})} className="w-full p-4 pl-12 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold dark:text-white" placeholder="email@example.com" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('username')}</label><input type="text" value={userFormData.username} onChange={e => setUserFormData({...userFormData, username: e.target.value.toLowerCase()})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl font-black dark:text-white" placeholder="username" /></div>
                                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('accessPassword')}</label><input type="password" value={userFormData.password} onChange={e => setUserFormData({...userFormData, password: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold dark:text-white" placeholder="••••••••" /></div>
                                </div>
                           </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-50 pb-2">Access & Permissions</h4>
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('securityRole')}</label>
                                    <select 
                                        value={userFormData.role} 
                                        onChange={e => handleRoleChange(e.target.value as UserRole)} 
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black dark:text-white text-[10px] uppercase tracking-widest"
                                    >
                                        <option value="CASHIER">Cashier</option>
                                        <option value="MANAGER">Manager</option>
                                        <option value="STAFF">Inventory Staff</option>
                                        <option value="ADMIN">Admin</option>
                                        <option value="VENDOR">Vendor Owner</option>
                                        <option value="VENDOR_STAFF">Vendor Staff</option>
                                    </select>
                                </div>

                                {userFormData.role === 'VENDOR_STAFF' && (
                                    <div className="space-y-1 animate-fade-in">
                                        <label className="text-[10px] font-black text-brand-600 uppercase tracking-widest ml-1">Select Parent Vendor</label>
                                        <div className="relative">
                                            <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-400" size={18} />
                                            <select 
                                                value={userFormData.vendorId}
                                                onChange={(e) => handleSelectVendor(e.target.value)}
                                                className="w-full p-4 pl-12 bg-brand-50 dark:bg-brand-900/10 border-2 border-brand-100 dark:border-brand-900/30 rounded-2xl font-black dark:text-white outline-none focus:border-brand-500 text-[10px] uppercase tracking-widest"
                                            >
                                                <option value="">-- Choose Vendor --</option>
                                                {vendorOwners.map(v => (
                                                    <option key={v.id} value={v.vendorId}>
                                                        {v.name} ({v.vendorId})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {userFormData.role === 'VENDOR' && (
                                    <div className="grid grid-cols-2 gap-4 animate-fade-in">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-brand-600 uppercase tracking-widest ml-1">Assigned Vendor ID</label>
                                            <input type="text" readOnly value={userFormData.vendorId} className="w-full p-4 bg-brand-50 dark:bg-brand-900/10 border-2 border-brand-100 dark:border-brand-900/30 rounded-2xl font-black dark:text-white cursor-not-allowed" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest ml-1">Staff Quota</label>
                                            <input type="number" value={userFormData.vendorStaffLimit} onChange={e => setUserFormData({...userFormData, vendorStaffLimit: parseInt(e.target.value) || 0})} className="w-full p-4 bg-amber-50 dark:bg-amber-900/10 border-2 border-amber-100 dark:border-amber-900/30 rounded-2xl font-black dark:text-white" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {userFormData.role === 'VENDOR' && userFormData.vendorSettings && (
                        <div className="space-y-6 bg-slate-50 dark:bg-slate-800/50 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 animate-fade-in">
                           <h4 className="text-xs font-black uppercase tracking-widest text-brand-600 flex items-center gap-2 italic"><Store size={16}/> Vendor Store Identity (Virtual Shop)</h4>
                           
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Store Brand Name</label>
                                        <input type="text" value={userFormData.vendorSettings.storeName} onChange={e => setUserFormData({...userFormData, vendorSettings: { ...userFormData.vendorSettings!, storeName: e.target.value }})} className="w-full p-4 bg-white dark:bg-slate-900 border border-slate-100 rounded-2xl font-bold dark:text-white" placeholder="My Boutique" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Shop Access Passcode</label>
                                        <div className="relative">
                                            <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                            <input type="text" value={userFormData.vendorSettings.shopPasscode} onChange={e => setUserFormData({...userFormData, vendorSettings: { ...userFormData.vendorSettings!, shopPasscode: e.target.value }})} className="w-full p-4 pl-12 bg-white dark:bg-slate-900 border border-slate-100 rounded-2xl font-black tracking-[0.2em] dark:text-white" placeholder="2026" />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Store Address / Location</label>
                                        <textarea value={userFormData.vendorSettings.storeAddress} onChange={e => setUserFormData({...userFormData, vendorSettings: { ...userFormData.vendorSettings!, storeAddress: e.target.value }})} className="w-full p-4 h-[115px] bg-white dark:bg-slate-900 border border-slate-100 rounded-2xl font-medium dark:text-white resize-none" placeholder="Vendor physical location..." />
                                    </div>
                                </div>
                           </div>

                           <div className="space-y-4">
                               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vendor Logo</label>
                               <div className="flex items-center gap-6">
                                    <div className="w-24 h-24 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                                        {userFormData.vendorSettings.storeLogo ? <img src={userFormData.vendorSettings.storeLogo} className="w-full h-full object-contain p-2" /> : <ImageIcon size={24} className="opacity-20" />}
                                    </div>
                                    <button onClick={() => vendorLogoInputRef.current?.click()} className="px-6 py-4 bg-white dark:bg-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-slate-100 shadow-sm flex items-center gap-2">
                                        <Upload size={16}/> Select Store Logo
                                    </button>
                                    <input type="file" ref={vendorLogoInputRef} className="hidden" accept="image/*" onChange={handleVendorLogoUpload} />
                               </div>
                           </div>

                           <div className="bg-brand-600/5 p-5 rounded-2xl border border-brand-500/20">
                                <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest flex items-center gap-2"><ExternalLink size={12}/> Unique Vendor URL</p>
                                <div className="mt-2 flex items-center gap-2">
                                    <code className="flex-1 p-3 bg-white dark:bg-slate-900 rounded-xl text-xs font-mono text-slate-500 overflow-hidden truncate">
                                        {window.location.origin}/#/shop/{userFormData.vendorId?.toLowerCase() || 'vendor-id'}
                                    </code>
                                    <button onClick={() => {
                                        const url = `${window.location.origin}/#/shop/${userFormData.vendorId?.toLowerCase()}`;
                                        navigator.clipboard.writeText(url);
                                        alert("URL Copied to clipboard");
                                    }} className="p-3 bg-white rounded-xl text-brand-600 shadow-sm border border-slate-100"><Share2 size={16}/></button>
                                </div>
                           </div>
                        </div>
                    )}
                </div>

                <div className="p-10 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex gap-4 shrink-0">
                    <button onClick={() => setIsModalOpen(false)} className="flex-1 py-5 text-slate-500 font-black uppercase tracking-widest text-[10px]">{t('cancel')}</button>
                    <button onClick={handleUserSubmit} className="flex-[2] py-5 bg-brand-600 text-white font-black uppercase tracking-widest text-[10px] rounded-[2rem] shadow-xl hover:bg-brand-500 transition-all italic flex items-center justify-center gap-3">
                        <CheckCircle2 size={18}/> {editingOperatorId ? 'Update Identity' : t('authorizeOperator')}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
