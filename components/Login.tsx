
import React, { useState, useEffect, useRef } from 'react';
import { User, Language, StoreSettings } from '../types';
import { Lock, User as UserIcon, AlertCircle, ChevronRight, Moon, Sun, LayoutDashboard, Loader2, Key, Store, ShoppingCart, Receipt, CreditCard, Package, ScanLine, Printer, Zap } from 'lucide-react';
import { auth } from '../firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

// --- ENHANCED INTERACTIVE COLORFUL GRAVITY ENGINE ---
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

    // Vibrant POS Brand Colors
    const colorPalette = [
      { fill: '#0ea5e9', stroke: '#ffffff', glow: 'rgba(14, 165, 233, 0.6)' }, // Sky Blue
      { fill: '#f59e0b', stroke: '#ffffff', glow: 'rgba(245, 158, 11, 0.6)' }, // Amber
      { fill: '#10b981', stroke: '#ffffff', glow: 'rgba(16, 185, 129, 0.6)' }, // Emerald
      { fill: '#ef4444', stroke: '#ffffff', glow: 'rgba(239, 68, 68, 0.6)' },  // Red
      { fill: '#8b5cf6', stroke: '#ffffff', glow: 'rgba(139, 92, 246, 0.6)' }, // Violet
      { fill: '#ec4899', stroke: '#ffffff', glow: 'rgba(236, 72, 153, 0.6)' }, // Pink
    ];

    const icons = ['cart', 'receipt', 'card', 'box', 'scan', 'printer', 'logo'];

    class PhysObject {
      x: number; y: number; vx: number; vy: number; 
      size: number; rotation: number; vr: number;
      type: string; palette: typeof colorPalette[0]; 
      opacity: number; depth: number;
      mass: number;

      constructor(isLogo = false) {
        this.depth = Math.random();
        // INCREASED SIZES: Logo is much bigger, tools are larger
        this.size = isLogo ? 140 : 60 + this.depth * 50;
        this.x = Math.random() * (width - this.size);
        this.y = -200 - Math.random() * 800; // Start higher for better fall sequence
        this.vx = (Math.random() - 0.5) * 12;
        this.vy = Math.random() * 6;
        this.rotation = Math.random() * Math.PI * 2;
        this.vr = (Math.random() - 0.5) * 0.2;
        this.type = isLogo ? 'logo' : icons[Math.floor(Math.random() * (icons.length - 1))];
        this.palette = colorPalette[Math.floor(Math.random() * colorPalette.length)];
        this.opacity = 0.85 + this.depth * 0.15;
        this.mass = this.size / 8;
      }

      update() {
        // Apply Gravity Vector (Modified by Tilt)
        this.vx += gravityRef.current.x;
        this.vy += gravityRef.current.y;

        // Air Resistance (Slightly less for "easy" fast motion)
        this.vx *= 0.99;
        this.vy *= 0.99;

        // Interaction: High-Intensity Explosive Force on Click/Touch
        if (mouseRef.current.isDown) {
          const dx = (this.x + this.size / 2) - mouseRef.current.x;
          const dy = (this.y + this.size / 2) - mouseRef.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const activeRadius = 250; // Larger interaction radius
          
          if (dist < activeRadius) {
            const force = (activeRadius - dist) / 6; // Stronger repulsive force
            this.vx += (dx / dist) * force;
            this.vy += (dy / dist) * force;
            this.vr += (dx / dist) * 0.2; // Extra spin on impact
          }
        }

        this.x += this.vx;
        this.y += this.vy;
        this.rotation += this.vr;

        const bounce = 0.75; // More elastic bounce

        // Boundary Logic with padding for larger objects
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
        
        // Dynamic Glow
        ctx.shadowBlur = 30;
        ctx.shadowColor = this.palette.glow;
        
        // Main Body (Rounded Box)
        ctx.fillStyle = this.palette.fill;
        ctx.strokeStyle = this.palette.stroke;
        ctx.lineWidth = 4;

        const r = this.size / 3.5; 
        const s = this.size;
        
        ctx.beginPath();
        ctx.roundRect(-s/2, -s/2, s, s, r);
        ctx.fill();
        ctx.stroke();

        // High-Contrast White Icons
        ctx.strokeStyle = '#ffffff';
        ctx.fillStyle = '#ffffff';
        ctx.lineWidth = 5;
        ctx.shadowBlur = 0; 

        const is = s * 0.55; 

        if (this.type === 'cart') {
          ctx.strokeRect(-is/2, -is/4, is, is/2);
          ctx.beginPath(); ctx.arc(-is/4, is/3, is/8, 0, Math.PI*2); ctx.stroke();
          ctx.beginPath(); ctx.arc(is/4, is/3, is/8, 0, Math.PI*2); ctx.stroke();
        } else if (this.type === 'logo') {
          // Large Grid-style Logo
          const gs = is * 0.42;
          const gap = is * 0.12;
          ctx.fillRect(-gs-gap/2, -gs-gap/2, gs, gs);
          ctx.fillRect(gap/2, -gs-gap/2, gs, gs);
          ctx.fillRect(-gs-gap/2, gap/2, gs, gs);
          ctx.fillRect(gap/2, gap/2, gs, gs);
        } else if (this.type === 'card') {
          ctx.strokeRect(-is/2, -is/3, is, is/1.5);
          ctx.fillRect(-is/2.5, -is/6, is/4, is/6);
        } else if (this.type === 'receipt') {
          ctx.beginPath();
          ctx.moveTo(-is/3, -is/2); ctx.lineTo(is/3, -is/2); ctx.lineTo(is/3, is/2); 
          ctx.lineTo(is/6, is/3); ctx.lineTo(0, is/2); ctx.lineTo(-is/6, is/3); 
          ctx.lineTo(-is/3, is/2); ctx.closePath();
          ctx.stroke();
        } else if (this.type === 'box') {
          ctx.strokeRect(-is/2, -is/2, is, is);
          ctx.beginPath(); ctx.moveTo(-is/2, 0); ctx.lineTo(is/2, 0); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(0, -is/2); ctx.lineTo(0, is/2); ctx.stroke();
        } else {
          // Zap Icon
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
      const pos = 'touches' in e ? e.touches[0] : e;
      mouseRef.current.x = pos.clientX - rect.left;
      mouseRef.current.y = pos.clientY - rect.top;
    };

    const handlePointerUp = () => { mouseRef.current.isDown = false; };

    const resize = () => {
      width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.parentElement?.clientHeight || window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      
      // Re-populate with larger density
      objects = [
        new PhysObject(true), // Mega Logo 1
        new PhysObject(true), // Mega Logo 2
        ...Array.from({ length: 14 }, () => new PhysObject(false)) 
      ];
    };

    const loop = () => {
      ctx.clearRect(0, 0, width, height);
      objects.forEach(obj => {
        obj.update();
        obj.draw(ctx);
      });
      animationFrameId = requestAnimationFrame(loop);
    };

    window.addEventListener('resize', resize);
    window.addEventListener('deviceorientation', handleTilt);
    canvas.addEventListener('mousedown', handlePointerDown);
    canvas.addEventListener('touchstart', handlePointerDown);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchend', handlePointerUp);

    resize();
    loop();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('deviceorientation', handleTilt);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchend', handlePointerUp);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 z-0 cursor-crosshair touch-none" 
      title="Click to push objects! Tilt device to move gravity!"
    />
  );
};

