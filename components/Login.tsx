import React, { useState } from 'react';
import { User, Language } from '../types';
import { ShoppingBag, Lock, User as UserIcon, AlertCircle, ChevronRight, Moon, Sun, Globe, Smartphone, MessageSquare } from 'lucide-react';

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
             // Login as default admin for demo
             onLogin(users[0]);
          } else {
             setError('Invalid verification code');
             setLoading(false);
          }
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 md:bg-slate-900 dark:md:bg-slate-950 flex items-center justify-center md:p-4 transition-colors duration-200">
      
      {/* Top Right Controls */}
      <div className="absolute top-4 right-4 flex gap-2 z-50">
         {toggleTheme && (
             <button onClick={toggleTheme} className="p-2 bg-white/10 backdrop-blur-sm rounded-full text-white hover:bg-white/20 transition-colors shadow-sm">
                 {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
             </button>
         )}
         {toggleLanguage && (
             <button onClick={toggleLanguage} className="px-3 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white hover:bg-white/20 transition-colors font-bold text-xs flex items-center justify-center min-w-[60px] shadow-sm">
                 {language === 'en' ? 'عربي' : 'English'}
             </button>
         )}
      </div>

      <div className="bg-white dark:bg-slate-900 md:rounded-3xl shadow-none md:shadow-2xl overflow-hidden w-full max-w-4xl flex flex-col md:flex-row animate-fade-in h-screen md:h-[min(680px,90vh)] transition-all">
        
        {/* Brand Side */}
        <div className="bg-brand-600 dark:bg-brand-800 p-8 md:p-12 md:w-[45%] flex flex-col justify-center md:justify-between text-white relative overflow-hidden shrink-0 min-h-[25vh] md:min-h-0">
          
          <div className="relative z-10 flex flex-col items-center md:items-start text-center md:text-left rtl:md:text-right">
            <div className="flex items-center gap-3 mb-6 animate-fade-in-up">
              <div className="bg-white/10 backdrop-blur-sm p-3 rounded-2xl text-white shadow-inner border border-white/20">
                <ShoppingBag size={32} />
              </div>
              <span className="text-4xl font-bold tracking-tight">easyPOS</span>
            </div>
            
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4 leading-tight max-w-xs md:max-w-none mx-auto md:mx-0">
              {t('smartRetail')}
            </h1>
            <p className="text-brand-100 leading-relaxed text-sm md:text-base max-w-sm mx-auto md:mx-0 opacity-80">
              {t('professionalSolution')}
            </p>
          </div>

          <div className="hidden md:block mt-8 relative z-10">
            <div className="text-[11px] text-brand-200/60 font-medium tracking-wide uppercase mb-1">{t('copyright')}</div>
            <div className="text-sm font-bold text-white/90 tracking-wide uppercase">{t('poweredBy')}</div>
          </div>
          
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-900 opacity-20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>
        </div>

        {/* Form Side */}
        <div className="p-8 md:p-12 md:w-[55%] flex flex-col justify-center bg-white dark:bg-slate-900 flex-1 relative rounded-t-[40px] md:rounded-none -mt-10 md:mt-0 z-20 shadow-[0_-15px_40px_-15px_rgba(0,0,0,0.1)] md:shadow-none transition-colors duration-200 overflow-y-auto">
          <div className="max-w-sm mx-auto w-full py-4">
              <div className="mb-8 text-center md:text-left rtl:md:text-right">
                <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">{t('welcomeBack')}</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm">{t('signInToAccess')}</p>
              </div>

              {/* Login Method Toggle */}
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl mb-8">
                  <button 
                    onClick={() => { setMethod('CREDENTIALS'); setError(''); }}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${method === 'CREDENTIALS' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}
                  >
                      <UserIcon size={14} /> {t('username')}
                  </button>
                  <button 
                    onClick={() => { setMethod('PHONE'); setError(''); }}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${method === 'PHONE' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}
                  >
                      <Smartphone size={14} /> {t('phoneNumber')}
                  </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-2xl flex items-start gap-3 border border-red-100 dark:border-red-900 animate-shake">
                        <AlertCircle size={18} className="shrink-0 mt-0.5" /> 
                        <span>{error}</span>
                    </div>
                )}

                {method === 'CREDENTIALS' ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1 rtl:mr-1 rtl:ml-0">{t('username')}</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 pl-4 rtl:pl-0 rtl:pr-4 flex items-center pointer-events-none">
                            <UserIcon className="text-slate-400 group-focus-within:text-brand-500 transition-colors" size={22} />
                        </div>
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full pl-12 rtl:pl-4 rtl:pr-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all text-slate-800 dark:text-white placeholder-slate-400 font-medium"
                          placeholder="admin"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1 rtl:mr-1 rtl:ml-0">{t('password')}</label>
                      <div className="relative group">
                         <div className="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 pl-4 rtl:pl-0 rtl:pr-4 flex items-center pointer-events-none">
                            <Lock className="text-slate-400 group-focus-within:text-brand-500 transition-colors" size={22} />
                        </div>
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-12 rtl:pl-4 rtl:pr-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all text-slate-800 dark:text-white placeholder-slate-400 font-medium"
                          placeholder="•••••••"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1 rtl:mr-1 rtl:ml-0">{t('phoneNumber')}</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 pl-4 rtl:pl-0 rtl:pr-4 flex items-center pointer-events-none">
                            <Smartphone className="text-slate-400 group-focus-within:text-brand-500 transition-colors" size={22} />
                        </div>
                        <input
                          type="tel"
                          disabled={otpSent}
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full pl-12 rtl:pl-4 rtl:pr-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all text-slate-800 dark:text-white placeholder-slate-400 font-medium disabled:opacity-60"
                          placeholder="+971 XX XXX XXXX"
                        />
                      </div>
                    </div>

                    {otpSent && (
                       <div className="space-y-2 animate-fade-in">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1 rtl:mr-1 rtl:ml-0">Verification Code</label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 pl-4 rtl:pl-0 rtl:pr-4 flex items-center pointer-events-none">
                              <Lock className="text-slate-400 group-focus-within:text-brand-500 transition-colors" size={22} />
                          </div>
                          <input
                            type="text"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            className="w-full pl-12 rtl:pl-4 rtl:pr-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all text-slate-800 dark:text-white placeholder-slate-400 font-bold tracking-widest"
                            placeholder="123456"
                            maxLength={6}
                          />
                        </div>
                        <button type="button" onClick={() => setOtpSent(false)} className="text-[10px] text-brand-600 font-bold uppercase hover:underline ml-1">Change Number</button>
                      </div>
                    )}
                  </>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-slate-900 dark:bg-brand-600 text-white font-bold py-4 rounded-2xl hover:bg-slate-800 dark:hover:bg-brand-500 transition-all shadow-xl hover:shadow-2xl active:scale-[0.98] mt-4 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group text-lg"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      {method === 'PHONE' && !otpSent ? t('getOtp') : t('accessTerminal')} 
                      <ChevronRight size={22} className="group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform rtl:rotate-180"/>
                    </>
                  )}
                </button>
              </form>
              
              <div className="mt-8 text-center md:hidden flex flex-col gap-1 items-center">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest">{t('copyright')}</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 tracking-wide uppercase">{t('poweredBy')}</span>
              </div>

               <div className="mt-8 text-center flex flex-col gap-3">
                 <p className="text-xs text-slate-400 bg-slate-50 dark:bg-slate-800 py-3 px-6 rounded-full inline-block border border-slate-100 dark:border-slate-700 font-medium">
                    {t('defaultLogin')}: <strong className="text-slate-700 dark:text-slate-200">admin</strong> / <strong className="text-slate-700 dark:text-slate-200">123</strong>
                 </p>
                 <div className="flex items-center justify-center gap-2 text-xs text-slate-400 italic">
                    <MessageSquare size={12} className="text-brand-500" />
                    Powered by Baileys Multi-Device
                 </div>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};