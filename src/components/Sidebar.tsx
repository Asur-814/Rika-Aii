import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home, User, MessageSquare, Volume2, Settings, Menu, X } from 'lucide-react';
import { UserMemory } from '../lib/memory';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  profile: UserMemory | null;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, profile }) => {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'profile', icon: User, label: 'Profile' },
    { id: 'chat', icon: MessageSquare, label: 'Chat' },
    { id: 'tone', icon: Volume2, label: 'Tone' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  
  const isLight = profile?.settings?.theme === 'light';

  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <>
      {/* Menu Trigger Button */}
      <button 
        onClick={toggleMenu}
        className={`fixed top-6 left-6 z-[110] p-3 rounded-2xl transition-all shadow-2xl active:scale-90 ${
          isLight 
            ? 'bg-white text-slate-900 border border-slate-200' 
            : 'bg-white/5 text-white border border-white/10 backdrop-blur-xl'
        }`}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={toggleMenu}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />

            {/* Menu Panel */}
            <motion.div 
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`fixed top-0 left-0 h-screen w-72 z-[105] p-10 flex flex-col ${
                isLight ? 'bg-white border-r border-slate-200' : 'bg-[#08080a] border-r border-white/5'
              }`}
            >
              {/* Logo Area in Menu */}
              <div className="flex items-center gap-3 mb-16 ml-12 mt-2">
                <div className="relative">
                  <div className={`text-3xl font-black italic tracking-tighter ${isLight ? 'text-slate-900' : 'text-white'}`}>R</div>
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1], rotate: [0, 10, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="absolute -top-1 -right-2 text-blue-400 text-xs"
                  >
                    ✦
                  </motion.div>
                </div>
                <div className="flex flex-col">
                    <span className={`text-lg font-black tracking-tighter ${isLight ? 'text-slate-900' : 'text-white'}`}>Rika</span>
                    <span className={`text-[10px] font-bold uppercase tracking-[0.2em] opacity-40 ${isLight ? 'text-slate-900' : 'text-white'}`}>Assistant</span>
                </div>
              </div>

              {/* Nav Items */}
              <div className="flex-1 flex flex-col gap-4 ml-6">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                        setActiveTab(item.id);
                        setIsOpen(false);
                    }}
                    className={`flex items-center gap-4 p-4 rounded-2xl transition-all group relative ${
                        activeTab === item.id 
                            ? 'bg-blue-500/10 text-blue-400' 
                            : isLight ? 'text-slate-500 hover:bg-slate-100 hover:text-slate-900' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <item.icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${activeTab === item.id ? 'text-blue-400' : ''}`} />
                    <span className="text-sm font-bold tracking-tight">{item.label}</span>
                    
                    {activeTab === item.id && (
                        <motion.div 
                            layoutId="activeIndicator"
                            className="absolute left-0 w-1 h-6 bg-blue-500 rounded-r-full"
                        />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