interface LoginProps {
  onLogin: (user: User) => void;
  users: User[];
  t?: (key: string) => string;
  isDarkMode?: boolean;
  toggleTheme?: () => void;
  language?: Language;
  toggleLanguage?: () => void;
  storeSettings?: StoreSettings;
  activeVendorId?: string | null;
}

type LoginMethod = 'VISITOR_CODE' | 'CUSTOMER_GOOGLE' | 'CREDENTIALS';

export const Login: React.FC<LoginProps> = ({ 
  onLogin, users, t = (k) => k, isDarkMode, toggleTheme, language, toggleLanguage, activeVendorId
}) => {
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
      const fbUser = result.user;
      const userEmail = fbUser.email?.toLowerCase() || '';
      
      const supremeAdmin = 'nabeelkhan1007@gmail.com';
      const isMaster = userEmail === supremeAdmin || userEmail === 'zahratalsawsen1@gmail.com';
      
      onLogin({
        id: fbUser.uid,
        name: fbUser.displayName || 'System Master',
        username: fbUser.email?.split('@')[0] || 'master',
        role: isMaster ? 'ADMIN' : 'CUSTOMER',
        email: fbUser.email || undefined,
        avatar: fbUser.photoURL || undefined
      });
    } catch (err) {
      setError('Identity Verification Failed');
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
      <div className="fixed top-6 right-6 md:top-10 md:right-10 flex gap-3 z-[100]">
         <button onClick={toggleTheme} className="p-3.5 bg-white/5 backdrop-blur-2xl rounded-2xl text-white hover:bg-white/15 transition-all border border-white/10 shadow-2xl">
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
         </button>
         <button onClick={toggleLanguage} className="px-6 py-3.5 bg-white/5 backdrop-blur-2xl rounded-2xl text-white hover:bg-white/15 transition-all font-black text-[10px] uppercase tracking-widest border border-white/10 shadow-2xl">
            {language === 'en' ? 'Arabic' : 'English'}
         </button>
      </div>

      <div className="bg-white dark:bg-slate-900 md:rounded-[5rem] shadow-[0_0_100px_rgba(0,0,0,0.4)] overflow-hidden w-full max-w-7xl flex flex-col md:flex-row animate-fade-in md:h-[min(900px,96vh)] relative border border-white/5">
        
        {/* Brand Hero Panel (With Mega Gravity Assets) */}
        <div className="bg-slate-950 p-12 md:p-24 md:w-[48%] flex flex-col justify-center text-white relative overflow-hidden shrink-0 border-r border-white/5">
          <GravityTerminal />
          
          {/* Brand Identity - Auto Adjusts for all views */}
          <div className="relative z-10 space-y-12 md:space-y-20 pointer-events-none select-none">
            <div className="flex items-center gap-6 group">
              <div className="bg-[#0ea5e9] p-6 md:p-8 rounded-[2.5rem] text-white shadow-[0_0_60px_rgba(14,165,233,0.7)] rotate-12 transform group-hover:rotate-0 transition-all duration-1000">
                <LayoutDashboard size={64} strokeWidth={3} />
              </div>
              <div>
                <span className="text-4xl md:text-5xl font-black tracking-tighter italic uppercase drop-shadow-2xl block leading-none">easyPOS</span>
                <span className="text-[10px] font-black tracking-[0.4em] text-brand-400 mt-2 block opacity-80">MULTI-VENDOR TERMINAL</span>
              </div>
            </div>
            
            <div className="space-y-6 md:space-y-10">
                <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black leading-[0.85] tracking-tighter italic uppercase text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-slate-600">
                  SMART<br/>RETAIL<br/>NODE
                </h1>
                <div className="h-1.5 w-32 bg-brand-500 rounded-full shadow-[0_0_20px_#0ea5e9]"></div>
                <p className="text-slate-400 font-bold text-xs md:text-sm uppercase tracking-widest leading-loose max-w-sm">
                  Decentralized physical inventory management for modern business logistics.
                </p>
            </div>
          </div>
          
          {/* Environmental Glows */}
          <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-brand-600/10 rounded-full blur-[140px]"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-brand-400/10 rounded-full blur-[120px]"></div>
        </div>

        {/* Authentication Panel */}
        <div className="p-10 md:p-24 md:w-[52%] flex flex-col justify-center bg-white dark:bg-slate-900 relative rounded-t-[5rem] md:rounded-none -mt-20 md:mt-0 z-20 transition-all overflow-y-auto custom-scrollbar shadow-[-50px_0_100px_rgba(0,0,0,0.1)]">
          <div className="max-w-md mx-auto w-full space-y-12 py-10 md:py-0">
              <div className="text-center md:text-left">
                <h2 className="text-5xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter italic uppercase mb-2">ACCESS HUB</h2>
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.35em]">SECURE IDENTITY VERIFICATION PROTOCOL</p>
              </div>

              {/* Navigation Pill */}
              <div className="flex bg-slate-100/80 dark:bg-slate-800/80 p-1.5 rounded-[2.5rem] border border-slate-200/50 dark:border-slate-800 shadow-inner backdrop-blur-md">
                <button onClick={() => {setMethod('VISITOR_CODE'); setError('');}} className={`flex-1 py-4.5 rounded-[2rem] text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2.5 ${method === 'VISITOR_CODE' ? 'bg-[#0ea5e9] text-white shadow-2xl' : 'text-slate-400 hover:text-slate-600'}`}>
                  <Store size={15} /> VISITOR
                </button>
                <button onClick={() => {setMethod('CUSTOMER_GOOGLE'); setError('');}} className={`flex-1 py-4.5 rounded-[2rem] text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2.5 ${method === 'CUSTOMER_GOOGLE' ? 'bg-white dark:bg-slate-700 text-slate-600 dark:text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
                   GOOGLE
                </button>
                <button onClick={() => {setMethod('CREDENTIALS'); setError('');}} className={`flex-1 py-4.5 rounded-[2rem] text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2.5 ${method === 'CREDENTIALS' ? 'bg-slate-900 text-white shadow-2xl' : 'text-slate-400 hover:text-slate-600'}`}>
                  <UserIcon size={15} /> STAFF
                </button>
              </div>

              {error && (
                <div className="p-6 bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest rounded-[2rem] flex items-center gap-4 border-2 border-red-100 animate-shake shadow-lg">
                  <AlertCircle size={22} /> {error}
                </div>
              )}

              {method === 'VISITOR_CODE' ? (
                <form onSubmit={handleSubmit} className="space-y-10 animate-fade-in-up">
                    <div className="p-12 bg-slate-50/50 dark:bg-slate-800/30 rounded-[4rem] border-2 border-slate-100/50 dark:border-slate-800 flex flex-col items-center text-center gap-8 shadow-inner">
                        <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center shadow-2xl text-brand-500 border border-slate-100/50">
                           <Store size={54} />
                        </div>
                        <div className="space-y-2">
                           <h4 className="font-black text-slate-900 dark:text-white uppercase italic text-3xl tracking-tight">STOREFRONT</h4>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">INPUT SHOP ACCESS IDENTIFIER</p>
                        </div>
                    </div>
                    
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-8">VENDOR ID</label>
                            <div className="relative group">
                                <input type="text" value={vendorCodeInput} onChange={e => setVendorCodeInput(e.target.value)} className="w-full p-7 bg-slate-100/50 dark:bg-slate-800 border-2 border-transparent focus:border-brand-500 rounded-[2.5rem] outline-none transition-all dark:text-white font-bold text-xl pl-18 shadow-inner" placeholder="VND-XXXXXX" required />
                                <LayoutDashboard className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-500" size={24} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-8">PASSCODE</label>
                            <div className="relative group">
                                <input type="password" value={visitorCode} onChange={e => setVisitorCode(e.target.value)} className="w-full p-7 bg-slate-100/50 dark:bg-slate-800 border-2 border-transparent focus:border-brand-500 rounded-[2.5rem] outline-none transition-all dark:text-white font-black text-4xl tracking-[0.5em] pl-18 shadow-inner" placeholder="••••" required />
                                <Key className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-500" size={30} />
                            </div>
                        </div>
                    </div>

                    <button type="submit" disabled={loading || !visitorCode || !vendorCodeInput} className="w-full py-8 bg-gradient-to-r from-brand-400 to-brand-600 text-white rounded-[2.5rem] font-black uppercase tracking-[0.25em] text-xs shadow-2xl active:scale-[0.98] flex items-center justify-center gap-5 italic group transition-all">
                      {loading ? <Loader2 className="animate-spin" size={28} /> : <><ChevronRight size={32} strokeWidth={3} className="group-hover:translate-x-1.5 transition-transform" /><span>INITIALIZE LINK</span></>}
                    </button>
                </form>
              ) : method === 'CUSTOMER_GOOGLE' ? (
                <div className="space-y-12 animate-fade-in text-center py-10">
                    <div className="py-20 px-10 bg-slate-50 dark:bg-slate-800/30 rounded-[4.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800 relative group overflow-hidden">
                        <div className="absolute inset-0 bg-brand-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" className="w-28 h-28 mx-auto mb-10 shadow-2xl rounded-full p-3 bg-white" alt="Google" />
                        <h4 className="text-3xl font-black dark:text-white uppercase italic tracking-tight">CLOUD AUTH</h4>
                        <p className="text-xs text-slate-400 font-medium mt-4 leading-relaxed max-w-[260px] mx-auto uppercase tracking-widest">Federated identity node verification.</p>
                    </div>
                    <button onClick={handleGoogleLogin} className="w-full py-8 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[2.5rem] font-black uppercase text-xs tracking-widest shadow-2xl flex items-center justify-center gap-6 hover:bg-slate-50 transition-all active:scale-95">
                        <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" className="w-7 h-7" alt="" />
                        SIGN IN WITH GOOGLE
                    </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-10 animate-fade-in py-6">
                  <div className="space-y-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-8">NODE OPERATOR</label>
                      <div className="relative group">
                        <UserIcon className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-500" size={28} />
                        <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full pl-20 pr-8 py-7 bg-slate-100/50 dark:bg-slate-800 border-2 border-transparent focus:border-brand-500 rounded-[2.5rem] outline-none font-bold dark:text-white text-xl shadow-inner" placeholder="operator_ID" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-8">SECURITY HASH</label>
                      <div className="relative group">
                        <Lock className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-500" size={28} />
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-20 pr-8 py-7 bg-slate-100/50 dark:bg-slate-800 border-2 border-transparent focus:border-brand-500 rounded-[2.5rem] outline-none font-bold dark:text-white text-xl shadow-inner" placeholder="••••••••" required />
                      </div>
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="w-full py-8 bg-slate-900 text-white rounded-[2.5rem] font-black uppercase tracking-[0.25em] text-xs shadow-2xl active:scale-[0.98] flex items-center justify-center gap-6 italic transition-all group">
                    {loading ? <Loader2 className="animate-spin" size={28} /> : <><ChevronRight size={32} strokeWidth={3} className="group-hover:translate-x-1.5 transition-transform" /><span>TERMINAL SYNC</span></>}
                  </button>
                </form>
              )}
          </div>
        </div>
      </div>
    </div>
  );
};
