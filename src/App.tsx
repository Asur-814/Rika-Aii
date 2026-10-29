/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import RikaInterface from "./components/RikaInterface";
import Sidebar from "./components/Sidebar";
import Profile from "./components/Profile";
import Tone from "./components/Tone";
import Settings from "./components/Settings";
import { MessageSquare } from "lucide-react";
import { UserMemory, getLocalProfile, getUserProfile } from "./lib/memory";
import ChatInterface from "./components/ChatInterface";

export default function App() {
  const [profile, setProfile] = useState<UserMemory>(getLocalProfile());
  const [activeTab, setActiveTab] = useState('home');

  useEffect(() => {
    getUserProfile().then((data) => {
      if (data) {
        setProfile(data);
      }
    });
  }, []);

  const isLight = profile?.settings?.theme === 'light';
  const themeClass = isLight ? 'bg-white text-slate-900' : 'bg-[#050508] text-white';

  return (
    <div className={`min-h-screen flex ${themeClass}`}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} profile={profile} />
      <main className="flex-1 overflow-y-auto h-screen custom-scrollbar relative">
        {activeTab === 'home' && <RikaInterface profile={profile} />}
        {activeTab === 'chat' && (
          <>
            <ChatInterface session={null} profile={profile} />
            <div className="w-full max-w-2xl mx-auto mt-8 bg-white/[0.02] border border-white/5 rounded-2xl p-6 text-slate-400">
               <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 mb-4">
                 <MessageSquare className="w-4 h-4" /> Neural Memory History
               </h3>
               <p className="text-sm italic">Summaries of past conversations will appear here...</p>
            </div>
          </>
        )}
        {activeTab === 'profile' && <Profile profile={profile} setProfile={setProfile as any} />}
        {activeTab === 'tone' && <Tone profile={profile} setProfile={setProfile as any} />}
        {activeTab === 'settings' && <Settings profile={profile} setProfile={setProfile as any} />}
      </main>
    </div>
  );
}
