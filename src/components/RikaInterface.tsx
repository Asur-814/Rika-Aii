import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Power, 
  Mic, 
  Languages,
  MessageSquare,
  Crosshair,
  Shield,
  Sparkles, 
  Music,
  Heart,
  Loader2,
  Maximize2,
  Minimize2,
  Image as ImageIcon,
  AlertCircle,
  X
} from "lucide-react";
import { AudioRecorder, AudioPlayer } from "../lib/audio-utils";
import { LiveSession, SessionState } from "../lib/live-session";
import { UserMemory } from "../lib/memory";
import Clock from "./Clock";
import ChatInterface from "./ChatInterface";
import { RikaActions, Lead } from "../lib/rika-actions";
import LedFace, { LedEmotion } from "./LedFace";

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
  <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all group">
    <div className="p-3 rounded-full bg-blue-500/10 text-blue-400 shrink-0 group-hover:bg-blue-500/20 transition-colors">
      {icon}
    </div>
    <div className="flex flex-col gap-1">
      <h4 className="text-sm font-bold text-blue-400/90 leading-tight group-hover:text-blue-400 transition-colors">{title}</h4>
      <p className="text-[10px] text-slate-500 leading-relaxed font-light">{description}</p>
    </div>
  </div>
);

const RikaInterface: React.FC<{ profile: UserMemory | null }> = ({ profile }) => {
  const [state, setState] = useState<SessionState>("disconnected");
  const [session, setSession] = useState<LiveSession | null>(null);
  const [isPowerOn, setIsPowerOn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeLeads, setActiveLeads] = useState<Lead[]>([]);
  const [driveAssets, setDriveAssets] = useState<any[]>([]);
  const [displayContent, setDisplayContent] = useState<string | null>(null);
  const [emotion, setEmotion] = useState<LedEmotion>("neutral");

  const recorderRef = useRef<AudioRecorder | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const sessionRef = useRef<LiveSession | null>(null);
  const lastUserInteraction = useRef<number>(Date.now());
  const stateRef = useRef<SessionState>(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    playerRef.current = new AudioPlayer();
    
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      if (sessionRef.current) {
        sessionRef.current.disconnect();
      }
      recorderRef.current?.stop();
      playerRef.current?.stop();
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Proactive inactivity timer
  useEffect(() => {
    let inactivityTimer: NodeJS.Timeout | null = null;
    if (isPowerOn) {
      inactivityTimer = setInterval(() => {
        if (stateRef.current !== 'speaking' && (Date.now() - lastUserInteraction.current > 90000)) {
          console.log("[Rika] Proactively initiating conversation due to inactivity.");
          sessionRef.current?.sendText("Hey! It's been a bit quiet. You’ve been on my mind. Is there anything you want to chat about, or should I tell you something interesting?");
          lastUserInteraction.current = Date.now();
        }
      }, 10000);
    }
    
    return () => {
      if (inactivityTimer) clearInterval(inactivityTimer);
    };
  }, [isPowerOn]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        } else {
          console.warn("Fullscreen API not supported on this browser.");
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.error("Error attempting full-screen mode:", err);
      // This is often blocked if the user is in an iframe without 
      // the 'allow="fullscreen"' attribute, or if the browser 
      // does not permit programmable full-screen requests.
    }
  };

  const handleTogglePower = async () => {
    setErrorMsg(null);
    if (isPowerOn) {
      setIsPowerOn(false);
      sessionRef.current?.disconnect();
      setSession(null);
      recorderRef.current?.stop();
      playerRef.current?.stop();
      setState("disconnected");
    } else {
      setIsPowerOn(true);
      lastUserInteraction.current = Date.now();
      const callbacks = {
        onStateChange: (newState: SessionState) => setState(newState),
        onAudioData: (base64Audio: string) => playerRef.current?.playChunk(base64Audio),
        onInterrupted: () => playerRef.current?.stop(),
        onToolCall: (name: string, args: any) => {
          console.log(`Tool call: ${name}`, args);
        },
        onToolResult: (name: string, result: any) => {
          console.log(`Tool result: ${name}`, result);
          if (name === "leadGeneration") {
            setActiveLeads(result);
          } else if (name === "workspaceManagement") {
            setDriveAssets(result);
          }
        },
        onDisplayUpdate: (content: string | null) => {
          setDisplayContent(content);
          // Auto clear after 10 seconds if no further update
          if (content) {
            setTimeout(() => setDisplayContent(prev => prev === content ? null : prev), 10000);
          }
        },
        onEmotionUpdate: (newEmotion: any) => {
          setEmotion(newEmotion);
        },
        onError: (err: any) => {
          console.error(err);
          setErrorMsg(err instanceof Error ? err.message : String(err));
          setIsPowerOn(false);
          setState("disconnected");
        }
      };

      try {
        recorderRef.current = new AudioRecorder((base64) => {
          lastUserInteraction.current = Date.now();
          sessionRef.current?.sendAudio(base64);
        });
        await recorderRef.current.start();
        sessionRef.current = new LiveSession(callbacks, profile);
        await sessionRef.current.connect();
        setSession(sessionRef.current);
      } catch (err: any) {
        callbacks.onError(err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#050508] text-white p-6 sm:p-12 flex flex-col items-center max-w-6xl mx-auto pb-32 w-full">
      {/* Header */}
      <div className="w-full flex justify-between items-start mb-12">
        <div className="flex flex-col gap-1">
          <span className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em]">System Ready_ <Clock /></span>
          <h1 className="text-3xl sm:text-4xl font-bold text-blue-400 tracking-tighter">Welcome back!</h1>
          <span className="text-[#7e628e] text-[10px] font-bold uppercase tracking-[0.3em]">Build by Harshit (ASUR)</span>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Main Interaction Area */}
      <div className="flex flex-col items-center w-full mb-20 relative">
        {/* Avatar Area */}
        <div className="flex flex-col items-center relative">
          <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center mb-12">
            {/* External Halo Glow */}
            <motion.div 
              animate={{ 
                scale: isPowerOn ? [1, 1.15, 1] : 1,
                opacity: isPowerOn ? [0.3, 0.6, 0.3] : 0.1,
              }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-[-40px] rounded-full bg-blue-600/10 blur-[60px]" 
            />

            {/* Main Neon Ring */}
            <motion.div 
              animate={{ 
                boxShadow: isPowerOn 
                  ? (state === "speaking" ? "0 0 60px rgba(59, 130, 246, 0.5)" : "0 0 40px rgba(59, 130, 246, 0.3)") 
                  : "0 0 10px rgba(255, 255, 255, 0.05)"
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className={`absolute inset-0 rounded-full border-2 transition-colors duration-1000 ${
                isPowerOn ? 'border-blue-500/40' : 'border-white/5'
              }`} 
            />
            
            {/* Inner Ring */}
            <div className="absolute inset-2 rounded-full border border-blue-500/5" />

            {/* Avatar Container */}
            <div className="relative w-full h-full rounded-full overflow-hidden p-8 z-10 flex items-center justify-center">
              {profile?.settings?.avatarId === 'led_face' ? (
                <LedFace 
                  isSpeaking={state === "speaking"} 
                  isListening={state === "listening"} 
                  isPowerOn={isPowerOn}
                  displayContent={displayContent}
                  emotion={emotion}
                />
              ) : (
                <motion.div
                  animate={{ 
                    scale: isPowerOn ? (state === "listening" ? 1.08 : 1) : 0.85,
                    opacity: isPowerOn ? 1 : 0.4,
                    filter: isPowerOn ? "none" : "grayscale(1) brightness(0.5)"
                  }}
                  className="w-full h-full relative"
                >
                  <img 
                    src={
                        profile?.settings?.avatarId === 'custom' && profile?.settings?.customAvatarUrl 
                        ? profile?.settings?.customAvatarUrl 
                        : `https://api.dicebear.com/7.x/lorelei/svg?seed=${profile?.settings?.avatarId || 'Rika'}`
                    }
                    alt="Rika Assistant"
                    className="w-full h-full object-contain drop-shadow-[0_0_30px_rgba(59,130,246,0.2)]"
                    referrerPolicy="no-referrer"
                  />
                </motion.div>
              )}
            </div>

            {/* Pulsing Particles */}
            <AnimatePresence>
              {isPowerOn && (
                <div className="absolute inset-0 pointer-events-none">
                  {[...Array(12)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ 
                        opacity: [0, 0.4, 0],
                        scale: [0, 1.5, 0],
                        x: Math.cos(i * (Math.PI * 2 / 12)) * 140,
                        y: Math.sin(i * (Math.PI * 2 / 12)) * 140
                      }}
                      transition={{ 
                        duration: 3 + Math.random() * 2, 
                        repeat: Infinity, 
                        delay: Math.random() * 2 
                      }}
                      className="absolute top-1/2 left-1/2 w-1 h-1 bg-blue-300 rounded-full blur-[1px]"
                    />
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Visualizer */}
          <div className="flex items-center gap-1 h-8 mb-10">
            <AnimatePresence mode="wait">
              {isPowerOn ? (
                <div className="flex items-center gap-1.5 h-full">
                  {state === "speaking" ? (
                    [...Array(9)].map((_, i) => (
                      <motion.div 
                        key={i}
                        animate={{ height: [4, 24, 4] }}
                        transition={{ duration: 0.3, repeat: Infinity, delay: i * 0.1 }}
                        className="w-[2px] bg-blue-400 rounded-full shadow-[0_0_8px_rgba(96,165,250,0.5)]"
                      />
                    ))
                  ) : state === "listening" ? (
                    <motion.div 
                      animate={{ width: [40, 140, 40], opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="h-[2px] bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                    />
                  ) : (
                    <div className="h-[1px] w-16 bg-blue-900/30 rounded-full" />
                  )}
                </div>
              ) : (
                <div className="h-[1px] w-16 bg-white/5 rounded-full" />
              )}
            </AnimatePresence>
          </div>

          {/* Action Button */}
          <div className="flex flex-col items-center gap-6 w-full max-w-md">
            <button 
              onClick={handleTogglePower}
              disabled={state === "connecting"}
              className={`group relative flex items-center gap-4 px-12 py-5 rounded-full transition-all duration-500 overflow-hidden ${
                isPowerOn 
                  ? 'bg-blue-600 shadow-[0_0_50px_rgba(37,99,235,0.4)]' 
                  : 'bg-transparent border border-blue-500/20 hover:border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.05)]'
              }`}
            >
              {/* Button Shine */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              
              {state === "connecting" ? (
                <Loader2 className="w-5 h-5 animate-spin text-white" />
              ) : (
                <Power className={`w-5 h-5 transition-transform group-hover:scale-110 ${isPowerOn ? 'text-white' : 'text-blue-500'}`} />
              )}
              <span className={`text-[11px] font-black uppercase tracking-[0.4em] ${isPowerOn ? 'text-white' : 'text-blue-500/80'}`}>
                {isPowerOn ? 'SYSTEM ACTIVE' : 'WAKE UP'}
              </span>
            </button>
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]"
            >
              {isPowerOn 
                ? (state === "speaking" ? "TRANSCEIVING_DATA" : state === "listening" ? "NEURAL_SYNC_ACTIVE" : "LINK_STABLE") 
                : "I'm here to help you, Rika is ready when you are."}
            </motion.p>
          </div>
        </div>
      </div>

      {/* Feature Section */}
      <div className="w-full flex flex-col items-center mt-8">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Rika – Your Personal AI Assistant</h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto font-light leading-relaxed px-4">
            More than an assistant, Rika is like your virtual girlfriend. <br className="hidden sm:block" />
            She understands you, supports you, and is always here for you.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl px-4">
          <FeatureCard 
            icon={<Heart className="w-5 h-5" />}
            title="Behaves Like Your Virtual Girlfriend"
            description="Caring, supportive and emotionally connected with you."
          />
          <FeatureCard 
            icon={<Mic className="w-5 h-5" />}
            title="Natural Voice"
            description="Realistic and expressive voice that feels truly human."
          />
          <FeatureCard 
            icon={<ImageIcon className="w-5 h-5" />}
            title="Image Analysis"
            description="Share photos via file upload for deep neural vision analysis."
          />
          <FeatureCard 
            icon={<Languages className="w-5 h-5" />}
            title="Real-Time Data Access"
            description="Neural search grounding for up-to-date information."
          />
          <FeatureCard 
            icon={<Shield className="w-5 h-5" />}
            title="Lead Generation Protocol"
            description="Neural search business leads via Google Maps integration."
          />
          <FeatureCard 
            icon={<Sparkles className="w-5 h-5" />}
            title="Advanced Workspace Sync"
            description="Deep link with Google Drive to extract and analyze assets."
          />
          <FeatureCard 
            icon={<Sparkles className="w-5 h-5" />}
            title="Social Neural Automation"
            description="Auto-captioning and cross-platform posting (IG/YT/FB)."
          />
          <FeatureCard 
            icon={<Shield className="w-5 h-5" />}
            title="Neural Data Encryption"
            description="Secure RIKA-grade security for your personal workspace data."
          />
        </div>

        {/* Footer */}
        <div className="mt-24 pb-12 flex flex-col items-center gap-4">
          <a href="https://www.instagram.com/its__harshit.8/" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-4 cursor-pointer">
            <div className="flex items-center gap-3 text-blue-500/60 transition-opacity hover:opacity-100">
              <Heart className="w-4 h-4 fill-blue-500/20" />
              <span className="text-[10px] font-bold uppercase tracking-[0.4em]">Rika is here. For you. Always.</span>
            </div>
            <div className="text-[8px] text-slate-800 uppercase font-black tracking-widest">
              Neural_Bridge_v2.0.4 || BY Harshit (ASUR)
            </div>
          </a>
        </div>
      </div>
      
      {/* Error Overlay */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 bg-red-950/40 border border-red-500/30 backdrop-blur-xl rounded-2xl flex items-center gap-4 shadow-2xl max-w-md w-full"
          >
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h5 className="text-[10px] font-black uppercase text-red-400 mb-1">Neural_Interface_Error</h5>
              <p className="text-xs text-red-100/70 font-medium leading-tight">{errorMsg}</p>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-slate-500 hover:text-white transition-colors" title="Dismiss">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.2);
        }
      `}</style>
    </div>
  );
};

export default RikaInterface;
