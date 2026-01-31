
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { Product, Sale, StoreSettings, User, Language } from '../types';
import { X, Send, Sparkles, Loader2, Bot, User as UserIcon, ShieldAlert, Cpu, Terminal, Zap, BrainCircuit, Mic, Volume2, Waves } from 'lucide-react';
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

// Manual PCM Codecs per requirement
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

export const ClawdBot: React.FC<ClawdBotProps> = ({ products, sales, storeSettings, currentUser, language, t }) => {
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

  const SUPREME_ID = 'nabeelkhan1007@gmail.com';
  const isSupremeAdmin = currentUser.email?.toLowerCase() === SUPREME_ID;

  useEffect(() => { if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isOpen, transcription]);

  const getSystemInstruction = () => {
      const today = new Date().setHours(0,0,0,0);
      const todaySales = sales.filter(s => s.timestamp >= today);
      const totalRev = todaySales.reduce((a,s)=>a+s.total,0);
      
      return `You are easyPOS Artificial Intelligence (Terminal Protocol v2.5). 
      You are speaking to ${currentUser.name}. 
      ${isSupremeAdmin ? 'IDENTITY VERIFIED: You are speaking to the System Owner. You have full access to solve system problems, provide detailed audit logs, and troubleshoot inventory nodes.' : ''}
      
      SYSTEM CONTEXT:
      - Multi-Vendor Hub: ${storeSettings.name}
      - Daily Ledger: ${formatCurrency(totalRev, language, CURRENCY)}
      - Product Registry: ${products.length} entries
      
      BEHAVIOR:
      1. Technical problem solver: Identify sales anomalies or stock issues.
      2. Direct & Elite: Avoid fluff. Use professional business terminology.
      3. Language: Respond in ${language === 'ar' ? 'Arabic' : 'English'}.
      4. Voice: Keep audio responses tactical and under 15 words for clarity.
      
      If the user asks about a problem, analyze the current sales data (${JSON.stringify(todaySales.slice(0, 5))}) to find solutions.`;
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
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
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
                if (transcription) setMessages(prev => [...prev, { role: 'assistant', content: transcription }]); 
                setTranscription(''); 
            }
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource();
              source.buffer = audioBuffer; 
              source.connect(outputCtx.destination);
              source.start(nextStartTimeRef.current); 
              nextStartTimeRef.current += audioBuffer.duration;
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
    activeSourcesRef.current.forEach(s => s.stop());
    activeSourcesRef.current.clear();
    setIsVoiceActive(false); setIsVoiceConnecting(false); setTranscription('');
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
      setMessages(prev => [...prev, { role: 'assistant', content: response.text || 'Logic processed.' }]);
    } catch (err) { setMessages(prev => [...prev, { role: 'assistant', content: 'Connection failure.' }]); }
    finally { setIsTyping(false); }
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)} className={`fixed bottom-8 right-8 z-[100] w-16 h-16 rounded-[2rem] bg-slate-950 dark:bg-brand-600 text-white shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group border-2 border-white/10 ${isOpen ? 'scale-0' : 'scale-100'}`}>
        <BrainCircuit size={28} className="animate-pulse" />
      </button>
      <div className={`fixed inset-0 z-[110] flex items-end md:items-center justify-center p-0 md:p-6 transition-all duration-500 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none translate-y-20'}`}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" onClick={() => setIsOpen(false)}></div>
        <div className="relative bg-white dark:bg-slate-950 w-full max-w-xl h-[85vh] md:h-[650px] md:rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col border border-white/5">
          <div className="p-8 bg-slate-900 text-white flex justify-between items-center shrink-0 border-b border-white/5">
            <div className="flex items-center gap-5">
              <div className={`w-12 h-12 rounded-[1.2rem] flex items-center justify-center shadow-lg ${isVoiceActive ? 'bg-emerald-600' : 'bg-brand-600'}`}>
                {isVoiceActive ? <Waves size={24} className="animate-bounce" /> : <Zap size={24} />}
              </div>
              <div><h3 className="text-xl font-black italic uppercase tracking-tighter leading-none mb-1.5">easyPOS <span className="text-brand-400">AI</span></h3><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{isVoiceActive ? 'Voice Link Active' : 'System Solver Mode'}</span></div>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-2.5 bg-white/5 rounded-xl hover:bg-red-500/20"><X size={24}/></button>
          </div>
          <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar bg-slate-50 dark:bg-slate-950/50">
            {isVoiceActive ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-10">
                    <div className="w-40 h-40 rounded-full bg-emerald-600 flex items-center justify-center text-white shadow-2xl animate-pulse"><Volume2 size={48} /></div>
                    <p className="text-sm font-medium dark:text-white uppercase tracking-widest italic">{transcription || "Listening for secure voice command..."}</p>
                    <button onClick={stopVoiceMode} className="px-10 py-5 bg-red-500 text-white rounded-[2rem] font-black uppercase text-xs shadow-xl active:scale-95 transition-all">Close Voice Link</button>
                </div>
            ) : (
                <>
                    <div className="p-4 rounded-3xl bg-slate-900 border border-brand-500/30 text-brand-400 text-[10px] uppercase font-bold tracking-widest leading-relaxed italic">
                        Authorized Node: {currentUser.name} | Identity: {isSupremeAdmin ? 'ROOT SYSTEM MASTER' : 'AUTHORIZED PERSONNEL'}
                    </div>
                    {messages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-4 animate-fade-in-up ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 ${msg.role === 'user' ? 'bg-slate-800' : 'bg-brand-600'}`}>
                          {msg.role === 'user' ? <UserIcon size={18}/> : <Bot size={18}/>}
                        </div>
                        <div className={`p-5 rounded-[1.8rem] max-w-[85%] shadow-xl ${msg.role === 'user' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-tr-none' : 'bg-slate-900 text-slate-100 rounded-tl-none border border-white/5'}`}>
                          <p className="text-sm leading-relaxed">{msg.content}</p>
                        </div>
                    </div>
                    ))}
                    {isTyping && <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 font-black text-[10px] uppercase animate-pulse">Syncing Logic Nodes...</div>}
                </>
            )}
            <div ref={messagesEndRef} />
          </div>
          {!isVoiceActive && (
          <div className="p-8 bg-white dark:bg-slate-900 border-t border-white/5 space-y-4">
            <form onSubmit={handleSendMessage} className="flex gap-4">
                <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type tactical instruction..." className="flex-1 px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-[2rem] outline-none font-bold dark:text-white" />
                <button type="submit" disabled={isTyping} className="w-14 h-14 bg-brand-600 text-white rounded-[1.5rem] flex items-center justify-center shadow-xl active:scale-95 transition-all"><Send size={24}/></button>
            </form>
            <button onClick={startVoiceMode} disabled={isVoiceConnecting} className="w-full py-4 rounded-[2rem] bg-slate-900 dark:bg-slate-800 text-white font-black uppercase text-[10px] tracking-widest italic flex items-center justify-center gap-3 border border-white/10 active:scale-[0.98] transition-all">
                {isVoiceConnecting ? <Loader2 size={16} className="animate-spin" /> : <><Mic size={16} /> Real-Time Voice Link</>}
            </button>
          </div>
          )}
        </div>
      </div>
    </>
  );
};
