import React, { useState } from 'react';
import { Radio, Search, Plus, LogIn, Users, Shield, Signal, ArrowRight, Trash2 } from 'lucide-react';
import { RoomSummary, User } from '../types';

interface MyRoomsScreenProps {
  rooms: RoomSummary[];
  currentUser: User;
  onSelectRoom: (roomId: string) => void;
  onOpenCreateRoom: () => void;
  onOpenJoinRoom: () => void;
  isInVoice: boolean;
  activeRoomId?: string;
}

export const MyRoomsScreen: React.FC<MyRoomsScreenProps> = ({
  rooms,
  currentUser,
  onSelectRoom,
  onOpenCreateRoom,
  onOpenJoinRoom,
  isInVoice,
  activeRoomId,
}) => {
  const [search, setSearch] = useState('');

  const filtered = rooms.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.roomId.toLowerCase().includes(search.toLowerCase()) ||
      r.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div id="my-rooms-screen" className="flex flex-col h-full bg-[#0B0F19] text-white overflow-y-auto pb-28">
      {/* Header */}
      <div className="p-4 bg-[#0E1424] border-b border-slate-800 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm">Persistent Voice Rooms</h2>
              <p className="text-[10px] text-slate-400 font-mono">My Rooms & Squad Channels</p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={onOpenCreateRoom}
              className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all shadow-md shadow-emerald-500/20"
              title="Create Room"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenJoinRoom}
              className="p-2 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 transition-all"
              title="Join by ID"
            >
              <LogIn className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            id="rooms-search-input"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search joined rooms by name or ID..."
            className="w-full pl-9 pr-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-medium"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      <div className="p-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="p-8 text-center rounded-3xl bg-slate-900/40 border border-slate-800/80 space-y-2">
            <Radio className="w-8 h-8 text-slate-600 mx-auto" />
            <h4 className="text-xs font-bold text-slate-300">
              {search ? 'No matching rooms found' : 'No rooms joined yet'}
            </h4>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              Create a new private voice room or join an existing squad room using their invite code.
            </p>
            <div className="pt-2 flex justify-center space-x-2">
              <button
                onClick={onOpenCreateRoom}
                className="px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold font-mono"
              >
                Create Room
              </button>
              <button
                onClick={onOpenJoinRoom}
                className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-cyan-300 text-xs font-bold font-mono"
              >
                Join Room
              </button>
            </div>
          </div>
        ) : (
          filtered.map((room) => {
            const isActive = activeRoomId === room.roomId && isInVoice;

            return (
              <div
                key={room.roomId}
                id={`room-item-${room.roomId}`}
                onClick={() => onSelectRoom(room.roomId)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between active:scale-[0.99] ${
                  isActive
                    ? 'bg-emerald-950/30 border-emerald-500/50 shadow-lg shadow-emerald-950/40'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 ${
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

                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{room.description || 'Voice squad room'}</p>

                    <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-mono mt-1">
                      <span className="text-cyan-400 font-bold">ID: {room.roomId}</span>
                      <span>•</span>
                      <span>{room.totalMembers} members</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end space-y-1.5 shrink-0 pl-2">
                  {room.connectedUsersCount > 0 ? (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>{room.connectedUsersCount} live</span>
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono text-slate-500">0 connected</span>
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
          })
        )}
      </div>
    </div>
  );
};
