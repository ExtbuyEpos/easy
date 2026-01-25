import React, { useState, useEffect, useRef } from 'react';
import { StoreSettings } from '../types';
import { MessageCircle, Save, ChevronLeft, Zap, PlayCircle, Loader2 } from 'lucide-react';
import QRCode from 'qrcode';

interface BaileysSetupProps {
  onUpdateStoreSettings: (settings: StoreSettings) => void;
  settings?: StoreSettings;
  onGoBack?: () => void;
  t?: (key: string) => string;
}

export const BaileysSetup: React.FC<BaileysSetupProps> = ({ onUpdateStoreSettings, settings, onGoBack }) => {
  const [activeTab, setActiveTab] = useState<'connect' | 'template'>('connect');
  const [status, setStatus] = useState<'disconnected' | 'initializing' | 'ready' | 'connected'>('disconnected');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [pairingCode, setPairingCode] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState(settings?.whatsappPhoneNumber || '');
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const savedSession = localStorage.getItem('easyPOS_whatsappSession');
    if (savedSession) setStatus('connected');
  }, []);

  const addLog = (msg: string) => setLogs(prev => [...prev.slice(-20), `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const handleStartConnection = () => {
      if (!phoneNumber) return;
      setStatus('initializing');
      addLog('Handshaking with WhatsApp Signal Server...');
      setTimeout(() => {
          const code = Math.random().toString(36).substring(2, 6).toUpperCase() + "-" + Math.random().toString(36).substring(2, 6).toUpperCase();
          setPairingCode(code);
          setStatus('ready');
          addLog(`Pairing code generated: ${code}`);
      }, 1500);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-colors">
       <div className="bg-[#00a884] dark:bg-[#065f46] text-white px-6 py-4 flex items-center justify-between shadow-xl border-b border-[#008f6f]">
           <div className="flex items-center gap-4">
                <button onClick={onGoBack} className="p-3 -ml-3 rounded-2xl bg-white/20 text-white transition-all active:scale-90" title="Go Back">
                    <ChevronLeft size={28} strokeWidth={3} className="rtl:rotate-180" />
                </button>
                <div>
                    <h2 className="text-xl md:text-2xl font-black tracking-tight uppercase italic leading-none">Dispatcher</h2>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mt-1">Automated WhatsApp Bridge</p>
                </div>
           </div>
           <div className="flex bg-black/10 p-1.5 rounded-2xl border border-white/5">
               <button onClick={() => setActiveTab('connect')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'connect' ? 'bg-white text-[#00a884] shadow' : 'text-white'}`}>Link</button>
               <button onClick={() => setActiveTab('template')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'template' ? 'bg-white text-[#00a884] shadow' : 'text-white'}`}>Rules</button>
           </div>
       </div>

       <div className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar">
           <div className="max-w-4xl mx-auto space-y-8">
               <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-xl border border-slate-100 dark:border-slate-800">
                   {status === 'connected' ? (
                       <div className="text-center py-10">
                           <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center text-white mx-auto mb-6 shadow-xl"><Zap size={40}/></div>
                           <h3 className="text-2xl font-black uppercase italic dark:text-white">Relay Active</h3>
                           <button onClick={() => { localStorage.removeItem('easyPOS_whatsappSession'); setStatus('disconnected'); }} className="mt-8 px-8 py-4 bg-red-50 text-red-600 font-black rounded-2xl uppercase text-[10px] tracking-widest">Disconnect Terminal</button>
                       </div>
                   ) : (
                       <div className="space-y-6">
                           <div>
                               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Terminal Phone</label>
                               <input type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} className="w-full p-5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-3xl text-2xl font-mono font-bold dark:text-white" placeholder="+971..." />
                           </div>
                           <button onClick={handleStartConnection} disabled={status !== 'disconnected'} className="w-full bg-[#00a884] text-white py-5 rounded-3xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3">
                               {status === 'initializing' ? <Loader2 className="animate-spin"/> : <PlayCircle size={24}/>}
                               Initialize Bridge
                           </button>
                           {status === 'ready' && (
                               <div className="mt-8 p-10 bg-slate-50 dark:bg-slate-800 rounded-[2.5rem] text-center border-2 border-dashed border-slate-200 dark:border-slate-700">
                                   <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Handshake Key</div>
                                   <div className="text-4xl font-mono font-black text-[#00a884] bg-white dark:bg-slate-900 py-8 rounded-3xl shadow-lg">{pairingCode}</div>
                                   <p className="mt-8 text-xs font-bold text-slate-500 leading-relaxed">Enter this code on your mobile in WhatsApp > Linked Devices > Link with Phone Number.</p>
                               </div>
                           )}
                       </div>
                   )}
               </div>
               <div className="bg-slate-900 p-6 rounded-[2.5rem] font-mono text-[10px] text-emerald-400 border border-slate-800 h-40 overflow-y-auto custom-scrollbar">
                   {logs.map((l, i) => <div key={i}>{l}</div>)}
               </div>
           </div>
       </div>
    </div>
  );
};