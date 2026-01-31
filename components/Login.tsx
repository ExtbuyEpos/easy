
import React, { useState, useEffect, useRef } from 'react';
import { User, Language, StoreSettings } from '../types';
import { Lock, User as UserIcon, Loader2, Key, Store, Globe, LayoutDashboard, Sun, Moon } from 'lucide-react';
import { auth } from '../firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

type LoginMethod = 'VISITOR_CODE' | 'CUSTOMER_GOOGLE' | 'CREDENTIALS';

interface LoginProps {
  onLogin: (user: User) => void;
  users: User[];
  t?: (key: string) => string;
  isDarkMode: boolean;
  toggleTheme: () => void;
  language: Language;
  toggleLanguage: () => void;
  storeSettings?: StoreSettings;
  activeVendorId: string | null;
}

export const Login: React.FC<LoginProps> = ({ 
  onLogin, users, t = (k) => k, isDarkMode, toggleTheme, language, toggleLanguage, activeVendorId
}) => {
  const [method, setMethod] = useState<LoginMethod>('CREDENTIALS');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [vendorCodeInput, setVendorCodeInput] = useState(activeVendorId || '');
  const [visitorCode, setVisitorCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    if (!auth) return;
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const userEmail = result.user.email?.toLowerCase() || '';
      const isAdmin = userEmail === 'nabeelkhan1007@gmail.com' || userEmail === 'zahratalsawsen1@gmail.com';
      onLogin({
        id: result.user.uid,
        name: result.user.displayName || (isAdmin ? 'System Master' : 'User'),
        username: result.user.email?.split('@')[0] || 'user',
        role: isAdmin ? 'ADMIN' : 'CUSTOMER',
        email: result.user.email || undefined,
      });
    } catch (err) { setError('Identity Sync Failed'); } 
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (method === 'CREDENTIALS') {
      await new Promise(r => setTimeout(r, 800));
      const user = users.find(u => 
        (u.username.toLowerCase() === username.trim().toLowerCase() || u.email?.toLowerCase() === username.trim().toLowerCase()) && u.password === password
      );
      if (user) onLogin(user);
      else { setError(t('invalidCredentials')); setLoading(false); }
    } else if (method === 'VISITOR_CODE') {
      await new Promise(r => setTimeout(r, 1200));
      const targetVendor = users.find(u => u.role === 'VENDOR' && u.vendorId?.toLowerCase() === vendorCodeInput.trim().toLowerCase());
      if (targetVendor && visitorCode === (targetVendor.vendorSettings?.shopPasscode || '2026')) {
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
    <div className="min-h-[100svh] bg-[#020617] flex flex-col items-center justify-center p-4 relative overflow-hidden transition-all duration-500">
      {/* "One Click" Language Toggle - Top Right */}
      <div className="fixed top-6 right-6 flex gap-3 z-[100]">
         <button onClick={toggleLanguage} className="flex items-center gap-3 px-6 py-3.5 bg-white/5 backdrop-blur-2xl rounded-2xl text-white border border-white/10 shadow-2xl hover:bg-white/10 transition-all font-black text-xs uppercase tracking-widest italic group">
            <Globe size={20} className="text-emerald-400 group-hover:rotate-180 transition-transform duration-500" />
            {language === 'en' ? 'Arabic | العربية' : 'English | الإنجليزية'}
         </button>
         <button onClick={toggleTheme} className="p-3.5 bg-white/5 backdrop-blur-2xl rounded-2xl text-white border border-white/10 shadow-2xl hover:bg-white/10 transition-all">
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
         </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[3rem] md:rounded-[4rem] shadow-2xl overflow-hidden w-full max-w-6xl flex flex-col md:flex-row animate-fade-in relative border border-white/5">
        <div className="bg-slate-950 p-12 md:w-[40%] flex flex-col justify-center text-white relative overflow-hidden shrink-0 border-r border-white/5">
          <div className="relative z-10 space-y-8">
            <div className="flex items-center gap-4">
              <div className="bg-brand-500 p-6 rounded-[2rem] text-white shadow-2xl rotate-12"><LayoutDashboard size={48} strokeWidth={3} /></div>
              <div><span className="text-4xl font-black tracking-tighter italic uppercase block">easyPOS</span><span className="text-[10px] font-black tracking-[0.3em] text-brand-400 mt-1 block opacity-80 uppercase">Root Matrix v2.0</span></div>
            </div>
            <div className="space-y-4">
                <h1 className="text-5xl md:text-7xl font-black leading-none tracking-tighter italic uppercase text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-500">SMART<br/>RETAIL</h1>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest leading-relaxed max-w-xs">{t('professionalSolution')}</p>
            </div>
          </div>
          <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-brand-500/20 rounded-full blur-[100px]"></div>
        </div>

        <div className="flex-1 p-8 md:p-20 flex flex-col justify-center bg-white dark:bg-slate-900 overflow-y-auto">
          <div className="max-w-md mx-auto w-full space-y-12">
              <div className="text-center md:text-left">
                <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter italic uppercase">ACCESS HUB</h2>
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-1">{t('signInToAccess')}</p>
              </div>

              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-3xl shadow-inner">
                <button onClick={() => setMethod('CREDENTIALS')} className={`flex-1 py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${method === 'CREDENTIALS' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}>{t('staffLogin')}</button>
                <button onClick={() => setMethod('CUSTOMER_GOOGLE')} className={`flex-1 py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${method === 'CUSTOMER_GOOGLE' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-lg' : 'text-slate-400'}`}>GOOGLE</button>
                <button onClick={() => setMethod('VISITOR_CODE')} className={`flex-1 py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${method === 'VISITOR_CODE' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-400'}`}>{t('visitorAccess')}</button>
              </div>

              {error && <div className="p-4 bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest rounded-2xl border-2 border-red-100 animate-shake">{error}</div>}

              {method === 'CREDENTIALS' ? (
                <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('username')}</label>
                    <div className="relative">
                        <UserIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={24} />
                        <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full pl-16 pr-8 py-6 bg-slate-100/50 dark:bg-slate-800 border-2 border-transparent focus:border-brand-500 rounded-3xl outline-none font-bold text-xl dark:text-white transition-all" placeholder="operator_id" required />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('password')}</label>
                    <div className="relative">
                        <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={24} />
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-16 pr-8 py-6 bg-slate-100/50 dark:bg-slate-800 border-2 border-transparent focus:border-brand-500 rounded-3xl outline-none font-bold text-xl dark:text-white transition-all" placeholder="••••••••" required />
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="w-full py-8 bg-slate-900 text-white rounded-3xl font-black uppercase tracking-[0.2em] text-xs shadow-2xl active:scale-[0.98] transition-all">
                    {loading ? <Loader2 className="animate-spin mx-auto" size={24} /> : t('accessTerminal')}
                  </button>
                </form>
              ) : method === 'CUSTOMER_GOOGLE' ? (
                <div className="space-y-8 text-center py-6 animate-fade-in-up">
                    <div className="py-20 px-6 bg-slate-50 dark:bg-slate-800/30 rounded-[4rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                        <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" className="w-28 h-28 mx-auto mb-10 shadow-2xl rounded-full p-3 bg-white" alt="Google" />
                        <h4 className="text-3xl font-black dark:text-white uppercase italic tracking-tight">CLOUD IDENTITY</h4>
                    </div>
                    <button onClick={handleGoogleLogin} className="w-full py-8 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-4 transition-all active:scale-95">
                        <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" className="w-6 h-6" alt="" />
                        {t('loginWithGoogle')}
                    </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in-up">
                    <div className="relative">
                        <input type="text" value={vendorCodeInput} onChange={e => setVendorCodeInput(e.target.value)} className="w-full p-8 bg-slate-100/50 dark:bg-slate-800 border-2 border-transparent focus:border-brand-500 rounded-[2.5rem] outline-none font-bold text-2xl pl-20 dark:text-white" placeholder={t('vendorId')} required />
                        <Store className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-300" size={28} />
                    </div>
                    <div className="relative">
                        <input type="password" value={visitorCode} onChange={e => setVisitorCode(e.target.value)} className="w-full p-8 bg-slate-100/50 dark:bg-slate-800 border-2 border-transparent focus:border-brand-500 rounded-[2.5rem] outline-none font-black text-5xl tracking-[0.5em] pl-20 dark:text-white" placeholder="••••" required />
                        <Key className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-300" size={32} />
                    </div>
                    <button type="submit" disabled={loading} className="w-full py-8 bg-brand-600 text-white rounded-[2.5rem] font-black uppercase tracking-[0.2em] text-xs shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 italic">
                      {loading ? <Loader2 className="animate-spin" size={24} /> : t('verify')}
                    </button>
                </form>
              )}
          </div>
        </div>
      </div>
    </div>
  );
};
