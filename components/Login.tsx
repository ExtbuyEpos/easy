import React, { useState } from 'react';
import { User, Language, StoreSettings, VendorRequest } from '../types';
import { Lock, User as UserIcon, AlertCircle, ChevronRight, Moon, Sun, Smartphone, MessageSquare, LayoutDashboard, ShieldCheck, RefreshCw, Loader2, Key, Store, Mail, Phone, FileText, Send, CheckCircle2 } from 'lucide-react';
import { auth } from '../firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

interface LoginProps {
  onLogin: (user: User) => void;
  users: User[];
  t?: (key: string) => string;
  isDarkMode?: boolean;
  toggleTheme?: () => void;
  language?: Language;
  toggleLanguage?: () => void;
  onEnterAsGuest?: () => void;
  storeSettings?: StoreSettings;
  activeVendorId?: string | null;
  activeVendor?: User | null;
  onApplyVendor?: (req: VendorRequest) => void;
}

type LoginMethod = 'VISITOR_CODE' | 'CUSTOMER_GOOGLE' | 'CREDENTIALS';

export const Login: React.FC<LoginProps> = ({ 
  onLogin, users, t = (k) => k, isDarkMode, toggleTheme, language, toggleLanguage, storeSettings,
  activeVendorId, activeVendor
}) => {
  const [method, setMethod] = useState<LoginMethod>('VISITOR_CODE');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [vendorIdInput, setVendorIdInput] = useState(activeVendorId || '');
  const [visitorCode, setVisitorCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    if (!auth) return;
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const fbUser = result.user;
      const adminEmails = ['zahratalsawsen1@gmail.com', 'extbuy.om@gmail.com'];
      const userEmail = fbUser.email?.toLowerCase() || '';
      const isSystemAdmin = adminEmails.includes(userEmail);
      onLogin({
        id: fbUser.uid,
        name: fbUser.displayName || 'User',
        username: fbUser.email?.split('@')[0] || 'google_user',
        role: isSystemAdmin ? 'ADMIN' : 'CUSTOMER',
        email: fbUser.email || undefined,
        avatar: fbUser.photoURL || undefined
      });
    } catch (err) {
      setError(t('loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (method === 'CREDENTIALS') {
      await new Promise(r => setTimeout(r, 800));
      const user = users.find(u => 
        (u.username.toLowerCase() === username.trim().toLowerCase()) && u.password === password
      );
      if (user) onLogin(user);
      else { setError(t('invalidCredentials')); setLoading(false); }
    } else if (method === 'VISITOR_CODE') {
      await new Promise(r => setTimeout(r, 1000));
      
      // Find the specific vendor by the entered Vendor ID
      const targetVendor = users.find(u => 
        (u.role === 'VENDOR' && u.vendorId?.toLowerCase() === vendorIdInput.trim().toLowerCase())
      );

      if (!targetVendor) {
          setError(t('vendorNotFound') || 'Vendor ID not recognized.');
          setLoading(false);
          return;
      }

      // Check the unique access code for that specific vendor
      const correctCode = targetVendor.vendorSettings?.shopPasscode || '2026';
      
      if (visitorCode === correctCode) {
          onLogin({
              id: `guest_${Date.now()}`,
              name: `${targetVendor.vendorSettings?.storeName || targetVendor.name} Guest`,
              username: 'visitor',
              role: 'CUSTOMER',
              vendorId: targetVendor.vendorId
          });
      } else {
          setError(t('invalidShopCode'));
          setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] dark:bg-black flex flex-col md:items-center md:justify-center p-0 transition-colors font-sans">
      {/* Top Utility Nav */}
      <div className="fixed top-8 right-8 flex gap-3 z-[100]">
         <button onClick={toggleTheme} className="p-3 bg-white/5 backdrop-blur-2xl rounded-2xl text-white hover:bg-white/10 transition-all border border-white/10 shadow-2xl">
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
         </button>
         <button onClick={toggleLanguage} className="px-5 py-3 bg-white/5 backdrop-blur-2xl rounded-2xl text-white hover:bg-white/10 transition-all font-bold text-xs uppercase tracking-widest border border-white/10 shadow-2xl">
            {language === 'en' ? 'Arabic' : 'English'}
         </button>
      </div>

      <div className="bg-white dark:bg-slate-900 md:rounded-[4rem] shadow-2xl overflow-hidden w-full max-w-6xl flex flex-col md:flex-row animate-fade-in md:h-[min(850px,94vh)] relative border border-white/5">
        
        {/* Left Panel: Brand Hero (Matches Screenshot) */}
        <div className="bg-[#0ea5e9] p-12 md:p-20 md:w-[45%] flex flex-col justify-center text-white relative overflow-hidden shrink-0">
          <div className="relative z-10 space-y-12">
            <div className="flex items-center gap-6">
              <div className="bg-white p-4 rounded-3xl text-[#0ea5e9] shadow-2xl rotate-12 hover:rotate-0 transition-all duration-500 cursor-pointer">
                <LayoutDashboard size={48} strokeWidth={2.5} />
              </div>
              <span className="text-4xl font-black tracking-tighter italic uppercase">EASYP...</span>
            </div>
            <div className="space-y-6">
                <h1 className="text-5xl md:text-6xl font-black leading-[0.95] tracking-tighter italic uppercase">
                  SMART RETAIL<br/>MANAGEMENT
                </h1>
                <p className="text-white/80 font-medium text-sm max-w-xs leading-relaxed">
                  The professional offline-capable solution for your business growth.
                </p>
            </div>
          </div>
          
          {/* Decorative background circle from screenshot */}
          <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-white/10 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 bg-brand-400/20 rounded-full blur-[80px]"></div>
        </div>

        {/* Right Panel: Auth Terminal */}
        <div className="p-8 md:p-24 md:w-[55%] flex flex-col justify-center bg-white dark:bg-slate-900 relative rounded-t-[4rem] md:rounded-none -mt-16 md:mt-0 z-20 transition-all overflow-y-auto custom-scrollbar">
          <div className="max-w-md mx-auto w-full space-y-10">
              <div className="text-center md:text-left">
                <h2 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter italic uppercase mb-2">WELCOME BACK</h2>
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em]">PLEASE SIGN IN TO ACCESS YOUR TERMINAL</p>
              </div>

              {/* Navigation Tabs (Pill Style from Screenshot) */}
              <div className="flex bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-inner">
                <button onClick={() => {setMethod('VISITOR_CODE'); setError('');}} className={`flex-1 py-4 rounded-[1.6rem] text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${method === 'VISITOR_CODE' ? 'bg-[#0ea5e9] text-white shadow-xl' : 'text-slate-400'}`}>
                  <Store size={14} /> SHOP VISITOR
                </button>
                <button onClick={() => {setMethod('CUSTOMER_GOOGLE'); setError('');}} className={`flex-1 py-4 rounded-[1.6rem] text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${method === 'CUSTOMER_GOOGLE' ? 'bg-white dark:bg-slate-700 text-slate-600 dark:text-white shadow-sm' : 'text-slate-400'}`}>
                  GOOGLE
                </button>
                <button onClick={() => {setMethod('CREDENTIALS'); setError('');}} className={`flex-1 py-4 rounded-[1.6rem] text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${method === 'CREDENTIALS' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400'}`}>
                  <UserIcon size={14} /> STAFF ACCESS
                </button>
              </div>

              {error && (
                <div className="p-5 bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest rounded-3xl flex items-center gap-4 border border-red-100 animate-shake">
                  <AlertCircle size={20} /> {error}
                </div>
              )}

              {method === 'VISITOR_CODE' ? (
                <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in-up">
                    <div className="p-8 bg-slate-50/50 dark:bg-slate-800/30 rounded-[3rem] border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center gap-5">
                        <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-xl text-[#0ea5e9] border border-slate-50">
                           <Store size={32} />
                        </div>
                        <div className="space-y-1">
                           <h4 className="font-black text-slate-900 dark:text-white uppercase italic text-2xl">EASYPOS</h4>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ENTER SHOP ACCESS CODE</p>
                        </div>
                    </div>
                    
                    <div className="space-y-6">
                        {/* Always show Vendor ID in Shop Visitor mode so users can find the right shop */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">VENDOR CODE</label>
                            <div className="relative group">
                                <input 
                                    type="text" 
                                    value={vendorIdInput} 
                                    onChange={e => setVendorIdInput(e.target.value)} 
                                    className="w-full p-5 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-[#0ea5e9] rounded-[2rem] outline-none transition-all dark:text-white font-bold text-lg pl-14 shadow-inner" 
                                    placeholder="VND-XXXXXX" 
                                />
                                <LayoutDashboard className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">ACCESS CODE</label>
                            <div className="relative group">
                                <input 
                                    type="password" 
                                    value={visitorCode} 
                                    onChange={e => setVisitorCode(e.target.value)} 
                                    className="w-full p-5 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-[#0ea5e9] rounded-[2rem] outline-none transition-all dark:text-white font-black text-3xl tracking-[0.4em] pl-14 shadow-inner" 
                                    placeholder="••••" 
                                />
                                <Key className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={22} />
                            </div>
                        </div>
                    </div>

                    <button type="submit" disabled={loading || !visitorCode || !vendorIdInput} className="w-full py-6 bg-gradient-to-r from-[#38bdf8] to-[#0ea5e9] text-white rounded-full font-black uppercase tracking-[0.2em] text-xs shadow-[0_20px_40px_-10px_rgba(14,165,233,0.5)] active:scale-95 transition-all flex items-center justify-center gap-4 italic group">
                      {loading ? <Loader2 className="animate-spin" size={24} /> : (
                        <>
                          <ChevronRight size={24} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
                          <span>ACCESS TERMINAL</span>
                        </>
                      )}
                    </button>
                </form>
              ) : method === 'CUSTOMER_GOOGLE' ? (
                <div className="space-y-10 animate-fade-in text-center">
                    <div className="py-12 px-8 bg-slate-50 dark:bg-slate-800/30 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                        <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" className="w-20 h-20 mx-auto mb-6" alt="Google" />
                        <h4 className="text-xl font-black dark:text-white uppercase italic">IDENTITY PORTAL</h4>
                        <p className="text-xs text-slate-400 font-medium mt-2">Secure multi-factor authentication via Google ecosystem.</p>
                    </div>
                    <button onClick={handleGoogleLogin} className="w-full py-6 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-full font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-4 hover:bg-slate-50 transition-all">
                        <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" className="w-6 h-6" alt="" />
                        SIGN IN WITH GOOGLE
                    </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">USERNAME</label>
                      <div className="relative group">
                        <UserIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                        <input 
                            type="text" 
                            value={username} 
                            onChange={e => setUsername(e.target.value)} 
                            className="w-full pl-14 pr-6 py-5 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-[#0ea5e9] rounded-[2rem] outline-none font-bold dark:text-white text-lg shadow-inner" 
                            placeholder="operator_node" 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">PASSWORD</label>
                      <div className="relative group">
                        <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                        <input 
                            type="password" 
                            value={password} 
                            onChange={e => setPassword(e.target.value)} 
                            className="w-full pl-14 pr-6 py-5 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-[#0ea5e9] rounded-[2rem] outline-none font-bold dark:text-white text-lg shadow-inner" 
                            placeholder="••••••••" 
                        />
                      </div>
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="w-full py-6 bg-slate-900 dark:bg-[#0ea5e9] text-white rounded-full font-black uppercase tracking-[0.2em] text-xs shadow-2xl active:scale-[0.98] flex items-center justify-center gap-4 italic transition-all group">
                    {loading ? <Loader2 className="animate-spin" size={24} /> : (
                      <>
                        <ChevronRight size={24} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
                        <span>ACCESS TERMINAL</span>
                      </>
                    )}
                  </button>
                </form>
              )}
          </div>
        </div>
      </div>
    </div>
  );
};
