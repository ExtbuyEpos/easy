import React, { useState } from 'react';
import { User } from '../types';
import { ShoppingBag, Lock, User as UserIcon, AlertCircle, ChevronRight } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
  users: User[];
}

export const Login: React.FC<LoginProps> = ({ onLogin, users }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simulate network delay for professional feel
    await new Promise(resolve => setTimeout(resolve, 600));

    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    
    if (user && user.password === password) {
       onLogin(user);
    } else {
      setError('Invalid username or password.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 md:bg-slate-900 flex items-center justify-center md:p-4">
      <div className="bg-white md:rounded-2xl shadow-none md:shadow-2xl overflow-hidden w-full max-w-4xl flex flex-col md:flex-row animate-fade-in h-screen md:h-auto">
        
        {/* Brand Side - Optimized for Mobile */}
        <div className="bg-brand-600 p-8 md:p-12 md:w-1/2 flex flex-col justify-center md:justify-between text-white relative overflow-hidden shrink-0 min-h-[35vh] md:min-h-[600px]">
          
          <div className="relative z-10 flex flex-col items-center md:items-start text-center md:text-left">
            <div className="flex items-center gap-3 mb-4 md:mb-6 animate-fade-in-up">
              <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl text-white shadow-inner border border-white/20">
                <ShoppingBag size={28} />
              </div>
              <span className="text-3xl font-bold tracking-tight">easyPOS</span>
            </div>
            
            <h1 className="text-2xl md:text-4xl font-bold mb-3 leading-tight max-w-xs md:max-w-none mx-auto md:mx-0">
              Smart Retail Management
            </h1>
            <p className="text-brand-100 leading-relaxed text-sm md:text-base max-w-sm mx-auto md:mx-0 opacity-90">
              The professional offline-capable solution for your business growth.
            </p>
          </div>

          <div className="hidden md:block mt-8 text-xs text-brand-200 relative z-10">
            &copy; 2026 easyPOS Systems. v1.1.0
          </div>
          
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-900 opacity-20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>
        </div>

        {/* Form Side */}
        <div className="p-8 md:p-12 md:w-1/2 flex flex-col justify-center bg-white flex-1 relative rounded-t-[30px] md:rounded-none -mt-8 md:mt-0 z-20 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] md:shadow-none">
          <div className="max-w-sm mx-auto w-full">
              <div className="mb-8 text-center md:text-left">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Welcome Back</h2>
                <p className="text-slate-500 text-sm">Please sign in to access your terminal</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                    <div className="p-4 bg-red-50 text-red-600 text-sm rounded-xl flex items-start gap-3 border border-red-100 animate-shake">
                        <AlertCircle size={18} className="shrink-0 mt-0.5" /> 
                        <span>{error}</span>
                    </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Username</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <UserIcon className="text-slate-400 group-focus-within:text-brand-500 transition-colors" size={20} />
                    </div>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all text-slate-800 placeholder-slate-400 font-medium"
                      placeholder="e.g. admin"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Password</label>
                  <div className="relative group">
                     <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="text-slate-400 group-focus-within:text-brand-500 transition-colors" size={20} />
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all text-slate-800 placeholder-slate-400 font-medium"
                      placeholder="•••••••"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl active:scale-[0.98] mt-4 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Access Terminal <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform"/>
                    </>
                  )}
                </button>
              </form>
              
              <div className="mt-8 text-center">
                 <p className="text-xs text-slate-400 bg-slate-50 py-2 px-4 rounded-full inline-block border border-slate-100">
                    Default: <strong className="text-slate-600">admin</strong> / <strong className="text-slate-600">123</strong>
                 </p>
              </div>

               <div className="md:hidden mt-8 text-center text-[10px] text-slate-400 pb-4">
                &copy; 2026 easyPOS Systems. v1.1.0
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};