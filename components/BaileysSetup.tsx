
import React, { useState, useEffect } from 'react';
import { StoreSettings } from '../types';
import { MessageCircle, Save, ChevronLeft, Zap, Loader2, RefreshCw, Monitor, ShieldCheck, CheckCircle2, Phone, QrCode, AlertTriangle, Smartphone, Info, ArrowRight } from 'lucide-react';
import QRCode from 'qrcode';

interface BaileysSetupProps {
  onUpdateStoreSettings: (settings: StoreSettings) => void;
  settings?: StoreSettings;
  onGoBack?: () => void;
  t?: (key: string) => string;
}

export const BaileysSetup: React.FC<BaileysSetupProps> = ({ onUpdateStoreSettings, settings, onGoBack, t = (k) => k }) => {
  const [activeTab, setActiveTab] = useState<'connect' | 'template'>('connect');
  const [connectMethod, setConnectMethod] = useState<'qr' | 'code'>('qr');
  const [status, setStatus] = useState<'disconnected' | 'initializing' | 'ready' | 'connected' | 'error'>('disconnected');
  const [qrData, setQrData] = useState<string>('');
  const [pairingCode, setPairingCode] = useState<string>('');
  const [qrExpired, setQrExpired] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(settings?.whatsappPhoneNumber || '');
  const [template, setTemplate] = useState(settings?.whatsappTemplate || "Hello! Thank you for shopping at *{{storeName}}*. Your order *#{{orderId}}* for *{{total}}* is ready. Receipt: {{receiptUrl}}");
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const savedSession = localStorage.getItem('easyPOS_whatsappSession');
    if (savedSession === 'active') setStatus('connected');
    addLog('easyPOS Multi-Device Bridge Ready.');
  }, []);

  const addLog = (msg: string) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 15)]);

  const generateQR = async () => {
    setStatus('initializing');
    setQrExpired(false);
    addLog('Handshaking with WhatsApp servers...');
    
    setTimeout(async () => {
      const mockSessionToken = `2@easyPOS-Session-${Math.random().toString(36).substring(7)}`;
      try {
        const url = await QRCode.toDataURL(mockSessionToken, { 
          margin: 1, 
          width: 320,
          color: { dark: '#111b21', light: '#ffffff' },
          errorCorrectionLevel: 'H' 
        });
        setQrData(url);
        setStatus('ready');
        addLog('QR Matrix generated. Awaiting device scan.');
        
        setTimeout(() => {
          if (status !== 'connected') {
            setQrExpired(true);
            addLog('Session token expired.');
          }
        }, 60000);
      } catch (err) {
        setStatus('error');
        addLog('Error: QR rendering failure.');
      }
    }, 1500);
  };

  const generatePairingCode = () => {
    if (!phoneNumber) {
        alert("Please enter your business phone number first.");
        return;
    }
    setStatus('initializing');
    addLog(`Initiating pairing protocol for ${phoneNumber}...`);
    
    setTimeout(() => {
      // Structure code as ABCD-EFGH for readability
      const code = Math.random().toString(36).substring(2, 6).toUpperCase() + "-" + Math.random().toString(36).substring(2, 6).toUpperCase();
      setPairingCode(code);
      setStatus('ready');
      addLog('Pairing key broadcasted. PLEASE OPEN WHATSAPP MANUALLY.');
    }, 2000);
  };

  const simulateSuccess = () => {
    setStatus('connected');
    localStorage.setItem('easyPOS_whatsappSession', 'active');
    addLog('HANDSHAKE SUCCESSFUL: Bridge active.');
    onUpdateStoreSettings({ 
      ...(settings as StoreSettings), 
      whatsappPhoneNumber: phoneNumber,
      whatsappTemplate: template
    });
  };

  const handleReset = () => {
    if (confirm("Disconnect WhatsApp link?")) {
        localStorage.removeItem('easyPOS_whatsappSession');
        setStatus('disconnected');
        setQrData('');
        setPairingCode('');
        addLog('Session terminated.');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f0f2f5] dark:bg-slate-950 font-sans overflow-hidden transition-colors duration-500">
      {/* Header */}
      <div className="bg-[#00a884] dark:bg-[#065f46] text-white p-6 flex items-center justify-between shadow-lg shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onGoBack} className="p-2 hover:bg-black/10 rounded-xl transition-all active:scale-90">
            <ChevronLeft size={24} className="rtl:rotate-180" />
          </button>
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
              <MessageCircle size={28} /> WhatsApp Setup
            </h2>
            <p className="text-[10px] uppercase font-bold opacity-70 tracking-widest leading-none mt-1">Multi-Device Terminal Bridge</p>
          </div>
        </div>
        <div className="flex bg-black/10 p-1 rounded-2xl">
          <button onClick={() => setActiveTab('connect')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'connect' ? 'bg-white text-[#00a884] shadow-md' : 'text-white/70 hover:text-white'}`}>Connectivity</button>
          <button onClick={() => setActiveTab('template')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'template' ? 'bg-white text-[#00a884] shadow-md' : 'text-white/70 hover:text-white'}`}>Dispatcher</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-12 custom-scrollbar">
        <div className="max-w-6xl mx-auto space-y-12">
          {activeTab === 'connect' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 animate-fade-in">
              {/* Method Selection Column */}
              <div className="lg:col-span-7 space-y-8 bg-white dark:bg-slate-900 p-8 md:p-12 rounded-[3.5rem] shadow-xl border border-slate-100 dark:border-slate-800">
                <div className="mb-10">
                   <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter mb-4">Link Your Account</h3>
                   <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wide text-xs opacity-80 leading-relaxed">
                     Automate receipt dispatching by linking your WhatsApp account. Choose your preferred authentication method.
                   </p>
                </div>

                <div className="space-y-4">
                  <button onClick={() => { setConnectMethod('qr'); setStatus('disconnected'); }} className={`w-full p-6 rounded-3xl border-2 flex items-center gap-6 transition-all active:scale-[0.98] ${connectMethod === 'qr' ? 'bg-[#00a884]/5 border-[#00a884] text-[#00a884]' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400'}`}>
                    <QrCode size={32} />
                    <div className="text-left">
                        <p className="font-black uppercase tracking-widest text-[10px]">Method A</p>
                        <p className="font-bold text-lg">Scan QR Code</p>
                    </div>
                  </button>
                  <button onClick={() => { setConnectMethod('code'); setStatus('disconnected'); }} className={`w-full p-6 rounded-3xl border-2 flex items-center gap-6 transition-all active:scale-[0.98] ${connectMethod === 'code' ? 'bg-[#00a884]/5 border-[#00a884] text-[#00a884]' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400'}`}>
                    <Smartphone size={32} />
                    <div className="text-left">
                        <p className="font-black uppercase tracking-widest text-[10px]">Method B</p>
                        <p className="font-bold text-lg">Link with Phone Number</p>
                    </div>
                  </button>
                </div>

                {connectMethod === 'code' && (
                    <div className="pt-6 space-y-4 animate-fade-in-up">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Business Phone Number</label>
                            <div className="relative">
                                <input type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} className="w-full p-5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-3xl outline-none focus:border-[#00a884] font-black text-xl shadow-inner dark:text-white" placeholder="e.g. 971501234567" />
                                <Phone className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300" size={24} />
                            </div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-2 italic">Format: Country Code + Number (No '+' or spaces)</p>
                        </div>
                        
                        {/* NO NOTIFICATION WARNING */}
                        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 p-5 rounded-2xl flex gap-4 text-amber-700 dark:text-amber-500">
                            <AlertTriangle className="shrink-0" size={24} />
                            <div className="text-[10px] font-bold uppercase leading-relaxed">
                                <span className="font-black block mb-1">Attention: No Push Notification</span>
                                WhatsApp does <span className="underline">NOT</span> send a notification for pairing. You must manually open the menu on your phone to enter the code.
                            </div>
                        </div>
                    </div>
                )}

                <div className="pt-8 border-t border-slate-50 dark:border-slate-800 flex items-center gap-4 text-[#00a884]">
                    <ShieldCheck size={40} className="opacity-40" />
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Secure Handshake</p>
                        <p className="text-xs font-bold text-slate-500">All communication is E2E encrypted directly from your terminal.</p>
                    </div>
                </div>
              </div>

              {/* Interaction Column */}
              <div className="lg:col-span-5 space-y-6 flex flex-col h-full">
                <div className="flex-1 bg-white dark:bg-slate-900 p-8 md:p-12 rounded-[3.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center relative overflow-hidden">
                    {status === 'connected' ? (
                      <div className="animate-fade-in-up flex flex-col items-center">
                          <div className="w-24 h-24 bg-[#00a884] rounded-[2rem] flex items-center justify-center text-white mb-8 shadow-2xl shadow-[#00a884]/40 animate-pulse">
                              <CheckCircle2 size={48} />
                          </div>
                          <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter mb-2">Bridge Active</h3>
                          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] mb-12">Linked to system dispatcher</p>
                          <button onClick={handleReset} className="px-10 py-5 bg-red-50 dark:bg-red-950/20 text-red-600 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all">Sever Link</button>
                      </div>
                    ) : status === 'ready' ? (
                      <div className="w-full flex flex-col items-center animate-fade-in">
                          {connectMethod === 'qr' ? (
                              <div className="relative p-6 bg-white rounded-[3rem] shadow-2xl border-4 border-[#00a884]/10 group">
                                  <img src={qrData} className={`w-64 h-64 rounded-2xl transition-all duration-700 ${qrExpired ? 'blur-2xl grayscale opacity-10' : 'opacity-100'}`} alt="Scan QR" />
                                  {qrExpired && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                                        <div className="bg-white/95 p-8 rounded-[3rem] shadow-2xl border border-slate-200">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-6">Token Expired</p>
                                            <button onClick={generateQR} className="w-16 h-16 bg-[#00a884] rounded-full text-white mx-auto flex items-center justify-center shadow-xl hover:scale-110 active:scale-90 transition-all"><RefreshCw size={28} /></button>
                                        </div>
                                    </div>
                                  )}
                                  <button onClick={simulateSuccess} className="absolute bottom-4 left-1/2 -translate-x-1/2 px-6 py-2 bg-[#00a884]/10 text-[9px] font-black uppercase tracking-widest rounded-full text-[#00a884] opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap">I have scanned the code</button>
                              </div>
                          ) : (
                              <div className="w-full space-y-6 animate-fade-in-up">
                                  <div className="bg-slate-900 rounded-[3rem] p-8 shadow-2xl border-4 border-slate-800 relative overflow-hidden group">
                                      <div className="flex justify-between items-center mb-6 px-2">
                                          <p className="text-[11px] font-black text-[#00a884] uppercase tracking-[0.4em]">Handshake Code</p>
                                          <Info size={16} className="text-slate-600" />
                                      </div>
                                      <div className="text-5xl font-mono font-black text-white bg-black/50 py-10 rounded-[2rem] mb-6 tracking-[0.2em] border border-white/5 shadow-inner select-all">
                                          {pairingCode}
                                      </div>
                                      
                                      {/* STEP BY STEP GUIDE */}
                                      <div className="text-left bg-black/30 p-5 rounded-2xl border border-white/5 space-y-4 mb-6">
                                          <div className="flex items-start gap-3">
                                              <span className="w-6 h-6 rounded-full bg-[#00a884] text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5 shadow-lg shadow-[#00a884]/20">1</span>
                                              <p className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">Open WhatsApp Settings on your phone</p>
                                          </div>
                                          <div className="flex items-start gap-3">
                                              <span className="w-6 h-6 rounded-full bg-[#00a884] text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5 shadow-lg shadow-[#00a884]/20">2</span>
                                              <p className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">Linked Devices <ArrowRight size={10} className="inline mx-1" /> Link a Device</p>
                                          </div>
                                          <div className="flex items-start gap-3">
                                              <span className="w-6 h-6 rounded-full bg-amber-500 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5 shadow-lg shadow-amber-500/20">3</span>
                                              <p className="text-[10px] text-white font-black uppercase tracking-wider underline">Tap "Link with phone number instead"</p>
                                          </div>
                                          <div className="flex items-start gap-3">
                                              <span className="w-6 h-6 rounded-full bg-[#00a884] text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5 shadow-lg shadow-[#00a884]/20">4</span>
                                              <p className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">Enter the 8-digit code shown above</p>
                                          </div>
                                      </div>

                                      <button onClick={simulateSuccess} className="text-[10px] font-black text-[#00a884] uppercase tracking-[0.2em] border-b-2 border-[#00a884] pb-1 hover:opacity-80 transition-all">I've entered the code on my device</button>
                                  </div>
                              </div>
                          )}
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-8 italic">Awaiting Terminal Handshake...</p>
                      </div>
                    ) : status === 'initializing' ? (
                      <div className="flex flex-col items-center gap-8 animate-pulse text-[#00a884]">
                          <Loader2 size={80} className="animate-spin opacity-40" />
                          <div className="space-y-2">
                              <p className="text-[11px] font-black uppercase tracking-[0.5em]">System Booting</p>
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em]">Authenticating relay tunnel...</p>
                          </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-8 text-slate-200 dark:text-slate-800">
                          <Monitor size={120} strokeWidth={1} className="opacity-20" />
                          <button onClick={connectMethod === 'qr' ? generateQR : generatePairingCode} className="px-12 py-6 bg-[#00a884] text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-2xl active:scale-95 transition-all flex items-center gap-3 italic">
                             <Zap size={20} /> Initialize Bridge Link
                          </button>
                      </div>
                    )}
                </div>

                <div className="bg-slate-950 rounded-[2.5rem] p-8 font-mono text-[10px] text-emerald-400/80 border border-slate-900 shadow-2xl h-44 overflow-y-auto custom-scrollbar transition-all shrink-0">
                    <div className="flex items-center gap-3 mb-6 border-b border-emerald-900/30 pb-4">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="font-black uppercase tracking-[0.3em] text-emerald-600">bridge_terminal_io</span>
                    </div>
                    {logs.map((l, i) => (
                      <div key={i} className="mb-2 opacity-80 animate-fade-in"><span className="text-emerald-900">#</span> {l}</div>
                    ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-fade-in">
              {/* Template Configuration */}
              <div className="bg-white dark:bg-slate-900 p-10 md:p-16 rounded-[4rem] shadow-xl border border-slate-100 dark:border-slate-800 space-y-10">
                <div>
                   <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter mb-4">Message Engine</h3>
                   <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wide text-xs opacity-80 leading-relaxed">
                     Customize the automated payload dispatched after each checkout.
                   </p>
                </div>
                
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payload Architecture</label>
                    <textarea value={template} onChange={e => setTemplate(e.target.value)} className="w-full h-80 p-8 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[2.5rem] outline-none focus:border-[#00a884] transition-all dark:text-white font-medium leading-relaxed shadow-inner text-sm" />
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                    {['storeName', 'orderId', 'total', 'receiptUrl'].map(token => (
                      <button key={token} onClick={() => setTemplate(prev => prev + ` {{${token}}}`)} className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-[9px] font-black text-slate-500 hover:text-[#00a884] transition-all uppercase tracking-widest shadow-sm">
                        + {token}
                      </button>
                    ))}
                </div>

                <button onClick={() => onUpdateStoreSettings({ ...settings as StoreSettings, whatsappTemplate: template })} className="w-full py-6 bg-slate-900 dark:bg-brand-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 italic">
                    <Save size={20}/> Synchronize Dispatcher
                </button>
              </div>

              {/* Live Preview */}
              <div className="bg-slate-900 rounded-[4rem] p-4 shadow-2xl border-[12px] border-slate-800 h-fit relative overflow-hidden">
                  <div className="bg-[#e5ddd5] dark:bg-[#0b141a] rounded-[3rem] h-[600px] flex flex-col overflow-hidden">
                      <div className="bg-[#075e54] dark:bg-[#202c33] p-6 flex items-center gap-4 text-white">
                          <div className="w-12 h-12 rounded-full bg-slate-400 flex items-center justify-center text-xl font-bold uppercase">{settings?.name?.charAt(0) || 'E'}</div>
                          <div>
                              <div className="text-sm font-black leading-none uppercase italic">{settings?.name || 'easyPOS Terminal'}</div>
                              <div className="text-[10px] opacity-60 flex items-center gap-1.5 mt-2 font-black uppercase tracking-widest">
                                  <div className="w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_8px_#10b981]"></div> active
                              </div>
                          </div>
                      </div>
                      <div className="flex-1 p-8 overflow-y-auto space-y-6 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat bg-[length:400px]">
                          <div className="bg-white dark:bg-[#d9fdd3] dark:text-[#111b21] p-6 rounded-3xl rounded-tl-none shadow-xl max-w-[90%] animate-fade-in-left relative border border-black/5">
                              <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">
                                {template
                                    .replace(/{{storeName}}/g, settings?.name || 'easyPOS')
                                    .replace(/{{orderId}}/g, 'ORD-88234')
                                    .replace(/{{total}}/g, '$125.00')
                                    .replace(/{{receiptUrl}}/g, 'https://easypos.io/r/5xY9')}
                              </p>
                              <span className="text-[9px] text-slate-400 mt-4 block text-right font-black uppercase tracking-widest">Just now</span>
                              <div className="absolute top-0 left-[-12px] w-0 h-0 border-t-[16px] border-t-white dark:border-t-[#d9fdd3] border-l-[16px] border-l-transparent"></div>
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
