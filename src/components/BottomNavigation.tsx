import React from 'react';
import { Home, Radio, Music, UserCheck, Shield } from 'lucide-react';
import { NavigationTab } from '../types';

interface BottomNavigationProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  isInVoice: boolean;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onTabChange,
  isInVoice,
}) => {
  const tabs = [
    { id: 'home' as NavigationTab, label: 'HOME', icon: Home },
    { id: 'rooms' as NavigationTab, label: 'ROOMS', icon: Radio },
    { id: 'music' as NavigationTab, label: 'MUSIC', icon: Music },
    { id: 'profile' as NavigationTab, label: 'PROFILE', icon: UserCheck },
  ];

  return (
    <nav
      id="android-bottom-nav"
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#0B0F19]/95 backdrop-blur-lg border-t border-slate-800/80 safe-area-bottom pb-safe"
    >
      <div className="max-w-md mx-auto px-3 py-1.5 flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              id={`nav-tab-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1.5 px-2 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'text-cyan-400 font-semibold bg-cyan-950/40 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'text-cyan-400 scale-105' : 'text-slate-400'}`} />
                {tab.id === 'rooms' && isInVoice && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#0B0F19] animate-pulse" />
                )}
              </div>
              <span className={`text-[10px] mt-1 font-mono tracking-wider ${isActive ? 'text-cyan-400 font-bold' : 'text-slate-400'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
