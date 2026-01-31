
import React, { useState, useEffect, useRef } from 'react';
import { User, Language, StoreSettings } from '../types';
import { Lock, User as UserIcon, Loader2, Key, Store, Globe, LayoutDashboard, Sun, Moon, Zap, ShieldCheck, ShoppingCart, CreditCard, Wallet, Tag, Package, Smartphone, Layers, Boxes, LayoutGrid } from 'lucide-react';

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
        <ShoppingCart size={24} />, <CreditCard size={24} />, <Tag size={24} />, 
        <Package size={24} />, <Zap size={24} />, <Boxes size={24} />, 
        <LayoutGrid size={24} />, <Wallet size={24} />
    ];

    const initialItems: PhysicsItem[] = Array.from({ length: 32 }).map((_, i) => ({
      id: i,
      x: 10 + Math.random() * 80,
      y: 80 + Math.random() * 20,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      rotation: Math.random() * 360,
      rv: (Math.random() - 0.5) * 10,
      size: 44 + Math.random() * 12,
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

  return (
    <div className="min-h-[100svh] bg-[#020617] flex flex-col items-center justify-start relative overflow-y-auto overflow-x-hidden font-sans custom-scrollbar">
      
      {/* FIXED GRAVITY ICON PIT */}
      <div className="fixed inset-x-0 bottom-0 h-[40vh] pointer-events-none z-0">
          {items.map(item => (
              <div 
                key={item.id}
                className="absolute flex items-center justify-center rounded-2xl shadow-2xl border border-white/10 transition-transform duration-75 ease-out"
                style={{
                    left: `${item.x}%`,
                    top: `${item.y}%`,
                    width: `${item.size}px`,
                    height: `${item.size}px`,
                    backgroundColor: item.color,
                    transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`,
                    boxShadow: `0 0 40px ${item.color}66`,
                    opacity: 0.9
                }}
              >
                  <div className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]">{item.icon}</div>
              </div>
          ))}
      </div>

      {/* Scrollable Content Container */}
      <div className="w-full max-w-lg flex flex-col items-center z-10 px-6 py-12 min-h-[100svh]">
          
          {/* HERO LOGO */}
          <div className="flex items-center gap-6 mb-12 animate-fade-in shrink-0">
              <div 
                className="w-24 h-24 bg-[#0ea5e9] rounded-[2.5rem] flex items-center justify-center text-white shadow-[0_0_80px_rgba(14,165,233,0.6)]"
                style={{
                  transform: `perspective(1000px) rotateY(${gravityRef.current.x * 20}deg) rotateX(${-gravityRef.current.y * 20}deg)`
                }}
              >
                  <LayoutGrid size={56} strokeWidth={2.5} className="animate-pulse" />
              </div>
              <div className="text-left">
                  <h1 className="text-5xl font-black text-white italic tracking-tighter uppercase leading-none">EASYPOS</h1>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.5em] mt-2 opacity-80 italic">Multi-Vendor Terminal</p>
              </div>
          </div>

          <div className="space-y-0 mb-16 text-center animate-fade-in shrink-0">
              <h2 className="text-7xl md:text-9xl font-black text-white italic uppercase tracking-tighter leading-[0.75] opacity-95">SMART</h2>
              <h2 className="text-7xl md:text-9xl font-black text-slate-600 italic uppercase tracking-tighter leading-[0.75] opacity-40">RETAIL</h2>
              <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] pt-8 italic opacity-60">Professional Physical Inventory Logic.</p>
          </div>

          {/* ENTRY TERMINAL */}
          <div className="w-full max-w-sm mb-12 bg-white/5 backdrop-blur-3xl rounded-[3.5rem] border border-white/10 p-8 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)] animate-fade-in-up">
              <div className="flex bg-black/40 p-1.5 rounded-[2.2rem] mb-8 border border-white/5 shadow-inner">
                  <button onClick={() => setMethod('CREDENTIALS')} className={`flex-1 py-3.5 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest transition-all ${method === 'CREDENTIALS' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-500 hover:text-white'}`}>Staff Access</button>
                  <button onClick={() => setMethod('VISITOR_CODE')} className={`flex-1 py-3.5 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest transition-all ${method === 'VISITOR_CODE' ? 'bg-brand-600 text-white shadow-xl' : 'text-slate-500 hover:text-white'}`}>Shop Visitor</button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                  {method === 'CREDENTIALS' ? (
                      <>
                          <div className="relative group">
                              <UserIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-500 transition-colors" size={20} />
                              <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full pl-16 pr-6 py-5 bg-black/40 border border-white/10 rounded-2xl outline-none focus:border-brand-500 font-bold text-white transition-all shadow-inner" placeholder="Operator ID" required />
                          </div>
                          <div className="relative group">
                              <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-500 transition-colors" size={20} />
                              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-16 pr-6 py-5 bg-black/40 border border-white/10 rounded-2xl outline-none focus:border-brand-500 font-bold text-white transition-all shadow-inner" placeholder="••••••••" required />
                          </div>
                      </>
                  ) : (
                      <>
                          <div className="relative group">
                              <Store className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                              <input type="text" value={vendorCodeInput} onChange={e => setVendorCodeInput(e.target.value)} className="w-full pl-16 pr-6 py-5 bg-black/40 border border-white/10 rounded-2xl outline-none focus:border-brand-500 font-black uppercase text-white tracking-widest shadow-inner" placeholder="VND-XXXXX" required />
                          </div>
                          <div className="relative group">
                              <Key className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                              <input type="password" value={visitorCode} onChange={e => setVisitorCode(e.target.value)} className="w-full pl-6 pr-6 py-5 bg-black/40 border border-white/10 rounded-2xl outline-none focus:border-brand-500 font-black text-center text-4xl text-white tracking-[0.5em] shadow-inner" placeholder="••••" required maxLength={4} />
                          </div>
                      </>
                  )}
                  
                  <button type="submit" disabled={loading} className="w-full py-6 bg-slate-900 hover:bg-black text-white rounded-[2.5rem] font-black uppercase tracking-[0.2em] text-xs shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-4 group border border-white/5 mt-4">
                      {loading ? <Loader2 className="animate-spin" size={20} /> : <><ShieldCheck size={22} className="group-hover:scale-110 transition-transform"/> {method === 'CREDENTIALS' ? 'Login Node' : 'Enter Shop'}</>}
                  </button>
              </form>

              {error && <div className="mt-6 text-center text-[10px] font-black text-rose-500 uppercase tracking-widest animate-shake p-3 bg-rose-500/10 rounded-xl border border-rose-500/20">{error}</div>}
              
              <div className="mt-10 pt-8 border-t border-white/5 flex items-center justify-between gap-4">
                  <button onClick={toggleLanguage} className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-emerald-400 transition-all active:scale-90 shadow-xl border border-white/5"><Globe size={22}/></button>
                  <button onClick={() => alert('Connect with Supabase instead')} className="flex-1 py-4 bg-white text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all hover:bg-slate-100">
                      <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" className="w-5 h-5" alt="G" /> 
                      Connect Secure
                  </button>
              </div>
          </div>

          {/* FOOTER SYSTEM META */}
          <div className="mt-auto py-8 flex flex-col items-center gap-2 opacity-30 pointer-events-none">
              <p className="text-[9px] font-black uppercase tracking-[0.7em] text-white italic tracking-widest">ZAHRAT AL SAWSEN CORE v6.5</p>
              <div className="h-0.5 w-12 bg-brand-500 rounded-full"></div>
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
