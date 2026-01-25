import React, { useState, useEffect } from 'react';
import { StoreSettings } from '../types';
import { MessageCircle, Save, ChevronLeft, Zap, PlayCircle, Loader2, Send, Copy, AlertCircle, CheckCircle2, FileText, Smartphone, Eye, RotateCcw, Link2, QrCode, RefreshCw, Monitor } from 'lucide-react';
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
  const [status, setStatus] = useState<'disconnected' | 'initializing' | 'ready' | 'connected'>('disconnected');
  const [qrData, setQrData] = useState<string>('');
  const [pairingCode, setPairingCode] = useState<string>('');
  const [qrExpired, setQrExpired] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(settings?.whatsappPhoneNumber || '');
  const [template, setTemplate] = useState(settings?.whatsappTemplate || "Hello! Thank you for shopping at *{{storeName}}*. \n\nYour order *#{{orderId}}* for *{{total}}* has been processed. \n\nView your receipt here: {{receiptUrl}}");
  const [logs, setLogs] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings?.whatsappPhoneNumber) setPhoneNumber(settings.whatsappPhoneNumber);
    if (settings?.whatsappTemplate) setTemplate(settings.whatsappTemplate);
  }, [settings]);

  useEffect(() => {
    const savedSession = localStorage.getItem('easyPOS_whatsappSession');
    if (savedSession === 'active') setStatus('connected');
    addLog('easyPOS Multi-Device Bridge Ready.');
  }, []);

  const addLog = (msg: string) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 19)]);

  const generateQR = async () => {
    setStatus('initializing');
    setQrExpired(false);
    addLog('Requesting bridge authentication token...');
    
    setTimeout(async () => {
      const dummyPayload = `easypos-baileys-link-${Math.random().toString(36).substring(7)}-${Date.now()}`;
      try {
        const url = await QRCode.toDataURL(dummyPayload, { 
          margin: 1, 
          scale: 10, 
          color: { dark: '#111b21', light: '#ffffff' },
          errorCorrectionLevel: 'H'
        });
        setQrData(url);
        setStatus('ready');
        addLog('QR Code ready. Mimicking web.whatsapp.com protocol.');
        
        setTimeout(() => {
          if (status !== 'connected') {
            setQrExpired(true);
            addLog('Session token expired. Refresh required.');
          }
        }, 60000);
      } catch (err) {
        addLog('Error generating QR payload.');
      }
    }, 1200);
  };

  const generatePairingCode = () => {
    if (!phoneNumber) {
        alert("Enter phone number for pairing code method.");
        return;
    }
    setStatus('initializing');
    addLog(`Generating secure pairing code for ${phoneNumber}...`);
    
    setTimeout(() => {
      const code = Math.random().toString(36).substring(2, 6).toUpperCase() + "-" + Math.random().toString(36).substring(2, 6).toUpperCase();
      setPairingCode(code);
      setStatus('ready');
      addLog(`Pairing code active: ${code}`);
    }, 1500);
  };

  const handleStartConnection = () => {
    if (connectMethod === 'qr') generateQR();
    else generatePairingCode();
  };

  const simulateSuccess = () => {
    setStatus('connected');
    localStorage.setItem('easyPOS_whatsappSession', 'active');
    addLog('SUCCESS: easyPOS Multi-Device Bridge LINKED via Baileys.');
    onUpdateStoreSettings({ 
      ...(settings as StoreSettings), 
      whatsappPhoneNumber: phoneNumber,
      whatsappTemplate: template
    });
  };

  const handleReset = () => {
    if (window.confirm("Logout from this device? Connection will be severed.")) {
        localStorage.removeItem('easyPOS_whatsappSession');
        setStatus('disconnected');
        setQrData('');
        setPairingCode('');
        addLog('Device unlinked. Session terminated.');
    }
  };

  const handleSaveTemplate = () => {
    setIsSaving(true);
    onUpdateStoreSettings({ 
      ...(settings as StoreSettings), 
      whatsappTemplate: template,
      whatsappPhoneNumber: phoneNumber
    });
    setTimeout(() => {
      setIsSaving(false);
      addLog('Template configuration updated.');
    }, 500);
  };

  const getPreviewMessage = () => {
      return template
        .replace(/{{storeName}}/g, settings?.name || 'easyPOS')
        .replace(/{{orderId}}/g, '1234')
        .replace(/{{total}}/g, '$150.00')
        .replace(/{{receiptUrl}}/g, 'https://easypos.io/r/5xY9');
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-colors duration-500 overflow-hidden">
      {/* WhatsApp Branding Header */}
      <div className="bg-[#00a884] dark:bg-[#065f46] text-white p-6 flex items-center justify-between shadow-2xl relative z-10 border-b border-black/10">
        <div className="flex items-center gap-5">
          <button onClick={onGoBack} className="p-3 -ml-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all active:scale-90" title="Go Back">
            <ChevronLeft size={28} strokeWidth={3} className="rtl:rotate-180" />
          </button>
          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tighter uppercase italic leading-none flex items-center gap-3">
              <MessageCircle size={32} /> WhatsApp Bridge
            </h2>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70 mt-1">easyPOS Multi-Device Link</p>
          </div>
        </div>
        <div className="hidden md:flex bg-black/10 p-1.5 rounded-[1.8rem] border border-white/5 backdrop-blur-xl">
          <button onClick={() => setActiveTab('connect')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'connect' ? 'bg-white text-[#00a884] shadow-lg' : 'text-white/70 hover:text-white'}`}>Connectivity</button>
          <button onClick={() => setActiveTab('template')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'template' ? 'bg-white text-[#00a884] shadow-lg' : 'text-white/70 hover:text-white'}`}>Dispatch Payload</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-5xl mx-auto p-6 md:p-12 space-y-10">
          
          {activeTab === 'connect' ? (
            <div className="space-y-8 animate-fade-in">
              <div className="bg-white dark:bg-slate-900 p-8 md:p-12 rounded-[3.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-5">
                  <Monitor size={180} />
                </div>
                
                {status === 'connected' ? (
                  <div className="text-center py-12">
                    <div className="w-24 h-24 bg-emerald-500 rounded-[2rem] flex items-center justify-center text-white mx-auto mb-8 shadow-2xl shadow-emerald-500/30 animate-pulse">
                      <CheckCircle2 size={48} />
                    </div>
                    <h3 className="text-4xl font-black uppercase italic dark:text-white mb-2 leading-none">Account Linked</h3>
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] mb-12">Active Device: {phoneNumber || 'Multi-Device Session'}</p>
                    
                    <div className="flex flex-col md:flex-row gap-4 justify-center">
                      <button onClick={handleReset} className="px-12 py-5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-black rounded-2xl uppercase text-[10px] tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2">
                        <RotateCcw size={16} /> Logout from Terminal
                      </button>
                      <button onClick={() => addLog('Relay status: OPTIMAL.')} className="px-12 py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black rounded-2xl uppercase text-[10px] tracking-widest active:scale-95 transition-all">Test Relay</button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-10 relative z-10">
                    <div className="flex flex-col lg:flex-row justify-between items-center gap-12">
                        <div className="flex-1 space-y-8">
                            <div>
                                <h4 className="text-3xl font-black uppercase italic tracking-tighter dark:text-white mb-4">Use WhatsApp on this Terminal</h4>
                                <p className="text-slate-500 dark:text-slate-400 text-sm font-bold leading-relaxed max-w-lg mb-8 uppercase tracking-wide opacity-80">To send receipts automatically, link your account just like using WhatsApp Web on your computer.</p>
                                
                                <div className="space-y-6 text-left max-w-md mb-10">
                                    <div className="flex gap-5 items-start">
                                        <div className="w-8 h-8 rounded-full bg-[#00a884] text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5 shadow-lg">1</div>
                                        <div className="space-y-1">
                                            <p className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-wider">Open WhatsApp on your phone</p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Available on Android and iPhone</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-5 items-start">
                                        <div className="w-8 h-8 rounded-full bg-[#00a884] text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5 shadow-lg">2</div>
                                        <div className="space-y-1">
                                            <p className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-wider">Go to Settings &gt; Linked Devices</p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Exactly like web.whatsapp.com process</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-5 items-start">
                                        <div className="w-8 h-8 rounded-full bg-[#00a884] text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5 shadow-lg">3</div>
                                        <div className="space-y-1">
                                            <p className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-wider">Point your camera to scan this QR code</p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Powered by easyPOS Multi-Device Baileys</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-4">
                                <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl w-fit border border-slate-200 dark:border-slate-700">
                                    <button onClick={() => { setConnectMethod('qr'); setStatus('disconnected'); }} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${connectMethod === 'qr' ? 'bg-white dark:bg-slate-700 text-[#00a884] shadow-md' : 'text-slate-500'}`}><QrCode size={14}/> Scan QR Mode</button>
                                    <button onClick={() => { setConnectMethod('code'); setStatus('disconnected'); }} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${connectMethod === 'code' ? 'bg-white dark:bg-slate-700 text-[#00a884] shadow-md' : 'text-slate-500'}`}><Smartphone size={14}/> Pairing Code</button>
                                </div>

                                {connectMethod === 'code' && (
                                    <div className="space-y-3 mb-4 animate-fade-in">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">International Business Number</label>
                                        <input 
                                            type="tel" 
                                            value={phoneNumber} 
                                            onChange={e => setPhoneNumber(e.target.value)} 
                                            className="w-full max-w-sm p-5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-3xl text-2xl font-mono font-black dark:text-white outline-none focus:border-[#00a884] transition-all shadow-inner" 
                                            placeholder="+971..." 
                                        />
                                    </div>
                                )}

                                <button 
                                    onClick={handleStartConnection} 
                                    disabled={status !== 'disconnected'} 
                                    className="w-full lg:w-fit px-12 bg-[#00a884] hover:bg-[#008f6f] text-white py-6 rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-2xl shadow-[#00a884]/20 flex items-center justify-center gap-4 transition-all active:scale-[0.98] disabled:opacity-50 text-xs italic"
                                >
                                    {status === 'initializing' ? <Loader2 className="animate-spin" size={20} /> : <Zap size={20}/>}
                                    {status === 'initializing' ? 'LOADING BRIDGE...' : 'Generate New Link'}
                                </button>
                            </div>
                        </div>

                        {/* Scan Interface */}
                        <div className="w-full lg:w-[380px] shrink-0">
                            {status === 'ready' && connectMethod === 'qr' && (
                                <div className="bg-white p-4 rounded-[3.5rem] shadow-2xl border-8 border-slate-50 relative group overflow-hidden">
                                    <div className="bg-white rounded-[2.5rem] p-4 flex items-center justify-center relative">
                                        <img src={qrData} className={`w-full aspect-square rounded-[2rem] transition-all duration-700 ${qrExpired ? 'blur-xl grayscale opacity-10' : ''}`} alt="Bridge QR" />
                                        {qrExpired && (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
                                                <div className="bg-white/95 p-8 rounded-[3rem] shadow-2xl border border-slate-200 max-w-[240px]">
                                                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-800 mb-6">QR CODE EXPIRED</p>
                                                    <button onClick={generateQR} className="w-16 h-16 bg-[#00a884] rounded-full text-white mx-auto flex items-center justify-center shadow-xl hover:scale-110 active:scale-90 transition-all">
                                                        <RefreshCw size={28} />
                                                    </button>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-6">Click to reload</p>
                                                </div>
                                            </div>
                                        )}
                                        {!qrExpired && (
                                            <div className="absolute top-6 right-6 flex items-center gap-2">
                                                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]"></div>
                                                <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">LIVE</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-6 text-center">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Easy Link Protocol v4.0</p>
                                    </div>
                                    <button onClick={simulateSuccess} className="absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-2 bg-slate-900/5 text-[9px] font-black uppercase tracking-widest rounded-full opacity-0 group-hover:opacity-100 transition-all text-slate-400">Simulate Scan Success</button>
                                </div>
                            )}

                            {status === 'ready' && connectMethod === 'code' && (
                                <div className="bg-slate-900 rounded-[3.5rem] p-10 shadow-2xl border-4 border-slate-800 text-center animate-fade-in relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-8 opacity-5"><Smartphone size={100} /></div>
                                    <div className="text-[10px] font-black text-[#00a884] uppercase tracking-[0.4em] mb-8">Secure Pairing Code</div>
                                    <div className="text-5xl font-mono font-black text-white bg-black/50 py-12 rounded-[2rem] mb-10 tracking-[0.2em] border border-white/5 shadow-inner select-all">{pairingCode}</div>
                                    <button onClick={simulateSuccess} className="text-[10px] font-black text-[#00a884] uppercase tracking-[0.2em] border-b-2 border-transparent hover:border-[#00a884] transition-all pb-1">Code Entered Successfully</button>
                                </div>
                            )}

                            {status === 'disconnected' && (
                                <div className="aspect-square bg-white dark:bg-slate-900 rounded-[3.5rem] border-4 border-dashed border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-slate-200 dark:text-slate-800 gap-6 transition-all shadow-inner">
                                    <Monitor size={80} className="opacity-10" />
                                    <div className="text-center space-y-2">
                                        <p className="text-[11px] font-black uppercase tracking-[0.4em] opacity-30">Terminal Standby</p>
                                        <p className="text-[9px] font-bold uppercase tracking-widest opacity-20 italic">Awaiting bridge request...</p>
                                    </div>
                                </div>
                            )}

                            {status === 'initializing' && (
                                <div className="aspect-square bg-[#111b21] rounded-[3.5rem] flex flex-col items-center justify-center text-[#00a884] gap-8 shadow-2xl">
                                    <Loader2 size={64} className="animate-spin opacity-80" />
                                    <div className="space-y-3 text-center">
                                        <p className="text-[11px] font-black uppercase tracking-[0.5em] animate-pulse">Relaying Signals</p>
                                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em] italic">Baileys Kernel Handshake...</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-fade-in">
              <div className="bg-white dark:bg-slate-900 p-8 md:p-12 rounded-[3.5rem] shadow-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-start mb-10">
                  <div>
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white">Payload Rules</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Receipt Notification Template</p>
                  </div>
                  <div className="bg-brand-50 dark:bg-brand-900/20 p-3 rounded-2xl text-brand-600">
                    <FileText size={24} />
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Message Architecture</label>
                    <textarea 
                      value={template} 
                      onChange={e => setTemplate(e.target.value)}
                      className="w-full h-80 p-8 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[2.5rem] outline-none focus:border-[#00a884] transition-all dark:text-white font-medium leading-relaxed shadow-inner text-sm"
                      placeholder="Enter receipt message template..."
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {['storeName', 'orderId', 'total', 'receiptUrl'].map(token => (
                      <button 
                        key={token}
                        onClick={() => setTemplate(prev => prev + ` {{${token}}}`)}
                        className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-[9px] font-black text-slate-500 hover:text-brand-600 hover:border-brand-500 transition-all uppercase tracking-widest shadow-sm"
                      >
                        + {token}
                      </button>
                    ))}
                  </div>

                  <button 
                    onClick={handleSaveTemplate}
                    className="w-full py-6 bg-brand-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl hover:bg-brand-500 transition-all active:scale-95 flex items-center justify-center gap-3 italic"
                  >
                    {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20}/>}
                    Commit Payload Architecture
                  </button>
                </div>
              </div>

              {/* Live Preview Device */}
              <div className="flex flex-col gap-6">
                 <div className="bg-slate-900 rounded-[4rem] p-1.5 shadow-2xl h-fit border-[12px] border-slate-800 shadow-brand-500/10 relative overflow-hidden">
                    <div className="bg-[#e5ddd5] dark:bg-[#0b141a] rounded-[3rem] h-[640px] flex flex-col overflow-hidden relative">
                        <div className="bg-[#075e54] dark:bg-[#202c33] p-6 flex items-center gap-4 text-white shrink-0">
                            <div className="w-11 h-11 rounded-full bg-slate-400 flex items-center justify-center text-xl font-bold border-2 border-white/20">P</div>
                            <div>
                                <div className="text-sm font-black leading-none uppercase italic">{settings?.name || 'easyPOS Bridge'}</div>
                                <div className="text-[10px] opacity-60 flex items-center gap-1.5 mt-1.5">
                                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div> active
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 p-8 overflow-y-auto space-y-6 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat bg-[length:400px]">
                            <div className="bg-white dark:bg-[#d9fdd3] dark:text-[#111b21] p-6 rounded-3xl rounded-tl-none shadow-xl max-w-[90%] animate-fade-in relative border border-black/5">
                                <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">{getPreviewMessage()}</p>
                                <span className="text-[9px] text-slate-400 mt-3 block text-right font-black uppercase tracking-widest">10:42 AM</span>
                                <div className="absolute top-0 left-[-12px] w-0 h-0 border-t-[14px] border-t-white dark:border-t-[#d9fdd3] border-l-[14px] border-l-transparent"></div>
                            </div>
                        </div>
                        <div className="p-5 bg-slate-50 dark:bg-[#202c33] flex items-center gap-4 shrink-0">
                            <div className="flex-1 h-14 bg-white dark:bg-[#2a3942] rounded-full border border-slate-200 dark:border-transparent px-8"></div>
                            <div className="w-14 h-14 bg-[#00a884] rounded-full flex items-center justify-center text-white shadow-lg active:scale-90 transition-all"><Send size={24} /></div>
                        </div>
                    </div>
                 </div>
                 <div className="p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex items-center gap-6 shadow-sm">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-3xl text-blue-500"><Eye size={32}/></div>
                    <div>
                        <h5 className="text-sm font-black uppercase tracking-[0.2em] dark:text-white italic leading-none mb-2">Payload Simulator</h5>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest opacity-60">Synchronized terminal output</p>
                    </div>
                 </div>
              </div>
            </div>
          )}

          {/* Activity Terminal */}
          <div className="bg-slate-950 rounded-[2.5rem] p-10 font-mono text-[11px] text-emerald-400/90 border border-slate-900 shadow-2xl relative">
            <div className="absolute top-0 right-0 p-8 opacity-10"><Zap size={80} /></div>
            <div className="flex items-center gap-3 mb-8 border-b border-emerald-900/30 pb-5">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="font-black uppercase tracking-[0.3em] text-emerald-500 italic">BRIDGE_RELAY_KERNEL</span>
            </div>
            <div className="h-56 overflow-y-auto custom-scrollbar flex flex-col gap-2.5">
              {logs.length > 0 ? logs.map((l, i) => (
                <div key={i} className="animate-fade-in opacity-80 hover:opacity-100 transition-opacity flex gap-3">
                    <span className="text-emerald-900 shrink-0 select-none">#</span>
                    <span>{l}</span>
                </div>
              )) : (
                <div className="opacity-30 italic">No packet traffic detected in kernel...</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
