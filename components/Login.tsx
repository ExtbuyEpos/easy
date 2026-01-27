
import React, { useState, useEffect } from 'react';
import { User, Language, StoreSettings, VendorRequest } from '../types';
import { Lock, User as UserIcon, AlertCircle, ChevronRight, Moon, Sun, Smartphone, MessageSquare, LayoutDashboard, ShieldCheck, RefreshCw, Loader2, Key, Store, Mail, Phone, FileText, Send, CheckCircle2 } from 'lucide-react';
import { auth } from '../firebase';
import { signInWithPopup, GoogleAuthProvider, sendPasswordResetEmail } from 'firebase/auth';

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

type LoginMethod = 'CREDENTIALS' | 'CUSTOMER_GOOGLE' | 'VISITOR_CODE' | 'FORGOT_PASSWORD' | 'VENDOR_APPLY';

export const Login: React.FC<LoginProps> = ({ 
  onLogin, users, t = (k) => k, isDarkMode, toggleTheme, language, toggleLanguage, onEnterAsGuest, storeSettings,
  activeVendorId, activeVendor, onApplyVendor
}) => {
  const [method, setMethod] = useState<LoginMethod>(activeVendorId ? 'VISITOR_CODE' : 'CREDENTIALS');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [visitorCode, setVisitorCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Vendor Apply Form State
  const [applyForm, setApplyForm] = useState({
      name: '',
      storeName: '',
      email: '',
      phone: '',
      description: ''
  });

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
      setError(language === 'ar' ? 'فشل تسجيل الدخول عبر جوجل.' : 'Google Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      if (auth) {
        await sendPasswordResetEmail(auth, resetEmail);
        setSuccess(language === 'ar' ? 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني' : 'Password reset link sent to your email');
      } else {
        throw new Error("Auth not initialized");
      }
    } catch (err: any) {
      setError(language === 'ar' ? 'فشل إرسال البريد. تأكد من صحة البريد الإلكتروني.' : 'Failed to send reset email. Verify the address.');
    } finally {
      setLoading(false);
    }
  };

  const handleVendorApply = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!applyForm.name || !applyForm.storeName || !applyForm.email) {
          setError(language === 'ar' ? 'الرجاء إكمال الحقول المطلوبة' : 'Please complete required fields');
          return;
      }
      setLoading(true);
      setError('');
      
      // Simulate API call
      await new Promise(r => setTimeout(r, 1500));
      
      const request: VendorRequest = {
          id: Date.now().toString(),
          ...applyForm,
          status: 'PENDING',
          timestamp: Date.now()
      };

      if (onApplyVendor) onApplyVendor(request);
      
      setSuccess(language === 'ar' ? 'تم إرسال طلبك بنجاح! سنقوم بمراجعته قريباً.' : 'Application sent successfully! We will review it shortly.');
      setApplyForm({ name: '', storeName: '', email: '', phone: '', description: '' });
      setLoading(false);
      setTimeout(() => {
          setSuccess('');
          setMethod('CREDENTIALS');
      }, 4000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (method === 'CREDENTIALS') {
      await new Promise(resolve => setTimeout(resolve, 800));
      const userInput = username.trim().toLowerCase();
      const user = users.find(u => 
        (u.username.toLowerCase() === userInput) || 
        (u.email && u.email.toLowerCase() === userInput)
      );

      if (user && user.password === password) {
         onLogin(user);
      } else {
        setError(t('invalidCredentials'));
        setLoading(false);
      }
    } else if (method === 'VISITOR_CODE') {
        await new Promise(resolve => setTimeout(resolve, 1200));
        let correctCode = storeSettings?.visitorAccessCode || '2026';
        if (activeVendor) {
            correctCode = activeVendor.vendorSettings?.shopPasscode || '2026';
        }
        if (visitorCode === correctCode) {
            const visitorUser: User = {
                id: `visitor_${Date.now()}`,
                name: activeVendor ? `${activeVendor.vendorSettings?.storeName} Guest` : 'Shop Visitor',
                username: 'visitor',
                role: 'CUSTOMER',
                vendorId: activeVendorId || undefined
            };
            onLogin(visitorUser);
        } else {
            setError(t('invalidShopCode'));
            setLoading(false);
        }
    }
  };

  const displayLogo = activeVendor?.vendorSettings?.storeLogo || storeSettings?.logo;
  const displayName = activeVendor?.vendorSettings?.storeName || storeSettings?.name || 'easyPOS';

  return (
    <div className="min-h-screen bg-slate-900 dark:bg-black md:bg-slate-900 dark:md:bg-slate-950 flex flex-col md:items-center md:justify-center transition-colors duration-500 overflow-hidden">
      <div className="fixed top-6 right-6 flex gap-3 z-[100]">
         {toggleTheme && (
             <button onClick={toggleTheme} className="p-3 bg-white/10 backdrop-blur-xl rounded-2xl text-white hover:bg-white/20 transition-all shadow-2xl border border-white/10 active:scale-90">
                 {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
             </button>
         )}
         {toggleLanguage && (
             <button onClick={toggleLanguage} className="px-4 py-3 bg-white/10 backdrop-blur-xl rounded-2xl text-white hover:bg-white/20 transition-all font-black text-[10px] uppercase tracking-widest flex items-center justify-center min-w-[70px] shadow-2xl border border-white/10 active:scale-90">
                 {language === 'en' ? 'Arabic' : language === 'ar' ? 'Hindi' : 'English'}
             </button>
         )}
      </div>

      <div className="bg-white dark:bg-slate-900 md:rounded-[3rem] shadow-none md:shadow-2xl overflow-hidden w-full max-w-5xl flex flex-col md:flex-row animate-fade-in md:h-[min(750px,92vh)] transition-all relative">
        <div className="bg-brand-600 dark:bg-brand-900 p-10 md:p-14 md:w-[42%] flex flex-col justify-center text-white relative overflow-hidden shrink-0 min-h-[35vh] md:min-h-0">
          <div className="relative z-10 flex flex-col items-center md:items-start text-center md:text-left rtl:md:text-right">
            <div className="flex items-center gap-4 mb-8 animate-fade-in-up">
              <div className="bg-white p-3 rounded-2xl text-brand-600 shadow-2xl shadow-brand-900/40 rotate-12 hover:rotate-0 transition-transform cursor-pointer">
                {displayLogo ? <img src={displayLogo} className="w-9 h-9 object-contain" /> : <LayoutDashboard size={36} strokeWidth={3} />}
              </div>
              <span className="text-4xl font-black tracking-tighter italic uppercase truncate max-w-[200px]">{displayName}</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black mb-4 leading-none tracking-tighter italic uppercase max-w-xs">{method === 'VENDOR_APPLY' ? 'JOIN OUR NETWORK' : (activeVendorId ? 'VENDOR OUTLET' : t('smartRetail'))}</h1>
            <p className="text-brand-100/70 leading-relaxed text-sm font-medium max-w-xs">{method === 'VENDOR_APPLY' ? 'Become an authorized vendor and scale your distribution through our smart ecosystem.' : (activeVendorId ? `Welcome to the official digital showroom of ${displayName}.` : t('professionalSolution'))}</p>
          </div>
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-brand-400/20 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2"></div>
        </div>

        <div className="p-8 md:p-14 md:w-[58%] flex flex-col justify-center bg-white dark:bg-slate-900 flex-1 relative rounded-t-[3.5rem] md:rounded-none -mt-16 md:mt-0 z-20 shadow-[0_-25px_50px_-12px_rgba(0,0,0,0.25)] md:shadow-none transition-colors duration-500 overflow-y-auto custom-scrollbar">
          <div className="max-w-sm mx-auto w-full py-6">
              <div className="mb-8 text-center md:text-left rtl:md:text-right">
                <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter italic uppercase mb-2">{method === 'VENDOR_APPLY' ? 'Apply Now' : (method === 'FORGOT_PASSWORD' ? t('resetPassword') : t('welcomeBack'))}</h2>
                <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest">{method === 'VENDOR_APPLY' ? 'Submit your business credentials for authorization' : (method === 'FORGOT_PASSWORD' ? t('enterEmailToReset') : t('signInToAccess'))}</p>
              </div>

              {method !== 'FORGOT_PASSWORD' && (
                <div className="flex bg-slate-50 dark:bg-slate-800/50 p-1 rounded-2xl mb-8 border border-slate-100 dark:border-slate-800 flex-wrap">
                  <button onClick={() => { setMethod('VISITOR_CODE'); setError(''); }} className={`flex-1 min-w-[100px] py-3 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1 ${method === 'VISITOR_CODE' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-400'}`}><Store size={12} /> {activeVendorId ? 'Vendor Entry' : t('visitorAccess')}</button>
                  <button onClick={() => { setMethod('CUSTOMER_GOOGLE'); setError(''); }} className={`flex-1 min-w-[100px] py-3 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1 ${method === 'CUSTOMER_GOOGLE' ? 'bg-white dark:bg-slate-700 shadow-sm border border-slate-100' : 'text-slate-400'}`}><img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" className="w-3.5 h-3.5" /> Google</button>
                  <button onClick={() => { setMethod('CREDENTIALS'); setError(''); }} className={`flex-1 min-w-[100px] py-3 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1 ${method === 'CREDENTIALS' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400'}`}><UserIcon size={12} /> {t('staffLogin')}</button>
                </div>
              )}

              {success && <div className="p-5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-2xl flex items-center gap-3 border border-emerald-100 dark:border-emerald-900/30 animate-fade-in-up mb-6"><CheckCircle2 size={18}/><span>{success}</span></div>}
              {error && <div className="p-5 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-[10px] font-black uppercase tracking-widest rounded-2xl flex items-center gap-3 border border-red-100 dark:border-red-900/30 animate-shake mb-6"><AlertCircle size={18} className="shrink-0" /><span>{error}</span></div>}

              {method === 'VENDOR_APPLY' ? (
                <form onSubmit={handleVendorApply} className="space-y-4 animate-fade-in-up">
                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Applicant Name</label>
                        <div className="relative"><UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16}/><input type="text" value={applyForm.name} onChange={e => setApplyForm({...applyForm, name: e.target.value})} className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-xl font-bold dark:text-white outline-none focus:border-brand-500" placeholder="Full Name" /></div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Proposed Store Name</label>
                        <div className="relative"><Store className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16}/><input type="text" value={applyForm.storeName} onChange={e => setApplyForm({...applyForm, storeName: e.target.value})} className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-xl font-bold dark:text-white outline-none focus:border-brand-500" placeholder="My Boutique" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Work Email</label>
                            <input type="email" value={applyForm.email} onChange={e => setApplyForm({...applyForm, email: e.target.value})} className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-xl font-bold dark:text-white outline-none focus:border-brand-500" placeholder="vendor@example.com" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone</label>
                            <input type="tel" value={applyForm.phone} onChange={e => setApplyForm({...applyForm, phone: e.target.value})} className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-xl font-bold dark:text-white outline-none focus:border-brand-500" placeholder="050..." />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Business Nature</label>
                        <textarea value={applyForm.description} onChange={e => setApplyForm({...applyForm, description: e.target.value})} className="w-full p-4 h-24 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-xl font-medium dark:text-white outline-none focus:border-brand-500 resize-none" placeholder="What do you sell? (Apparel, Tech, etc)" />
                    </div>
                    <button type="submit" disabled={loading} className="w-full py-5 bg-brand-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50">
                        {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={18} />} Submit Authorization Request
                    </button>
                    <button type="button" onClick={() => setMethod('CREDENTIALS')} className="w-full text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">Back to Login</button>
                </form>
              ) : method === 'FORGOT_PASSWORD' ? (
                <form onSubmit={handlePasswordReset} className="space-y-6 animate-fade-in">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('emailAddress')}</label>
                    <div className="relative">
                      <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                      <input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} className="w-full pl-14 pr-5 py-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-slate-100 dark:border-slate-800 outline-none focus:border-brand-500 font-bold dark:text-white" placeholder="admin@easypos.com" />
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="w-full py-5 bg-brand-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-[10px] shadow-2xl active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-3 italic">
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <ChevronRight size={20} />} {t('sendResetLink')}
                  </button>
                  <button type="button" onClick={() => setMethod('CREDENTIALS')} className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">{t('backToLogin')}</button>
                </form>
              ) : method === 'CUSTOMER_GOOGLE' ? (
                <div className="space-y-6 animate-fade-in-up">
                   <div className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center text-center gap-6">
                      <div className="w-20 h-20 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center shadow-xl p-4"><img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" className="w-full h-full object-contain" /></div>
                      <div className="space-y-2">
                        <h4 className="font-black text-slate-800 dark:text-white uppercase italic tracking-tighter text-lg">{t('loginWithGoogle')}</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Secure authentication for our smart retail ecosystem</p>
                      </div>
                   </div>
                   <button onClick={handleGoogleLogin} disabled={loading} className="w-full py-5 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[2rem] font-black uppercase tracking-widest text-[10px] shadow-xl flex items-center justify-center gap-3 transition-all hover:bg-slate-50 active:scale-95 disabled:opacity-50">
                     {loading ? <Loader2 className="animate-spin" size={20} /> : <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" className="w-5 h-5" />} {t('loginWithGoogle')}
                   </button>
                </div>
              ) : method === 'VISITOR_CODE' ? (
                <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in-up">
                    <div className="p-6 bg-brand-50/50 dark:bg-brand-900/10 rounded-[2rem] border border-brand-100 dark:border-brand-900/20 flex flex-col items-center text-center gap-4 mb-4">
                        <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-lg text-brand-600">
                           {displayLogo ? <img src={displayLogo} className="w-9 h-9 object-contain" /> : <Store size={28} />}
                        </div>
                        <div className="space-y-1">
                           <h4 className="font-black text-slate-900 dark:text-white uppercase italic text-lg">{displayName}</h4>
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{activeVendor ? 'ENTER VENDOR PASSCODE' : t('enterShopCode')}</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('visitorCode')}</label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none"><Key className="text-slate-300 group-focus-within:text-brand-500 transition-colors" size={20} /></div>
                          <input type="password" value={visitorCode} onChange={(e) => setVisitorCode(e.target.value)} className="w-full pl-14 pr-5 py-5 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:bg-white dark:focus:bg-slate-900 focus:border-brand-500 outline-none transition-all text-slate-900 dark:text-white font-black text-2xl tracking-[0.4em] text-center placeholder-slate-300" placeholder="••••" />
                        </div>
                    </div>
                    <button type="submit" disabled={loading || !visitorCode} className="w-full py-5 bg-brand-600 hover:bg-brand-500 text-white rounded-[2rem] font-black uppercase tracking-widest text-[10px] shadow-2xl active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-3 italic">
                      {loading ? <Loader2 className="animate-spin" size={20} /> : <ChevronRight size={20} />} {t('accessTerminal')}
                    </button>
                </form>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('username')}</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none"><UserIcon className="text-slate-300 group-focus-within:text-brand-500 transition-colors" size={20} /></div>
                        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full pl-14 pr-5 py-5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:bg-white dark:focus:bg-slate-900 focus:border-brand-500 outline-none transition-all text-slate-900 dark:text-white font-bold text-lg placeholder-slate-300" placeholder="admin / email" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center px-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('password')}</label>
                        <button type="button" onClick={() => setMethod('FORGOT_PASSWORD')} className="text-[8px] font-black text-brand-600 uppercase tracking-widest hover:underline italic">{t('forgotPassword')}</button>
                      </div>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none"><Lock className="text-slate-300 group-focus-within:text-brand-500 transition-colors" size={20} /></div>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-14 pr-5 py-5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:bg-white dark:focus:bg-slate-900 focus:border-brand-500 outline-none transition-all text-slate-900 dark:text-white font-bold text-lg placeholder-slate-300" placeholder="••••••••" />
                      </div>
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="w-full font-black py-5 bg-slate-900 hover:bg-black text-white rounded-[2rem] transition-all shadow-2xl active:scale-[0.98] mt-4 flex items-center justify-center gap-3 disabled:opacity-70 group text-[10px] uppercase tracking-widest italic">
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <><ChevronRight size={20} strokeWidth={3} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform rtl:rotate-180"/></>} {t('accessTerminal')}
                  </button>
                  <button type="button" onClick={() => { setMethod('VENDOR_APPLY'); setError(''); }} className="w-full mt-4 flex items-center justify-center gap-2 py-4 bg-brand-50 dark:bg-brand-950/20 text-brand-600 rounded-2xl font-black uppercase text-[9px] tracking-widest border border-brand-100 dark:border-brand-900/30 hover:bg-brand-100 transition-all">
                    <Store size={14}/> Become an Authorized Vendor
                  </button>
                </form>
              )}
          </div>
        </div>
      </div>
    </div>
  );
};
