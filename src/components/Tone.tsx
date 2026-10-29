import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Volume2, Heart, Zap, Smile, Info, Check } from 'lucide-react';
import { getUserProfile, saveUserProfile, UserMemory } from '../lib/memory';

interface ToneProps {
  profile: UserMemory | null;
  setProfile: React.Dispatch<React.SetStateAction<UserMemory | null>>;
}

const Tone: React.FC<ToneProps> = ({ profile: initialProfile, setProfile: setGlobalProfile }) => {
  const [profile, setProfile] = useState<UserMemory | null>(initialProfile);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialProfile) {
        setProfile(initialProfile);
    } else {
        getUserProfile().then(setProfile);
    }
  }, [initialProfile]);

  const tones = [
    { id: 'sassy', label: 'Sassy', icon: Zap, color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10', desc: 'Bold, witty, and a little provocative.' },
    { id: 'caring', label: 'Caring', icon: Heart, color: 'text-rose-400', bg: 'bg-rose-500/10', desc: 'Sweet, supportive, and emotionally present.' },
    { id: 'helpful', label: 'Professional', icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10', desc: 'Clear, concise, and focused on tasks.' },
    { id: 'playful', label: 'Playful', icon: Smile, color: 'text-amber-400', bg: 'bg-amber-500/10', desc: 'Energetic, fun, and lighthearted.' },
  ];

  const handleToneChange = async (toneId: any) => {
    if (!profile) return;
    setSaving(true);
    const updated = {
      ...profile,
      preferences: {
        ...profile.preferences,
        sassyLevel: profile.preferences?.sassyLevel || 'mild',
        tone: toneId
      }
    } as UserMemory;
    setProfile(updated);
    await saveUserProfile(updated);
    setGlobalProfile(updated);
    setSaving(false);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto w-full">
      <div className="mb-10">
        <h2 className="text-3xl font-bold text-blue-400 mb-2">Tone</h2>
        <p className="text-slate-500 text-sm">Adjust Rika's personality and communication style.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tones.map((tone) => {
          const isActive = profile?.preferences?.tone === tone.id;
          return (
            <button
              key={tone.id}
              onClick={() => handleToneChange(tone.id)}
              disabled={saving}
              className={`p-6 rounded-3xl border transition-all text-left flex flex-col gap-4 relative overflow-hidden group ${
                isActive 
                  ? 'bg-blue-500/10 border-blue-500/40' 
                  : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
              }`}
            >
              {isActive && (
                <div className="absolute top-4 right-4 text-blue-400">
                  <Check className="w-5 h-5" />
                </div>
              )}
              
              <div className={`p-3 w-fit rounded-2xl ${tone.bg} ${tone.color}`}>
                <tone.icon className="w-6 h-6" />
              </div>

              <div>
                <h3 className={`font-bold mb-1 ${isActive ? 'text-blue-400' : 'text-white'}`}>{tone.label}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{tone.desc}</p>
              </div>

              {isActive && (
                <motion.div 
                  layoutId="toneActiveLine"
                  className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 opacity-50 shadow-[0_0_15px_rgba(59,130,246,0.8)]"
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-12 p-6 rounded-3xl bg-blue-500/5 border border-blue-500/10 flex items-start gap-4">
        <div className="p-2 rounded-full bg-blue-500/20 text-blue-400">
          <Info className="w-4 h-4" />
        </div>
        <p className="text-[11px] text-blue-400/70 leading-relaxed font-medium mt-1">
          Changing the tone will instantly rewire Rika's neural pathways. Conversations will adapt to the new personality profile in real-time.
        </p>
      </div>
    </div>
  );
};

export default Tone;
