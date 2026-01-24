import React, { useState, useEffect, useRef } from 'react';
import { StoreSettings } from '../types';
import { MessageCircle, Save, Smartphone, LayoutTemplate, AlertCircle, RefreshCw, QrCode, CheckCircle, Loader2, Wifi, WifiOff, Settings, Link, Info, Server, Globe, Shield, Lock, PlayCircle, Terminal, MoreVertical } from 'lucide-react';
import { toDataURL } from 'qrcode';

interface BaileysSetupProps {
  onUpdateStoreSettings: (settings: StoreSettings) => void;
  settings?: StoreSettings;
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
type ConnectionStatus = 'disconnected' | 'initializing' | 'ready' | 'connecting' | 'connected';

interface ConnectionConfig {
    phoneNumber: string;
    useProxy: boolean;
    proxyHost: string;
    proxyPort: string;
    proxyUser: string;
    proxyPass: string;
}

export const BaileysSetup: React.FC<BaileysSetupProps> = ({ onUpdateStoreSettings, settings }) => {
  const [activeTab, setActiveTab] = useState<Tab>('connect');
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  
  // Connection State
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [connectedSession, setConnectedSession] = useState<{ name: string; number: string; platform: string } | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // QR Refresh Timer
  const [qrTimer, setQrTimer] = useState(0);

  // Configuration State
  const [config, setConfig] = useState<ConnectionConfig>({
      phoneNumber: settings?.whatsappPhoneNumber || '',
      useProxy: false,
      proxyHost: '',
      proxyPort: '',
      proxyUser: '',
      proxyPass: ''
  });

  // Load existing settings & session
  useEffect(() => {
    const saved = localStorage.getItem('easyPOS_storeSettings');
    if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.whatsappTemplate) {
            setTemplate(parsed.whatsappTemplate);
        }
    }
    
    // Check if we have a session saved
    const savedSession = localStorage.getItem('easyPOS_whatsappSession');
    if (savedSession) {
        setConnectedSession(JSON.parse(savedSession));
        setStatus('connected');
        addLog('Restored active session from local storage.');
    }
  }, []);

  // Update config when settings change (if not connected)
  useEffect(() => {
     if (settings?.whatsappPhoneNumber && status === 'disconnected' && !config.phoneNumber) {
         setConfig(prev => ({...prev, phoneNumber: settings.whatsappPhoneNumber!}));
     }
  }, [settings, status]);

  // Scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // QR Code Rotation Logic (Simulating Real Baileys Behavior)
  useEffect(() => {
    let interval: any;
    
    if (status === 'ready') {
        const generateQR = async () => {
            // Mimic Baileys QR format: ref,publicKey,clientId
            const randomRef = Math.random().toString(36).substring(2, 15);
            const randomKey = btoa(Math.random().toString()).substring(0, 20);
            const qrData = `${randomRef},${randomKey},${config.phoneNumber}`;
            
            try {
                const url = await toDataURL(qrData, { 
                    width: 300, 
                    margin: 2, 
                    color: { dark: '#111827', light: '#ffffff' } 
                });
                setQrCodeUrl(url);
                addLog('QR Code rotated. Waiting for scan...');
                setQrTimer(20); // Reset timer
            } catch (e) {
                console.error(e);
            }
        };

        generateQR(); // Initial

        interval = setInterval(() => {
            setQrTimer((prev) => {
                if (prev <= 1) {
                    generateQR();
                    return 20;
                }
                return prev - 1;
            });
        }, 1000);
    }

    return () => clearInterval(interval);
  }, [status]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleSaveTemplate = () => {
    const saved = localStorage.getItem('easyPOS_storeSettings');
    const currentSettings = saved ? JSON.parse(saved) : {};
    
    const newSettings = {
        ...currentSettings,
        whatsappTemplate: template
    };

    onUpdateStoreSettings(newSettings);
    alert("WhatsApp Receipt Template Saved!");
  };

  const resetTemplate = () => {
    if(window.confirm("Reset to default template?")) {
        setTemplate(DEFAULT_TEMPLATE);
    }
  };

  const handleStartConnection = async () => {
      if (!config.phoneNumber) {
          alert("Please enter the WhatsApp Phone Number you intend to connect.");
          return;
      }
      
      setLogs([]);
      setStatus('initializing');
      addLog('Initializing Baileys Socket...');
      
      // Simulate socket connection delay
      setTimeout(() => {
          addLog('Connected to WebSocket Server.');
          if (config.useProxy) {
              addLog(`Using Proxy: ${config.proxyHost}:${config.proxyPort}`);
          }
          addLog('Fetching latest MD version...');
          
          setTimeout(() => {
              setStatus('ready');
          }, 800);
      }, 1000);
  };

  const handleSimulateScan = () => {
      if (status !== 'ready') return;
      
      setStatus('connecting');
      addLog('QR Code Scanned!');
      addLog('Exchanging keys...');
      
      // Simulate auth flow
      setTimeout(() => {
          addLog('Authenticated successfully.');
          addLog('Syncing history...');
          
          setTimeout(() => {
              const session = { 
                  name: "Store Owner", 
                  number: config.phoneNumber,
                  platform: "Bailyes-Web-Client"
              };
              setConnectedSession(session);
              setStatus('connected');
              addLog('Session Active. Ready to send messages.');
              localStorage.setItem('easyPOS_whatsappSession', JSON.stringify(session));
          }, 1500);
      }, 1500);
  };

  const handleDisconnect = () => {
      if(window.confirm("Are you sure you want to disconnect?")) {
          setConnectedSession(null);
          setStatus('disconnected');
          localStorage.removeItem('easyPOS_whatsappSession');
          setQrCodeUrl('');
          addLog('Session terminated by user.');
      }
  };

  const getPreview = () => {
    const previewData = {
        store_name: "My Store",
        order_id: "123456",
        date: new Date().toLocaleString(),
        items: "- Coffee (x2): $5.00\n- Croissant (x1): $3.50",
        subtotal: "$8.50",
        discount: "$0.00",
        total: "$8.50",
        footer: "Thank you for shopping with us!"
      };

    return template
      .replace(/{store_name}/g, previewData.store_name)
      .replace(/{order_id}/g, previewData.order_id)
      .replace(/{date}/g, previewData.date)
      .replace(/{items}/g, previewData.items)
      .replace(/{subtotal}/g, previewData.subtotal)
      .replace(/{discount}/g, previewData.discount)
      .replace(/{total}/g, previewData.total)
      .replace(/{footer}/g, previewData.footer);
  };

  return (
    <div className="flex flex-col h-full bg-[#f0f2f5] overflow-hidden">
        {/* Header Section */}
       <div className="bg-[#00a884] text-white px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 shadow-md z-10">
           <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                    <MessageCircle size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold">WhatsApp Integration</h2>
                    <p className="text-xs opacity-90">Powered by Baileys Multi-Device</p>
                </div>
           </div>
           
           <div className="flex bg-[#008f6f] p-1 rounded-lg">
               <button 
                 onClick={() => setActiveTab('connect')}
                 className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'connect' ? 'bg-white text-[#00a884] shadow-sm' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
               >
                   <Link size={16} /> Device Connect
               </button>
               <button 
                 onClick={() => setActiveTab('template')}
                 className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'template' ? 'bg-white text-[#00a884] shadow-sm' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
               >
                   <Settings size={16} /> Template Config
               </button>
           </div>
       </div>

       <div className="flex-1 overflow-y-auto p-4 md:p-8">
           <div className="max-w-6xl mx-auto h-full">
               
               {/* --- CONNECTION TAB --- */}
               {activeTab === 'connect' && (
                   <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
                       
                       {/* Left: Configuration & Logs */}
                       <div className="lg:col-span-4 space-y-4">
                           {/* Status Card */}
                           <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                               <h3 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-wider">Session Status</h3>
                               
                               <div className="flex items-center gap-3 mb-4">
                                   <div className={`w-3 h-3 rounded-full ${status === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                                   <span className="font-semibold text-gray-700 capitalize">{status}</span>
                               </div>

                               {status === 'connected' && (
                                   <div className="bg-green-50 border border-green-100 p-4 rounded-lg mb-4">
                                       <div className="flex items-center gap-3 mb-2">
                                           <div className="w-10 h-10 bg-green-200 rounded-full flex items-center justify-center text-green-700">
                                               <Smartphone size={20} />
                                           </div>
                                           <div>
                                               <div className="font-bold text-gray-800">{connectedSession?.name}</div>
                                               <div className="text-xs text-gray-500">{connectedSession?.number}</div>
                                           </div>
                                       </div>
                                       <button 
                                            onClick={handleDisconnect}
                                            className="w-full mt-2 text-xs font-bold text-red-500 hover:text-red-700 border border-red-200 rounded py-1.5 hover:bg-red-50 transition-colors"
                                        >
                                            Disconnect
                                        </button>
                                   </div>
                               )}

                               {status === 'disconnected' && (
                                   <button 
                                     onClick={handleStartConnection}
                                     className="w-full bg-[#00a884] hover:bg-[#008f6f] text-white py-2.5 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
                                   >
                                       <PlayCircle size={18} /> Start Session
                                   </button>
                               )}
                           </div>

                           {/* Logs Terminal */}
                           <div className="bg-gray-900 rounded-lg shadow-sm border border-gray-800 overflow-hidden flex flex-col h-[300px]">
                               <div className="bg-gray-800 px-4 py-2 flex items-center gap-2 border-b border-gray-700">
                                   <Terminal size={14} className="text-gray-400" />
                                   <span className="text-xs font-mono text-gray-300">Connection Logs</span>
                               </div>
                               <div className="flex-1 p-4 overflow-y-auto font-mono text-xs text-green-400 space-y-1">
                                   {logs.length === 0 && <span className="text-gray-600 italic">Waiting for activity...</span>}
                                   {logs.map((log, i) => (
                                       <div key={i}>{log}</div>
                                   ))}
                                   <div ref={logsEndRef}></div>
                               </div>
                           </div>
                       </div>

                       {/* Right: QR Display & WhatsApp Style UI */}
                       <div className="lg:col-span-8">
                           <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden h-full min-h-[500px] flex flex-col">
                               {status === 'connected' ? (
                                   <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
                                        <div className="w-24 h-24 bg-[#d9fdd3] rounded-full flex items-center justify-center mb-6">
                                            <CheckCircle size={48} className="text-[#00a884]" />
                                        </div>
                                        <h2 className="text-2xl font-light text-gray-800 mb-2">WhatsApp is connected</h2>
                                        <p className="text-gray-500 max-w-md">
                                            The system is ready to send automated receipts and notifications to 
                                            <span className="font-bold text-gray-800 ml-1">{config.phoneNumber}</span>.
                                        </p>
                                        <div className="mt-8 grid grid-cols-3 gap-4 w-full max-w-lg">
                                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                                <div className="font-bold text-xl text-gray-800">Ready</div>
                                                <div className="text-xs text-gray-500 uppercase">Status</div>
                                            </div>
                                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                                <div className="font-bold text-xl text-gray-800">Stable</div>
                                                <div className="text-xs text-gray-500 uppercase">Connection</div>
                                            </div>
                                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                                <div className="font-bold text-xl text-gray-800">0ms</div>
                                                <div className="text-xs text-gray-500 uppercase">Latency</div>
                                            </div>
                                        </div>
                                   </div>
                               ) : status === 'disconnected' ? (
                                   <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
                                       <div className="mb-4 opacity-20">
                                            <QrCode size={80} />
                                       </div>
                                       <h3 className="text-lg font-medium text-gray-600">No Active Session</h3>
                                       <p className="text-sm">Click "Start Session" on the left panel to begin.</p>
                                   </div>
                               ) : (
                                   // WhatsApp Web Style QR Screen
                                   <div className="flex-1 flex flex-col md:flex-row p-8 md:p-12 gap-8 md:gap-12 animate-fade-in">
                                       <div className="flex-1 space-y-6">
                                           <h2 className="text-3xl font-light text-gray-700">Use WhatsApp on your computer</h2>
                                           <ol className="list-decimal ml-5 space-y-4 text-gray-600 text-lg">
                                               <li>Open WhatsApp on your phone</li>
                                               <li>Tap <strong>Menu</strong> <MoreVertical size={16} className="inline"/> or <strong>Settings</strong> <Settings size={16} className="inline"/> and select <strong>Linked Devices</strong></li>
                                               <li>Tap on <strong>Link a Device</strong></li>
                                               <li>Point your phone to this screen to capture the code</li>
                                           </ol>
                                           <div className="pt-4 text-[#00a884] font-medium cursor-pointer hover:underline text-sm">
                                               Need help getting started?
                                           </div>
                                       </div>

                                       <div className="relative">
                                           <div className="bg-white border border-gray-200 rounded-lg p-2 shadow-sm inline-block relative">
                                                {status === 'initializing' || status === 'connecting' ? (
                                                    <div className="w-[264px] h-[264px] flex flex-col items-center justify-center bg-gray-50">
                                                        <Loader2 className="animate-spin text-[#00a884] mb-4" size={40} />
                                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{status === 'initializing' ? 'Generating Keys...' : 'Authenticating...'}</p>
                                                    </div>
                                                ) : (
                                                    <div className="relative group">
                                                        <img src={qrCodeUrl} alt="QR Code" className="w-[264px] h-[264px]" />
                                                        <div className="absolute inset-0 flex items-center justify-center bg-white/90 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <div className="text-center">
                                                                <div className="text-[#00a884] font-bold mb-2">Scan with App</div>
                                                            </div>
                                                        </div>
                                                        {/* Fake "Keep me signed in" */}
                                                        <div className="absolute -bottom-10 left-0 w-full flex items-center justify-center gap-2">
                                                            <div className="w-4 h-4 rounded-full border border-gray-300 bg-[#00a884] flex items-center justify-center">
                                                                <CheckCircle size={10} className="text-white" />
                                                            </div>
                                                            <span className="text-sm text-gray-600 font-medium">Keep me signed in</span>
                                                        </div>
                                                    </div>
                                                )}
                                           </div>
                                           
                                           {/* Mock Sim Button strictly for demo purposes */}
                                            {status === 'ready' && (
                                                <button 
                                                    onClick={handleSimulateScan}
                                                    className="absolute -bottom-20 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-full text-xs font-bold border border-gray-300 transition-colors"
                                                >
                                                    [DEBUG] Simulate Phone Scan
                                                </button>
                                            )}
                                       </div>
                                   </div>
                               )}
                           </div>
                       </div>
                   </div>
               )}

               {/* --- TEMPLATE TAB --- */}
               {activeTab === 'template' && (
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                       {/* Editor */}
                       <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col h-full">
                           <div className="flex justify-between items-center mb-4">
                               <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                   <LayoutTemplate size={20} className="text-gray-400"/> Message Template
                               </h3>
                               <button onClick={resetTemplate} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                                   <RefreshCw size={12} /> Reset Default
                               </button>
                           </div>
                           
                           <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4 text-xs text-gray-600 space-y-1">
                               <p className="font-bold text-gray-700 mb-1">Available Placeholders:</p>
                               <div className="grid grid-cols-2 gap-2 font-mono">
                                   <span>{`{store_name}`}</span>
                                   <span>{`{order_id}`}</span>
                                   <span>{`{date}`}</span>
                                   <span>{`{items}`}</span>
                                   <span>{`{total}`}</span>
                                   <span>{`{footer}`}</span>
                               </div>
                           </div>

                           <textarea 
                              value={template}
                              onChange={(e) => setTemplate(e.target.value)}
                              className="flex-1 w-full p-4 border border-gray-200 rounded-lg font-mono text-sm focus:ring-2 focus:ring-[#00a884] outline-none resize-none min-h-[300px]"
                              placeholder="Type your message template here..."
                           />

                           <div className="mt-4">
                               <button 
                                 onClick={handleSaveTemplate}
                                 className="w-full bg-[#00a884] hover:bg-[#008f6f] text-white py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
                               >
                                   <Save size={20} /> Save Configuration
                               </button>
                           </div>
                       </div>

                       {/* Phone Preview */}
                       <div className="flex flex-col h-full">
                           <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                               <Smartphone size={20} className="text-gray-400"/> Live Preview
                           </h3>
                           
                           <div className="flex-1 bg-gray-200 rounded-[3rem] border-8 border-gray-800 p-4 max-w-sm mx-auto w-full relative shadow-2xl min-h-[500px]">
                               <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-gray-800 rounded-b-xl z-10"></div>
                               
                               <div className="bg-[#e5ddd5] h-full w-full rounded-[2rem] overflow-hidden flex flex-col relative">
                                   <div className="bg-[#075e54] p-4 pt-8 text-white flex items-center gap-3 shadow-md z-10">
                                       <div className="w-8 h-8 rounded-full bg-gray-300"></div>
                                       <div className="flex-1">
                                           <div className="font-bold text-sm">Customer</div>
                                           <div className="text-[10px] opacity-80">online</div>
                                       </div>
                                   </div>

                                   <div className="flex-1 p-4 overflow-y-auto" style={{backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundSize: '300px'}}>
                                       <div className="bg-[#dcf8c6] p-3 rounded-lg rounded-tr-none shadow-sm max-w-[90%] ml-auto mb-2 text-sm text-gray-800 whitespace-pre-wrap">
                                           {getPreview()}
                                           <div className="text-[10px] text-gray-400 text-right mt-1 flex items-center justify-end gap-1">
                                               {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                               <span className="text-blue-400">✓✓</span>
                                           </div>
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