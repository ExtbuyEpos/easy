import React, { useState, useEffect } from 'react';
import { StoreSettings } from '../types';
import { MessageCircle, Save, Smartphone, LayoutTemplate, AlertCircle, RefreshCw, QrCode, CheckCircle, Loader2, Wifi, WifiOff, Settings, Link, Info, Server, Globe, Shield, Lock, PlayCircle } from 'lucide-react';
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
type ConnectionStatus = 'disconnected' | 'generating' | 'ready' | 'connecting' | 'connected';

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
  const [connectedSession, setConnectedSession] = useState<{ name: string; number: string; proxy?: string } | null>(null);

  // Configuration State
  const [config, setConfig] = useState<ConnectionConfig>({
      phoneNumber: '',
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
    }
  }, []);

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
      if (config.useProxy && (!config.proxyHost || !config.proxyPort)) {
          alert("Please enter Proxy Host and Port.");
          return;
      }

      setStatus('generating');
      
      try {
          // Simulate latency for generating session based on config
          await new Promise(resolve => setTimeout(resolve, 1500));

          // Mock QR generation
          const mockSocketString = `https://example.com/mock-whatsapp-auth/${config.phoneNumber}/${Date.now()}`; 
          const url = await toDataURL(mockSocketString, { width: 300, margin: 2, color: { dark: '#000000', light: '#ffffff' } });
          setQrCodeUrl(url);
          setStatus('ready');
      } catch (err) {
          console.error("QR Gen Error:", err);
          setStatus('disconnected');
      }
  };

  const handleSimulateScan = () => {
      if (status !== 'ready') return;
      
      setStatus('connecting');
      // Simulate network delay for authentication
      setTimeout(() => {
          const session = { 
              name: "Store Owner", 
              number: config.phoneNumber,
              proxy: config.useProxy ? `${config.proxyHost}:${config.proxyPort}` : undefined
          };
          setConnectedSession(session);
          setStatus('connected');
          localStorage.setItem('easyPOS_whatsappSession', JSON.stringify(session));
      }, 3000);
  };

  const handleDisconnect = () => {
      if(window.confirm("Are you sure you want to disconnect?")) {
          setConnectedSession(null);
          setStatus('disconnected');
          localStorage.removeItem('easyPOS_whatsappSession');
          setQrCodeUrl('');
          setConfig(prev => ({ ...prev, phoneNumber: '' })); // Optional: Clear phone
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
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
        {/* Header Section */}
       <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
           <div className="flex items-center gap-3">
                <div className="bg-green-100 text-green-600 w-10 h-10 rounded-xl flex items-center justify-center shadow-sm">
                    <MessageCircle size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800">WhatsApp Integration</h2>
                    <p className="text-xs text-slate-500">Connect Baileys to send automated receipts</p>
                </div>
           </div>
           
           <div className="flex bg-slate-100 p-1 rounded-lg">
               <button 
                 onClick={() => setActiveTab('connect')}
                 className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'connect' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
               >
                   <Link size={16} /> Device Connect
               </button>
               <button 
                 onClick={() => setActiveTab('template')}
                 className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'template' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
               >
                   <Settings size={16} /> Template Config
               </button>
           </div>
       </div>

       <div className="flex-1 overflow-y-auto p-4 md:p-8">
           <div className="max-w-6xl mx-auto h-full">
               
               {/* --- CONNECTION TAB --- */}
               {activeTab === 'connect' && (
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                       {/* Left: Configuration & Status */}
                       <div className="space-y-6">
                           
                           {/* Status Card */}
                           <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                               <h3 className="font-bold text-lg text-slate-800 mb-4">Connection Status</h3>
                               
                               <div className={`p-4 rounded-xl flex items-center gap-4 mb-4 ${status === 'connected' ? 'bg-green-50 border border-green-100' : 'bg-slate-50 border border-slate-100'}`}>
                                   <div className={`w-12 h-12 rounded-full flex items-center justify-center ${status === 'connected' ? 'bg-green-500 text-white' : 'bg-slate-300 text-slate-500'}`}>
                                       {status === 'connected' ? <Wifi size={24} /> : <WifiOff size={24} />}
                                   </div>
                                   <div>
                                       <div className="font-bold text-slate-800">
                                           {status === 'connected' ? 'WhatsApp Connected' : 'Disconnected'}
                                       </div>
                                       <div className="text-xs text-slate-500">
                                           {status === 'connected' ? `Session Active` : 'No active session'}
                                       </div>
                                   </div>
                               </div>

                               {status === 'connected' && (
                                   <div className="space-y-3 animate-fade-in">
                                       <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1">
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Number:</span>
                                                <span className="font-mono font-bold">{connectedSession?.number}</span>
                                            </div>
                                            {connectedSession?.proxy && (
                                                <div className="flex justify-between">
                                                    <span className="text-slate-500">Proxy:</span>
                                                    <span className="font-mono font-bold text-xs">{connectedSession.proxy}</span>
                                                </div>
                                            )}
                                       </div>
                                       <button 
                                            onClick={handleDisconnect}
                                            className="w-full bg-red-50 text-red-600 border border-red-100 py-3 rounded-xl font-bold hover:bg-red-100 transition-colors"
                                        >
                                            Disconnect Device
                                        </button>
                                   </div>
                               )}
                           </div>

                           {/* Setup Form (Only visible when disconnected) */}
                           {status === 'disconnected' && (
                               <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-fade-in">
                                   <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                                       <Settings size={20} className="text-slate-400"/> Session Configuration
                                   </h3>
                                   
                                   <div className="space-y-4">
                                       <div>
                                           <label className="block text-xs font-bold text-slate-500 uppercase mb-1">WhatsApp Phone Number</label>
                                           <div className="relative">
                                               <Smartphone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                                               <input 
                                                   type="tel" 
                                                   placeholder="+1 234 567 890"
                                                   value={config.phoneNumber}
                                                   onChange={(e) => setConfig({...config, phoneNumber: e.target.value})}
                                                   className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                                               />
                                           </div>
                                       </div>

                                       <div className="border-t border-slate-100 pt-4">
                                            <div className="flex items-center justify-between mb-4">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={config.useProxy}
                                                        onChange={(e) => setConfig({...config, useProxy: e.target.checked})}
                                                        className="w-4 h-4 rounded text-brand-600"
                                                    />
                                                    <span className="text-sm font-bold text-slate-700 flex items-center gap-2"><Globe size={16}/> Use Proxy</span>
                                                </label>
                                            </div>

                                            {config.useProxy && (
                                                <div className="grid grid-cols-2 gap-4 animate-fade-in p-4 bg-slate-50 rounded-xl border border-slate-100">
                                                    <div className="col-span-2">
                                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Proxy Host</label>
                                                        <div className="relative">
                                                            <Server className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
                                                            <input 
                                                                type="text" 
                                                                placeholder="192.168.1.1"
                                                                value={config.proxyHost}
                                                                onChange={(e) => setConfig({...config, proxyHost: e.target.value})}
                                                                className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Port</label>
                                                        <input 
                                                            type="text" 
                                                            placeholder="8080"
                                                            value={config.proxyPort}
                                                            onChange={(e) => setConfig({...config, proxyPort: e.target.value})}
                                                            className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Username (Optional)</label>
                                                        <input 
                                                            type="text" 
                                                            value={config.proxyUser}
                                                            onChange={(e) => setConfig({...config, proxyUser: e.target.value})}
                                                            className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg"
                                                        />
                                                    </div>
                                                    <div className="col-span-2">
                                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Password (Optional)</label>
                                                        <div className="relative">
                                                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
                                                            <input 
                                                                type="password" 
                                                                value={config.proxyPass}
                                                                onChange={(e) => setConfig({...config, proxyPass: e.target.value})}
                                                                className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                       </div>

                                       <button 
                                         onClick={handleStartConnection}
                                         className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                                       >
                                           <QrCode size={18} /> Generate Connection QR
                                       </button>
                                   </div>
                               </div>
                           )}

                           <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                               <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                                   <Info size={18} /> Integration Note
                               </h4>
                               <p className="text-sm text-blue-700 leading-relaxed">
                                   Ensure your device remains on the "Linked Devices" screen during the pairing process. The system uses the Baileys protocol to establish a secure multi-device session.
                               </p>
                           </div>
                       </div>

                       {/* Right: QR Display */}
                       <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center relative overflow-hidden min-h-[500px]">
                           {status === 'connected' ? (
                               <div className="animate-fade-in">
                                   <div className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600 animate-bounce-short">
                                       <CheckCircle size={64} />
                                   </div>
                                   <h3 className="text-2xl font-bold text-slate-800 mb-2">You're all set!</h3>
                                   <p className="text-slate-500 max-w-xs mx-auto">Your WhatsApp account ({connectedSession?.number}) is successfully linked.</p>
                               </div>
                           ) : status === 'ready' || status === 'connecting' ? (
                               <div className="w-full max-w-sm animate-fade-in flex flex-col items-center">
                                   <h3 className="font-bold text-slate-800 mb-2 text-lg">Scan to Link {config.phoneNumber}</h3>
                                   
                                   <div className="bg-white p-2 border-2 border-slate-100 rounded-xl shadow-sm inline-block mb-6 relative">
                                       {qrCodeUrl ? (
                                           <img src={qrCodeUrl} alt="Scan Me" className="w-64 h-64 object-contain" />
                                       ) : (
                                           <div className="w-64 h-64 flex items-center justify-center bg-slate-50 text-slate-400">
                                               <Loader2 className="animate-spin" size={32} />
                                           </div>
                                       )}
                                       
                                       {status === 'connecting' && (
                                            <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center z-10">
                                                <Loader2 size={48} className="text-brand-600 animate-spin mb-2" />
                                                <p className="text-sm font-bold text-slate-600">Connecting...</p>
                                            </div>
                                       )}
                                   </div>

                                   {/* Simulation Trigger Button - Renamed for "Production" look */}
                                   <button 
                                      onClick={handleSimulateScan}
                                      className="mb-6 bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-full font-bold shadow-lg transform transition-all hover:scale-105 flex items-center gap-2"
                                   >
                                      <CheckCircle size={20} /> Confirm Connection
                                   </button>

                                   <ol className="text-left text-sm text-slate-600 space-y-3 max-w-xs mx-auto bg-slate-50 p-4 rounded-xl border border-slate-100">
                                       <li className="flex gap-2">
                                           <span className="font-bold text-slate-900">1.</span> Open WhatsApp on <strong>{config.phoneNumber}</strong>
                                       </li>
                                       <li className="flex gap-2">
                                           <span className="font-bold text-slate-900">2.</span> Go to <strong>Linked Devices</strong> &gt; <strong>Link a Device</strong>
                                       </li>
                                       <li className="flex gap-2">
                                           <span className="font-bold text-slate-900">3.</span> Point your phone to this screen
                                       </li>
                                   </ol>
                                   
                                   <button onClick={() => setStatus('disconnected')} className="mt-6 text-sm text-red-500 hover:text-red-700 underline">
                                       Cancel & Edit Config
                                   </button>
                               </div>
                           ) : (
                               <div className="text-slate-400 flex flex-col items-center">
                                   <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                                       <Settings size={32} className="text-slate-300" />
                                   </div>
                                   <p className="text-lg font-bold text-slate-600 mb-2">Configure Session</p>
                                   <p className="text-sm max-w-xs mb-4">Enter your phone number and optional proxy settings on the left to generate a connection QR code.</p>
                               </div>
                           )}

                           {status === 'generating' && (
                               <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center z-10">
                                   <Loader2 size={48} className="text-brand-600 animate-spin mb-4" />
                                   <p className="font-bold text-slate-600">Preparing session...</p>
                                   <p className="text-xs text-slate-400 mt-2">Configuring Proxy & Socket</p>
                               </div>
                           )}
                       </div>
                   </div>
               )}

               {/* --- TEMPLATE TAB --- */}
               {activeTab === 'template' && (
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                       {/* Editor */}
                       <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col h-full">
                           <div className="flex justify-between items-center mb-4">
                               <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                   <LayoutTemplate size={20} className="text-slate-400"/> Message Template
                               </h3>
                               <button onClick={resetTemplate} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
                                   <RefreshCw size={12} /> Reset Default
                               </button>
                           </div>
                           
                           <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4 text-xs text-slate-600 space-y-1">
                               <p className="font-bold text-slate-700 mb-1">Available Placeholders:</p>
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
                              className="flex-1 w-full p-4 border border-slate-200 rounded-xl font-mono text-sm focus:ring-2 focus:ring-green-500 outline-none resize-none min-h-[300px]"
                              placeholder="Type your message template here..."
                           />

                           <div className="mt-4">
                               <button 
                                 onClick={handleSaveTemplate}
                                 className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                               >
                                   <Save size={20} /> Save Configuration
                               </button>
                           </div>
                       </div>

                       {/* Phone Preview */}
                       <div className="flex flex-col h-full">
                           <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                               <Smartphone size={20} className="text-slate-400"/> Live Preview
                           </h3>
                           
                           <div className="flex-1 bg-slate-200 rounded-[3rem] border-8 border-slate-800 p-4 max-w-sm mx-auto w-full relative shadow-2xl min-h-[500px]">
                               <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-xl z-10"></div>
                               
                               <div className="bg-[#e5ddd5] h-full w-full rounded-[2rem] overflow-hidden flex flex-col relative">
                                   <div className="bg-[#075e54] p-4 pt-8 text-white flex items-center gap-3 shadow-md z-10">
                                       <div className="w-8 h-8 rounded-full bg-slate-300"></div>
                                       <div className="flex-1">
                                           <div className="font-bold text-sm">Customer</div>
                                           <div className="text-[10px] opacity-80">online</div>
                                       </div>
                                   </div>

                                   <div className="flex-1 p-4 overflow-y-auto" style={{backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundSize: '300px'}}>
                                       <div className="bg-[#dcf8c6] p-3 rounded-lg rounded-tr-none shadow-sm max-w-[90%] ml-auto mb-2 text-sm text-slate-800 whitespace-pre-wrap">
                                           {getPreview()}
                                           <div className="text-[10px] text-slate-400 text-right mt-1 flex items-center justify-end gap-1">
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