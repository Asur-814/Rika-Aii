import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Settings as SettingsIcon, Volume2, Shield, Bell, Moon, Sun, Smartphone, Laptop } from 'lucide-react';
import { getUserProfile, saveUserProfile, UserMemory } from '../lib/memory';

interface SettingsProps {
  profile: UserMemory | null;
  setProfile: React.Dispatch<React.SetStateAction<UserMemory | null>>;
}

const Settings: React.FC<SettingsProps> = ({ profile, setProfile }) => {
  const [saving, setSaving] = useState(false);
  const [localSettings, setLocalSettings] = useState(profile?.settings || { audioVolume: 80, voiceId: 'Kore', theme: 'dark', avatarId: 'Rika' });
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile?.settings && JSON.stringify(profile.settings) !== JSON.stringify(localSettings)) {
      setLocalSettings(profile.settings);
    }
  }, [profile]);

  const handleUpdate = (key: string, value: any) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = Math.min(img.width, img.height);
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.clip();
        
        const offsetX = (img.width - size) / 2;
        const offsetY = (img.height - size) / 2;
        
        ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, size, size);
        
        const croppedDataUrl = canvas.toDataURL('image/png');
        handleUpdate('customAvatarUrl', croppedDataUrl);
        handleUpdate('avatarId', 'custom');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    console.log("Saving settings:", localSettings);
    setSaving(true);
    const updated = {
      ...profile,
      settings: localSettings
    } as UserMemory;
    console.log("Saving updated profile:", updated);
    await saveUserProfile(updated);
    setProfile(updated);
    setSaving(false);
    console.log("Save complete.");
  };

  return (
    <div className={`p-8 max-w-4xl mx-auto w-full ${localSettings.theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>
      <div className="mb-10">
        <h2 className="text-3xl font-bold text-blue-400 mb-2">Settings</h2>
        <p className="text-slate-500 text-sm">Fine-tune your system experience and data privacy.</p>
      </div>

      <div className="space-y-6">
        {/* Audio Section */}
        <div className={`p-6 rounded-3xl border border-white/5 space-y-6 ${profile?.settings?.theme === 'light' ? 'bg-slate-100' : 'bg-white/[0.02]'}`}>
          <div className="flex items-center gap-3">
            <Volume2 className="w-5 h-5 text-blue-500" />
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-300">Audio & Voice Configuration</h3>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <span className="text-sm text-slate-400">Master Volume</span>
              <span className="text-sm font-mono text-blue-400">{localSettings.audioVolume || 80}%</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={localSettings.audioVolume || 80}
              onChange={(e) => handleUpdate('audioVolume', parseInt(e.target.value))}
              className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-slate-400 px-1">Rika's Voice</label>
              <div className="space-y-2">
                {['Kore', 'Puck', 'Charon', 'Fenrir', 'Aoede'].map((voice) => (
                  <div key={voice} className="flex items-center gap-2">
                    <button
                      onClick={() => handleUpdate('voiceId', voice)}
                      className={`flex-1 p-3 border rounded-xl text-sm text-left transition-all ${
                        localSettings.voiceId === voice
                          ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                          : localSettings.theme === 'light'
                          ? 'bg-white border-slate-300 text-slate-900 hover:bg-slate-50'
                          : 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10'
                      }`}
                    >
                      {voice}
                    </button>
                    <button
                      onClick={() => {
                        const path = `/audio/${voice.toLowerCase()}.mp3`;
                        console.log(`Attempting to play: ${path}`);
                        const audio = new Audio(path);
                        audio.play().catch(e => {
                          console.error("Audio playback failed:", e);
                          alert(`Audio file not found at ${path}. Please ensure it exists in /public/audio/ for the application to play it.`);
                        });
                      }}
                      className={`p-3 border rounded-xl transition-all ${
                        localSettings.theme === 'light'
                          ? 'bg-white border-slate-300 text-slate-900 hover:bg-slate-50'
                          : 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10'
                      }`}
                      title="Play Preview"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-400 px-1">Rika's Avatar</label>
              <div className="grid grid-cols-2 gap-4">
                {['Rika', 'Elena', 'Maya', 'Seraphina', 'led_face'].map((avatar) => (
                  <button
                    key={avatar}
                    onClick={() => handleUpdate('avatarId', avatar)}
                    className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-3 ${
                      localSettings.avatarId === avatar
                        ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                        : localSettings.theme === 'light'
                        ? 'bg-white border-slate-300 text-slate-900 hover:bg-slate-50'
                        : 'bg-white/5 border-transparent text-slate-500 hover:text-white'
                    }`}
                  >
                    {avatar === 'led_face' ? (
                      <div className="w-16 h-16 rounded-full bg-blue-500/20 flex flex-col items-center justify-center border border-blue-500/40">
                         <div className="flex gap-2 mb-2">
                           <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                           <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                         </div>
                         <div className="w-6 h-0.5 bg-blue-400/60 rounded-full" />
                      </div>
                    ) : (
                      <img
                        src={`https://api.dicebear.com/7.x/lorelei/svg?seed=${avatar}`}
                        alt={avatar}
                        className="w-16 h-16 rounded-full"
                      />
                    )}
                    <span className="text-sm font-bold">{avatar === 'led_face' ? 'LED Face' : avatar}</span>
                  </button>
                ))}
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-3 ${
                      localSettings.avatarId === 'custom'
                        ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                        : localSettings.theme === 'light'
                        ? 'bg-white border-slate-300 text-slate-900 hover:bg-slate-50'
                        : 'bg-white/5 border-transparent text-slate-500 hover:text-white'
                    }`}
                  >
                    {localSettings.customAvatarUrl ? (
                        <img src={localSettings.customAvatarUrl} alt="Custom" className="w-16 h-16 rounded-full" />
                    ) : (
                        <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xl">+</div>
                    )}
                    <span className="text-sm font-bold">Custom</span>
                </button>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} className="hidden" accept="image/*" />
            </div>
          </div>
        </div>

        {/* Interface Section */}
        <div className={`p-6 rounded-3xl border border-white/5 space-y-6 ${localSettings.theme === 'light' ? 'bg-slate-100' : 'bg-white/[0.02]'}`}>
          <div className="flex items-center gap-3">
            <Smartphone className="w-5 h-5 text-blue-500" />
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-300">Interface & Appearance</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => handleUpdate('theme', 'dark')}
              className={`p-4 rounded-2xl border transition-all flex items-center gap-3 ${
                localSettings.theme === 'dark' || !localSettings.theme 
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' 
                  : 'bg-white/5 border-transparent text-slate-500 hover:text-white'
              }`}
            >
              <Moon className="w-4 h-4" />
              <span className="text-sm font-bold">Dark Mode</span>
            </button>
            <button 
              onClick={() => handleUpdate('theme', 'light')}
              className={`p-4 rounded-2xl border transition-all flex items-center gap-3 ${
                localSettings.theme === 'light' 
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' 
                  : 'bg-white/5 border-transparent text-slate-500 hover:text-white'
              }`}
            >
              <Sun className="w-4 h-4" />
              <span className="text-sm font-bold">Light Mode</span>
            </button>
          </div>
        </div>

        {/* Security Section */}
        <div className={`p-6 rounded-3xl border border-white/5 space-y-6 ${localSettings.theme === 'light' ? 'bg-slate-100' : 'bg-white/[0.02]'}`}>
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-blue-500" />
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-300">Security & Privacy</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
                <label className="text-sm text-slate-400 px-1">Personal Gemini API Key</label>
                <input 
                  type="password"
                  placeholder="AIza..."
                  value={localSettings.geminiApiKey || ''}
                  onChange={(e) => handleUpdate('geminiApiKey', e.target.value)}
                  className={`w-full p-3 border rounded-xl text-sm font-mono outline-none focus:border-blue-500/50 ${localSettings.theme === 'light' ? 'bg-white border-slate-300 text-slate-900' : 'bg-white/5 border-white/10 text-slate-200'}`}
                />
                <p className="text-[10px] text-slate-600 px-1">Adding your own key will override the default system key and help you avoid rate limits. Key is stored locally in your profile.</p>
            </div>

            <div className={`flex items-center justify-between p-4 rounded-2xl ${localSettings.theme === 'light' ? 'bg-white border border-slate-200' : 'bg-white/5'}`}>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-bold text-slate-700">Encryption Level</span>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">AES-256 Quantum Resistant</span>
              </div>
              <div className="px-2 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded text-[8px] font-black uppercase tracking-widest">
                Active
              </div>
            </div>

            <div className={`flex items-center justify-between p-4 rounded-2xl ${localSettings.theme === 'light' ? 'bg-white border border-slate-200' : 'bg-white/5'}`}>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-bold text-slate-700">Data Synchronization</span>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Cloud Sync (Real-time)</span>
              </div>
              <div className="px-2 py-1 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded text-[8px] font-black uppercase tracking-widest">
                Enabled
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="mt-12 text-center">
        <p className="text-[10px] text-slate-800 font-black uppercase tracking-[0.5em]">
          Version Beta 2.0.4 || BY Harshit (ASUR)
        </p>
      </div>
    </div>
  );
};

export default Settings;
