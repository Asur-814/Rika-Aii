import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from "motion/react";
import { Send, Briefcase, MessageSquare, Mic, MapPin, Battery, Wifi, ExternalLink, RefreshCw, X, Check, Image as ImageIcon, Monitor } from 'lucide-react';
import { UserMemory, saveUserProfile } from '../lib/memory';

interface Message {
  sender: 'user' | 'rika';
  text: string;
  type?: 'text' | 'image' | 'status';
  image?: string; // Base64 image
  grounding?: any[];
}

const ChatInterface: React.FC<{ profile: UserMemory | null }> = ({ profile }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isProfessionalMode, setIsProfessionalMode] = useState(false);
  const [isRikaTyping, setIsRikaTyping] = useState(false);
  const [sensoryInput, setSensoryInput] = useState<{ image?: string; audio?: string } | null>(null);
  const [activeSensors, setActiveSensors] = useState<string[]>([]);
  const [isCapturingScreen, setIsCapturingScreen] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isRikaTyping]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const data = (reader.result as string).split(',')[1];
        setSensoryInput(prev => ({ ...(prev || {}), image: data }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleScreenSync = async () => {
    try {
      setIsCapturingScreen(true);
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: { cursor: "always" } as any,
        audio: false 
      });
      
      const track = stream.getVideoTracks()[0];
      const imageCapture = new (window as any).ImageCapture(track);
      const bitmap = await imageCapture.grabFrame();
      
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        const base64 = dataUrl.split(",")[1];
        setSensoryInput(prev => ({ ...(prev || {}), image: base64 }));
        
        setMessages(prev => [...prev, { 
          sender: 'rika', 
          text: "Visual Sync established. I can see your screen now. What should I look for?", 
          type: 'status' 
        }]);
      }
      
      track.stop();
    } catch (err) {
      console.error("Screen sync failed:", err);
    } finally {
      setIsCapturingScreen(false);
    }
  };

  const executeFunction = async (name: string, args: any) => {
    switch (name) {
      case 'changeTheme':
        // Updated for Rika theme specs
        await saveUserProfile({ settings: { ...profile?.settings, themeColor: args.primaryColor, density: args.density } as any });
        setMessages(prev => [...prev, { sender: 'rika', text: `Neural Link: Layout density set to ${args.density}`, type: 'status' }]);
        break;
      case 'socialAutomation':
        setMessages(prev => [...prev, { 
          sender: 'rika', 
          text: `Initiating ${args.platform} protocol for ${args.task}... Sequence: "${args.content}"`, 
          type: 'status' 
        }]);
        break;
      case 'executeLocalCommand':
        setMessages(prev => [...prev, { 
          sender: 'rika', 
          text: `Directing Local Bridge to ${args.action} on target: ${args.target}.`, 
          type: 'status' 
        }]);
        break;
      case 'setTimer':
        setMessages(prev => [...prev, { sender: 'rika', text: `System action: Timer set for ${args.seconds}s: ${args.label || 'No label'}`, type: 'status' }]);
        setTimeout(() => {
            alert(`Timer finished: ${args.label || 'Rika Timer'}`);
        }, args.seconds * 1000);
        break;
      case 'getSensoryData':
        // Mocking real-time device data
        let res = "Unknown";
        if (args.sensor === 'battery') res = `${Math.floor(Math.random() * 100)}%`;
        if (args.sensor === 'connection') res = "Strong (5G)";
        if (args.sensor === 'memory') res = "4.2GB / 8GB Free";
        if (args.sensor === 'location') res = "New York, USA";
        
        setActiveSensors(prev => [...new Set([...prev, args.sensor])]);
        return res;
      default:
        return "Function not implemented";
    }
  };

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;

        recognitionRef.current.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInputText(transcript);
            setIsListening(false);
        };

        recognitionRef.current.onerror = () => setIsListening(false);
        recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
        recognitionRef.current?.stop();
    } else {
        setIsListening(true);
        recognitionRef.current?.start();
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() && !sensoryInput?.image) return;
    
    const userMessage: Message = { 
        sender: 'user', 
        text: inputText || "What do you see?",
        image: sensoryInput?.image
    };
    setMessages(prev => [...prev, userMessage]);
    
    const currentInputText = inputText;
    const currentSensoryInput = sensoryInput;
    setInputText("");
    setSensoryInput(null);
    setIsRikaTyping(true);

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                message: currentInputText, 
                isProfessionalMode,
                userApiKey: profile?.settings?.geminiApiKey,
                profile: profile ? {
                    nickname: profile.nickname,
                    bio: profile.bio,
                    instagramId: profile.instagramId,
                    preferences: profile.preferences
                } : undefined,
                sensoryInput: currentSensoryInput ? {
                    image: currentSensoryInput.image ? { data: currentSensoryInput.image } : undefined,
                    audio: currentSensoryInput.audio ? { data: currentSensoryInput.audio } : undefined
                } : undefined,
                history: messages.slice(-10).map(m => ({ // Slightly longer history for context
                    role: m.sender === 'user' ? 'user' : 'model',
                    parts: [
                        ...(m.image ? [{ inlineData: { mimeType: "image/jpeg", data: m.image } }] : []),
                        { text: m.text }
                    ]
                }))
            }),
        });
        const data = await response.json();
        
        if (!response.ok) {
            setMessages(prev => [...prev, { 
                sender: 'rika', 
                text: data.error || "Rika is currently offline or experiencing issues. Try again in a moment.",
                type: 'status'
            }]);
            return;
        }

        // Handle Function Calls
        if (data.functionCalls) {
            for (const call of data.functionCalls) {
                await executeFunction(call.name, call.args);
            }
        }

        if (data.text) {
            setMessages(prev => [...prev, { 
                sender: 'rika', 
                text: data.text, 
                grounding: data.groundingMetadata?.groundingChunks 
            }]);
        }
    } catch (error) {
        console.error("Chat error:", error);
    } finally {
        setIsRikaTyping(false);
        setSensoryInput(null);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-12 bg-white/[0.02] border border-white/5 rounded-2xl p-6 flex flex-col gap-4 relative overflow-hidden">
      {/* Sensor Dashboard Area */}
      <div className="flex gap-4 p-3 bg-white/[0.02] rounded-xl border border-white/5 relative z-10 overflow-x-auto no-scrollbar">
          <div className={`p-2 rounded-lg flex items-center gap-2 text-[10px] uppercase font-bold tracking-tighter ${activeSensors.includes('location') ? 'text-blue-400 bg-blue-400/10' : 'text-slate-600'}`}>
              <MapPin className="w-3 h-3" /> Sensory Grounding
          </div>
          <div className={`p-2 rounded-lg flex items-center gap-2 text-[10px] uppercase font-bold tracking-tighter ${activeSensors.includes('battery') ? 'text-green-400 bg-green-400/10' : 'text-slate-600'}`}>
              <Battery className="w-3 h-3" /> Core Power
          </div>
          <div className={`p-2 rounded-lg flex items-center gap-2 text-[10px] uppercase font-bold tracking-tighter ${activeSensors.includes('connection') ? 'text-cyan-400 bg-cyan-400/10' : 'text-slate-600'}`}>
              <Wifi className="w-3 h-3" /> Neural Link
          </div>
      </div>

      <div className="flex justify-between items-center text-slate-400 relative z-10">
        <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
          <MessageSquare className="w-4 h-4" /> Cognitive Interface
        </h3>
        <button 
          onClick={() => setIsProfessionalMode(!isProfessionalMode)}
          className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded transition-colors ${isProfessionalMode ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white/5 hover:bg-white/10'}`}
        >
          <Briefcase className="w-3 h-3" /> {isProfessionalMode ? "Professional AI" : "Casual Rika"}
        </button>
      </div>

      <div className="h-80 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-3 relative z-10">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex flex-col gap-1 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`text-sm ${msg.sender === 'user' ? 'bg-blue-600 text-white px-3 py-2 rounded-l-2xl rounded-tr-2xl' : msg.type === 'status' ? 'bg-white/5 text-slate-500 italic text-[11px] px-3 py-1' : 'bg-slate-800 text-slate-200 px-3 py-2 rounded-r-2xl rounded-tl-2xl border border-white/5'}`}>
                {msg.image && (
                    <img 
                        src={`data:image/jpeg;base64,${msg.image}`} 
                        alt="Shared image" 
                        className="w-40 h-auto rounded-lg mb-2 border border-white/10"
                    />
                )}
                {msg.text}
                {msg.grounding && (
                  <div className="mt-2 pt-2 border-t border-white/10 flex flex-wrap gap-2">
                    {msg.grounding.map((chunk, cidx) => chunk.web && (
                       <a key={cidx} href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="text-[10px] flex items-center gap-1 text-blue-400 hover:underline">
                         <ExternalLink className="w-2 h-2" /> {chunk.web.title || 'Source'}
                       </a>
                    ))}
                  </div>
                )}
            </div>
          </div>
        ))}
        {isRikaTyping && (
          <div className="self-start bg-slate-800 text-slate-200 px-3 py-2 rounded-r-2xl rounded-tl-2xl flex gap-1 items-center border border-white/5">
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-blue-400 rounded-full"></motion.div>
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-blue-400 rounded-full"></motion.div>
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-blue-400 rounded-full"></motion.div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {sensoryInput?.image && (
        <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-blue-500/50 mb-2">
           <img src={`data:image/jpeg;base64,${sensoryInput.image}`} className="w-full h-full object-cover" />
           <button onClick={() => setSensoryInput(prev => ({ ...prev, image: undefined }))} className="absolute top-0 right-0 bg-red-600 text-white p-0.5"><X size={10} /></button>
        </div>
      )}

      <div className="flex gap-2 relative z-10 items-end">
        <div className="flex gap-1 mb-1">
            <button 
                onClick={handleScreenSync}
                disabled={isCapturingScreen}
                className={`p-2 bg-white/5 text-slate-400 rounded-full hover:bg-white/10 transition-colors ${isCapturingScreen ? 'animate-pulse text-blue-400' : ''}`}
                title="Sync Vision (Read Screen)"
            >
                <Monitor size={18} />
            </button>
            <button 
                onClick={() => fileInputRef.current?.click()} 
                className="p-2 bg-white/5 text-slate-400 rounded-full hover:bg-white/10"
                title="Upload Image"
            >
                <ImageIcon size={18} />
            </button>
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept="image/*" 
                className="hidden" 
            />
            <button 
                onClick={toggleListening}
                className={`p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors ${isListening ? 'animate-pulse text-red-500 bg-red-500/10' : 'text-slate-400'}`}
                title="Auditory Perception"
            >
                <Mic size={18} />
            </button>
        </div>
        <div className="flex-1 relative flex items-center">
            <input 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={sensoryInput?.image ? "Comment on this image..." : "Ask Rika anything..."}
              className="w-full bg-white/5 border border-white/5 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-700 outline-none focus:border-blue-500/50 transition-all font-light"
            />
        </div>
        <button 
            onClick={handleSendMessage} 
            disabled={isRikaTyping}
            className="p-3 bg-blue-600 rounded-2xl text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-blue-600/20 transition-all active:scale-95"
        >
          {isRikaTyping ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};

export default ChatInterface;
