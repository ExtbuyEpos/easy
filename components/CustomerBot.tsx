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

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
}

export const CustomerBot: React.FC<CustomerBotProps> = ({ products, storeSettings, currentUser, language, t }) => {
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

  useEffect(() => { if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isOpen, transcription]);

  const getSystemInstruction = () => {
      const availableProducts = products.filter(p => p.stock > 0).map(p => ({
          name: p.name, category: p.category, price: formatCurrency(p.sellPrice, language, CURRENCY)
      }));
      return `You are the Support Assistant for ${storeSettings.name}. Help ${currentUser?.name || 'Guest'} find products.
      CATALOG: ${JSON.stringify(availableProducts)}. 
      IDENTITY: Polite, friendly, retail-focused. Respond in ${language}. 
      VOICE MODE: Keep responses under 20 words. 
      NEVER share backend counts or cost prices.`;
  };

  const startVoiceMode = async () => {
    if (isVoiceActive) { stopVoiceMode(); return; }
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
        },
        callbacks: {
          onopen: () => {
            setIsVoiceConnecting(false); setIsVoiceActive(true);
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              sessionPromise.then(session => session.sendRealtimeInput({ media: { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' } }));
            };
            source.connect(scriptProcessor); scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) setTranscription(prev => prev + message.serverContent!.outputTranscription!.text);
            if (message.serverContent?.turnComplete) { 
                setMessages(prev => [...prev, { role: 'assistant', content: transcription }]); 
                setTranscription(''); 
            }
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource();
              source.buffer = audioBuffer; source.connect(outputCtx.destination);
              source.start(nextStartTimeRef.current); nextStartTimeRef.current += audioBuffer.duration;
              activeSourcesRef.current.add(source);
            }
          },
          onclose: () => stopVoiceMode(),
          onerror: () => stopVoiceMode()
        }
      });
      liveSessionRef.current = await sessionPromise;
    } catch (err) { setIsVoiceConnecting(false); }
  };

  const stopVoiceMode = () => {
    if (liveSessionRef.current) liveSessionRef.current.close();
    if (audioContextRef.current) { audioContextRef.current.input.close(); audioContextRef.current.output.close(); }
    setIsVoiceActive(false); setIsVoiceConnecting(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;
    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput(''); setIsTyping(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: userMsg,
        config: { systemInstruction: getSystemInstruction() }
      });
      setMessages(prev => [...prev, { role: 'assistant', content: response.text || "I'm here to help with your purchase." }]);
    } catch (err) { setMessages(prev => [...prev, { role: 'assistant', content: "Connecting to support..." }]); }
    finally { setIsTyping(false); }
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)} className={`fixed bottom-24 right-8 z-[100] w-16 h-16 rounded-2xl bg-brand-600 text-white shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group overflow-hidden border-2 border-white/10 ${isOpen ? 'scale-0' : 'scale-100'}`}>
        <MessageCircle size={32} />
      </button>
      <div className={`fixed inset-0 z-[110] flex items-end md:items-center justify-center p-0 md:p-6 transition-all duration-700 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none translate-y-20'}`}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-xl" onClick={() => setIsOpen(false)}></div>
        <div className="relative bg-white dark:bg-slate-950 w-full max-w-lg h-[80vh] md:h-[650px] md:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border border-white/5">
          <div className="p-6 bg-brand-600 text-white flex justify-between items-center shrink-0">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${isVoiceActive ? 'bg-emerald-500' : 'bg-white text-brand-600'}`}>
                {isVoiceActive ? <Waves size={24} className="animate-bounce" /> : <Bot size={24} />}
              </div>
              <div>
                <h3 className="text-lg font-black italic uppercase tracking-tighter leading-none mb-1">{t('customerBotName')}</h3>
                <span className="text-[9px] font-black uppercase tracking-widest opacity-80">{isVoiceActive ? 'Voice Link Established' : 'Support Active'}</span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all"><X size={24}/></button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50 dark:bg-slate-900/50">
            {isVoiceActive ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-8 animate-fade-in">
                    <div className="w-40 h-40 rounded-full bg-emerald-600 flex items-center justify-center text-white shadow-2xl animate-pulse"><Volume2 size={48} /></div>
                    <p className="text-sm font-medium dark:text-white uppercase tracking-widest italic">{transcription || "How can I help you today?"}</p>
                    <button onClick={stopVoiceMode} className="px-8 py-4 bg-red-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all">Close Voice</button>
                </div>
            ) : (
                <>
                    {messages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-4 animate-fade-in-up ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 ${msg.role === 'user' ? 'bg-slate-800' : 'bg-brand-600'}`}>
                          {msg.role === 'user' ? <UserIcon size={16}/> : <Bot size={16}/>}
                        </div>
                        <div className={`p-4 rounded-[1.5rem] max-w-[85%] shadow-md ${msg.role === 'user' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white' : 'bg-brand-600 text-white'}`}>
                          <div className="text-sm font-medium leading-relaxed">{msg.content}</div>
                        </div>
                    </div>
                    ))}
                    {isTyping && <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 font-black text-[9px] uppercase animate-pulse">Assistant is thinking...</div>}
                </>
            )}
            <div ref={messagesEndRef} />
          </div>
          {!isVoiceActive && (
          <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-white/5">
            <form onSubmit={handleSendMessage} className="flex gap-3 mb-4">
                <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your inquiry..." className="flex-1 px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none font-bold dark:text-white shadow-inner" />
                <button type="submit" disabled={isTyping} className="w-14 h-14 bg-brand-600 text-white rounded-2xl flex items-center justify-center shadow-xl active:scale-95 transition-all"><Send size={20}/></button>
            </form>
            <button onClick={startVoiceMode} disabled={isVoiceConnecting} className="w-full py-4 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white font-black uppercase text-[9px] tracking-widest italic flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all border border-white/10">
                {isVoiceConnecting ? <Loader2 size={16} className="animate-spin" /> : <><Mic size={16} /> Talk with AI Support</>}
            </button>
          </div>
          )}
        </div>
      </div>
    </>
  );
};