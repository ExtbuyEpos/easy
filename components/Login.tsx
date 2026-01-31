
import React, { useState, useEffect, useRef } from 'react';
import { User, Language, StoreSettings } from '../types';
import { Lock, User as UserIcon, AlertCircle, ChevronRight, Moon, Sun, LayoutDashboard, Loader2, Key, Store, ShoppingCart, Receipt, CreditCard, Package, ScanLine, Printer, Zap } from 'lucide-react';
import { auth } from '../firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

// Define the LoginMethod type to identify login strategies
type LoginMethod = 'VISITOR_CODE' | 'CUSTOMER_GOOGLE' | 'CREDENTIALS';

// Define the LoginProps interface used by the Login component
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

const GravityTerminal: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gravityRef = useRef({ x: 0, y: 0.5 }); 
  const mouseRef = useRef({ x: -1000, y: -1000, isDown: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width: number;
    let height: number;

    const colorPalette = [
      { fill: '#0ea5e9', stroke: '#ffffff', glow: 'rgba(14, 165, 233, 0.6)' },
      { fill: '#f59e0b', stroke: '#ffffff', glow: 'rgba(245, 158, 11, 0.6)' },
      { fill: '#10b981', stroke: '#ffffff', glow: 'rgba(16, 185, 129, 0.6)' },
      { fill: '#ef4444', stroke: '#ffffff', glow: 'rgba(239, 68, 68, 0.6)' },
      { fill: '#8b5cf6', stroke: '#ffffff', glow: 'rgba(139, 92, 246, 0.6)' },
      { fill: '#ec4899', stroke: '#ffffff', glow: 'rgba(236, 72, 153, 0.6)' },
    ];

    const icons = ['cart', 'receipt', 'card', 'box', 'scan', 'printer', 'logo'];

    class PhysObject {
      x: number; y: number; vx: number; vy: number; 
      size: number; rotation: number; vr: number;
      type: string; palette: typeof colorPalette[0]; 
      opacity: number; depth: number;
      mass: number;

      constructor(isLogo = false) {
        const isMobile = window.innerWidth < 768;
        this.depth = Math.random();
        // Dynamic sizing for mobile vs desktop
        this.size = isLogo ? (isMobile ? 100 : 160) : (isMobile ? 45 : 70) + this.depth * (isMobile ? 20 : 40);
        this.x = Math.random() * (width - this.size);
        this.y = -200 - Math.random() * 800;
        this.vx = (Math.random() - 0.5) * (isMobile ? 8 : 12);
        this.vy = Math.random() * (isMobile ? 4 : 6);
        this.rotation = Math.random() * Math.PI * 2;
        this.vr = (Math.random() - 0.5) * 0.2;
        this.type = isLogo ? 'logo' : icons[Math.floor(Math.random() * (icons.length - 1))];
        this.palette = colorPalette[Math.floor(Math.random() * colorPalette.length)];
        this.opacity = 0.85 + this.depth * 0.15;
        this.mass = this.size / 8;
      }

      update() {
        this.vx += gravityRef.current.x;
        this.vy += gravityRef.current.y;
        this.vx *= 0.99;
        this.vy *= 0.99;

        if (mouseRef.current.isDown) {
          const dx = (this.x + this.size / 2) - mouseRef.current.x;
          const dy = (this.y + this.size / 2) - mouseRef.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const isMobile = window.innerWidth < 768;
          const activeRadius = isMobile ? 150 : 250;
          
          if (dist < activeRadius) {
            const force = (activeRadius - dist) / 5;
            this.vx += (dx / dist) * force;
            this.vy += (dy / dist) * force;
            this.vr += (dx / dist) * 0.2;
          }
        }

        this.x += this.vx;
        this.y += this.vy;
        this.rotation += this.vr;

        const bounce = 0.75;
        if (this.y + this.size > height) {
          this.y = height - this.size;
          this.vy *= -bounce;
          this.vx *= 0.96; 
          this.vr *= 0.92;
        } else if (this.y < 0) {
          this.y = 0;
          this.vy *= -bounce;
        }

        if (this.x + this.size > width) {
          this.x = width - this.size;
          this.vx *= -bounce;
        } else if (this.x < 0) {
          this.x = 0;
          this.vx *= -bounce;
        }
      }

      draw(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.translate(this.x + this.size / 2, this.y + this.size / 2);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = this.opacity;
        ctx.shadowBlur = window.innerWidth < 768 ? 15 : 30;
        ctx.shadowColor = this.palette.glow;
        ctx.fillStyle = this.palette.fill;
        ctx.strokeStyle = this.palette.stroke;
        ctx.lineWidth = window.innerWidth < 768 ? 2 : 4;

        const r = this.size / 3.5; 
        const s = this.size;
        ctx.beginPath();
        ctx.roundRect(-s/2, -s/2, s, s, r);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.fillStyle = '#ffffff';
        ctx.lineWidth = window.innerWidth < 768 ? 3 : 5;
        ctx.shadowBlur = 0; 

        const is = s * 0.55; 
        if (this.type === 'logo') {
          const gs = is * 0.42;
          const gap = is * 0.12;
          ctx.fillRect(-gs-gap/2, -gs-gap/2, gs, gs);
          ctx.fillRect(gap/2, -gs-gap/2, gs, gs);
          ctx.fillRect(-gs-gap/2, gap/2, gs, gs);
          ctx.fillRect(gap/2, gap/2, gs, gs);
        } else {
          ctx.beginPath();
          ctx.moveTo(0, -is/2); ctx.lineTo(-is/3, 0); ctx.lineTo(is/8, 0); 
          ctx.lineTo(0, is/2); ctx.lineTo(is/3, 0); ctx.lineTo(-is/8, 0); ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }
    }

    let objects: PhysObject[] = [];

    const handleTilt = (e: DeviceOrientationEvent) => {
      if (e.beta !== null && e.gamma !== null) {
        const gx = (e.gamma / 45) * 0.6;
        const gy = (e.beta / 45) * 0.6;
        gravityRef.current = { 
          x: Math.max(-1.0, Math.min(1.0, gx)), 
          y: Math.max(-1.0, Math.min(1.0, gy)) 
        };
      }
    };

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      mouseRef.current.isDown = true;
      const rect = canvas.getBoundingClientRect();
      const pos = 'touches' in e ? e.touches[0] : (e as MouseEvent);
      mouseRef.current.x = pos.clientX - rect.left;
      mouseRef.current.y = pos.clientY - rect.top;
    };

    const handlePointerUp = () => { mouseRef.current.isDown = false; };

    const resize = () => {
      width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.parentElement?.clientHeight || window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      const isMobile = window.innerWidth < 768;
      objects = [
        new PhysObject(true),
        new PhysObject(true),
        ...Array.from({ length: isMobile ? 8 : 14 }, () => new PhysObject(false)) 
      ];
    };

    const loop = () => {
      ctx.clearRect(0, 0, width, height);
      objects.forEach(obj => { obj.update(); obj.draw(ctx); });
      animationFrameId = requestAnimationFrame(loop);
    };

    window.addEventListener('resize', resize);
    window.addEventListener('deviceorientation', handleTilt);
    canvas.addEventListener('mousedown', handlePointerDown);
    canvas.addEventListener('touchstart', handlePointerDown);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchend', handlePointerUp);

    resize(); loop();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('deviceorientation', handleTilt);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchend', handlePointerUp);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 z-0 cursor-crosshair touch-none" />;
};

// Fix: Now uses the defined LoginProps interface
export const Login: React.FC<LoginProps> = ({ 
  onLogin, users, t = (k) => k, isDarkMode, toggleTheme, language, toggleLanguage, activeVendorId
}) => {
  // Fix: Now uses the defined LoginMethod type
  const [method, setMethod] = useState<LoginMethod>('VISITOR_CODE');
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
      
      const supremeAdmin = 'nabeelkhan1007@gmail.com';
      const isMaster = userEmail === supremeAdmin || userEmail === 'zahratalsawsen1@gmail.com';
      
      onLogin({
        id: result.user.uid,
        name: result.user.displayName || 'System Master',
        username: result.user.email?.split('@')[0] || 'master',
        role: isMaster ? 'ADMIN' : 'CUSTOMER',
        email: result.user.email || undefined,
        avatar: result.user.photoURL || undefined
      });
    } catch (err) { setError('Identity Verification Failed'); } 
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

      if (!targetVendor) {
        setError('Invalid Vendor Code. Access Denied.');
        setLoading(false);
        return;
      }

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
    <div className="min-h-screen bg-[#020617] dark:bg-black flex flex-col md:items-center md:justify-center p-0 transition-colors font-sans overflow-hidden">
      <div className="fixed top-4 right-4 md:top-10 md:right-10 flex gap-2 z-[100]">
         <button onClick={toggleTheme} className="p-3 bg-white/5 backdrop-blur-2xl rounded-2xl text-white hover:bg-white/15 transition-all border border-white/10 shadow-2xl">
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
         </button>
         <button onClick={toggleLanguage} className="px-4 py-2.5 bg-white/5 backdrop-blur-2xl rounded-2xl text-white hover:bg-white/15 transition-all font-black text-[9px] uppercase tracking-widest border border-white/10 shadow-2xl">
            {language === 'en' ? 'Arabic' : 'English'}
         </button>
      </div>

      <div className="bg-white dark:bg-slate-900 md:rounded-[4rem] shadow-[0_0_100px_rgba(0,0,0,0.4)] overflow-hidden w-full max-w-7xl flex flex-col md:flex-row animate-fade-in md:h-[min(900px,94vh)] relative border border-white/5">
        
        <div className="bg-slate-950 p-8 md:p-24 md:w-[48%] flex flex-col justify-center text-white relative overflow-hidden shrink-0 border-b md:border-b-0 md:border-r border-white/5 h-[40vh] md:h-auto">
          <GravityTerminal />
          <div className="relative z-10 space-y-4 md:space-y-12 pointer-events-none select-none">
            <div className="flex items-center gap-4 md:gap-6">
              <div className="bg-[#0ea5e9] p-4 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] text-white shadow-[0_0_60px_rgba(14,165,233,0.7)] rotate-6 md:rotate-12">
                <LayoutDashboard size={window.innerWidth < 768 ? 32 : 64} strokeWidth={3} />
              </div>
              <div>
                <span className="text-2xl md:text-5xl font-black tracking-tighter italic uppercase block leading-none">easyPOS</span>
                <span className="text-[8px] md:text-[10px] font-black tracking-[0.3em] text-brand-400 mt-1 block opacity-80">MULTI-VENDOR TERMINAL</span>
              </div>
            </div>
            
            <div className="space-y-2 md:space-y-10">
                <h1 className="text-4xl md:text-8xl font-black leading-[0.85] tracking-tighter italic uppercase text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-500">
                  SMART<br/>RETAIL
                </h1>
                <p className="text-slate-400 font-bold text-[10px] md:text-sm uppercase tracking-widest leading-relaxed max-w-xs md:max-w-sm">
                  Professional physical inventory logic.
                </p>
            </div>
          </div>
        </div>

        <div className="flex-1 p-6 md:p-24 flex flex-col justify-center bg-white dark:bg-slate-900 relative md:rounded-none z-20 overflow-y-auto custom-scrollbar">
          <div className="max-w-md mx-auto w-full space-y-6 md:space-y-12">
              <div className="text-center md:text-left">
                <h2 className="text-3xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter italic uppercase">ACCESS HUB</h2>
                <p className="text-slate-400 font-bold text-[8px] md:text-[10px] uppercase tracking-[0.3em]">SECURE IDENTITY PROTOCOL</p>
              </div>

              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-[1.5rem] md:rounded-[2.5rem] shadow-inner backdrop-blur-md">
                <button onClick={() => {setMethod('VISITOR_CODE'); setError('');}} className={`flex-1 py-3 md:py-4.5 rounded-[1.2rem] md:rounded-[2rem] text-[8px] md:text-[9px] font-black uppercase tracking-widest transition-all ${method === 'VISITOR_CODE' ? 'bg-[#0ea5e9] text-white shadow-lg' : 'text-slate-400'}`}>VISITOR</button>
                <button onClick={() => {setMethod('CUSTOMER_GOOGLE'); setError('');}} className={`flex-1 py-3 md:py-4.5 rounded-[1.2rem] md:rounded-[2rem] text-[8px] md:text-[9px] font-black uppercase tracking-widest transition-all ${method === 'CUSTOMER_GOOGLE' ? 'bg-white dark:bg-slate-700 text-[#0ea5e9] shadow-lg' : 'text-slate-400'}`}>GOOGLE</button>
                <button onClick={() => {setMethod('CREDENTIALS'); setError('');}} className={`flex-1 py-3 md:py-4.5 rounded-[1.2rem] md:rounded-[2rem] text-[8px] md:text-[9px] font-black uppercase tracking-widest transition-all ${method === 'CREDENTIALS' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}>STAFF</button>
              </div>

              {error && <div className="p-4 bg-red-50 text-red-600 text-[9px] font-black uppercase tracking-widest rounded-2xl border-2 border-red-100 animate-shake">{error}</div>}

              {method === 'VISITOR_CODE' ? (
                <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8 animate-fade-in-up">
                    <div className="relative">
                        <input type="text" value={vendorCodeInput} onChange={e => setVendorCodeInput(e.target.value)} className="w-full p-5 md:p-7 bg-slate-100/50 dark:bg-slate-800 border-2 border-transparent focus:border-brand-500 rounded-[1.5rem] md:rounded-[2.5rem] outline-none font-bold text-lg md:text-xl pl-14 md:pl-18" placeholder="VENDOR ID" required />
                        <LayoutDashboard className="absolute left-6 md:left-8 top-1/2 -translate-y-1/2 text-slate-300" size={window.innerWidth < 768 ? 20 : 24} />
                    </div>
                    <div className="relative">
                        <input type="password" value={visitorCode} onChange={e => setVisitorCode(e.target.value)} className="w-full p-5 md:p-7 bg-slate-100/50 dark:bg-slate-800 border-2 border-transparent focus:border-brand-500 rounded-[1.5rem] md:rounded-[2.5rem] outline-none font-black text-2xl md:text-4xl tracking-[0.5em] pl-14 md:pl-18" placeholder="••••" required />
                        <Key className="absolute left-6 md:left-8 top-1/2 -translate-y-1/2 text-slate-300" size={window.innerWidth < 768 ? 24 : 30} />
                    </div>
                    <button type="submit" disabled={loading} className="w-full py-6 md:py-8 bg-brand-600 text-white rounded-[1.5rem] md:rounded-[2.5rem] font-black uppercase tracking-[0.2em] text-[10px] md:text-xs shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-3">
                      {loading ? <Loader2 className="animate-spin" size={24} /> : 'INITIALIZE LINK'}
                    </button>
                </form>
              ) : method === 'CUSTOMER_GOOGLE' ? (
                <div className="space-y-8 text-center py-6">
                    <div className="py-12 md:py-20 px-6 bg-slate-50 dark:bg-slate-800/30 rounded-[3rem] md:rounded-[4.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                        <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" className="w-20 h-20 md:w-28 md:h-28 mx-auto mb-6 md:mb-10 shadow-2xl rounded-full p-3 bg-white" alt="Google" />
                        <h4 className="text-xl md:text-3xl font-black dark:text-white uppercase italic tracking-tight">CLOUD AUTH</h4>
                    </div>
                    <button onClick={handleGoogleLogin} className="w-full py-6 md:py-8 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[1.5rem] md:rounded-[2.5rem] font-black uppercase text-[10px] md:text-xs tracking-widest shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95">
                        <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" className="w-6 h-6" alt="" />
                        SIGN IN WITH GOOGLE
                    </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8 animate-fade-in">
                  <div className="relative">
                    <UserIcon className="absolute left-6 md:left-8 top-1/2 -translate-y-1/2 text-slate-300" size={window.innerWidth < 768 ? 22 : 28} />
                    <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full pl-16 md:pl-20 pr-8 py-5 md:py-7 bg-slate-100/50 dark:bg-slate-800 border-2 border-transparent focus:border-brand-500 rounded-[1.5rem] md:rounded-[2.5rem] outline-none font-bold text-lg md:text-xl" placeholder="operator_ID" required />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-6 md:left-8 top-1/2 -translate-y-1/2 text-slate-300" size={window.innerWidth < 768 ? 22 : 28} />
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-16 md:pl-20 pr-8 py-5 md:py-7 bg-slate-100/50 dark:bg-slate-800 border-2 border-transparent focus:border-brand-500 rounded-[1.5rem] md:rounded-[2.5rem] outline-none font-bold text-lg md:text-xl" placeholder="••••••••" required />
                  </div>
                  <button type="submit" disabled={loading} className="w-full py-6 md:py-8 bg-slate-900 text-white rounded-[1.5rem] md:rounded-[2.5rem] font-black uppercase tracking-[0.2em] text-[10px] md:text-xs shadow-2xl active:scale-[0.98] transition-all">
                    {loading ? <Loader2 className="animate-spin" size={24} /> : 'TERMINAL SYNC'}
                  </button>
                </form>
              )}
          </div>
        </div>
      </div>
    </div>
  );
};
