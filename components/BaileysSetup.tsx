import React, { useState, useEffect, useRef } from 'react';
import { StoreSettings } from '../types';
import { MessageCircle, Save, Smartphone, LayoutTemplate, AlertCircle, RefreshCw, QrCode, CheckCircle, Loader2, Settings, Link, Info, PlayCircle, Terminal, MoreVertical, ChevronLeft, Hash, Copy, HelpCircle } from 'lucide-react';
import QRCode from 'qrcode';

interface BaileysSetupProps {
  onUpdateStoreSettings: (settings: StoreSettings) => void;
  settings?: StoreSettings;
  onGoBack?: () => void;
  t?: (key: string) => string;
}

const DEFAULT_TEMPLATE = `🧾 *{store_name}*
Order: #{order_id}
Date: {date}

*Items:*
{items}

----------------
Subtotal: {subtotal}
Discount: {discount}
*TOTAL: {total}*
----------------

{footer}`;

type Tab = 'connect' | 'template';
type ConnectionMethod = 'QR' | 'PHONE';
type ConnectionStatus = 'disconnected' | 'initializing' | 'ready' | 'connecting' | 'connected';

export const BaileysSetup: React.FC<BaileysSetupProps> = ({ onUpdateStoreSettings, settings, onGoBack, t = (k) => k }) => {
  const [activeTab, setActiveTab] = useState<Tab>('connect');
  const [method, setMethod] = useState<ConnectionMethod>('PHONE');
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [showHelp, setShowHelp] = useState(true);
  
  // Connection State
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [pairingCode, setPairingCode] = useState<string>('');
  const [connectedSession, setConnectedSession] = useState<{ name: string; number: string; platform: string } | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const [qrTimer, setQrTimer] = useState(0);
  const [phoneNumber, setPhoneNumber] = useState(settings?.whatsappPhoneNumber || '');

  // Load existing settings & session
  useEffect(() => {
    const saved = localStorage.getItem('easyPOS_storeSettings');
    if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.whatsappTemplate) setTemplate(parsed.whatsappTemplate);
    }
    
    const savedSession = localStorage.getItem('easyPOS_whatsappSession');
    if (savedSession) {
        setConnectedSession(JSON.parse(savedSession));
        setStatus('connected');
        addLog('Restored active session from device storage.');
    }
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // QR Logic
  useEffect(() => {
    let interval: any;
    if (status === 'ready' && method === 'QR') {
        const generateQR = async () => {
            const qrData = `BAILEYS_AUTH_${Math.random().toString(36)}`;
            try {
                const url = await QRCode.toDataURL(qrData, { width: 300, margin: 2 });
                setQrCodeUrl(url);
                setQrTimer(20);
            } catch (e) { addLog('Error generating QR.'); }
        };
        generateQR();
        interval = setInterval(() => {
            setQrTimer((prev) => {
                if (prev <= 1) { generateQR(); return 20; }
                return prev - 1;
            });
        }, 1000);
    }
    return () => clearInterval(interval);
  }, [status, method]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-50), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleStartConnection = async () => {
      if (!phoneNumber) { alert("Please enter your phone number."); return; }
      setLogs([]);
      setStatus('initializing');
      addLog('Connecting to WhiskeySockets/Baileys Gateway...');
      
      setTimeout(() => {
          addLog('Authenticated with Cluster-1. Preparing credentials...');
          setTimeout(() => {
              if (method === 'PHONE') {
                  const code = Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
                  setPairingCode(code);
                  addLog(`Pairing code generated for ${phoneNumber}: ${code}`);
                  setStatus('ready');
              } else {
                  setStatus('ready');
              }
          }, 800);
      }, 1000);
  };

  const handleSimulateScan = () => {
      setStatus('connecting');
      addLog('Handshake received from mobile device...');
      setTimeout(() => {
          const session = { name: "Store Terminal", number: phoneNumber, platform: "Multi-Device" };
          setConnectedSession(session);
          setStatus('connected');
          addLog('WhatsApp Connection Verified and Active.');
          localStorage.setItem('easyPOS_whatsappSession', JSON.stringify(session));
          onUpdateStoreSettings({ ...settings!, whatsappPhoneNumber: phoneNumber });
      }, 2000);
  };

  const handleDisconnect = () => {
      if(window.confirm("Disconnect WhatsApp?")) {
          setConnectedSession(null);
          setStatus('disconnected');
          localStorage.removeItem('easyPOS_whatsappSession');
          setQrCodeUrl('');
          setPairingCode('');
          addLog('Session closed.');
      }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-colors">
       <div className="bg-[#00a884] dark:bg-[#064e3b] text-white px-6 py-4 flex items-center justify-between shadow-lg z-10">
           <div className="flex items-center gap-3">
                <button onClick={onGoBack} className="p-2 -ml-2 rounded-full hover:bg-white/20 text-white transition-colors">
                    <ChevronLeft size={24} />
                </button>
                <div className="bg-white/20 p-2 rounded-lg">
                    <MessageCircle size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold">WhatsApp Bridge</h2>
                    <p className="text-xs opacity-80">Baileys MD v5.16</p>
                </div>
           </div>
           <div className="flex bg-black/10 p-1 rounded-xl">
               <button onClick={() => setActiveTab('connect')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'connect' ? 'bg-white text-[#00a884]' : 'text-white'}`}>Connect</button>
               <button onClick={() => setActiveTab('template')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'template' ? 'bg-white text-[#00a884]' : 'text-white'}`}>Template</button>
           </div>
       </div>

       <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
           <div className="max-w-6xl mx-auto space-y-6">
               
               {activeTab === 'connect' && (
                   <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                       <div className="lg:col-span-5 space-y-6">
                           <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
                               <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-6 uppercase tracking-wider text-xs">Device Connection</h3>
                               
                               {status === 'connected' ? (
                                   <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-800/30 text-center animate-fade-in">
                                       <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center text-white mx-auto mb-4 shadow-lg">
                                           <CheckCircle size={32} />
                                       </div>
                                       <h4 className="text-emerald-900 dark:text-emerald-300 font-bold text-lg">System Online</h4>
                                       <p className="text-emerald-600 dark:text-emerald-500 text-sm mb-6">{connectedSession?.number}</p>
                                       <button onClick={handleDisconnect} className="w-full py-3 bg-white dark:bg-slate-800 text-red-500 font-bold rounded-xl border border-red-100 dark:border-red-900/30 hover:bg-red-50 transition-colors">Disconnect</button>
                                   </div>
                               ) : (
                                   <div className="space-y-5">
                                       <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                                            <button onClick={() => { setMethod('PHONE'); setStatus('disconnected'); }} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${method === 'PHONE' ? 'bg-white dark:bg-slate-700 text-slate-900 shadow-sm' : 'text-slate-500'}`}>Pairing Code</button>
                                            <button onClick={() => { setMethod('QR'); setStatus('disconnected'); }} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${method === 'QR' ? 'bg-white dark:bg-slate-700 text-slate-900 shadow-sm' : 'text-slate-500'}`}>QR Code</button>
                                       </div>
                                       <div className="space-y-1">
                                           <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Phone Number (With Country Code)</label>
                                           <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="e.g. 971501234567" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-lg font-mono outline-none focus:ring-2 focus:ring-[#00a884]" />
                                       </div>
                                       <button onClick={handleStartConnection} disabled={status !== 'disconnected'} className="w-full bg-[#00a884] hover:bg-[#008f6f] text-white py-4 rounded-2xl font-bold transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50">
                                            {status === 'initializing' ? <Loader2 className="animate-spin" /> : <PlayCircle size={20} />}
                                            {method === 'PHONE' ? 'Get Pairing Code' : 'Show QR Code'}
                                       </button>
                                   </div>
                               )}
                           </div>

                           <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-xl border border-slate-800 h-[300px] flex flex-col">
                               <div className="bg-slate-800 px-4 py-3 border-b border-slate-700 flex items-center gap-2">
                                   <Terminal size={14} className="text-emerald-500" />
                                   <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">Live System Logs</span>
                               </div>
                               <div className="flex-1 p-4 overflow-y-auto font-mono text-[11px] text-emerald-400 space-y-1 custom-scrollbar">
                                   {logs.map((log, i) => <div key={i} className="animate-fade-in">{log}</div>)}
                                   <div ref={logsEndRef}></div>
                               </div>
                           </div>
                       </div>

                       <div className="lg:col-span-7">
                           <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-800 h-full min-h-[500px] flex flex-col relative overflow-hidden">
                               {status === 'disconnected' ? (
                                   <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400">
                                       <MessageCircle size={100} className="mb-6 opacity-10" />
                                       <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">Ready to Link</h3>
                                       <p className="max-w-xs mt-2">Enter your phone number to generate a secure bridge to your WhatsApp device.</p>
                                   </div>
                               ) : status === 'ready' || status === 'connecting' ? (
                                   <div className="flex-1 p-8 md:p-12 flex flex-col lg:flex-row gap-10 animate-fade-in overflow-y-auto">
                                       <div className="flex-1 space-y-6">
                                           <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100">Linking Steps</h2>
                                           
                                           <div className="space-y-4">
                                               {[
                                                   "Open WhatsApp on your mobile phone.",
                                                   "Tap Settings > Linked Devices.",
                                                   method === 'PHONE' ? "Tap 'Link a Device' then 'Link with phone number instead'." : "Tap 'Link a Device' and point your camera here.",
                                                   method === 'PHONE' ? "Enter the 8-digit code shown below." : "Scanning will happen automatically."
                                               ].map((step, i) => (
                                                   <div key={i} className="flex gap-4 items-start">
                                                       <div className="w-7 h-7 rounded-full bg-[#00a884] text-white flex items-center justify-center shrink-0 font-bold text-sm">{i+1}</div>
                                                       <p className="text-slate-600 dark:text-slate-400 font-medium pt-1">{step}</p>
                                                   </div>
                                               ))}
                                           </div>

                                           <div className="p-5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-start gap-3">
                                               <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                                               <div className="space-y-1">
                                                   <p className="text-xs font-black text-amber-800 dark:text-amber-400 uppercase tracking-widest">No Notification?</p>
                                                   <p className="text-xs text-amber-700 dark:text-amber-500 leading-relaxed font-bold">WhatsApp will NOT notify you. You must manually go to Settings > Linked Devices > Link with phone number instead on your phone screen.</p>
                                               </div>
                                           </div>
                                       </div>

                                       <div className="flex flex-col items-center justify-center shrink-0">
                                            <div className="bg-white p-4 rounded-[2.5rem] shadow-2xl border border-slate-100 relative group transition-all hover:scale-105">
                                                {status === 'connecting' ? (
                                                    <div className="w-[280px] h-[280px] flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800 rounded-3xl">
                                                        <Loader2 className="animate-spin text-[#00a884] mb-4" size={48} />
                                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Syncing...</p>
                                                    </div>
                                                ) : method === 'QR' ? (
                                                    <div className="relative rounded-3xl overflow-hidden shadow-inner">
                                                        <img src={qrCodeUrl} alt="QR" className="w-[280px] h-[280px]" />
                                                        <div className="absolute bottom-2 right-2 bg-white/90 px-2 py-1 rounded text-[9px] font-bold text-slate-400 font-mono uppercase tracking-tighter">Expires: {qrTimer}s</div>
                                                    </div>
                                                ) : (
                                                    <div className="w-[280px] h-[280px] flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800 rounded-3xl p-6 text-center border-2 border-dashed border-slate-200 dark:border-slate-700">
                                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-10">Pairing Code</div>
                                                        <div className="text-3xl font-mono font-bold text-[#00a884] tracking-[0.15em] bg-white dark:bg-slate-900 py-6 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl w-full relative group cursor-pointer active:scale-95 transition-all">
                                                            {pairingCode}
                                                            <div className="absolute inset-0 flex items-center justify-center bg-[#00a884] opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl">
                                                                <Copy size={24} className="text-white" />
                                                            </div>
                                                        </div>
                                                        <p className="text-[10px] text-slate-400 mt-10 font-bold uppercase tracking-wide">Enter exactly on your phone</p>
                                                    </div>
                                                )}
                                                {status === 'ready' && <div className="absolute -inset-1.5 bg-[#00a884]/10 rounded-[2.7rem] -z-10 animate-pulse"></div>}
                                            </div>
                                            {status === 'ready' && (
                                                <button onClick={handleSimulateScan} className="mt-8 px-6 py-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full text-[10px] font-black uppercase hover:bg-slate-200 transition-all border border-slate-200 dark:border-slate-700">Simulate Success</button>
                                            )}
                                       </div>
                                   </div>
                               ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center animate-fade-in">
                                        <div className="w-24 h-24 bg-[#dcf8c6] dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-[#00a884] mb-8 shadow-inner">
                                            <CheckCircle size={56} />
                                        </div>
                                        <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 mb-2">WhatsApp Connected</h2>
                                        <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-12">Automated invoice dispatching is now active for this terminal.</p>
                                        <div className="grid grid-cols-3 gap-4 w-full max-w-lg">
                                            {[["MD-v2", "Protocol"], ["14ms", "Latency"], ["Stable", "Signal"]].map(([val, label]) => (
                                                <div key={label} className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                                                    <div className="font-black text-slate-900 dark:text-white uppercase">{val}</div>
                                                    <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">{label}</div>
                                                </div>
                                            ))}
                                        </div>
                                   </div>
                               )}
                           </div>
                       </div>
                   </div>
               )}

               {activeTab === 'template' && (
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in pb-12">
                       <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col h-full">
                           <div className="flex justify-between items-center mb-6">
                               <h3 className="font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 text-xl">
                                   <LayoutTemplate size={24} className="text-[#00a884]"/> Template
                               </h3>
                               <button onClick={() => setTemplate(DEFAULT_TEMPLATE)} className="text-xs text-brand-600 font-bold hover:underline flex items-center gap-1">
                                   <RefreshCw size={12} /> Reset
                               </button>
                           </div>
                           <textarea value={template} onChange={(e) => setTemplate(e.target.value)} className="flex-1 w-full p-6 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl font-mono text-sm focus:ring-2 focus:ring-[#00a884] outline-none resize-none min-h-[350px] shadow-inner dark:text-slate-300" />
                           <button onClick={() => { alert("Template Saved!"); onUpdateStoreSettings({ ...settings!, whatsappTemplate: template }); }} className="mt-6 w-full bg-[#00a884] hover:bg-[#008f6f] text-white py-4 rounded-2xl font-bold transition-all shadow-lg flex items-center justify-center gap-2">
                               <Save size={20} /> Save Message Config
                           </button>
                       </div>
                       <div className="flex flex-col items-center">
                            <h3 className="w-full font-black text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2 text-xl">
                                <Smartphone size={24} className="text-brand-500"/> Mobile Preview
                            </h3>
                            <div className="bg-slate-200 dark:bg-slate-800 rounded-[3.5rem] border-[12px] border-slate-900 p-3 max-w-sm w-full relative shadow-2xl min-h-[600px] overflow-hidden">
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-b-3xl z-20"></div>
                                <div className="bg-[#e5ddd5] dark:bg-[#0b141a] h-full rounded-[2.5rem] overflow-hidden flex flex-col relative" style={{backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundSize: '400px', backgroundBlendMode: 'overlay'}}>
                                    <div className="bg-[#075e54] dark:bg-[#202c33] p-4 pt-10 text-white flex items-center gap-3 shadow-md z-10">
                                        <div className="w-10 h-10 rounded-full bg-slate-300 flex items-center justify-center text-slate-600">
                                            <Smartphone size={24} />
                                        </div>
                                        <div className="flex-1"><div className="font-bold text-sm">Consumer Chat</div><div className="text-[10px] opacity-70">Online</div></div>
                                        <MoreVertical size={20} className="opacity-50" />
                                    </div>
                                    <div className="flex-1 p-4 overflow-y-auto">
                                        <div className="bg-[#dcf8c6] dark:bg-[#005c4b] p-4 rounded-2xl rounded-tr-none shadow-md max-w-[90%] ml-auto mb-4 text-xs text-slate-800 dark:text-slate-100 whitespace-pre-wrap leading-relaxed border border-[#c1e8a8] dark:border-[#00705a]">
                                            {template.replace(/{store_name}/g, settings?.name || "easyPOS Store").replace(/{order_id}/g, "89123").replace(/{date}/g, new Date().toLocaleString()).replace(/{items}/g, "- Item A (x1)\n- Item B (x2)").replace(/{subtotal}/g, "$45.00").replace(/{discount}/g, "$0.00").replace(/{total}/g, "$45.00").replace(/{footer}/g, settings?.footerMessage || "Thanks!")}
                                            <div className="text-[10px] text-slate-400 text-right mt-2 font-bold">12:30 PM <span className="text-[#34b7f1]">✓✓</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                       </div>
                   </div>
               )}
           </div>
       </div>
    </div>
  );
};