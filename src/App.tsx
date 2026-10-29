/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, User } from "firebase/auth";
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from "./lib/firebase";
import RikaInterface from "./components/RikaInterface";
import Sidebar from "./components/Sidebar";
import Profile from "./components/Profile";
import Tone from "./components/Tone";
import Settings from "./components/Settings";
import { LogIn, Loader2, MessageSquare } from "lucide-react";
import { UserMemory } from "./lib/memory";
import ChatInterface from "./components/ChatInterface";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserMemory | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');

  useEffect(() => {
    let profileUnsubscribe: () => void = () => {};

    const authUnsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        setLoading(true);
        profileUnsubscribe = onSnapshot(doc(db, 'users', u.uid), (snap) => {
           if (snap.exists()) {
             setProfile(snap.data() as UserMemory);
           }
           setLoading(false);
        }, (err: any) => {
           if (err.code === 'unavailable' || err.message?.includes('offline')) {
             console.warn("Profile sync in offline mode.");
           } else {
             console.error("Profile sync error:", err);
           }
           setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
        profileUnsubscribe();
      }
    });
    
    return () => {
      authUnsubscribe();
      profileUnsubscribe();
    };
  }, []);

  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      const provider = new GoogleAuthProvider();
      // Add Rika Advanced Scopes
      provider.addScope('https://www.googleapis.com/auth/drive.readonly');
      provider.addScope('https://www.googleapis.com/auth/youtube.upload');
      provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
      provider.addScope('https://www.googleapis.com/auth/userinfo.email');
      
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      
      // Store token in global memory for API access
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        (window as any).googleAccessToken = credential.accessToken;
        console.log("[Rika] Advanced neural link established with Workspace.");
      }
    } catch (error: any) {
      if (error.code === 'auth/cancelled-popup-request') {
        console.warn("Login popup was cancelled by a subsequent request.");
      } else if (error.code === 'auth/popup-closed-by-user') {
        console.warn("Login popup was closed by user.");
      } else {
        console.error("Login failed:", error);
        alert(`Login failed: ${error.message}`);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const isLight = profile?.settings?.theme === 'light';
  const themeClass = isLight ? 'bg-white text-slate-900' : 'bg-[#050508] text-white';

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050508] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-600 blur-2xl opacity-20 absolute" />
        <h1 className="text-5xl font-light tracking-tighter text-white mb-4 relative z-10 italic">Rika Assistant</h1>
        <p className="text-slate-400 max-w-sm mb-12 font-light leading-relaxed relative z-10">
          Your personal AI assistant. More than just chat, she's here for you.
        </p>
        <button 
          onClick={handleLogin}
          disabled={isLoggingIn}
          className="group relative px-8 py-4 bg-white text-black font-bold rounded-2xl transition-all hover:scale-105 active:scale-95 flex items-center gap-3 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-white opacity-0 group-hover:opacity-100 transition-opacity" />
          {isLoggingIn ? (
            <Loader2 className="w-5 h-5 animate-spin relative z-10" />
          ) : (
            <LogIn className="w-5 h-5 relative z-10" />
          )}
          <span className="relative z-10">{isLoggingIn ? 'Connecting...' : 'Sign in with Google'}</span>
        </button>
      </div>
    );
  }

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
        {activeTab === 'profile' && <Profile profile={profile} setProfile={setProfile} />}
        {activeTab === 'tone' && <Tone profile={profile} setProfile={setProfile} />}
        {activeTab === 'settings' && <Settings profile={profile} setProfile={setProfile} />}
      </main>
    </div>
  );
}

