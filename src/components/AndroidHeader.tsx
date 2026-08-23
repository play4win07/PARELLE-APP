import React, { useState, useEffect } from 'react';
import { Wifi, BatteryMedium, Signal, Shield } from 'lucide-react';
import { User } from '../types';

interface AndroidHeaderProps {
  user: User | null;
  onOpenProfile: () => void;
  isInVoice: boolean;
  activeRoomName?: string;
  onOpenActiveRoom?: () => void;
}

export const AndroidHeader: React.FC<AndroidHeaderProps> = ({
  user,
  onOpenProfile,
  isInVoice,
  activeRoomName,
  onOpenActiveRoom,
}) => {
  const [timeString, setTimeString] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div id="android-header" className="sticky top-0 z-40 bg-[#0B0F19]/95 backdrop-blur-md border-b border-slate-800/80 select-none">
      {/* Android System Status Bar */}
      <div className="flex items-center justify-between px-4 py-1 text-[11px] font-medium text-slate-400">
        <span className="tracking-tight font-mono text-slate-300">{timeString || '12:00 PM'}</span>
        <div className="flex items-center space-x-2">
          <Signal className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[10px] font-bold text-emerald-400 font-mono">5G</span>
          <Wifi className="w-3.5 h-3.5 text-slate-300" />
          <div className="flex items-center space-x-0.5">
            <span className="text-[10px] font-mono">92%</span>
            <BatteryMedium className="w-3.5 h-3.5 text-slate-300" />
          </div>
        </div>
      </div>

      {/* App Action Bar */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-500 flex items-center justify-center shadow-md shadow-emerald-500/20">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-base tracking-wide text-white font-sans">AeroVoice</span>
              <span className="px-1.5 py-0.2 text-[9px] font-mono font-semibold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 rounded-md border border-emerald-500/30">
                LITE
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Low-Latency Gaming Comms</p>
          </div>
        </div>

        {/* User profile quick trigger */}
        {user && (
          <button
            id="header-profile-btn"
            onClick={onOpenProfile}
            className="flex items-center space-x-2 p-1.5 pl-2 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 active:scale-95 transition-all text-left"
          >
            <div className="hidden sm:block text-right">
              <div className="text-xs font-semibold text-slate-200 truncate max-w-[90px]">{user.username}</div>
              <div className="text-[9px] font-mono text-emerald-400">● Online</div>
            </div>
            <div className="relative">
              <img
                src={user.avatar}
                alt={user.username}
                className="w-7 h-7 rounded-lg object-cover bg-slate-800 ring-1 ring-slate-700"
                referrerPolicy="no-referrer"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#0B0F19]"></span>
            </div>
          </button>
        )}
      </div>
    </div>
  );
};
