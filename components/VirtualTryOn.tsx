
import React, { useState, useRef, useEffect } from 'react';
import { Product, Language } from '../types';
import { GoogleGenAI } from "@google/genai";
import { formatCurrency } from '../utils/format';
import { Camera, Upload, X, Sparkles, Loader2, RefreshCw, ChevronLeft, Download, ShieldCheck, Zap, ScanFace, CheckCircle2 } from 'lucide-react';

interface VirtualTryOnProps {
  product: Product | null;
  onClose: () => void;
  language: Language;
  t: (key: string) => string;
  initialAvatar?: string;
  tryOnCache?: Record<string, string>;
  onCaptureAvatar?: (avatarData: string, cache?: Record<string, string>) => void;
}

export const VirtualTryOn: React.FC<VirtualTryOnProps> = ({
  product,
  onClose,
  language,
  t,
  initialAvatar,
  tryOnCache = {},
  onCaptureAvatar
}) => {
  const [userImage, setUserImage] = useState<string | null>(initialAvatar || null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [setupMode, setSetupMode] = useState(!product && !initialAvatar);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // One-click logic: Check cache or auto-trigger AI on mount
  useEffect(() => {
    if (product && userImage && !resultImage) {
        if (tryOnCache[product.id]) {
            // Instant Retrieval from Cache - No API Call
            setResultImage(tryOnCache[product.id]);
        } else {
            // Auto-trigger AI if we have an avatar but no cached result
            handleTryOn();
        }
    }
  }, [product, userImage]);

  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access failed", err);
      setShowCamera(false);
      alert("Camera access denied. Please check permissions.");
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        setUserImage(dataUrl);
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setShowCamera(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setUserImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleTryOn = async () => {
    if (!userImage || !product?.image) return;
    
    setIsProcessing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const stripBase64 = (str: string) => {
        if (str.includes('base64,')) return str.split('base64,')[1];
        return str;
      };

      const productPart = {
        inlineData: {
          data: stripBase64(product.image),
          mimeType: 'image/jpeg'
        }
      };
      const userPart = {
        inlineData: {
          data: stripBase64(userImage),
          mimeType: 'image/jpeg'
        }
      };

      let scenarioPrompt = "";
      const cat = (product.category || "").toLowerCase();

      if (cat.includes("apparel") || cat.includes("clothing")) {
        scenarioPrompt = `This is an Apparel Fitting. Please DRESS the customer in the provided ${product.name}. Replace their current clothes with this item while preserving their face, hair, and body shape.`;
      } else if (cat.includes("automotive") || cat.includes("car")) {
        scenarioPrompt = `This is a Vehicle Showroom. Please place the customer (the "Real Avatar") in or NEXT TO the ${product.name}. Make it look like a professional lifestyle photo of them with their new car.`;
      } else if (cat.includes("parts") || cat.includes("accessories")) {
        scenarioPrompt = `This is a Product Integration. Please show the ${product.name} being used or held by the customer, or naturally integrated into their environment.`;
      } else {
        scenarioPrompt = `Please perform a Virtual Try-On. Integrate the product "${product.name}" naturally into the photo of the customer.`;
      }

      const prompt = `
        Product: "${product.name}"
        Task: ${scenarioPrompt}
        
        Requirements:
        1. IDENTITY PRESERVATION: The customer MUST look exactly like they do in their photo.
        2. NATURAL LIGHTING: Match the lighting of the result to the customer's photo.
        3. HIGH FIDELITY: The product itself must remain recognizable and high-quality.
        
        Return ONLY the modified image data as a raw base64 string.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [productPart, userPart, { text: prompt }]
        }
      });

      let base64Result = '';
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          base64Result = part.inlineData.data;
          break;
        }
      }

      if (base64Result) {
        const finalImg = `data:image/png;base64,${base64Result}`;
        setResultImage(finalImg);
        
        // Save to cache automatically for "one-click" next time
        if (onCaptureAvatar) {
            const newCache = { ...tryOnCache, [product.id]: finalImg };
            onCaptureAvatar(userImage, newCache);
        }
      } else {
        setResultImage(userImage);
      }
    } catch (err) {
      console.error("AI Try-On failed", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveAvatar = () => {
    if (userImage && onCaptureAvatar) {
        onCaptureAvatar(userImage, tryOnCache);
    }
  };

  const isSetupMode = !product;

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900 flex flex-col md:flex-row overflow-hidden font-sans">
      <div className="md:w-1/3 bg-white dark:bg-slate-900 p-8 md:p-12 flex flex-col justify-between overflow-y-auto border-r border-slate-100 dark:border-slate-800">
        <div className="space-y-10">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-500 hover:text-red-500 transition-all active:scale-90"><ChevronLeft size={24} className="rtl:rotate-180"/></button>
            <h2 className="text-xl font-black italic uppercase tracking-tighter dark:text-white">{isSetupMode ? 'AI Identity Scan' : t('magicMirror')}</h2>
          </div>

          {isSetupMode ? (
              <div className="space-y-6">
                <div className="w-20 h-20 bg-brand-600/10 rounded-3xl flex items-center justify-center text-brand-600 mx-auto">
                    <ScanFace size={40} />
                </div>
                <div className="text-center space-y-2">
                    <h3 className="text-2xl font-black dark:text-white uppercase italic">Setup Your Avatar</h3>
                    <p className="text-xs font-medium text-slate-400 leading-relaxed">Scan your face or upload a clear photo to create your Real Avatar. You only need to do this once.</p>
                </div>
              </div>
          ) : (
            <div className="space-y-4">
                <div className="aspect-square rounded-[3rem] bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 overflow-hidden shadow-2xl relative group">
                    {product?.image ? (
                    <img src={product.image} className="w-full h-full object-cover" alt={product.name} />
                    ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-200"><Sparkles size={48}/></div>
                    )}
                    <div className="absolute top-6 left-6 bg-brand-600 text-white px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-xl">{product?.category}</div>
                </div>
                <div className="text-center">
                    <h3 className="text-2xl font-black dark:text-white uppercase italic truncate">{product?.name}</h3>
                    <p className="text-brand-600 font-black text-sm">{formatCurrency(product?.sellPrice || 0, language, '$')}</p>
                </div>
            </div>
          )}

          <div className="bg-brand-50 dark:bg-brand-900/10 p-6 rounded-[2.5rem] border border-brand-100 dark:border-brand-900/20 space-y-3">
             <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest flex items-center gap-2"><ShieldCheck size={14}/> Professional AI</p>
             <p className="text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed italic">
                 {isSetupMode ? "For best results, look directly at the camera in a bright room." : `AI will perform a "${(product?.category || "").toLowerCase().includes("apparel") ? "fitting" : "placement"}" scan of your identity with this product.`}
             </p>
          </div>
        </div>

        <div className="pt-10 flex flex-col gap-3">
            {!resultImage && (
                <div className="flex gap-3">
                    <button onClick={startCamera} className="flex-1 py-5 bg-slate-900 text-white rounded-3xl font-black uppercase tracking-widest text-[10px] shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all"><Camera size={18}/> {t('takeAPhoto')}</button>
                    <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 dark:text-white rounded-3xl font-black uppercase tracking-widest text-[10px] shadow-sm flex items-center justify-center gap-2 active:scale-95 transition-all"><Upload size={18}/> {t('uploadImage')}</button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                </div>
            )}
            
            {userImage && !resultImage && !isSetupMode && !isProcessing && (
                <button 
                  onClick={handleTryOn} 
                  className="w-full py-6 bg-brand-600 text-white rounded-[2.5rem] font-black uppercase tracking-widest text-xs shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 animate-fade-in italic"
                >
                   <Sparkles size={20} /> Force Re-Generate
                </button>
            )}

            {userImage && !resultImage && isSetupMode && (
                <button 
                  onClick={handleSaveAvatar}
                  className="w-full py-6 bg-emerald-600 text-white rounded-[2.5rem] font-black uppercase tracking-widest text-xs shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 animate-fade-in italic"
                >
                   <CheckCircle2 size={20} /> Use This Identity
                </button>
            )}

            {resultImage && (
              <div className="space-y-3 animate-fade-in-up">
                <button onClick={() => window.print()} className="w-full py-6 bg-slate-900 text-white rounded-[2.5rem] font-black uppercase tracking-widest text-xs shadow-xl flex items-center justify-center gap-3 active:scale-95"><Download size={20}/> {t('downloadLook')}</button>
                <button onClick={() => { setResultImage(null); }} className="w-full py-5 bg-slate-100 dark:bg-slate-800 dark:text-white rounded-[2.5rem] font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 active:scale-95"><RefreshCw size={16}/> New Session</button>
              </div>
            )}
        </div>
      </div>

      <div className="flex-1 bg-slate-100 dark:bg-black relative flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-2xl aspect-square md:aspect-video rounded-[4rem] bg-white dark:bg-slate-900 shadow-2xl overflow-hidden relative border-[16px] border-slate-800">
            {showCamera && (
              <div className="absolute inset-0 z-10 bg-black flex flex-col items-center justify-center">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  <div className="absolute bottom-10 inset-x-0 flex justify-center gap-6">
                      <button onClick={capturePhoto} className="w-20 h-20 bg-white rounded-full border-8 border-slate-300 flex items-center justify-center shadow-2xl active:scale-90 transition-all"></button>
                      <button onClick={stopCamera} className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center text-white shadow-2xl active:scale-90 transition-all"><X size={32}/></button>
                  </div>
              </div>
            )}

            {!userImage && !resultImage && !showCamera && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 gap-6">
                  <div className="w-32 h-32 rounded-[3rem] bg-slate-50 dark:bg-slate-800 flex items-center justify-center shadow-inner"><ScanFace size={48} strokeWidth={1} /></div>
                  <div className="text-center space-y-2">
                    <p className="font-black text-sm uppercase tracking-widest">Awaiting Capture</p>
                    <p className="text-[10px] uppercase font-bold tracking-widest opacity-40">Scan or Upload your Identity</p>
                  </div>
              </div>
            )}

            {userImage && !resultImage && (
               <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800 animate-fade-in">
                  <img src={userImage} className="w-full h-full object-cover" alt="User Capture" />
                  <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"></div>
                  <div className="absolute inset-x-10 bottom-10 py-6 px-10 bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-brand-600 rounded-2xl flex items-center justify-center text-white"><ShieldCheck size={20}/></div>
                        <span className="font-black text-[10px] uppercase tracking-widest dark:text-white">Active Profile</span>
                      </div>
                      <button onClick={() => setUserImage(null)} className="p-3 bg-red-50 text-red-500 rounded-2xl active:scale-90"><RefreshCw size={18}/></button>
                  </div>
               </div>
            )}

            {resultImage && (
               <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 animate-fade-in">
                  <img src={resultImage} className="w-full h-full object-cover shadow-2xl" alt="Try-on Result" />
                  <div className="absolute top-10 right-10 flex items-center gap-3 px-6 py-3 bg-emerald-500 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-2xl">
                    <Zap size={14} className="animate-pulse" /> AI Avatar Result
                  </div>
               </div>
            )}

            {isProcessing && (
              <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xl flex flex-col items-center justify-center text-white gap-8">
                  <div className="relative">
                      <Loader2 size={120} className="animate-spin text-brand-500 opacity-30" />
                      <Sparkles size={40} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse text-brand-400" />
                  </div>
                  <div className="text-center space-y-3">
                      <h4 className="text-2xl font-black italic uppercase tracking-tighter">{t('aiGenerating')}</h4>
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Consulting Gemini Creative Core</p>
                  </div>
              </div>
            )}
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};
