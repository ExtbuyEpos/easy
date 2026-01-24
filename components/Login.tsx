import React, { useState } from 'react';
import { User } from '../types';
import { ShoppingBag, Lock, User as UserIcon, AlertCircle } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
  users: User[];
}

export const Login: React.FC<LoginProps> = ({ onLogin, users }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    
    if (user && user.password === password) {
       onLogin(user);
    } else {
      setError('Invalid username or password.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-4xl flex flex-col md:flex-row animate-fade-in">
        {/* Brand Side */}
        <div className="bg-brand-600 p-12 md:w-1/2 flex flex-col justify-between text-white relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-6">
              <div className="bg-white p-2 rounded-lg text-brand-600">
                <ShoppingBag size={24} />
              </div>
              <span className="text-2xl font-bold tracking-tight">easyPOS</span>
            </div>
            <h1 className="text-4xl font-bold mb-4">Manage your store with confidence.</h1>
            <p className="text-brand-100 leading-relaxed">
              The all-in-one offline capable solution for inventory, sales, and AI-powered business intelligence.
            </p>
          </div>
          <div className="mt-8 text-sm text-brand-200 relative z-10">
            &copy; 2024 easyPOS Systems. v1.1.0
          </div>
          {/* Decorative Circle */}
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-brand-500 rounded-full opacity-50 blur-3xl"></div>
        </div>

        {/* Form Side */}
        <div className="p-12 md:w-1/2 flex flex-col justify-center">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Sign In</h2>
          <p className="text-slate-500 mb-8">Access your terminal</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-600">Username</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                  placeholder="Enter username"
                  autoFocus
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-600">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                  placeholder="Enter password"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-slate-900 text-white font-bold py-3 rounded-lg hover:bg-slate-800 transition-colors shadow-lg active:transform active:scale-[0.98]"
            >
              Access Terminal
            </button>
          </form>
          
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
             <p className="text-xs text-slate-400">Default Admin: username: <b>admin</b> | password: <b>123</b></p>
          </div>
        </div>
      </div>
    </div>
  );
};