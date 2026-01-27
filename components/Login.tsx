
import React, { useState, useEffect } from 'react';
import { User, Language, StoreSettings } from '../types';
import { Lock, User as UserIcon, AlertCircle, ChevronRight, Moon, Sun, Smartphone, MessageSquare, LayoutDashboard, ShieldCheck, RefreshCw, Loader2, Key, Store } from 'lucide-react';
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
}

type LoginMethod = 'CREDENTIALS' | 'CUSTOMER_GOOGLE' | 'CUSTOMER_PHONE' | 'VISITOR_CODE';

export const Login: React.FC<LoginProps> = ({ 
  onLogin, users, t = (k) => k, isDarkMode, toggleTheme, language, toggleLanguage, onEnterAsGuest, storeSettings
}) => {
  const [method, setMethod] = useState<LoginMethod>('CREDENTIALS');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [visitorCode, setVisitorCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);

  // Verification code countdown logic
  useEffect(() => {
    let interval: any;
    if (timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleRequestOtp = async () => {
    if (phone.length < 8) {
      setError(language === 'ar' ? 'أدخل رقم هاتف صحيح' : 'Enter a valid phone number');
      return;
    }
    setError('');
    setLoading(true);
    
    // Simulated real-time delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setOtpSent(true);
    setLoading(false);
    setTimer(60);
  };

  const handleGoogleLogin = async () => {
    if (!auth) {
        setError(language === 'ar' ? 'فشل الاتصال بخادم الأمان' : 'Security server connection failed');
        return;
    }

    setLoading(true);
    setError('');
    
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const fbUser = result.user;
      
      // Admin Access Logic: Grant full system access to specific emails
      const adminEmails = ['zahratalsawsen1@gmail.com', 'extbuy.om@gmail.com'];
      const userEmail = fbUser.email?.toLowerCase() || '';
      const isSystemAdmin = adminEmails.includes(userEmail);

      const googleUser: User = {
        id: fbUser.uid,
        name: fbUser.displayName || (isSystemAdmin ? 'System Admin' : 'Google User'),
        username: fbUser.email?.split('@')[0] || 'google_user',
        role: isSystemAdmin ? 'ADMIN' : 'CUSTOMER',
        email: fbUser.email || undefined,
        avatar: fbUser.photoURL || undefined
      };
      
      onLogin(googleUser);
    } catch (err: any) {
      console.error("Google Auth Error:", err);
      if (err.code === 'auth/popup-blocked') {
        setError(language === 'ar' ? 'تم حظر النافذة المنبثقة. يرجى تفعيلها.' : 'Popup blocked. Please enable popups.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        setError(language === 'ar' ? 'تم إلغاء عملية الدخول.' : 'Login cancelled.');
      } else {
        setError(language === 'ar' ? 'فشل تسجيل الدخول عبر جوجل.' : 'Google Login failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (method === 'CREDENTIALS') {
      // Artificial delay for premium feel
      await new Promise(resolve => setTimeout(resolve, 800));
      const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
      if (user && user.password === password) {
         onLogin(user);
      } else {
        setError(t('invalidCredentials'));
        setLoading(false);
      }
    } else if (method === 'CUSTOMER_PHONE') {
      if (!otpSent) {
          handleRequestOtp();
      } else {
          await new Promise(resolve => setTimeout(resolve, 1000));
          if (otp === '123456' || otp === '000000') {
             const customerUser: User = {
                 id: `phone_${phone}`,
                 name: `Customer ${phone.slice(-4)}`,
                 username: `user_${phone}`,
                 role: 'CUSTOMER'
             };
             onLogin(customerUser);
          } else {
             setError(language === 'ar' ? 'رمز التحقق غير صحيح' : 'Invalid verification code');
             setLoading(false);
          }
      }
    } else if (method === 'VISITOR_CODE') {
        await new Promise(resolve => setTimeout(resolve, 1200));
        const correctCode = storeSettings?.visitorAccessCode || '2026';
        if (visitorCode === correctCode) {
            const visitorUser: User = {
                id: `visitor_${Date.now()}`,
                name: 'Shop Visitor',
                username: 'visitor',
                role: 'CUSTOMER'
            };
            onLogin(visitorUser);
        } else {
            setError(t('invalidShopCode'));
            setLoading(false);
        }
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 dark:bg-black md:bg-slate-900 dark:md:bg-slate-950 flex flex-col md:items-center md:justify-center transition-colors duration-500 overflow-hidden">
      
      {/* Top Controls Overlay */}
      <div className="fixed top-6 right-6 flex gap-3 z-[100]">
         {toggleTheme && (
             <button 
                onClick={toggleTheme} 
                className="p-3 bg-white/10 backdrop-blur-xl rounded-2xl text-white hover:bg-white/20 transition-all shadow-2xl border border-white/10 active:scale-90"
             >
                 {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
             </button>
         )}
         {toggleLanguage && (
             <button 
                onClick={toggleLanguage} 
                className="px-4 py-3 bg-white/10 backdrop-blur-xl rounded-2xl text-white hover:bg-white/20 transition-all font-black text-[10px] uppercase tracking-widest flex items-center justify-center min-w-[70px] shadow-2xl border border-white/10 active:scale-90"
             >
                 {language === 'en' ? 'Arabic' : language === 'ar' ? 'Hindi' : 'English'}
             </button>
         )}
      </div>

      <div className="bg-white dark:bg-slate-900 md:rounded-[3rem] shadow-none md:shadow-2xl overflow-hidden w-full max-w-5xl flex flex-col md:flex-row animate-fade-in md:h-[min(750px,92vh)] transition-all relative">
        
        {/* Brand Hero Side */}
        <div className="bg-brand-600 dark:bg-brand-900 p-10 md:p-14 md:w-[42%] flex flex-col justify-center text-white relative overflow-hidden shrink-0 min-h-[35vh] md:min-h-0">
          
          <div className="relative z-10 flex flex-col items-center md:items-start text-center md:text-left rtl:md:text-right">
            <div className="flex items-center gap-4 mb-8 animate-fade-in-up">
              <div className="bg-white p-3 rounded-2xl text-brand-600 shadow-2xl shadow-brand-900/40 rotate-12 hover:rotate-0 transition-transform cursor-pointer">
                <LayoutDashboard size={36} strokeWidth={3} />
              </div>
              <span className="text-4xl font-black tracking-tighter italic uppercase">easyPOS</span>
            </div>
            
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black mb-4 leading-none tracking-tighter italic uppercase max-w-xs">
              {t('smartRetail')}
            </h1>
            <p className="text-brand-100/70 leading-relaxed text-sm font-medium max-w-xs">
              {t('professionalSolution')}
            </p>
          </div>

          <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-brand-400/20 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2"></div>
          
          <div className="hidden md:block absolute bottom-14 left-14 z-10 opacity-40">
            <div className="text-[9px] font-black tracking-[0.2em] uppercase mb-1">{t('copyright')}</div>
            <div className="text-[10px] font-black tracking-[0.1em] uppercase">{t('poweredBy')}</div>
          </div>
        </div>

        {/* Auth Interaction Side */}
        <div className="p-8 md:p-14 md:w-[58%] flex flex-col justify-center bg-white dark:bg-slate-900 flex-1 relative rounded-t-[3.5rem] md:rounded-none -mt-16 md:mt-0 z-20 shadow-[0_-25px_50px_-12px_rgba(0,0,0,0.25)] md:shadow-none transition-colors duration-500 overflow-y-auto">
          <div className="max-w-sm mx-auto w-full py-6">
              <div className="mb-8 text-center md:text-left rtl:md:text-right">
                <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter italic uppercase mb-2">{t('welcomeBack')}</h2>
                <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest">{t('signInToAccess')}</p>
              </div>

              {/* Branded Interaction Tabs */}
              <div className="flex bg-slate-50 dark:bg-slate-800/50 p-1 rounded-2xl mb-8 border border-slate-100 dark:border-slate-800 flex-wrap">
                  <button 
                    onClick={() => { setMethod('VISITOR_CODE'); setError(''); }}
                    className={`flex-1 min-w-[100px] py-3.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${method === 'VISITOR_CODE' ? 'bg-brand-600 text-white shadow-xl shadow-brand-500/20' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                      <Store size={12} /> {t('visitorAccess')}
                  </button>
                  <button 
                    onClick={() => { setMethod('CUSTOMER_GOOGLE'); setError(''); }}
                    className={`flex-1 min-w-[100px] py-3.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${method === 'CUSTOMER_GOOGLE' ? 'bg-white dark:bg-slate-700 border-2 border-slate-100 dark:border-slate-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                      <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" className="w-3.5 h-3.5" /> Google
                  </button>
                  <button 
                    onClick={() => { setMethod('CREDENTIALS'); setError(''); }}
                    className={`flex-1 min-w-[100px] py-3.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${method === 'CREDENTIALS' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                      <UserIcon size={12} /> {t('staffLogin')}
                  </button>
              </div>

              {method === 'CUSTOMER_GOOGLE' ? (
                <div className="space-y-6 animate-fade-in-up">
                   <div className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center text-center gap-6">
                      <div className="w-20 h-20 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center shadow-xl p-4">
                        <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" className="w-full h-full object-contain" />
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-black text-slate-800 dark:text-white uppercase italic tracking-tighter text-lg">{t('loginWithGoogle')}</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Secure authentication for our smart retail ecosystem</p>
                      </div>
                   </div>
                   
                   {error && (
                      <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-[10px] font-black uppercase tracking-widest rounded-2xl flex items-center gap-3 border border-red-100 dark:border-red-900/30">
                          <AlertCircle size={16} className="shrink-0" /> 
                          <span>{error}</span>
                      </div>
                   )}

                   <button 
                    onClick={handleGoogleLogin} 
                    disabled={loading}
                    className="w-full py-5 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[2rem] font-black uppercase tracking-widest text-[10px] shadow-xl flex items-center justify-center gap-3 transition-all hover:bg-slate-50 active:scale-95 disabled:opacity-50"
                   >
                     {loading ? <Loader2 className="animate-spin" size={20} /> : <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" className="w-5 h-5" />}
                     {t('loginWithGoogle')}
                   </button>
                </div>
              ) : method === 'VISITOR_CODE' ? (
                <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in-up">
                    <div className="p-6 bg-brand-50/50 dark:bg-brand-900/10 rounded-[2rem] border border-brand-100 dark:border-brand-900/20 flex flex-col items-center text-center gap-4 mb-4">
                        <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-lg text-brand-600">
                           <Store size={28} />
                        </div>
                        <div className="space-y-1">
                           <h4 className="font-black text-slate-900 dark:text-white uppercase italic text-lg">{storeSettings?.name || 'easyPOS'}</h4>
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('enterShopCode')}</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('visitorCode')}</label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                              <Key className="text-slate-300 group-focus-within:text-brand-500 transition-colors" size={20} />
                          </div>
                          <input
                            type="password"
                            value={visitorCode}
                            onChange={(e) => setVisitorCode(e.target.value)}
                            className="w-full pl-14 pr-5 py-5 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:bg-white dark:focus:bg-slate-900 focus:border-brand-500 outline-none transition-all text-slate-900 dark:text-white font-black text-2xl tracking-[0.4em] text-center placeholder-slate-300"
                            placeholder="••••"
                          />
                        </div>
                    </div>

                    {error && (
                      <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-[10px] font-black uppercase tracking-widest rounded-2xl flex items-center gap-3 border border-red-100 dark:border-red-900/30">
                          <AlertCircle size={16} /> 
                          <span>{error}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading || !visitorCode}
                      className="w-full py-5 bg-brand-600 hover:bg-brand-500 text-white rounded-[2rem] font-black uppercase tracking-widest text-[10px] shadow-2xl active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-3 italic"
                    >
                      {loading ? <Loader2 className="animate-spin" size={20} /> : <ChevronRight size={20} />}
                      {t('accessTerminal')}
                    </button>
                </form>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in">
                  {error && (
                      <div className="p-5 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-[10px] font-black uppercase tracking-widest rounded-2xl flex items-center gap-3 border border-red-100 dark:border-red-900/30 animate-shake">
                          <AlertCircle size={18} className="shrink-0" /> 
                          <span>{error}</span>
                      </div>
                  )}

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('username')}</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                            <UserIcon className="text-slate-300 group-focus-within:text-brand-500 transition-colors" size={20} />
                        </div>
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full pl-14 pr-5 py-5 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:bg-white dark:focus:bg-slate-900 focus:border-brand-500 outline-none transition-all text-slate-900 dark:text-white font-bold text-lg placeholder-slate-300"
                          placeholder="admin"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('password')}</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                            <Lock className="text-slate-300 group-focus-within:text-brand-500 transition-colors" size={20} />
                        </div>
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-14 pr-5 py-5 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:bg-white dark:focus:bg-slate-900 focus:border-brand-500 outline-none transition-all text-slate-900 dark:text-white font-bold text-lg placeholder-slate-300"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full font-black py-5 bg-slate-900 hover:bg-black text-white rounded-[2rem] transition-all shadow-2xl active:scale-[0.98] mt-8 flex items-center justify-center gap-3 disabled:opacity-70 group text-[10px] uppercase tracking-widest italic"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <>
                        <span>{t('accessTerminal')}</span>
                        <ChevronRight size={20} strokeWidth={3} className="group-hover:translate-x-1 transition-transform rtl:rotate-180"/>
                      </>
                    )}
                  </button>
                </form>
              )}
              
               <div className="mt-12 text-center flex flex-col gap-4">
                 <div className="flex items-center justify-center gap-2 text-[9px] text-slate-400 font-black uppercase tracking-widest italic">
                    <ShieldCheck size={12} className={method === 'VISITOR_CODE' ? 'text-emerald-500' : 'text-slate-400'} />
                    {method === 'VISITOR_CODE' ? 'Verified direct shop access' : 'Encrypted via easyPOS Multi-Device'}
                 </div>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};
