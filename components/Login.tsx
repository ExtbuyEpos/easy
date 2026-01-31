
import React, { useState, useEffect } from 'react';
import { User, Language, StoreSettings } from '../types';
import { Lock, User as UserIcon, Loader2, Key, Store, Globe, LayoutDashboard, Sun, Moon, Zap, ShieldCheck, Box, ShoppingCart, CreditCard, Wallet, Smartphone, Receipt } from 'lucide-react';
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
    <div className="min-h-[100svh] bg-[#020617] flex flex-col items-center justify-center p-4 relative overflow-hidden transition-all duration-700 font-sans">
      
      {/* 
          MOTION MATRIX BACKGROUND 
          - Floating boxes simulating gravity and depth 
      */}
      <div className="absolute inset-0 pointer-events-none z-0">
          <style>{`
            @keyframes float-box-slow {
              0%, 100% { transform: translate(0, 0) rotate(0deg); }
              25% { transform: translate(10px, -20px) rotate(2deg); }
              50% { transform: translate(-15px, -35px) rotate(-1deg); }
              75% { transform: translate(20px, -15px) rotate(3deg); }
            }
            @keyframes pulse-glow {
              0%, 100% { opacity: 0.3; transform: scale(1); }
              50% { opacity: 0.6; transform: scale(1.1); }
            }
            .floating-element {
              animation: float-box-slow 12s ease-in-out infinite;
              will-change: transform;
            }
            .glow-pulse {
              animation: pulse-glow 8s ease-in-out infinite;
            }
          `}</style>

          {/* Background Gradient Orbs */}
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-600/20 rounded-full blur-[120px] glow-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/10 rounded-full blur-[100px] glow-pulse" style={{ animationDelay: '-4s' }}></div>

          {/* Floating Branding Items (Simulated Gravity) */}
          <div className="absolute top-[15%] left-[10%] floating-element opacity-20 hidden md:block" style={{ animationDelay: '0s' }}>
             <div className="bg-slate-800/40 p-6 rounded-[2rem] border border-white/10 backdrop-blur-xl rotate-12">
                <ShoppingCart size={40} className="text-brand-400" />
             </div>
          </div>
          <div className="absolute bottom-[20%] left-[5%] floating-element opacity-15 hidden md:block" style={{ animationDelay: '-3s' }}>
             <div className="bg-slate-800/40 p-8 rounded-[2.5rem] border border-white/10 backdrop-blur-xl -rotate-6">
                <CreditCard size={48} className="text-emerald-400" />
             </div>
          </div>
          <div className="absolute top-[20%] right-[8%] floating-element opacity-20 hidden md:block" style={{ animationDelay: '-6s' }}>
             <div className="bg-slate-800/40 p-5 rounded-[1.8rem] border border-white/10 backdrop-blur-xl -rotate-12">
                <Receipt size={36} className="text-brand-300" />
             </div>
          </div>
          <div className="absolute bottom-[15%] right-[10%] floating-element opacity-15 hidden md:block" style={{ animationDelay: '-9s' }}>
             <div className="bg-slate-800/40 p-7 rounded-[2.2rem] border border-white/10 backdrop-blur-xl rotate-6">
                <Wallet size={42} className="text-white" />
             </div>
          </div>

          {/* Grid Pattern Layer */}
          <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:60px_60px]"></div>
      </div>

      {/* Floating Header Controls */}
      <div className="fixed top-8 right-8 flex gap-4 z-[100]">
         <button onClick={toggleLanguage} className="flex items-center gap-3 px-8 py-4 bg-white/5 backdrop-blur-3xl rounded-[2rem] text-white border border-white/10 shadow-2xl hover:bg-white/10 transition-all font-black text-[11px] uppercase tracking-widest italic group">
            <Globe size={20} className="text-emerald-400 group-hover:rotate-180 transition-transform duration-700" />
            {language === 'en' ? 'Arabic' : 'English'}
         </button>
         <button onClick={toggleTheme} className="p-4 bg-white/5 backdrop-blur-3xl rounded-[1.5rem] text-white border border-white/10 shadow-2xl hover:bg-white/10 transition-all">
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
         </button>
      </div>

      {/* Main Container */}
      <div className="bg-white/80 dark:bg-slate-900/90 backdrop-blur-2xl rounded-[4rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden w-full max-w-7xl flex flex-col lg:flex-row animate-fade-in relative border border-white/5 min-h-[750px] z-10">
        
        {/* Left: Brand Gravity Box */}
        <div className="bg-slate-950 p-12 lg:w-[45%] flex flex-col justify-center text-white relative overflow-hidden shrink-0 border-r border-white/5">
          <div className="relative z-10 flex flex-col items-center text-center">
            
            {/* The Core Gravity Box */}
            <div className="relative group">
                <div className="floating-element w-72 h-72 bg-gradient-to-br from-slate-800 to-slate-950 rounded-[5rem] border-2 border-white/10 flex items-center justify-center relative shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)]">
                    {/* Pulsing Outer Ring */}
                    <div className="absolute inset-[-10px] border-2 border-brand-500/20 rounded-[5.5rem] animate-pulse"></div>
                    <div className="absolute inset-[-20px] border border-brand-500/10 rounded-[6rem] animate-ping" style={{ animationDuration: '4s' }}></div>
                    
                    {/* Main Icon */}
                    <div className="bg-brand-600 p-10 rounded-[3rem] text-white shadow-[0_0_60px_rgba(14,165,233,0.5)] transform group-hover:scale-110 transition-transform duration-1000">
                        <LayoutDashboard size={100} strokeWidth={2.5} className="animate-pulse" />
                    </div>

                    {/* Orbiting Satellite Icons */}
                    <div className="absolute -top-6 -right-6 bg-emerald-500 p-4 rounded-2xl shadow-xl border border-white/20 rotate-12 floating-element" style={{ animationDelay: '-2s' }}>
                        <ShoppingCart size={24} className="text-white" />
                    </div>
                    <div className="absolute -bottom-8 -left-4 bg-brand-400 p-5 rounded-3xl shadow-xl border border-white/20 -rotate-6 floating-element" style={{ animationDelay: '-5s' }}>
                        <CreditCard size={32} className="text-white" />
                    </div>
                </div>
            </div>

            <div className="mt-16 space-y-6">
                <div className="flex flex-col items-center">
                    <span className="text-6xl font-black tracking-tighter italic uppercase block bg-clip-text text-transparent bg-gradient-to-r from-white via-brand-300 to-slate-500">easyPOS</span>
                    <span className="text-[11px] font-black tracking-[0.6em] text-brand-500 mt-3 block opacity-80 uppercase italic">Multi-Node Retail OS</span>
                </div>
                <div className="h-px w-48 bg-gradient-to-r from-transparent via-white/20 to-transparent mx-auto"></div>
                <h1 className="text-4xl md:text-5xl font-black leading-tight tracking-tighter italic uppercase text-white/90">QUANTUM<br/>LEDGER HUB</h1>
                <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.4em] leading-relaxed max-w-sm">{t('professionalSolution')}</p>
            </div>
          </div>
          
          <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-brand-600/10 rounded-full blur-[120px]"></div>
        </div>

        {/* Right: Input Terminal */}
        <div className="flex-1 p-8 md:p-20 flex flex-col justify-center bg-white dark:bg-slate-900">
          <div className="max-w-md mx-auto w-full space-y-12">
              <div className="text-center lg:text-left">
                <div className="flex items-center gap-4 mb-3 justify-center lg:justify-start">
                    <div className="w-12 h-12 rounded-2xl bg-brand-600/10 flex items-center justify-center text-brand-600"><Zap size={28} /></div>
                    <h2 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter italic uppercase leading-none">Entry</h2>
                </div>
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.45em] mt-1 ml-1">{t('signInToAccess')}</p>
              </div>

              <div className="flex bg-slate-100 dark:bg-slate-800 p-2 rounded-[2.5rem] shadow-inner">
                <button onClick={() => setMethod('CREDENTIALS')} className={`flex-1 py-4 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest transition-all ${method === 'CREDENTIALS' ? 'bg-slate-900 text-white shadow-xl scale-[1.02]' : 'text-slate-400'}`}>{t('staffLogin')}</button>
                <button onClick={() => setMethod('CUSTOMER_GOOGLE')} className={`flex-1 py-4 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest transition-all ${method === 'CUSTOMER_GOOGLE' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-xl scale-[1.02]' : 'text-slate-400'}`}>GOOGLE</button>
                <button onClick={() => setMethod('VISITOR_CODE')} className={`flex-1 py-4 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest transition-all ${method === 'VISITOR_CODE' ? 'bg-brand-600 text-white shadow-xl scale-[1.02]' : 'text-slate-400'}`}>{t('visitorAccess')}</button>
              </div>

              {error && <div className="p-5 bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest rounded-3xl border-2 border-red-100 animate-shake flex items-center gap-4"><ShieldCheck size={18}/> {error}</div>}

              {method === 'CREDENTIALS' ? (
                <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in">
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">{t('username')}</label>
                    <div className="relative group">
                        <UserIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-500 transition-colors" size={24} />
                        <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full pl-16 pr-8 py-6 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-brand-500 rounded-[2rem] outline-none font-bold text-xl dark:text-white transition-all shadow-inner" placeholder="operator_id" required />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">{t('password')}</label>
                    <div className="relative group">
                        <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-500 transition-colors" size={24} />
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-16 pr-8 py-6 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-brand-500 rounded-[2rem] outline-none font-bold text-xl dark:text-white transition-all shadow-inner" placeholder="••••••••" required />
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="w-full py-8 bg-slate-900 hover:bg-black text-white rounded-[2.5rem] font-black uppercase tracking-[0.35em] text-xs shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-4 group">
                    {loading ? <Loader2 className="animate-spin" size={24} /> : <><ShieldCheck size={22} className="group-hover:scale-110 transition-transform"/> {t('accessTerminal')}</>}
                  </button>
                </form>
              ) : method === 'CUSTOMER_GOOGLE' ? (
                <div className="space-y-10 text-center py-6 animate-fade-in-up">
                    <div className="py-16 px-8 bg-slate-50 dark:bg-slate-800/30 rounded-[4rem] border-2 border-dashed border-slate-200 dark:border-slate-800 relative group overflow-hidden">
                        <div className="absolute inset-0 bg-brand-500/5 opacity-0 group-hover:opacity-