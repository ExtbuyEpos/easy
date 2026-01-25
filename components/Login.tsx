import React, { useState } from 'react';
import { User, Language } from '../types';
import { ShoppingBag, Lock, User as UserIcon, AlertCircle, ChevronRight, Moon, Sun, Globe, Smartphone, MessageSquare, LayoutDashboard } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
  users: User[];
  t?: (key: string) => string;
  isDarkMode?: boolean;
  toggleTheme?: () => void;
  language?: Language;
  toggleLanguage?: () => void;
}

type LoginMethod = 'CREDENTIALS' | 'PHONE';

export const Login: React.FC<LoginProps> = ({ 
  onLogin, users, t = (k) => k, isDarkMode, toggleTheme, language, toggleLanguage 
}) => {
  const [method, setMethod] = useState<LoginMethod>('CREDENTIALS');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Artificial delay for premium feel
    await new Promise(resolve => setTimeout(resolve, 800));

    if (method === 'CREDENTIALS') {
      const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
      if (user && user.password === password) {
         onLogin(user);
      } else {
        setError(t('invalidCredentials'));
        setLoading(false);
      }
    } else {
      // Simulated WhatsApp/Phone Login
      if (!otpSent) {
          if (phone.length < 8) {
              setError('Enter a valid phone number');
              setLoading(false);
          } else {
              setOtpSent(true);
              setLoading(false);
          }
      } else {
          if (otp === '123456' || otp === '000000') {
             onLogin(users[0]);
          } else {
             setError('Invalid verification code');
             setLoading(false);
          }
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
                 {language === 'en' ? 'Arabic' : 'English'}
             </button>
         )}
      </div>

      <div className="bg-white dark:bg-slate-900 md:rounded-[3rem] shadow-none md:shadow-2xl overflow-hidden w-full max-w-5xl flex flex-col md:flex-row animate-fade-in md:h-[min(720px,90vh)] transition-all relative">
        
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

          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-brand-400/20 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2"></div>
          
          {/* Desktop Footer Info */}
          <div className="hidden md:block absolute bottom-14 left-14 z-10 opacity-40">
            <div className="text-[9px] font-black tracking-[0.2em] uppercase mb-1">{t('copyright')}</div>
            <div className="text-[10px] font-black tracking-[0.1em] uppercase">{t('poweredBy')}</div>
          </div>
        </div>

        {/* Auth Interaction Side */}
        <div className="p-8 md:p-14 md:w-[58%] flex flex-col justify-center bg-white dark:bg-slate-900 flex-1 relative rounded-t-[3.5rem] md:rounded-none -mt-16 md:mt-0 z-20 shadow-[0_-25px_50px_-12px_rgba(0,0,0,0.25)] md:shadow-none transition-colors duration-500 overflow-y-auto">
          <div className="max-w-sm mx-auto w-full py-6">
              <div className="mb-10 text-center md:text-left rtl:md:text-right">
                <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter italic uppercase mb-2">{t('welcomeBack')}</h2>
                <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest">{t('signInToAccess')}</p>
              </div>

              {/* Enhanced Login Method Toggle */}
              <div className="flex bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-2xl mb-10 border border-slate-100 dark:border-slate-800">
                  <button 
                    onClick={() => { setMethod('CREDENTIALS'); setError(''); }}
                    className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${method === 'CREDENTIALS' ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-white shadow-xl border border-slate-100 dark:border-slate-600' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                      <UserIcon size={14} /> {t('username')}
                  </button>
                  <button 
                    onClick={() => { setMethod('PHONE'); setError(''); }}
                    className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${method === 'PHONE' ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-white shadow-xl border border-slate-100 dark:border-slate-600' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                      <Smartphone size={14} /> Mobile
                  </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                {error && (
                    <div className="p-5 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-[10px] font-black uppercase tracking-widest rounded-2xl flex items-center gap-3 border border-red-100 dark:border-red-900/30 animate-shake">
                        <AlertCircle size={18} className="shrink-0" /> 
                        <span>{error}</span>
                    </div>
                )}

                {method === 'CREDENTIALS' ? (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('username')}</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 pl-5 rtl:pr-5 flex items-center pointer-events-none">
                            <UserIcon className="text-slate-300 group-focus-within:text-brand-500 transition-colors" size={20} />
                        </div>
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full pl-14 rtl:pr-14 pr-5 py-5 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:bg-white dark:focus:bg-slate-900 focus:border-brand-500 outline-none transition-all text-slate-900 dark:text-white font-bold text-lg placeholder-slate-300"
                          placeholder="admin"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('password')}</label>
                      <div className="relative group">
                         <div className="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 pl-5 rtl:pr-5 flex items-center pointer-events-none">
                            <Lock className="text-slate-300 group-focus-within:text-brand-500 transition-colors" size={20} />
                        </div>
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-14 rtl:pr-14 pr-5 py-5 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:bg-white dark:focus:bg-slate-900 focus:border-brand-500 outline-none transition-all text-slate-900 dark:text-white font-bold text-lg placeholder-slate-300"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('phoneNumber')}</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 pl-5 rtl:pr-5 flex items-center pointer-events-none">
                            <Smartphone className="text-slate-300 group-focus-within:text-brand-500 transition-colors" size={20} />
                        </div>
                        <input
                          type="tel"
                          disabled={otpSent}
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full pl-14 rtl:pr-14 pr-5 py-5 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:bg-white dark:focus:bg-slate-900 focus:border-brand-500 outline-none transition-all text-slate-900 dark:text-white font-black text-lg disabled:opacity-50"
                          placeholder="+971 00 000 0000"
                        />
                      </div>
                    </div>

                    {otpSent && (
                       <div className="space-y-2 animate-fade-in-up">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Verification Code</label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 pl-5 rtl:pr-5 flex items-center pointer-events-none">
                              <Lock className="text-slate-300 group-focus-within:text-brand-500 transition-colors" size={20} />
                          </div>
                          <input
                            type="text"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            className="w-full pl-14 rtl:pr-14 pr-5 py-5 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:bg-white dark:focus:bg-slate-900 focus:border-brand-500 outline-none transition-all text-slate-900 dark:text-white font-black text-2xl tracking-[0.3em] placeholder-slate-300"
                            placeholder="000000"
                            maxLength={6}
                          />
                        </div>
                        <button type="button" onClick={() => setOtpSent(false)} className="text-[9px] text-brand-600 font-black uppercase tracking-widest hover:underline ml-1">Edit Phone Number</button>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-slate-900 dark:bg-brand-600 text-white font-black py-5 rounded-[2rem] hover:bg-black dark:hover:bg-brand-500 transition-all shadow-2xl active:scale-[0.98] mt-8 flex items-center justify-center gap-3 disabled:opacity-70 group text-sm uppercase tracking-widest italic"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{method === 'PHONE' && !otpSent ? t('getOtp') : t('accessTerminal')}</span>
                      <ChevronRight size={20} strokeWidth={3} className="group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform rtl:rotate-180"/>
                    </>
                  )}
                </button>
              </form>
              
              <div className="mt-12 text-center md:hidden flex flex-col gap-1 items-center opacity-30">
                  <span className="text-[8px] text-slate-400 font-black uppercase tracking-widest">{t('copyright')}</span>
                  <span className="text-[9px] font-black text-slate-700 dark:text-slate-300 tracking-[0.2em] uppercase">{t('poweredBy')}</span>
              </div>

               <div className="mt-12 text-center flex flex-col gap-4">
                 <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest border-2 border-dashed border-slate-100 dark:border-slate-800 py-4 px-6 rounded-3xl inline-block">
                    {t('defaultLogin')}: <strong className="text-slate-900 dark:text-white">admin</strong> / <strong className="text-slate-900 dark:text-white">123</strong>
                 </div>
                 <div className="flex items-center justify-center gap-2 text-[9px] text-slate-400 font-black uppercase tracking-widest italic">
                    <MessageSquare size={12} className="text-brand-500" />
                    Encrypted via easyPOS Multi-Device
                 </div>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};
