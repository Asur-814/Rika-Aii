import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

export type LedEmotion = 'neutral' | 'happy' | 'sad' | 'thinking' | 'angry' | 'surprised';

interface LedFaceProps {
  isSpeaking: boolean;
  isListening: boolean;
  isPowerOn: boolean;
  displayContent?: string | null;
  emotion?: LedEmotion;
}

const LedFace: React.FC<LedFaceProps> = ({ 
  isSpeaking, 
  isListening, 
  isPowerOn, 
  displayContent,
  emotion = 'neutral' 
}) => {
  const [blink, setBlink] = useState(false);
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!isPowerOn) return;
    
    let timeoutId: NodeJS.Timeout;
    
    const scheduleBlink = () => {
      const delay = 3000 + Math.random() * 5000;
      timeoutId = setTimeout(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), 150);
        scheduleBlink();
      }, delay);
    };

    scheduleBlink();
    
    // Mouse tracking & Idle Gazing logic
    let lastMouseMove = Date.now();
    let idleInterval: NodeJS.Timeout;

    const handleMouseMove = (e: MouseEvent) => {
      lastMouseMove = Date.now();
      // Normalize to -6 to 6 px range
      const x = (e.clientX / window.innerWidth - 0.5) * 12;
      const y = (e.clientY / window.innerHeight - 0.5) * 12;
      setEyeOffset({ x, y });
    };

    const handleIdleLook = () => {
      if (Date.now() - lastMouseMove > 2000) {
        // Random small saccade
        setEyeOffset({ 
          x: (Math.random() - 0.5) * 8, 
          y: (Math.random() - 0.5) * 8 
        });
      }
    };

    idleInterval = setInterval(handleIdleLook, 3000);
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(idleInterval);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [isPowerOn]);

  const emotionConfigs: Record<LedEmotion, { color: string; eyeClass: string; mouthClass?: string }> = {
    neutral: { color: 'bg-blue-400', eyeClass: 'rounded-full' },
    happy: { color: 'bg-green-400', eyeClass: 'rounded-t-full rounded-b-lg scale-y-75' },
    sad: { color: 'bg-blue-300', eyeClass: 'rounded-b-full rounded-t-lg scale-y-75 rotate-12' },
    thinking: { color: 'bg-purple-400', eyeClass: 'rounded-full scale-y-50' },
    angry: { color: 'bg-red-500', eyeClass: 'rounded-full rotate-45 scale-x-125' },
    surprised: { color: 'bg-amber-400', eyeClass: 'rounded-full scale-125' }
  };

  const currentConfig = emotionConfigs[emotion] || emotionConfigs.neutral;

  const eyeVariants = {
    open: { scaleY: 1 },
    blink: { scaleY: 0.1 }
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      {/* Eyes Container */}
      <div className="flex justify-center gap-12 mb-8">
        {/* Left Eye */}
        <motion.div 
          variants={eyeVariants}
          animate={{
            ...eyeOffset,
            scaleY: blink ? 0.1 : 1
          }}
          transition={{ 
            type: "spring", 
            stiffness: 150, 
            damping: 20,
            scaleY: { duration: 0.1 }
          }}
          className={`w-5 h-5 ${currentConfig.color} ${currentConfig.eyeClass} shadow-[0_0_20px_rgba(var(--glow-rgb),0.8)] transition-colors duration-500`}
          style={{ 
            '--glow-rgb': emotion === 'angry' ? '239, 68, 68' : 
                          emotion === 'happy' ? '74, 222, 128' :
                          '96, 165, 250' 
          } as any}
        />
        {/* Right Eye */}
        <motion.div 
          variants={eyeVariants}
          animate={{
            ...eyeOffset,
            scaleY: blink ? 0.1 : 1
          }}
          transition={{ 
            type: "spring", 
            stiffness: 150, 
            damping: 20,
            scaleY: { duration: 0.1 }
          }}
          className={`w-5 h-5 ${currentConfig.color} ${currentConfig.eyeClass} shadow-[0_0_20px_rgba(var(--glow-rgb),0.8)] transition-colors duration-500`}
          style={{ 
            '--glow-rgb': emotion === 'angry' ? '239, 68, 68' : 
                          emotion === 'happy' ? '74, 222, 128' :
                          '96, 165, 250' 
          } as any}
        />
      </div>

      {/* Main Display / Mouth Area */}
      <div className="relative w-32 h-20 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {displayContent ? (
            <motion.div
              key="content"
              initial={{ opacity: 0, scale: 0.5, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: -10 }}
              className={`text-4xl font-black ${emotion === 'angry' ? 'text-red-500' : 'text-blue-400'} drop-shadow-[0_0_10px_rgba(var(--glow-rgb),0.6)] font-mono transition-colors duration-500`}
              style={{ '--glow-rgb': emotion === 'angry' ? '239, 68, 68' : '96, 165, 250' } as any}
            >
              {displayContent}
            </motion.div>
          ) : (
            <motion.div 
              key="mouth"
              className="flex items-center gap-1.5"
            >
              {isSpeaking ? (
                /* Animated Mouth Bars */
                [...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ 
                      height: [4, emotion === 'happy' ? 24 : 16, 4],
                      opacity: [0.4, 1, 0.4]
                    }}
                    transition={{ 
                      duration: 0.2, 
                      repeat: Infinity, 
                      delay: i * 0.05 
                    }}
                    className={`w-2.5 ${currentConfig.color} rounded-full shadow-[0_0_12px_rgba(var(--glow-rgb),0.5)] transition-all duration-500`}
                    style={{ '--glow-rgb': emotion === 'angry' ? '239, 68, 68' : '96, 165, 250' } as any}
                  />
                ))
              ) : isListening ? (
                /* Listening Wave */
                <motion.div
                  animate={{ 
                    width: [20, 80, 20],
                    opacity: [0.3, 0.8, 0.3]
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className={`h-1.5 ${currentConfig.color} opacity-50 rounded-full blur-[1px] transition-all duration-500`}
                />
              ) : (
                /* Static Mouth based on emotion - Smile at rest */
                <motion.div
                  animate={{ 
                    width: emotion === 'happy' ? 44 : 
                           emotion === 'neutral' ? 32 : 
                           emotion === 'sad' ? 12 : 24,
                    height: (emotion === 'happy' || emotion === 'neutral') ? 4 : 2,
                    borderRadius: (emotion === 'happy' || emotion === 'neutral') ? "0 0 20px 20px" : "2px",
                    y: (emotion === 'happy' || emotion === 'neutral') ? 2 : 0
                  }}
                  className={`${currentConfig.color} opacity-40 shadow-[0_0_8px_rgba(var(--glow-rgb),0.4)] transition-all duration-500`}
                  style={{ '--glow-rgb': emotion === 'angry' ? '239, 68, 68' : '96, 165, 250' } as any}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default LedFace;
