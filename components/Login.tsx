
import React, { useState, useEffect, useRef } from 'react';
import { User, Language, StoreSettings } from '../types';
import { Lock, User as UserIcon, Loader2, Key, Store, Globe, LayoutDashboard, Sun, Moon, Zap, ShieldCheck, ShoppingCart, CreditCard, Wallet, Tag, Package, Smartphone, Layers, Boxes, LayoutGrid, LogIn } from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

type LoginMethod = 'VISITOR_CODE' | 'CUSTOMER_GOOGLE' | 'CREDENTIALS';

interface PhysicsItem {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rv: number;
  size: number;
  color: string;
  icon: React.ReactNode;
}

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
  
  const [items, setItems] = useState<PhysicsItem[]>([]);
  const gravityRef = useRef({ x: 0, y: 1 });

  useEffect(() => {
    const colors = ['#0ea5e9', '#10b981', '#f43f5e', '#f59e0b', '#8b5cf6', '#ec4899', '#3b82f6'];
    const iconPool = [
        <ShoppingCart size={32} />, <CreditCard size={32} />, <Tag size={32} />, 
        <Package size={32} />, <Zap size={32} />, <Boxes size={32} />, 
        <LayoutGrid size={32} />, <Wallet size={32} />
    ];

    const initialItems: PhysicsItem[] = Array.from({ length: 24 }).map((_, i) => ({
      id: i,
      x: 10 + Math.random() * 80,
      y: 80 + Math.random() * 20,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      rotation: Math.random() * 360,
      rv: (Math.random() - 0.5) * 10,
      size: 60 + Math.random() * 40, // Increased size for better visuals
      color: colors[i % colors.length],
      icon: iconPool[i % iconPool.length]
    }));
    setItems(initialItems);

    const handleMotion = (e: DeviceOrientationEvent) => {
      const gx = (e.gamma || 0) / 45; 
      const gy = (e.beta || 0) / 45;
      gravityRef.current = { x: gx, y: gy };
    };

    window.addEventListener('deviceorientation', handleMotion);

    const animate = () => {
      setItems(prev => prev.map(item => {
        let nvx = item.vx + (gravityRef.current.x * 0.15);
        let nvy = item.vy + (gravityRef.current.y * 0.15);
        nvx *= 0.98; nvy *= 0.98;
        let nx = item.x + nvx; let ny = item.y + nvy;
        if (nx < 5) { nx = 5; nvx *= -0.6; }
        if (nx > 95) { nx = 95; nvx *= -0.6; }
        if (ny < 0) { ny = 0; nvy *= -0.6; }
        if (ny > 95) { ny = 95; nvy *= -0.6; }
        return { ...item, x: nx, y: ny, vx: nvx, vy: nvy, rotation: item.rotation + item.rv + (nvx * 5) };
      }));
      requestAnimationFrame(animate);
    };

    const handleId = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(handleId);
      window.removeEventListener('deviceorientation', handleMotion);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (method === 'CREDENTIALS') {
      const user = users.find(u => (u.username.toLowerCase() === username.trim().toLowerCase()) && u.password === password);
      if (user) onLogin(user);
      else { setError(t('invalidCredentials')); setLoading(false); }
    } else {
      const vendor = users.find(u => u.role === 'VENDOR' && u.vendorId?.toLowerCase() === vendorCodeInput.trim().toLowerCase());
      if (vendor && visitorCode === (vendor.vendorSettings?.shopPasscode || '2026')) {
        onLogin({
          id: `vst_${Date.now()}`,
          name: `${vendor.vendorSettings?.storeName || vendor.name} Visitor`,
          username: 'visitor',
          role: 'CUSTOMER',
          vendorId: vendor.vendorId
        });
      } else {
        setError(t('invalidShopCode'));
        setLoading(false);
      }
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      
      const isAdmin = firebaseUser.email === 'nabeelkhan1007@gmail.com';

      const user: User = {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || 'Google User',
        username: firebaseUser.email?.split('@')[0] || 'user',
        email: firebaseUser.email || '',
        role: isAdmin ? 'ADMIN' : 'CUSTOMER',
        avatar: firebaseUser.photoURL || undefined
      };
      
      onLogin(user);
    } catch (err: any) {
      console.error("Google Login Error:", err);
      setError(err.message || 'Login failed');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-[#020617] overflow-y-auto font-sans custom-scrollbar">
      
      {/* FIXED GRAVITY ICON PIT */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          {items.map(item => (
              <div 
                key={item.id}
                className="absolute flex items-center justify-center rounded-3xl shadow-2xl border border-white/10 transition-transform duration-75 ease-out"
                style={{
                    left: `${item.x}%`,
                    top: `${item.y}%`,
                    width: `${item.size}px`,
                    height: `${item.size}px`,
                    backgroundColor: item.color,
                    transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`,
                    boxShadow: `0 0 60px ${item.color}66`,
                    opacity: 0.8
                }}
              >
                  <div className="text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)] scale-150">{item.icon}</div>
              </div>
          ))}
      </div>

      {/* Scrollable Content Container */}
      <div className="w-full min-h-full flex flex-col items-center justify-center py-16 px-4 z-10 relative">
          
          {/* HERO LOGO */}
          <div className="flex items-center gap-6 md:gap-8 mb-10 md:mb-16 animate-fade-in shrink-0 origin-center scale-90 md:scale-100">
              <div 
                className="w-24 h-24 md:w-32 md:h-32 bg-[#0ea5e9] rounded-[2.5rem] md:rounded-[3rem] flex items-center justify-center text-white shadow-[0_0_100px_rgba(14,165,233,0.6)]"
                style={{
                  transform: `perspective(1000px) rotateY(${gravityRef.current.x * 20}deg) rotateX(${-gravityRef.current.y * 20}deg)`
                }}
              >
                  <LayoutGrid size={48} strokeWidth={2.5} className="animate-pulse md:hidden" />
                  <LayoutGrid size={72} strokeWidth={2.5} className="animate-pulse hidden md:block" />
              </div>
              <div className="text-left">
                  <h1 className="text-5xl md:text-7xl font-black text-white italic tracking-tighter uppercase leading-none">EASYPOS</h1>
                  <p className="text-[10px] md:text-[12px] font-black text-slate-500 uppercase tracking-[0.5em] mt-3 opacity-80 italic">Multi-Vendor Terminal</p>
              </div>
          </div>

          <div className="space-y-0 mb-10 md:mb-16 text-center animate-fade-in shrink-0">
              <h2 className="text-6xl sm:text-8xl md:text-9xl font-black text-white italic uppercase tracking-tighter leading-[0.75] opacity-95">SMART</h2>
              <h2 className="text-6xl sm:text-8xl md:text-9xl font-black text-slate-600 italic uppercase tracking-tighter leading-[0.75] opacity-40">RETAIL</h2>
              <p className="text-[12px] md:text-[14px] font-black text-slate-400 uppercase tracking-[0.4em] pt-8 md:pt-10 italic opacity-60">Professional Physical Inventory Logic.</p>
          </div>

          {/* ENTRY TERMINAL */}
          <div className="w-full max-w-lg mb-12 bg-white/5 backdrop-blur-3xl rounded-[3rem] md:rounded-[4rem] border border-white/10 p-8 md:p-12 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)] animate-fade-in-up">
              <div className="flex bg-black/40 p-2 rounded-[2.5rem] mb-10 border border-white/5 shadow-inner">
                  <button onClick={() => setMethod('CREDENTIALS')} className={`flex-1 py-4 rounded-[2rem] text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${method === 'CREDENTIALS' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-500 hover:text-white'}`}>Staff Access</button>
                  <button onClick={() => setMethod('VISITOR_CODE')} className={`flex-1 py-4 rounded-[2rem] text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${method === 'VISITOR_CODE' ? 'bg-brand-600 text-white shadow-xl' : 'text-slate-500 hover:text-white'}`}>Shop Visitor</button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                  {method === 'CREDENTIALS' ? (
                      <>
                          <div className="relative group">
                              <UserIcon className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-500 transition-colors" size={24} />
                              <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full pl-20 pr-8 py-6 bg-black/40 border border-white/10 rounded-[2rem] outline-none focus:border-brand-500 font-bold text-white transition-all shadow-inner text-base md:text-lg" placeholder="Operator ID" required />
                          </div>
                          <div className="relative group">
                              <Lock className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-500 transition-colors" size={24} />
                              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-20 pr-8 py-6 bg-black/40 border border-white/10 rounded-[2rem] outline-none focus:border-brand-500 font-bold text-white transition-all shadow-inner text-base md:text-lg" placeholder="••••••••" required />
                          </div>
                      </>
                  ) : (
                      <>
                          <div className="relative group">
                              <Store className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-500" size={24} />
                              <input type="text" value={vendorCodeInput} onChange={e => setVendorCodeInput(e.target.value)} className="w-full pl-20 pr-8 py-6 bg-black/40 border border-white/10 rounded-[2rem] outline-none focus:border-brand-500 font-black uppercase text-white tracking-widest shadow-inner text-base md:text-lg" placeholder="VND-XXXXX" required />
                          </div>
                          <div className="relative group">
                              <Key className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-500" size={24} />
                              <input type="password" value={visitorCode} onChange={e => setVisitorCode(e.target.value)} className="w-full pl-8 pr-8 py-6 bg-black/40 border border-white/10 rounded-[2rem] outline-none focus:border-brand-500 font-black text-center text-4xl md:text-5xl text-white tracking-[0.5em] shadow-inner" placeholder="••••" required maxLength={4} />
                          </div>
                      </>
                  )}
                  
                  <button type="submit" disabled={loading} className="w-full py-6 md:py-7 bg-slate-900 hover:bg-black text-white rounded-[3rem] font-black uppercase tracking-[0.2em] text-xs md:text-sm shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-4 group border border-white/5 mt-6">
                      {loading ? <Loader2 className="animate-spin" size={24} /> : <><ShieldCheck size={26} className="group-hover:scale-110 transition-transform"/> {method === 'CREDENTIALS' ? 'Login Node' : 'Enter Shop'}</>}
                  </button>
              </form>

              {error && <div className="mt-8 text-center text-xs font-black text-rose-500 uppercase tracking-widest animate-shake p-4 bg-rose-500/10 rounded-2xl border border-rose-500/20">{error}</div>}
              
              <div className="mt-12 pt-10 border-t border-white/5 flex items-center justify-between gap-4">
                  <button onClick={toggleLanguage} className="p-5 bg-white/5 hover:bg-white/10 rounded-3xl text-emerald-400 transition-all active:scale-90 shadow-xl border border-white/5"><Globe size={26}/></button>
                  <button onClick={handleGoogleLogin} className="flex-1 py-5 bg-white text-slate-900 rounded-3xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-4 shadow-2xl active:scale-95 transition-all hover:bg-slate-100">
                      <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" className="w-6 h-6" alt="G" /> 
                      Sign in with Google
                  </button>
              </div>
          </div>

          {/* FOOTER SYSTEM META */}
          <div className="mt-auto pb-4 flex flex-col items-center gap-2 opacity-30 pointer-events-none">
              <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.7em] text-white italic tracking-widest">ZAHRAT AL SAWSEN CORE v6.5</p>
              <div className="h-1 w-16 bg-brand-500 rounded-full"></div>
          </div>
      </div>

      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fade-in-up 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out infinite; }
      `}</style>
    </div>
  );
};
