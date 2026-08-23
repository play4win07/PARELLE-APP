import React from 'react';
import {
  Shield,
  Plus,
  LogIn,
  Radio,
  Users,
  Music,
  Headphones,
  Signal,
  ArrowRight,
  Sparkles,
  Volume2,
  ChevronRight,
  Flame,
} from 'lucide-react';
import { User, RoomSummary, NavigationTab } from '../types';

interface HomeScreenProps {
  user: User;
  myRooms: RoomSummary[];
  onOpenCreateRoom: () => void;
  onOpenJoinRoom: () => void;
  onSelectRoom: (roomId: string) => void;
  onNavigateTab: (tab: NavigationTab) => void;
  isInVoice: boolean;
  activeRoomId?: string;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  user,
  myRooms,
  onOpenCreateRoom,
  onOpenJoinRoom,
  onSelectRoom,
  onNavigateTab,
  isInVoice,
  activeRoomId,
}) => {
  return (
    <div id="home-screen" className="flex flex-col h-full bg-[#0B0F19] text-white overflow-y-auto pb-28">
      {/* Top Banner / Gamer Identity */}
      <div className="p-4 bg-[#0E1424] border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <img
                src={user.avatar}
                alt={user.username}
                className="w-12 h-12 rounded-2xl object-cover bg-slate-800 border-2 border-cyan-500/40 p-0.5 shadow-md shadow-cyan-500/20"
                referrerPolicy="no-referrer"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-[#0E1424]" />
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-bold text-base text-slate-100">{user.username}</h2>
                <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
                  ONLINE
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{user.bio || 'Squad Voice Comms'}</p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-mono text-slate-500 uppercase block">Engine</span>
            <span className="text-xs font-mono font-semibold text-cyan-400">WebRTC Opus</span>
          </div>
        </div>

        {/* Action Buttons: Create Room & Join Room */}
        <div className="grid grid-cols-2 gap-2.5 mt-4">
          <button
            id="home-create-room-btn"
            onClick={onOpenCreateRoom}
            className="p-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 active:scale-98 transition-all"
          >
            <Plus className="w-4 h-4 text-slate-950 stroke-[2.5]" />
            <span>Create Room</span>
          </button>

          <button
            id="home-join-room-btn"
            onClick={onOpenJoinRoom}
            className="p-3 rounded-2xl bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/40 text-cyan-300 font-bold text-xs flex items-center justify-center space-x-2 shadow-md shadow-cyan-950/30 active:scale-98 transition-all"
          >
            <LogIn className="w-4 h-4 text-cyan-300 stroke-[2.5]" />
            <span>Join Room</span>
          </button>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* MY ROOMS Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Radio className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-200">
                My Rooms ({myRooms.length})
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('rooms')}
              className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {myRooms.length === 0 ? (
            <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 text-center space-y-2">
              <Radio className="w-8 h-8 text-slate-600 mx-auto" />
              <h4 className="text-xs font-bold text-slate-300">No rooms joined yet</h4>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                Create a private room for your squad or join with a Room ID and Password.
              </p>
              <div className="pt-2 flex justify-center space-x-2">
                <button
                  onClick={onOpenCreateRoom}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold font-mono"
                >
                  Create Room
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {myRooms.map((room) => {
                const isActive = activeRoomId === room.roomId && isInVoice;

                return (
                  <div
                    key={room.roomId}
                    id={`room-card-${room.roomId}`}
                    onClick={() => onSelectRoom(room.roomId)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between active:scale-[0.99] ${
                      isActive
                        ? 'bg-emerald-950/30 border-emerald-500/50 shadow-md shadow-emerald-950/40'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                          isActive
                            ? 'bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                            : 'bg-slate-800 text-cyan-400 border border-slate-700'
                        }`}
                      >
                        <Radio className="w-5 h-5" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <h4 className="text-xs font-bold text-slate-100 truncate">{room.name}</h4>
                          {room.isOwner && (
                            <span className="px-1.5 py-0.2 text-[8px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded">
                              OWNER
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-mono mt-0.5">
                          <span className="text-cyan-400">ID: {room.roomId}</span>
                          <span>•</span>
                          <span>{room.totalMembers} members</span>
                        </div>
                      </div>
                    </div>

                    {/* Right side stats & Connect trigger */}
                    <div className="flex items-center space-x-2 shrink-0">
                      {room.connectedUsersCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center space-x-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>{room.connectedUsersCount} live</span>
                        </span>
                      )}

                      <button
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all ${
                          isActive
                            ? 'bg-emerald-500 text-slate-950 shadow-sm'
                            : 'bg-slate-800 text-cyan-300 hover:bg-cyan-500 hover:text-slate-950'
                        }`}
                      >
                        {isActive ? 'IN VOICE' : 'CONNECT'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Music & Gaming Audio Stations Banner */}
        <div
          id="home-music-banner"
          onClick={() => onNavigateTab('music')}
          className="p-4 rounded-3xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-purple-950/40 border border-indigo-500/30 cursor-pointer hover:border-indigo-500/50 transition-all flex items-center justify-between"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h4 className="text-xs font-bold text-slate-100">YouTube Gaming Music Player</h4>
                <span className="px-1.5 py-0.2 text-[8px] font-mono font-bold bg-indigo-500/20 text-indigo-300 rounded">
                  NEW
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                Lo-Fi beats, OST & Hypetracks while in voice comms
              </p>
            </div>
          </div>

          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>

        {/* Low-End Android Device Features info */}
        <div className="p-3.5 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-2 text-[11px] text-slate-400 font-mono">
          <div className="flex items-center justify-between text-slate-300 font-semibold">
            <span className="flex items-center space-x-1.5">
              <Signal className="w-3.5 h-3.5 text-emerald-400" />
              <span>Android Lite Voice Architecture</span>
            </span>
            <span className="text-emerald-400">Low RAM & Battery Mode</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            Optimized for low-end mobile hardware and cellular data. Microphone is strictly turned off when disconnected.
          </p>
        </div>
      </div>
    </div>
  );
};
