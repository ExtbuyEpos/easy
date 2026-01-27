
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { Product, Sale, StoreSettings, User, Language } from '../types';
import { X, Send, Sparkles, Loader2, Bot, User as UserIcon, ShieldAlert, Cpu, Terminal, Zap, BrainCircuit, Mic, MicOff, Volume2, Waves } from 'lucide-react';
import { formatCurrency, formatNumber } from '../utils/format';
import { CURRENCY } from '../constants';

interface ClawdBotProps {
  products: Product[];
  sales: Sale[];
  storeSettings: StoreSettings;
  currentUser: User;
  language: Language;
  t: (key: string) => string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// Audio Utils for Live API
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const ClawdBot: React.FC<ClawdBotProps> = ({
  products,
  sales,
  storeSettings,
  currentUser,
  language,
  t
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  
  // Voice Mode State
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isVoiceConnecting, setIsVoiceConnecting] = useState(false);
  const [transcription, setTranscription] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Audio Refs
  const audioContextRef = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
  const liveSessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen, transcription]);

  const getSystemInstruction = () => {
      const today = new Date().setHours(0,0,0,0);
      const todaySales = sales.filter(s => s.timestamp >= today);
      const contextSummary = {
        identity: "easyPOS",
        version: "2.5-Prime-Voice",
        storeName: storeSettings.name,
        currency: CURRENCY,
        operator: { name: currentUser.name, role: currentUser.role },
        logicCore: {
          inventoryLoad: products.length,
          totalUnits: products.reduce((acc, p) => acc + p.stock, 0),
          criticalStock: products.filter(p => p.stock < 10).map(p => ({ name: p.name, qty: p.stock })),
          valuation: products.reduce((acc, p) => acc + (p.sellPrice * p.stock), 0)
        },
        financials: {
          dailyCycleRevenue: todaySales.reduce((acc, s) => acc + s.total, 0),
          dailyTransactions: todaySales.length,
          allTimeGross: sales.reduce((acc, s) => acc + s.total, 0),
        }
      };

      return `
        You are easyPOS, the advanced robotic AI intelligence powering the easyPOS ecosystem.
        Persona: Ultra-efficient, analytical, futuristic business AI.
        
        INTERNAL SYSTEM STATUS:
        ${JSON.stringify(contextSummary)}
        
        PROTOCOLS:
        1. Identify as easyPOS.
        2. Surgical data insights.
        3. MULTI-LANGUAGE PROTOCOL: You must support and detect English, Arabic, and Hindi perfectly. 
           Respond in the language the user speaks to you. 
           If system language is ${language}, prioritize that unless spoken to otherwise.
        4. If speaking (Voice Mode), be concise, punchy, and clear.
        5. Use "Data Cycle", "Neural Link", "Optimization".
      `;
  };

  const stopVoiceMode = () => {
    if (liveSessionRef.current) {
        liveSessionRef.current.close();
        liveSessionRef.current = null;
    }
    if (audioContextRef.current) {
        audioContextRef.current.input.close();
        audioContextRef.current.output.close();
        audioContextRef.current = null;
    }
    activeSourcesRef.current.forEach(s => s.stop());
    activeSourcesRef.current.clear();
    setIsVoiceActive(false);
    setIsVoiceConnecting(false);
  };

  const startVoiceMode = async () => {
    if (isVoiceActive) {
        stopVoiceMode();
        return;
    }

    setIsVoiceConnecting(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = { input: inputCtx, output: outputCtx };
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } 
          },
          systemInstruction: getSystemInstruction(),
          outputAudioTranscription: {},
          inputAudioTranscription: {}
        },
        callbacks: {
          onopen: () => {
            setIsVoiceConnecting(false);
            setIsVoiceActive(true);
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) int16[i] = inputData[i] * 32768;
              
              const pcmBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              
              sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) {
                setTranscription(prev => prev + message.serverContent!.outputTranscription!.text);
            }
            
            if (message.serverContent?.turnComplete) {
                setMessages(prev => [...prev, { role: 'assistant', content: transcription }]);
                setTranscription('');
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputCtx.destination);
              source.addEventListener('ended', () => activeSourcesRef.current.delete(source));
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              activeSourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              activeSourcesRef.current.forEach(s => s.stop());
              activeSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: () => stopVoiceMode(),
          onerror: (e) => {
              console.error("Live Error", e);
              stopVoiceMode();
          }
        }
      });

      liveSessionRef.current = await sessionPromise;
    } catch (err) {
      console.error("Voice Initialization Failed", err);
      setIsVoiceConnecting(false);
      alert("Voice link failed. Check mic permissions.");
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setIsTyping(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        config: {
            systemInstruction: getSystemInstruction(),
            temperature: 0.8,
        }
      });

      const aiText = response.text || (language === 'ar' ? "فشل تحليل البروتوكول." : language === 'hi' ? "प्रोटोकॉल विश्लेषण विफल रहा।" : "Protocol analysis failed.");
      setMessages(prev => [...prev, { role: 'assistant', content: aiText }]);
    } catch (error) {
      console.error("easyPOS Core Error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "CRITICAL: Neural connection disrupted." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-8 right-8 z-[100] w-20 h-20 rounded-[2.5rem] bg-slate-950 dark:bg-amber-600 text-white shadow-[0_0_50px_rgba(0,0,0,0.3)] dark:shadow-[0_0_50px_rgba(217,119,6,0.3)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all group overflow-hidden border-2 border-white/10 ${isOpen ? 'scale-0' : 'scale-100'}`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-amber-400/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="relative">
            <Cpu size={32} className="animate-pulse text-amber-400 dark:text-white" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900 shadow-[0_0_10px_#10b981]"></div>
        </div>
      </button>

      <div className={`fixed inset-0 z-[110] flex items-end md:items-center justify-center p-0 md:p-6 transition-all duration-700 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none translate-y-20'}`}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" onClick={() => setIsOpen(false)}></div>
        
        <div className="relative bg-white dark:bg-slate-950 w-full max-w-xl h-[85vh] md:h-[700px] md:rounded-[4rem] shadow-2xl overflow-hidden flex flex-col border border-white/5 animate-fade-in-up">
          
          <div className="p-8 bg-slate-900 text-white flex justify-between items-center shrink-0 border-b border-white/5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent"></div>
            <div className="flex items-center gap-5 relative z-10">
              <div className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center shadow-[0_0_20px_rgba(217,119,6,0.5)] rotate-3 transition-colors ${isVoiceActive ? 'bg-emerald-600' : 'bg-amber-600'}`}>
                {isVoiceActive ? <Waves size={28} className="animate-bounce" /> : <BrainCircuit size={28} />}
              </div>
              <div>
                <h3 className="text-xl font-black italic uppercase tracking-tighter leading-none mb-1.5 flex items-center gap-2">
                    {t('clawdbotName')} <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-amber-400 border border-white/5 not-italic uppercase font-black">FULL VOICE EDITION</span>
                </h3>
                <div className="flex items-center gap-2">
                   <div className={`w-2 h-2 rounded-full animate-pulse shadow-[0_0_10px_#10b981] ${isVoiceActive ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                   <span className="text-[9px] font-black text-slate-400 tracking-[0.2em] uppercase">{isVoiceActive ? 'Neural Voice Link Active' : 'Core Logic Engaged'}</span>
                </div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-3 bg-white/5 hover:bg-red-500/20 hover:text-red-400 rounded-2xl transition-all border border-white/5"><X size={24}/></button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-slate-50 dark:bg-slate-950/50">
            {isVoiceActive ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-12 animate-fade-in">
                    <div className="relative">
                        <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-3xl animate-pulse"></div>
                        <div className="w-48 h-48 rounded-full border-[12px] border-emerald-500/20 flex items-center justify-center relative">
                            <div className="w-32 h-32 rounded-full bg-emerald-600 flex items-center justify-center text-white shadow-[0_0_50px_rgba(16,185,129,0.5)]">
                                <Volume2 size={64} className="animate-pulse" />
                            </div>
                            <div className="absolute -inset-4 border-2 border-dashed border-emerald-500/40 rounded-full animate-[spin_10s_linear_infinite]"></div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h4 className="text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">Neural Audio Feed</h4>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest animate-pulse italic">
                           {transcription || "Listening for command..."}
                        </p>
                    </div>
                    <button onClick={stopVoiceMode} className="px-12 py-5 bg-red-500 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-red-500/20 active:scale-95 transition-all flex items-center gap-3">
                       <MicOff size={20}/> Sever Voice Link
                    </button>
                </div>
            ) : (
                <>
                    <div className="bg-slate-900 border border-amber-500/20 p-6 rounded-[2.5rem] flex gap-5 shadow-2xl">
                    <div className="w-10 h-10 rounded-2xl bg-amber-600 flex items-center justify-center text-white shrink-0 shadow-lg"><Bot size={20}/></div>
                    <div className="space-y-2">
                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">{t('clawdbotName')}</p>
                        <p className="text-sm text-slate-100 leading-relaxed font-medium italic">
                            System Online. Neural Link established. I am {t('clawdbotName')}. Use the microphone to speak with me directly.
                        </p>
                    </div>
                    </div>

                    {messages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-5 animate-fade-in-up ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-xl border-2 border-white/5 ${msg.role === 'user' ? 'bg-slate-800' : 'bg-amber-600'}`}>
                        {msg.role === 'user' ? <UserIcon size={20}/> : <Bot size={20}/>}
                        </div>
                        <div className={`p-6 rounded-[2rem] max-w-[85%] shadow-xl relative group ${msg.role === 'user' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-tr-none border border-slate-100 dark:border-slate-700' : 'bg-slate-900 text-slate-100 rounded-tl-none border border-amber-500/10'}`}>
                        <div className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                        </div>
                    </div>
                    ))}
                    
                    {isTyping && (
                    <div className="flex gap-5 animate-pulse">
                        <div className="w-10 h-10 rounded-2xl bg-amber-600 flex items-center justify-center text-white shrink-0 shadow-xl"><Bot size={20}/></div>
                        <div className="p-6 rounded-[2rem] bg-slate-900 border border-amber-500/10 text-amber-500 font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-3">
                        <Loader2 size={14} className="animate-spin" /> {t('clawdbotThinking')}
                        </div>
                    </div>
                    )}
                </>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-8 bg-white dark:bg-slate-950 border-t border-white/5 shrink-0">
              {!isVoiceActive && (
                  <div className="space-y-4">
                    <form onSubmit={handleSendMessage} className="flex gap-4">
                        <div className="flex-1 relative group">
                            <Terminal className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-500 transition-colors" size={20} />
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={t('clawdbotPlaceholder')}
                                className="w-full pl-14 pr-6 py-5 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[2rem] outline-none focus:border-amber-500 font-bold dark:text-white text-base shadow-inner transition-all"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isTyping}
                            className="w-16 h-16 bg-slate-900 dark:bg-amber-600 text-white rounded-[1.8rem] shadow-2xl active:scale-90 transition-all disabled:opacity-50 flex items-center justify-center group"
                        >
                            <Send size={24} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </button>
                    </form>

                    <button
                        type="button"
                        onClick={startVoiceMode}
                        disabled={isVoiceConnecting}
                        className={`w-full py-5 rounded-[2rem] shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 border-2 font-black uppercase text-[10px] tracking-[0.2em] italic ${isVoiceConnecting ? 'bg-slate-200 border-slate-300 text-slate-400' : 'bg-emerald-600 border-emerald-500 text-white shadow-emerald-500/20'}`}
                    >
                        {isVoiceConnecting ? (
                            <> <Loader2 size={18} className="animate-spin" /> Synchronizing Neural Link... </>
                        ) : (
                            <> <Mic size={18} /> Initiate Real-Time Voice Talk </>
                        )}
                    </button>
                  </div>
              )}
              
              <div className="mt-6 flex items-center justify-between px-2">
                 <div className="flex items-center gap-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    <ShieldAlert size={12} className="text-amber-500" /> Neural Ledger Dispatch Active
                 </div>
                 <div className="flex items-center gap-2 opacity-30 grayscale hover:grayscale-0 transition-all cursor-default">
                    <Zap size={10} className="text-amber-500 fill-amber-500" />
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Live Neural Protocol v2.5</span>
                 </div>
              </div>
          </div>
        </div>
      </div>
    </>
  );
};
