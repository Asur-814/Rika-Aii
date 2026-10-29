import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { User, Sparkles, Check, Loader2 } from 'lucide-react';
import { getUserProfile, saveUserProfile, UserMemory } from '../lib/memory';

interface ProfileProps {
  profile: UserMemory | null;
  setProfile: React.Dispatch<React.SetStateAction<UserMemory | null>>;
}

const Profile: React.FC<ProfileProps> = ({ profile: initialProfile, setProfile: setGlobalProfile }) => {
  const [profile, setProfile] = useState<UserMemory | null>(initialProfile);
  const [loading, setLoading] = useState(!initialProfile);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (initialProfile) {
        setProfile(initialProfile);
        setLoading(false);
    } else {
        getUserProfile().then(data => {
            setProfile(data || {
              nickname: '',
              aiName: 'Rika',
              bio: ''
            });
            setLoading(false);
          });
    }
  }, [initialProfile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    await saveUserProfile(profile);
    setGlobalProfile(profile);
    setSaving(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
    </div>
  );

  return (
    <div className="p-8 max-w-4xl mx-auto w-full">
      <div className="mb-10">
        <h2 className="text-3xl font-bold text-blue-400 mb-2">Profile</h2>
        <p className="text-slate-500 text-sm">Personalize how you and Rika interact.</p>
      </div>

      <form onSubmit={handleSave} className="grid gap-8">
        <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 space-y-8">
          {/* User Info */}
          <div className="grid gap-6">
            <div className="flex items-center gap-3 mb-2">
              <User className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">User Identification</span>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Your Nickname</label>
              <input 
                type="text"
                value={profile?.nickname || ''}
                onChange={(e) => setProfile(prev => ({ ...prev!, nickname: e.target.value }))}
                placeholder="How should I call you?"
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-blue-500/50 transition-all"
              />
            </div>
          </div>

          <div className="h-[1px] bg-white/5 w-full" />

          {/* AI Info */}
          <div className="grid gap-6">
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">AI Personality Setup</span>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Short Bio / Background</label>
              <textarea 
                value={profile?.bio || ''}
                onChange={(e) => setProfile(prev => ({ ...prev!, bio: e.target.value }))}
                placeholder="Give Rika some context about your relationship or background..."
                rows={3}
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-blue-500/50 transition-all resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Instagram ID</label>
              <input 
                type="text"
                value={profile?.instagramId || ''}
                onChange={(e) => setProfile(prev => ({ ...prev!, instagramId: e.target.value }))}
                placeholder="@username"
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-blue-500/50 transition-all"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end items-center gap-4">
          {success && (
            <motion.span 
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-emerald-500 text-xs font-bold uppercase tracking-widest flex items-center gap-2"
            >
              <Check className="w-4 h-4" /> Profile Updated
            </motion.span>
          )}
          <button 
            type="submit"
            disabled={saving}
            className="px-10 py-4 bg-blue-600 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] hover:bg-blue-500 transition-all shadow-[0_0_30px_rgba(37,99,235,0.2)] disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Sync Profile'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Profile;
