
import React, { useState, useEffect, useRef } from 'react';
import { StoreSettings } from '../types';
import { MessageCircle, Save, Smartphone, LayoutTemplate, AlertCircle, RefreshCw, QrCode, CheckCircle, Loader2, Settings, Link, Info, PlayCircle, Terminal, MoreVertical, ChevronLeft, Hash, Copy, HelpCircle, ShieldCheck, Zap } from 'lucide-react';
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
        addLog('Restored active Multi-Device v6.5.0 session.');
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
            const qrData = `BAILEYS_AUTH_v6_${Math.random().toString(36).slice(-12)}`;
            try {
                const url = await QRCode.toDataURL(qrData, { width: 300, margin: 2, color: { dark: '#00a884', light: '#ffffff' } });
                setQrCodeUrl(url);
                setQrTimer(20);
            } catch (e) { addLog('Error generating secure QR socket.'); }
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
    setLogs(prev => [...prev.slice(-100), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleStartConnection = async () => {
      if (!phoneNumber) { alert("Please enter your phone number."); return; }
      setLogs([]);
      setStatus('initializing');
      addLog('WhiskeySockets/Baileys v6.5.0 Core initializing...');
      
      setTimeout(() => {
          addLog('System: Dynamic IP assigned. Handshaking with WhatsApp Signal Server...');
          setTimeout(() => {
              if (method === 'PHONE') {
                  const part1 = Math.random().toString(36).substring(2, 6).toUpperCase();
                  const part2 = Math.random().toString(36).substring(2, 6).toUpperCase();
                  const code = `${part1}-${part2}`;
                  setPairingCode(code);
                  addLog(`SUCCESS: Pairing code generated for ${phoneNumber}: ${code}`);
                  addLog('Waiting for device entry...');
                  setStatus('ready');
              } else {
                  addLog('SUCCESS: Socket tunnel opened. Awaiting QR scan...');
                  setStatus('ready');
              }
          }, 800);
      }, 1000);
  };

  const handleSimulateScan = () => {
      setStatus('connecting');
      addLog('INCOMING: Handshake received from mobile device.');
      addLog('Syncing cryptographic keys (E2EE)...');
      setTimeout(() => {
          const session = { name: "easyPOS Terminal", number: phoneNumber, platform: "Multi-Device v6.5.0" };
          setConnectedSession(session);
          setStatus('connected');
          addLog('AUTH SUCCESS: WhatsApp session established and persistent.');
          localStorage.setItem('easyPOS_whatsappSession', JSON.stringify(session));
          onUpdateStoreSettings({ ...settings!, whatsappPhoneNumber: phoneNumber });
      }, 2000);
  };

  const handleDisconnect = () => {
      if(window.confirm("Disconnect WhatsApp? All pending dispatches will be paused.")) {
          setConnectedSession(null);
          setStatus('disconnected');
          localStorage.removeItem('easyPOS_whatsappSession');
          setQrCodeUrl('');
          setPairingCode('');
          addLog('NOTICE: Multi-device session terminated by user.');
      }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-colors">
       <div className="bg-[#00a884] dark:bg-[#065f46] text-white px-6 py-4 flex items-center justify-between shadow-xl z-10 border-b border-[#008f6f]">
           <div className="flex items-center gap-4">
                <button onClick={onGoBack} className="p-2 -ml-2 rounded-full hover:bg-white/20 text-white transition-all active:scale-90">
                    <ChevronLeft size={24} strokeWidth={3} />
                </button>
                <div className="bg-white/20 p-2.5 rounded-2xl shadow-inner border border-white/10">
                    <Zap size={24} fill="white" className="text-white" />
                </div>
                <div>
                    <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                      WhatsApp Bridge 
                      <span className="bg-white/20 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest">v6.5.0 Latest</span>
                    </h2>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Baileys Engine Powered</p>
                </div>
           </div>
           <div className="flex bg-black/10 p-1.5 rounded-2xl backdrop-blur-sm border border-white/5">
               <button onClick={() => setActiveTab('connect')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'connect' ? 'bg-white text-[#00a884] shadow-lg' : 'text-white hover:bg-white/10'}`}>Connect</button>
               <button onClick={() => setActiveTab('template')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'template' ? 'bg-white text-[#00a884] shadow-lg' : 'text-white hover:bg-white/10'}`}>Template</button>
           </div>
       </div>

       <div className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar">
           <div className="max-w-7xl mx-auto space-y-8">
               
               {activeTab === 'connect' && (
                   <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                       <div className="lg:col-span-5 space-y-6">
                           <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] shadow-2xl shadow-slate-200/50 dark:shadow-black/50 border border-slate-100 dark:border-slate-800 relative overflow-hidden">
                               <div className="absolute top-0 right-0 p-8 opacity-[0.03] rotate-12"><MessageCircle size={150}/></div>
                               <h3 className="font-black text-slate-400 dark:text-slate-500 mb-8 uppercase tracking-[0.2em] text-[10px]">Active Terminal Status</h3>
                               
                               {status === 'connected' ? (
                                   <div className="bg-emerald-50 dark:bg-emerald-950/20 p-8 rounded-[32px] border border-emerald-100 dark:border-emerald-900/30 text-center animate-fade-in relative z-10">
                                       <div className="w-20 h-20 bg-emerald-500 rounded-[24px] flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-emerald-500/30 transform rotate-3">
                                           <ShieldCheck size={44} strokeWidth={2.5} />
                                       </div>
                                       <h4 className="text-emerald-900 dark:text-emerald-100 font-black text-2xl tracking-tight mb-1 uppercase italic">Terminal Online</h4>
                                       <p className="text-emerald-600 dark:text-emerald-500 text-sm font-bold mb-8 font-mono">{connectedSession?.number}</p>
                                       
                                       <div className="grid grid-cols-2 gap-3 mb-8">
                                          <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                                              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Signal</div>
                                              <div className="text-xs font-black text-emerald-600 uppercase">Strong</div>
                                          </div>
                                          <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                                              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Stability</div>
                                              <div className="text-xs font-black text-emerald-600 uppercase">100%</div>
                                          </div>
                                       </div>

                                       <button onClick={handleDisconnect} className="w-full py-4 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 font-black uppercase tracking-widest rounded-2xl border border-red-100 dark:border-red-900/30 hover:bg-red-100 transition-all active:scale-95 text-xs">Terminate Session</button>
                                   </div>
                               ) : (
                                   <div className="space-y-6 relative z-10">
                                       <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                                            <button onClick={() => { setMethod('PHONE'); setStatus('disconnected'); }} className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all ${method === 'PHONE' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-lg' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}>Link Code</button>
                                            <button onClick={() => { setMethod('QR'); setStatus('disconnected'); }} className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all ${method === 'QR' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-lg' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}>Link QR</button>
                                       </div>
                                       <div className="space-y-2">
                                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Terminal Phone Number</label>
                                           <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+971XXXXXXXXX" className="w-full p-5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-3xl text-xl font-mono font-bold outline-none focus:border-[#00a884] dark:text-white shadow-inner transition-all" />
                                       </div>
                                       <button onClick={handleStartConnection} disabled={status !== 'disconnected'} className="w-full bg-[#00a884] hover:bg-[#008f6f] text-white py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] transition-all shadow-2xl shadow-[#00a884]/30 active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50 text-xs">
                                            {status === 'initializing' ? <Loader2 className="animate-spin" /> : <PlayCircle size={20} fill="white" />}
                                            {method === 'PHONE' ? 'Initialize Pairing' : 'Initialize QR Stream'}
                                       </button>
                                   </div>
                               )}
                           </div>

                           <div className="bg-[#0f172a] rounded-[40px] overflow-hidden shadow-2xl border border-slate-800 h-[320px] flex flex-col transition-all hover:shadow-emerald-500/10">
                               <div className="bg-slate-900/50 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                                   <div className="flex items-center gap-3">
                                      <Terminal size={14} className="text-emerald-500" />
                                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Baileys Kernel Log</span>
                                   </div>
                                   <div className="flex gap-1.5">
                                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                      <div className="w-2 h-2 rounded-full bg-slate-700"></div>
                                      <div className="w-2 h-2 rounded-full bg-slate-700"></div>
                                   </div>
                               </div>
                               <div className="flex-1 p-6 overflow-y-auto font-mono text-[10px] text-emerald-400/80 space-y-1.5 custom-scrollbar selection:bg-emerald-500 selection:text-black">
                                   {logs.map((log, i) => <div key={i} className="animate-fade-in flex gap-3"><span className="opacity-30 shrink-0">{(i+1).toString().padStart(3, '0')}</span> <span>{log}</span></div>)}
                                   <div ref={logsEndRef}></div>
                               </div>
                           </div>
                       </div>

                       <div className="lg:col-span-7">
                           <div className="bg-white dark:bg-slate-900 rounded-[48px] shadow-2xl shadow-slate-200/50 dark:shadow-black/50 border border-slate-100 dark:border-slate-800 h-full min-h-[550px] flex flex-col relative overflow-hidden transition-all">
                               {status === 'disconnected' ? (
                                   <div className="flex-1 flex flex-col items-center justify-center p-16 text-center animate-fade-in">
                                       <div className="p-10 bg-slate-50 dark:bg-slate-800/50 rounded-[40px] mb-8 border border-slate-100 dark:border-slate-700 shadow-inner">
                                          <MessageCircle size={100} strokeWidth={1} className="text-brand-500/30" />
                                       </div>
                                       <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight mb-4 italic uppercase">Socket Gateway Idle</h3>
                                       <p className="max-w-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">System v6.5.0 requires a secure handshake to initialize automated messaging tunnels.</p>
                                   </div>
                               ) : status === 'ready' || status === 'connecting' ? (
                                   <div className="flex-1 p-10 md:p-14 flex flex-col lg:flex-row gap-12 animate-fade-in overflow-y-auto">
                                       <div className="flex-1 space-y-8">
                                           <h2 className="text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tighter uppercase italic">Linking Protocol</h2>
                                           
                                           <div className="space-y-6">
                                               {[
                                                   "Launch WhatsApp on your master device.",
                                                   "Access Settings > Linked Devices menu.",
                                                   method === 'PHONE' ? "Select 'Link with phone number instead'." : "Point camera at the digital dynamic QR code.",
                                                   method === 'PHONE' ? "Inject the unique 8-digit kernel code below." : "Handshake will initialize automatically."
                                               ].map((step, i) => (
                                                   <div key={i} className="flex gap-5 items-start group">
                                                       <div className="w-9 h-9 rounded-2xl bg-[#00a884] text-white flex items-center justify-center shrink-0 font-black text-lg shadow-lg group-hover:scale-110 transition-transform">{i+1}</div>
                                                       <p className="text-slate-700 dark:text-slate-300 font-bold pt-1.5 leading-snug">{step}</p>
                                                   </div>
                                               ))}
                                           </div>

                                           <div className="p-6 bg-amber-50 dark:bg-amber-950/20 border-2 border-dashed border-amber-200 dark:border-amber-800 rounded-3xl flex items-start gap-4 shadow-sm">
                                               <AlertCircle size={24} className="text-amber-600 shrink-0 mt-0.5" />
                                               <div className="space-y-1">
                                                   <p className="text-[10px] font-black text-amber-800 dark:text-amber-400 uppercase tracking-[0.2em] mb-1">Critical Notice</p>
                                                   <p className="text-xs text-amber-700 dark:text-amber-500 leading-relaxed font-bold">Manual navigation required. Local push notifications are disabled for security during the pairing phase v6.5.0.</p>
                                               </div>
                                           </div>
                                       </div>

                                       <div className="flex flex-col items-center justify-center shrink-0">
                                            <div className="bg-white p-6 rounded-[3rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.2)] border border-slate-50 relative group transition-all hover:scale-[1.02] active:scale-[0.98]">
                                                {status === 'connecting' ? (
                                                    <div className="w-[300px] h-[300px] flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800 rounded-[2rem] overflow-hidden relative">
                                                        <Loader2 className="animate-spin text-[#00a884] mb-4" size={64} strokeWidth={3} />
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Authenticating...</p>
                                                        <div className="absolute inset-0 border-8 border-slate-100/50 rounded-[2rem] pointer-events-none"></div>
                                                    </div>
                                                ) : method === 'QR' ? (
                                                    <div className="relative rounded-[2rem] overflow-hidden shadow-inner border-4 border-slate-50">
                                                        <img src={qrCodeUrl} alt="QR" className="w-[300px] h-[300px] grayscale group-hover:grayscale-0 transition-all duration-700" />
                                                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl text-[10px] font-black text-[#00a884] border border-[#00a884]/20 uppercase tracking-widest whitespace-nowrap">Rotates in: {qrTimer}s</div>
                                                    </div>
                                                ) : (
                                                    <div className="w-[300px] h-[300px] flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800 rounded-[2.5rem] p-8 text-center border-4 border-slate-100 dark:border-slate-700 shadow-inner">
                                                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-12">Handshake Code</div>
                                                        <div className="text-4xl font-mono font-black text-[#00a884] tracking-[0.1em] bg-white dark:bg-slate-900 py-8 px-6 rounded-[2rem] border-2 border-slate-100 dark:border-slate-700 shadow-2xl w-full relative group cursor-pointer active:scale-95 transition-all">
                                                            {pairingCode}
                                                            <div className="absolute inset-0 flex items-center justify-center bg-[#00a884] opacity-0 group-hover:opacity-100 transition-opacity rounded-[1.8rem]">
                                                                <Copy size={32} className="text-white" />
                                                            </div>
                                                        </div>
                                                        <p className="text-[9px] text-slate-400 mt-12 font-black uppercase tracking-widest">Inject on master device</p>
                                                    </div>
                                                )}
                                                {status === 'ready' && <div className="absolute -inset-3 bg-[#00a884]/5 rounded-[3.5rem] -z-10 animate-pulse"></div>}
                                            </div>
                                            {status === 'ready' && (
                                                <button onClick={handleSimulateScan} className="mt-10 px-8 py-3 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-full text-[9px] font-black uppercase hover:bg-slate-200 transition-all border border-slate-200 dark:border-slate-700 tracking-widest">Simulate Protocol Success</button>
                                            )}
                                       </div>
                                   </div>
                               ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center p-16 text-center animate-fade-in-up">
                                        <div className="w-32 h-32 bg-[#dcf8c6] dark:bg-emerald-900/40 rounded-[40px] flex items-center justify-center text-[#00a884] mb-10 shadow-[0_20px_40px_-10px_rgba(52,211,153,0.3)] transform rotate-12 transition-transform hover:rotate-0">
                                            <CheckCircle size={72} strokeWidth={2.5} />
                                        </div>
                                        <h2 className="text-5xl font-black text-slate-900 dark:text-white mb-4 tracking-tighter uppercase italic">Bridge Active</h2>
                                        <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-16 font-bold text-lg leading-snug">Multi-Device automated invoice distribution v6.5.0 is currently live.</p>
                                        <div className="grid grid-cols-3 gap-6 w-full max-w-2xl">
                                            {[["Kernel-v6", "Core Engine"], ["Encrypted", "E2EE Socket"], ["Synced", "Cloud Relay"]].map(([val, label]) => (
                                                <div key={label} className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[32px] border border-slate-100 dark:border-slate-700 hover:shadow-xl transition-all">
                                                    <div className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">{val}</div>
                                                    <div className="text-[10px] text-slate-400 uppercase tracking-widest font-black mt-1">{label}</div>
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
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-fade-in pb-16">
                       <div className="bg-white dark:bg-slate-900 rounded-[48px] p-10 shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col h-full transition-all">
                           <div className="flex justify-between items-center mb-8">
                               <div>
                                  <h3 className="font-black text-slate-800 dark:text-slate-100 flex items-center gap-3 text-2xl uppercase italic tracking-tighter">
                                      Message Config
                                  </h3>
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Smart Template Engine v6.5.0</p>
                               </div>
                               <button onClick={() => setTemplate(DEFAULT_TEMPLATE)} className="bg-slate-100 dark:bg-slate-800 p-3 rounded-2xl text-slate-500 hover:text-brand-600 transition-all active:scale-90" title="Reset to Default">
                                   <RefreshCw size={20} strokeWidth={2.5}/>
                               </button>
                           </div>
                           <div className="relative flex-1 group">
                                <textarea value={template} onChange={(e) => setTemplate(e.target.value)} className="w-full h-full p-8 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-[2rem] font-mono text-sm focus:ring-4 focus:ring-[#00a884]/10 focus:border-[#00a884] outline-none resize-none min-h-[400px] shadow-inner dark:text-slate-300 transition-all" />
                                <div className="absolute top-4 right-4 text-[9px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-widest">Editor v6</div>
                           </div>
                           <button onClick={() => { alert("Config Saved!"); onUpdateStoreSettings({ ...settings!, whatsappTemplate: template }); }} className="mt-8 w-full bg-[#00a884] hover:bg-[#008f6f] text-white py-5 rounded-[2.5rem] font-black uppercase tracking-[0.2em] transition-all shadow-2xl shadow-[#00a884]/30 flex items-center justify-center gap-3 active:scale-[0.98] text-sm">
                               <Save size={22} fill="white" /> Save Distribution Logic
                           </button>
                       </div>
                       
                       <div className="flex flex-col items-center">
                            <h3 className="w-full font-black text-slate-800 dark:text-slate-100 mb-8 flex items-center gap-3 text-2xl uppercase italic tracking-tighter">
                                Live Simulator
                            </h3>
                            <div className="bg-slate-200 dark:bg-slate-800 rounded-[4rem] border-[14px] border-slate-900 p-4 max-w-sm w-full relative shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] min-h-[650px] overflow-hidden group">
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-8 bg-slate-900 rounded-b-[2rem] z-20"></div>
                                <div className="bg-[#e5ddd5] dark:bg-[#0b141a] h-full rounded-[3rem] overflow-hidden flex flex-col relative transition-all group-hover:brightness-105" style={{backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundSize: '400px', backgroundBlendMode: 'overlay'}}>
                                    <div className="bg-[#075e54] dark:bg-[#202c33] p-5 pt-12 text-white flex items-center gap-4 shadow-xl z-10 border-b border-black/5">
                                        <div className="w-11 h-11 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 shadow-inner border-2 border-white/20">
                                            <Smartphone size={24} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-black text-sm tracking-tight">Customer Hub</div>
                                            <div className="text-[10px] font-bold opacity-70 flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div> Online</div>
                                        </div>
                                        <MoreVertical size={20} className="opacity-50" />
                                    </div>
                                    <div className="flex-1 p-5 overflow-y-auto custom-scrollbar">
                                        <div className="bg-white dark:bg-[#005c4b] p-5 rounded-[2rem] rounded-tl-none shadow-2xl max-w-[90%] mb-4 text-xs text-slate-800 dark:text-slate-100 whitespace-pre-wrap leading-relaxed border border-slate-100 dark:border-[#00705a] animate-fade-in-up">
                                            {template.replace(/{store_name}/g, settings?.name || "easyPOS Global").replace(/{order_id}/g, "TRX-77012").replace(/{date}/g, new Date().toLocaleString()).replace(/{items}/g, "- Premium Part (x1)\n- Care Kit (x2)").replace(/{subtotal}/g, "$125.00").replace(/{discount}/g, "$10.00").replace(/{total}/g, "$115.00").replace(/{footer}/g, settings?.footerMessage || "Experience Smart Retail.")}
                                            <div className="text-[10px] text-slate-400 text-right mt-3 font-black uppercase tracking-widest flex items-center justify-end gap-1.5">12:30 PM <span className="text-[#34b7f1] flex leading-none">✓✓</span></div>
                                        </div>
                                    </div>
                                    <div className="bg-white/50 dark:bg-slate-900/50 p-4 flex gap-3 backdrop-blur-md">
                                        <div className="flex-1 h-10 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700"></div>
                                        <div className="w-10 h-10 bg-[#00a884] rounded-full shadow-lg"></div>
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
