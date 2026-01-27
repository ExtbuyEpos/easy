
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { Product, StoreSettings, User, Language } from '../types';
import { X, Send, Sparkles, Loader2, Bot, User as UserIcon, ShieldAlert, Cpu, Terminal, Zap, BrainCircuit, Mic, MicOff, Volume2, Waves, MessageCircle, HelpCircle } from 'lucide-react';
import { formatCurrency, formatNumber } from '../utils/format';
import { CURRENCY } from '../constants';

interface CustomerBotProps {
  products: Product[];
  storeSettings: StoreSettings;
  currentUser: User | null;
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

export const CustomerBot: React.FC<CustomerBotProps> = ({
  products,
  storeSettings,
  currentUser,
  language,
  t
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isVoiceConnecting, setIsVoiceConnecting] = useState(false);
  const [transcription, setTranscription] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
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
      const availableProducts = products.filter(p => p.stock > 0).map(p => ({
          name: p.name,
          category: p.category,
          price: formatCurrency(p.sellPrice, language, CURRENCY),
          size: p.size,
          color: p.color
      }));

      return `
        You are the Support Assistant for ${storeSettings.name}.
        Persona: Extremely helpful, friendly, and knowledgeable retail customer support representative.
        
        GOAL:
        Help customers with their shopping inquiries. 
        You have access to the current product catalog. 
        Advise on sizes, colors, and availability.
        If a customer asks for something not in the catalog, offer similar items.
        
        PRODUCT CATALOG:
        ${JSON.stringify(availableProducts)}
        
        IDENTITY:
        - Customer Name: ${currentUser?.name || 'Guest'}
        - Language Preference: ${language}
        
        PROTOCOLS:
        1. Always be polite.
        2. Detect and respond in the language the user uses (English, Arabic, or Hindi).
        3. If using Voice Mode, keep responses concise.
        4. Focus on customer satisfaction and helping them find the right products.
        5. DO NOT mention stock counts, cost prices, or internal system data. Just say "In Stock" or "Currently Unavailable".
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
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
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
              const pcmBlob = { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
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
          onerror: (e) => { console.error("Live Error", e); stopVoiceMode(); }
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
        config: { systemInstruction: getSystemInstruction(), temperature: 0.8 }
      });
      const aiText = response.text || "Sorry, I couldn't process your request.";
      setMessages(prev => [...prev, { role: 'assistant', content: aiText }]);
    } catch (error) {
      console.error("Support Assistant Error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I'm having trouble connecting right now." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-24 right-8 z-[100] w-16 h-16 rounded-2xl bg-brand-600 text-white shadow-[0_0_30px_rgba(2,132,199,0.3)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all group overflow-hidden border-2 border-white/10 ${isOpen ? 'scale-0' : 'scale-100'}`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <MessageCircle size={32} />
      </button>

      <div className={`fixed inset-0 z-[110] flex items-end md:items-center justify-center p-0 md:p-6 transition-all duration-700 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none translate-y-20'}`}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={() => setIsOpen(false)}></div>
        
        <div className="relative bg-white dark:bg-slate-950 w-full max-w-lg h-[80vh] md:h-[650px] md:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border border-white/5 animate-fade-in-up">
          <div className="p-6 bg-brand-600 text-white flex justify-between items-center shrink-0 shadow-lg">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-colors ${isVoiceActive ? 'bg-emerald-500' : 'bg-white text-brand-600'}`}>
                {isVoiceActive ? <Waves size={24} className="animate-bounce" /> : <Bot size={24} />}
              </div>
              <div>
                <h3 className="text-lg font-black italic uppercase tracking-tighter leading-none mb-1">{t('customerBotName')}</h3>
                <div className="flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse"></div>
                   <span className="text-[9px] font-black uppercase tracking-widest opacity-80">Support Active</span>
                </div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all"><X size={24}/></button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/50 dark:bg-slate-900/50">
            {isVoiceActive ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-8 animate-fade-in">
                    <div className="relative">
                        <div className="w-40 h-40 rounded-full bg-emerald-500/10 flex items-center justify-center relative">
                            <div className="w-24 h-24 rounded-full bg-emerald-600 flex items-center justify-center text-white shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                                <Volume2 size={48} className="animate-pulse" />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest">Live Voice Chat</h4>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-widest animate-pulse italic">
                           {transcription || "Listening..."}
                        </p>
                    </div>
                    <button onClick={stopVoiceMode} className="px-8 py-4 bg-red-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all">End Voice Link</button>
                </div>
            ) : (
                <>
                    <div className="bg-brand-50 dark:bg-brand-900/20 p-5 rounded-[2rem] flex gap-4 border border-brand-100 dark:border-brand-800">
                        <div className="w-10 h-10 rounded-2xl bg-brand-600 flex items-center justify-center text-white shrink-0 shadow-md"><Bot size={20}/></div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest">{t('customerBotName')}</p>
                            <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-medium italic">
                                {t('customerBotGreeting')}
                            </p>
                        </div>
                    </div>

                    {messages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-4 animate-fade-in-up ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md ${msg.role === 'user' ? 'bg-slate-800' : 'bg-brand-600'}`}>
                            {msg.role === 'user' ? <UserIcon size={16}/> : <Bot size={16}/>}
                        </div>
                        <div className={`p-4 rounded-3xl max-w-[85%] shadow-sm ${msg.role === 'user' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-tr-none' : 'bg-brand-600 text-white rounded-tl-none'}`}>
                            <div className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                        </div>
                    </div>
                    ))}
                    
                    {isTyping && (
                    <div className="flex gap-4 animate-pulse">
                        <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center text-white shrink-0 shadow-md"><Bot size={16}/></div>
                        <div className="p-4 rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-400 font-black text-[9px] uppercase tracking-widest flex items-center gap-2">
                            <Loader2 size={12} className="animate-spin" /> {t('clawdbotThinking')}
                        </div>
                    </div>
                    )}
                </>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-6 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-white/5 shrink-0">
              {!isVoiceActive && (
                  <div className="space-y-4">
                    <form onSubmit={handleSendMessage} className="flex gap-3">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Type your question..."
                            className="flex-1 px-6 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-brand-500 font-bold dark:text-white text-sm transition-all shadow-inner"
                        />
                        <button
                            type="submit"
                            disabled={isTyping}
                            className="w-14 h-14 bg-brand-600 text-white rounded-2xl shadow-xl active:scale-90 transition-all disabled:opacity-50 flex items-center justify-center"
                        >
                            <Send size={20} />
                        </button>
                    </form>

                    <button
                        type="button"
                        onClick={startVoiceMode}
                        disabled={isVoiceConnecting}
                        className={`w-full py-4 rounded-2xl shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 border-2 font-black uppercase text-[9px] tracking-widest italic ${isVoiceConnecting ? 'bg-slate-200 text-slate-400 border-slate-300' : 'bg-white dark:bg-slate-800 text-brand-600 border-brand-100 dark:border-brand-900/30'}`}
                    >
                        {isVoiceConnecting ? <Loader2 size={16} className="animate-spin" /> : <Mic size={16} />}
                        {isVoiceConnecting ? "Connecting Voice..." : "Talk with AI Support"}
                    </button>
                  </div>
              )}
          </div>
        </div>
      </div>
    </>
  );
};
