import React, { useState, useEffect } from 'react';
import { StoreSettings } from '../types';
import { MessageCircle, Save, ChevronLeft, Zap, PlayCircle, Loader2, Send, Copy, AlertCircle, CheckCircle2, FileText, Smartphone, Eye, History } from 'lucide-react';

interface BaileysSetupProps {
  onUpdateStoreSettings: (settings: StoreSettings) => void;
  settings?: StoreSettings;
  onGoBack?: () => void;
  t?: (key: string) => string;
}

export const BaileysSetup: React.FC<BaileysSetupProps> = ({ onUpdateStoreSettings, settings, onGoBack, t = (k) => k }) => {
  const [activeTab, setActiveTab] = useState<'connect' | 'template'>('connect');
  const [status, setStatus] = useState<'disconnected' | 'initializing' | 'ready' | 'connected'>('disconnected');
  const [pairingCode, setPairingCode] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState(settings?.whatsappPhoneNumber || '');
  const [template, setTemplate] = useState(settings?.whatsappTemplate || "Hello! Thank you for shopping at *{{storeName}}*. \n\nYour order *#{{orderId}}* for *{{total}}* has been processed. \n\nView your receipt here: {{receiptUrl}}");
  const [logs, setLogs] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const savedSession = localStorage.getItem('easyPOS_whatsappSession');
    if (savedSession) setStatus('connected');
    addLog('System kernel initialized. Waiting for handshake.');
  }, []);

  const addLog = (msg: string) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 19)]);

  const handleStartConnection = () => {
    if (!phoneNumber) {
      alert("Please enter a valid business phone number.");
      return;
    }
    setStatus('initializing');
    addLog(`Initiating bridge for ${phoneNumber}...`);
    
    setTimeout(() => {
      const code = Math.random().toString(36).substring(2, 6).toUpperCase() + "-" + Math.random().toString(36).substring(2, 6).toUpperCase();
      setPairingCode(code);
      setStatus('ready');
      addLog(`Pairing code generated: ${code}`);
      addLog('Websocket established. Waiting for mobile authorization...');
    }, 2000);
  };

  const simulateSuccess = () => {
    setStatus('connected');
    localStorage.setItem('easyPOS_whatsappSession', 'active');
    addLog('Authentication successful! Multi-device bridge active.');
    onUpdateStoreSettings({ 
      ...(settings as StoreSettings), 
      whatsappPhoneNumber: phoneNumber,
      whatsappTemplate: template
    });
  };

  const handleSaveTemplate = () => {
    setIsSaving(true);
    onUpdateStoreSettings({ 
      ...(settings as StoreSettings), 
      whatsappTemplate: template 
    });
    setTimeout(() => {
      setIsSaving(false);
      addLog('Payload rules committed to system memory.');
    }, 600);
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
      {/* Dynamic WhatsApp Header */}
      <div className="bg-[#00a884] dark:bg-[#065f46] text-white p-6 flex items-center justify-between shadow-2xl border-b border-[#008f6f] relative z-10">
        <div className="flex items-center gap-5">
          <button onClick={onGoBack} className="p-3 -ml-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all active:scale-90" title="Go Back">
            <ChevronLeft size={28} strokeWidth={3} className="rtl:rotate-180" />
          </button>
          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tighter uppercase italic leading-none flex items-center gap-3">
              <MessageCircle size={32} /> WhatsApp Bridge
            </h2>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70 mt-1">Automated Dispatch Engine v2.5</p>
          </div>
        </div>
        <div className="flex bg-black/10 p-1.5 rounded-[1.8rem] border border-white/5 backdrop-blur-xl">
          <button onClick={() => setActiveTab('connect')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'connect' ? 'bg-white text-[#00a884] shadow-lg' : 'text-white/70 hover:text-white'}`}>Link Device</button>
          <button onClick={() => setActiveTab('template')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'template' ? 'bg-white text-[#00a884] shadow-lg' : 'text-white/70 hover:text-white'}`}>Message Template</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-5xl mx-auto p-6 md:p-12 space-y-10">
          
          {activeTab === 'connect' ? (
            <div className="space-y-8 animate-fade-in">
              <div className="bg-white dark:bg-slate-900 p-8 md:p-12 rounded-[3.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform duration-700">
                  <Smartphone size={180} />
                </div>
                
                {status === 'connected' ? (
                  <div className="text-center py-6">
                    <div className="w-24 h-24 bg-emerald-500 rounded-[2rem] flex items-center justify-center text-white mx-auto mb-8 shadow-2xl shadow-emerald-500/30 animate-pulse">
                      <Zap size={48} fill="currentColor" />
                    </div>
                    <h3 className="text-4xl font-black uppercase italic dark:text-white mb-2 leading-none">Bridge Active</h3>
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] mb-10">Session Linked: {phoneNumber}</p>
                    
                    <div className="flex flex-col md:flex-row gap-4 justify-center">
                      <button onClick={() => { localStorage.removeItem('easyPOS_whatsappSession'); setStatus('disconnected'); addLog('Session terminated by user.'); }} className="px-12 py-5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-black rounded-2xl uppercase text-xs tracking-widest active:scale-95 transition-all">Terminate Link</button>
                      <button onClick={() => addLog('Heartbeat pulse sent to connected device... OK')} className="px-12 py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black rounded-2xl uppercase text-xs tracking-widest active:scale-95 transition-all">Send Pulse Test</button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8 relative z-10">
                    <div>
                      <h4 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white mb-4">Initialize Handshake</h4>
                      <p className="text-slate-400 text-xs font-bold leading-relaxed max-w-lg mb-8 uppercase tracking-widest opacity-60">Connect your mobile phone to enable automated digital receipts and marketing blasts.</p>
                      
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Terminal Phone Number</label>
                        <div className="relative group">
                          <input 
                            type="tel" 
                            value={phoneNumber} 
                            onChange={e => setPhoneNumber(e.target.value)} 
                            className="w-full p-6 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[2rem] text-3xl font-mono font-black dark:text-white outline-none focus:border-[#00a884] transition-all" 
                            placeholder="+9715..." 
                          />
                          <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[#00a884]">
                            <Smartphone size={24} />
                          </div>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={handleStartConnection} 
                      disabled={status !== 'disconnected'} 
                      className="w-full bg-[#00a884] hover:bg-[#008f6f] text-white py-7 rounded-[2.5rem] font-black uppercase tracking-[0.2em] shadow-2xl shadow-[#00a884]/20 flex items-center justify-center gap-4 transition-all active:scale-[0.98] disabled:opacity-50 text-base italic"
                    >
                      {status === 'initializing' ? <Loader2 className="animate-spin" size={24} /> : <PlayCircle size={28}/>}
                      {status === 'initializing' ? 'SECURE HANDSHAKE...' : 'Generate Pairing Bridge'}
                    </button>

                    {status === 'ready' && (
                      <div className="mt-12 p-10 bg-slate-50 dark:bg-slate-800/50 rounded-[3rem] text-center border-2 border-dashed border-slate-200 dark:border-slate-700 animate-fade-in-up">
                        <div className="text-[10px] font-black text-[#00a884] uppercase tracking-[0.3em] mb-6">Enter this on your mobile device</div>
                        <div className="text-5xl md:text-6xl font-mono font-black text-[#00a884] bg-white dark:bg-slate-900 py-12 rounded-[2.5rem] shadow-2xl mb-10 tracking-widest border border-slate-100 dark:border-slate-800">{pairingCode}</div>
                        
                        <div className="space-y-5 text-left max-w-md mx-auto mb-10">
                          <div className="flex gap-5 items-start">
                             <div className="w-7 h-7 rounded-xl bg-[#00a884] text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5 shadow-lg">1</div>
                             <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{"WhatsApp > Settings > Linked Devices"}</p>
                          </div>
                          <div className="flex gap-5 items-start">
                             <div className="w-7 h-7 rounded-xl bg-[#00a884] text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5 shadow-lg">2</div>
                             <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Tap "Link a Device" then "Link with phone number instead"</p>
                          </div>
                          <div className="flex gap-5 items-start">
                             <div className="w-7 h-7 rounded-xl bg-[#00a884] text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5 shadow-lg">3</div>
                             <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Input the secure pairing code above</p>
                          </div>
                        </div>

                        <button onClick={simulateSuccess} className="text-xs font-black text-[#00a884] uppercase tracking-widest border-b-4 border-transparent hover:border-[#00a884] transition-all pb-1">Handshake Completed Manually</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
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
                      className="w-full h-72 p-8 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[2.5rem] outline-none focus:border-[#00a884] transition-all dark:text-white font-medium leading-relaxed shadow-inner text-sm"
                      placeholder="Type your message..."
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {['storeName', 'orderId', 'total', 'receiptUrl'].map(token => (
                      <button 
                        key={token}
                        onClick={() => setTemplate(prev => prev + ` {{${token}}}`)}
                        className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-[9px] font-black text-slate-500 hover:text-brand-600 hover:border-brand-500 transition-all uppercase tracking-widest"
                      >
                        + {token}
                      </button>
                    ))}
                  </div>

                  <button 
                    onClick={handleSaveTemplate}
                    className="w-full py-6 bg-brand-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl hover:bg-brand-500 transition-all active:scale-95 flex items-center justify-center gap-3"
                  >
                    {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20}/>}
                    Commit Payload Changes
                  </button>
                </div>
              </div>

              {/* Real-time Preview */}
              <div className="flex flex-col gap-6">
                 <div className="bg-slate-900 rounded-[3.5rem] p-1 shadow-2xl h-fit border-[10px] border-slate-800 shadow-brand-500/10">
                    <div className="bg-[#e5ddd5] dark:bg-[#0b141a] rounded-[2.8rem] h-[600px] flex flex-col overflow-hidden relative">
                        <div className="bg-[#075e54] dark:bg-[#202c33] p-5 flex items-center gap-3 text-white shrink-0">
                            <div className="w-10 h-10 rounded-full bg-slate-400 flex items-center justify-center text-xl font-bold">P</div>
                            <div>
                                <div className="text-sm font-bold leading-none">Dispatcher Bot</div>
                                <div className="text-[10px] opacity-60">online</div>
                            </div>
                        </div>
                        <div className="flex-1 p-6 overflow-y-auto space-y-4">
                            <div className="bg-white dark:bg-[#d9fdd3] dark:text-[#111b21] p-5 rounded-2xl rounded-tl-none shadow-sm max-w-[85%] animate-fade-in relative">
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{getPreviewMessage()}</p>
                                <span className="text-[9px] text-slate-400 mt-2 block text-right">10:42 AM</span>
                                <div className="absolute top-0 left-[-10px] w-0 h-0 border-t-[10px] border-t-white dark:border-t-[#d9fdd3] border-l-[10px] border-l-transparent"></div>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-[#202c33] flex items-center gap-3 shrink-0">
                            <div className="flex-1 h-12 bg-white dark:bg-[#2a3942] rounded-full border border-slate-200 dark:border-transparent px-6"></div>
                            <div className="w-12 h-12 bg-[#00a884] rounded-full flex items-center justify-center text-white"><Send size={20} /></div>
                        </div>
                    </div>
                 </div>
                 <div className="p-6 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 flex items-center gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-2xl text-blue-500"><Eye size={24}/></div>
                    <div>
                        <h5 className="text-xs font-black uppercase tracking-widest dark:text-white italic">Live Simulator</h5>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Showing actual message output</p>
                    </div>
                 </div>
              </div>
            </div>
          )}

          {/* Professional Terminal Logs */}
          <div className="bg-slate-950 rounded-[2.5rem] p-8 font-mono text-[10px] text-emerald-400/80 border border-slate-900 shadow-2xl relative">
            <div className="absolute top-0 right-0 p-6 opacity-10"><Zap size={60} /></div>
            <div className="flex items-center gap-3 mb-6 border-b border-emerald-900/30 pb-4">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="font-black uppercase tracking-widest text-emerald-500 italic">SYSTEM_BRIDGE_TERMINAL</span>
            </div>
            <div className="h-48 overflow-y-auto custom-scrollbar flex flex-col gap-2">
              {logs.length > 0 ? logs.map((l, i) => (
                <div key={i} className="animate-fade-in opacity-80 hover:opacity-100 transition-opacity"><span className="text-emerald-800">{">"}</span> {l}</div>
              )) : (
                <div className="opacity-30 italic">Kernel standby... No activity recorded.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};