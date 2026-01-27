
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Product, Sale, StoreSettings, User, Language } from '../types';
import { MessageSquare, X, Send, Sparkles, Loader2, Bot, User as UserIcon, ShieldAlert } from 'lucide-react';
import { formatCurrency, formatNumber } from '../utils/format';
import { CURRENCY } from '../constants';

interface AiAssistantProps {
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

export const AiAssistant: React.FC<AiAssistantProps> = ({
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setIsTyping(true);

    try {
      // Create a new instance right before use to ensure updated API Key
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Prepare localized business summary for context
      const today = new Date().setHours(0,0,0,0);
      const todaySales = sales.filter(s => s.timestamp >= today);
      
      const contextSummary = {
        storeName: storeSettings.name,
        currency: CURRENCY,
        currentUser: { name: currentUser.name, role: currentUser.role },
        inventorySummary: {
          totalProducts: products.length,
          totalStock: products.reduce((acc, p) => acc + p.stock, 0),
          lowStockItems: products.filter(p => p.stock < 10).map(p => ({ name: p.name, stock: p.stock })),
          topExpensive: products.sort((a,b) => b.sellPrice - a.sellPrice).slice(0, 3).map(p => p.name)
        },
        salesSummary: {
          todayRevenue: todaySales.reduce((acc, s) => acc + s.total, 0),
          todayCount: todaySales.length,
          totalRevenue: sales.reduce((acc, s) => acc + s.total, 0),
          lastSale: sales.length > 0 ? { id: sales[0].id, total: sales[0].total, time: new Date(sales[0].timestamp).toLocaleTimeString() } : null
        },
        recentProducts: products.slice(0, 10).map(p => ({ name: p.name, sku: p.sku, price: p.sellPrice, stock: p.stock }))
      };

      const systemInstruction = `
        You are the easyPOS AI Business Assistant. You are integrated into a Point of Sale app for ${storeSettings.name}.
        Your goal is to help ${currentUser.name} (${currentUser.role}) understand their business data.
        
        CURRENT BUSINESS CONTEXT:
        ${JSON.stringify(contextSummary)}
        
        RULES:
        1. Be professional, concise, and helpful.
        2. Answer questions based on the real-time data provided above.
        3. If you don't have specific data for a query, state it politely.
        4. Use ${language === 'ar' ? 'Arabic' : 'English'} for your responses.
        5. If asked about stock, refer to inventorySummary.
        6. If asked about sales, refer to salesSummary.
        7. Keep responses short and easy to read on a mobile POS screen.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        // Use string for contents to follow guidelines
        contents: userMessage,
        config: {
            systemInstruction: systemInstruction,
            temperature: 0.7,
        }
      });

      const aiText = response.text || (language === 'ar' ? "عذراً، لم أستطع تحليل الطلب." : "Sorry, I couldn't process that request.");
      setMessages(prev => [...prev, { role: 'assistant', content: aiText }]);
    } catch (error) {
      console.error("AI Assistant Error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Connection Error. Please try again." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-8 right-8 z-[100] w-16 h-16 rounded-full bg-slate-900 dark:bg-brand-600 text-white shadow-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all group overflow-hidden ${isOpen ? 'scale-0' : 'scale-100'}`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-brand-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <Sparkles size={24} className="animate-pulse" />
      </button>

      {/* Chat Window Overlay */}
      <div className={`fixed inset-0 z-[110] flex items-end md:items-center justify-center p-0 md:p-6 transition-all duration-500 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none translate-y-10'}`}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={() => setIsOpen(false)}></div>
        
        <div className="relative bg-white dark:bg-slate-900 w-full max-w-lg h-[80vh] md:h-[600px] md:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border border-slate-100 dark:border-slate-800 animate-fade-in-up">
          
          {/* Header */}
          <div className="p-6 bg-slate-900 text-white flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-600 flex items-center justify-center shadow-lg">
                <Bot size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest leading-none mb-1">{t('aiAssistant')}</h3>
                <div className="flex items-center gap-1.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                   <span className="text-[9px] font-bold text-slate-400 tracking-wider">CORE ENGINE LIVE</span>
                </div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all"><X size={20}/></button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/30 dark:bg-slate-950/20">
            <div className="bg-brand-50/50 dark:bg-brand-900/10 p-5 rounded-3xl border border-brand-100 dark:border-brand-900/20 flex gap-4">
               <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center text-white shrink-0 shadow-md"><Bot size={16}/></div>
               <div className="space-y-1">
                  <p className="text-xs font-black text-brand-600 uppercase tracking-widest">{t('aiAssistant')}</p>
                  <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-medium italic">
                    {t('aiGreeting')}
                  </p>
               </div>
            </div>

            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-4 animate-fade-in-up ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md ${msg.role === 'user' ? 'bg-slate-900 dark:bg-slate-700' : 'bg-brand-600'}`}>
                  {msg.role === 'user' ? <UserIcon size={16}/> : <Bot size={16}/>}
                </div>
                <div className={`p-4 rounded-3xl max-w-[80%] shadow-sm ${msg.role === 'user' ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white rounded-tr-none' : 'bg-brand-600 text-white rounded-tl-none'}`}>
                  <p className="text-sm font-medium leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex gap-4 animate-pulse">
                <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center text-white shrink-0 shadow-md"><Bot size={16}/></div>
                <div className="p-4 rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-400 font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                   <Loader2 size={12} className="animate-spin" /> {t('aiThinking')}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSendMessage} className="p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex gap-3">
             <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('aiPlaceholder')}
              className="flex-1 px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:border-brand-500 font-bold dark:text-white text-sm"
             />
             <button
              type="submit"
              disabled={isTyping}
              className="p-4 bg-slate-900 dark:bg-brand-600 text-white rounded-2xl shadow-xl active:scale-95 transition-all disabled:opacity-50"
             >
              <Send size={20} />
             </button>
          </form>
          
          <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-2 text-[8px] font-black text-slate-400 uppercase tracking-widest">
             <ShieldAlert size={10} className="text-brand-500" /> {t('aiContextInfo')}
          </div>
        </div>
      </div>
    </>
  );
};
