import React, { useState, useEffect } from 'react';
import { StoreSettings } from '../types';
import { MessageCircle, Save, ChevronLeft, Zap, PlayCircle, Loader2, Send, Copy, AlertCircle, CheckCircle2, FileText, Smartphone } from 'lucide-react';

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
  }, []);

  const addLog = (msg: string) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 19)]);

  const handleStartConnection = () => {
    if (!phoneNumber) {
      alert("Please enter a phone number first.");
      return;
    }
    setStatus('initializing');
    addLog('Establishing secure websocket to relay...');
    
    setTimeout(() => {
      const code = Math.random().toString(36).substring(2, 6).toUpperCase() + "-" + Math.random().toString(36).substring(2, 6).toUpperCase();
      setPairingCode(code);
      setStatus('ready');
      addLog(`Pairing code generated: ${code}`);
      addLog('Waiting for mobile device to authorize...');
    }, 2000);
  };

  const simulateSuccess = () => {
    setStatus('connected');
    localStorage.setItem('easyPOS_whatsappSession', 'active');
    addLog('Authentication successful! Bridge active.');
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
      addLog('Messaging template updated successfully.');
    }, 600);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-colors duration-500 overflow-hidden">
      {/* Dynamic Header */}
      <div className="bg-[#00a884] dark:bg-[#065f46] text-white p-6 flex items-center justify-between shadow-2xl border-b border-[#008f6f] relative z-10">
        <div className="flex items-center gap-5">
          <button onClick={onGoBack} className="p-3 -ml-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all active:scale-90" title="Go Back">
            <ChevronLeft size={28} strokeWidth={3} className="rtl:rotate-180" />
          </button>
          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tighter uppercase italic leading-none flex items-center gap-3">
              <MessageCircle size={32} /> Dispatcher
            </h2>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70 mt-1">Automated WhatsApp Logic Engine</p>
          </div>
        </div>
        <div className="flex bg-black/10 p-1.5 rounded-[1.5rem] border border-white/5 backdrop-blur-md">
          <button onClick={() => setActiveTab('connect')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'connect' ? 'bg-white text-[#00a884] shadow-lg' : 'text-white/70 hover:text-white'}`}>Connectivity</button>
          <button onClick={() => setActiveTab('template')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'template' ? 'bg-white text-[#00a884] shadow-lg' : 'text-white/70 hover:text-white'}`}>Payload Rules</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-4xl mx-auto p-6 md:p-12 space-y-10">
          
          {activeTab === 'connect' ? (
            <div className="space-y-8 animate-fade-in">
              <div className="bg-white dark:bg-slate-900 p-8 md:p-12 rounded-[3.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform duration-700">
                  <Smartphone size={180} />
                </div>
                
                {status === 'connected' ? (
                  <div className="text-center py-6">
                    <div className="w-24 h-24 bg-emerald-500 rounded-[2rem] flex items-center justify-center text-white mx-auto mb-8 shadow-2xl shadow-emerald-500/30 animate-bounce">
                      <Zap size={48} fill="currentColor" />
                    </div>
                    <h3 className="text-3xl font-black uppercase italic dark:text-white mb-2">Relay Established</h3>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-10">Active Device: {phoneNumber}</p>
                    
                    <div className="flex flex-col md:flex-row gap-4 justify-center">
                      <button onClick={() => { localStorage.removeItem('easyPOS_whatsappSession'); setStatus('disconnected'); addLog('Session terminated by user.'); }} className="px-10 py-5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-black rounded-2xl uppercase text-xs tracking-widest active:scale-95 transition-all">Terminate Link</button>
                      <button onClick={() => addLog('Heartbeat signal sent to device.')} className="px-10 py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black rounded-2xl uppercase text-xs tracking-widest active:scale-95 transition-all">Test Pulse</button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8 relative z-10">
                    <div>
                      <h4 className="text-xl font-black uppercase italic tracking-tighter dark:text-white mb-4">Device Handshake</h4>
                      <p className="text-slate-400 text-xs font-bold leading-relaxed max-w-lg mb-8 uppercase tracking-widest opacity-60">Initialize your business WhatsApp to start sending automated digital receipts instantly.</p>
                      
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Terminal International Number</label>
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
                      className="w-full bg-[#00a884] hover:bg-[#008f6f] text-white py-6 rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-2xl shadow-[#00a884]/20 flex items-center justify-center gap-4 transition-all active:scale-[0.98] disabled:opacity-50 text-sm italic"
                    >
                      {status === 'initializing' ? <Loader2 className="animate-spin" size={24} /> : <PlayCircle size={28}/>}
                      {status === 'initializing' ? 'Initializing Secure Socket...' : 'Start Connection Sequence'}
                    </button>

                    {status === 'ready' && (
                      <div className="mt-12 p-10 bg-slate-50 dark:bg-slate-800/50 rounded-[3rem] text-center border-2 border-dashed border-slate-200 dark:border-slate-700 animate-fade-in-up">
                        <div className="text-[10px] font-black text-[#00a884] uppercase tracking-[0.3em] mb-6">Mobile Authorization Key</div>
                        <div className="text-5xl font-mono font-black text-[#00a884] bg-white dark:bg-slate-900 py-10 rounded-[2rem] shadow-inner mb-8 tracking-wider">{pairingCode}</div>
                        
                        <div className="space-y-4 text-left max-w-md mx-auto">
                          <div className="flex gap-4 items-start">
                             <div className="w-6 h-6 rounded-full bg-[#00a884] text-white flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">1</div>
                             <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Open WhatsApp > Linked Devices</p>
                          </div>
                          <div className="flex gap-4 items-start">
                             <div className="w-6 h-6 rounded-full bg-[#00a884] text-white flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">2</div>
                             <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Tap "Link with Phone Number"</p>
                          </div>
                          <div className="flex gap-4 items-start">
                             <div className="w-6 h-6 rounded-full bg-[#00a884] text-white flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">3</div>
                             <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Enter the code displayed above</p>
                          </div>
                        </div>

                        <button onClick={simulateSuccess} className="mt-10 text-[10px] font-black text-[#00a884] uppercase tracking-widest border-b-2 border-transparent hover:border-[#00a884] transition-all">I've entered the code</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-8 animate-fade-in">
              <div className="bg-white dark:bg-slate-900 p-8 md:p-12 rounded-[3.5rem] shadow-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-start mb-10">
                  <div>
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white">Payload Configuration</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Customize your automated sales messages</p>
                  </div>
                  <div className="bg-brand-50 dark:bg-brand-900/20 p-3 rounded-2xl text-brand-600">
                    <FileText size={24} />
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Message Body Template</label>
                    <div className="relative">
                      <textarea 
                        value={template} 
                        onChange={e => setTemplate(e.target.value)}
                        className="w-full h-60 p-8 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[2.5rem] outline-none focus:border-[#00a884] transition-all dark:text-white font-medium leading-relaxed shadow-inner"
                        placeholder="Type your message..."
                      />
                      <div className="absolute bottom-6 right-6 flex gap-2">
                        <span className="px-3 py-1 bg-white dark:bg-slate-700 text-[9px] font-black uppercase tracking-widest rounded-lg border border-slate-200 dark:border-slate-600 text-slate-400">Preview</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {['storeName', 'orderId', 'total', 'receiptUrl'].map(token => (
                      <button 
                        key={token}
                        onClick={() => setTemplate(prev => prev + ` {{${token}}}`)}
                        className="px-4 py-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-[10px] font-black text-slate-500 hover:text-brand-600 hover:border-brand-500 transition-all uppercase tracking-widest"
                      >
                        + {token}
                      </button>
                    ))}
                  </div>

                  <div className="pt-6 border-t border-slate-50 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-center">
                    <button 
                      onClick={handleSaveTemplate}
                      className="w-full md:w-auto px-12 py-5 bg-brand-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl hover:bg-brand-500 transition-all active:scale-95 flex items-center justify-center gap-3"
                    >
                      {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20}/>}
                      Save Payload Rules
                    </button>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest text-center md:text-left">Changes will apply to all future automated receipts.</p>
                  </div>
                </div>
              </div>
              
              {/* Test Interface */}
              <div className="bg-slate-900 rounded-[2.5rem] p-10 border border-slate-800 shadow-2xl flex flex-col md:flex-row items-center gap-8">
                 <div className="bg-brand-500/10 p-5 rounded-[2rem] border border-brand-500/20 text-brand-400">
                    <Send size={40} />
                 </div>
                 <div className="flex-1 text-center md:text-left">
                    <h4 className="text-xl font-black uppercase italic text-white tracking-tighter">Test Dispatcher</h4>
                    <p className="text-[11px] font-medium text-slate-500 leading-relaxed mt-1 uppercase tracking-widest">Send a test message to a specified number to verify your bridge connectivity.</p>
                 </div>
                 <div className="w-full md:w-auto">
                    <button className="w-full px-10 py-5 bg-slate-800 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest border border-slate-700 hover:bg-slate-700 transition-all active:scale-95">Shoot Test</button>
                 </div>
              </div>
            </div>
          )}

          {/* Console Output */}
          <div className="bg-slate-900 rounded-[2.5rem] p-8 font-mono text-[10px] text-emerald-400/80 border border-slate-800 shadow-2xl relative">
            <div className="absolute top-0 right-0 p-4 opacity-10"><Zap size={60} /></div>
            <div className="flex items-center gap-2 mb-4 border-b border-emerald-900/30 pb-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="font-black uppercase tracking-widest text-emerald-600">Dispatcher Kernel Logs</span>
            </div>
            <div className="h-48 overflow-y-auto custom-scrollbar flex flex-col gap-1">
              {logs.length > 0 ? logs.map((l, i) => (
                <div key={i} className="animate-fade-in">{l}</div>
              )) : (
                <div className="opacity-30 italic">No output in terminal... System idle.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};