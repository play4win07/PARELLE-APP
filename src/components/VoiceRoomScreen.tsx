import React, { useState, useEffect } from 'react';
import {
  Mic,
  MicOff,
  PhoneOff,
  Shield,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Radio,
  Sliders,
  Settings,
  Users,
  LogOut,
  ChevronDown,
  Volume1,
  Share2,
  Lock,
  Headphones,
  Signal,
} from 'lucide-react';
import { RoomDetail, RoomMemberDetail, PeerVoiceState, ConnectionStatus, User } from '../types';
import { AdminControlsModal } from './AdminControlsModal';

interface VoiceRoomScreenProps {
  room: RoomDetail;
  members: RoomMemberDetail[];
  currentUser: User;
  connectionStatus: ConnectionStatus;
  connectionMessage: string;
  peers: PeerVoiceState[];
  isMicMuted: boolean;
  isLocalSpeaking: boolean;
  onToggleMic: () => void;
  onConnectVoice: () => void;
  onDisconnectVoice: () => void;
  onSetPeerVolume: (peerUserId: string, volume: number) => void;
  onSetPeerLocallyMuted: (peerUserId: string, muted: boolean) => void;
  onSetMasterVoiceVolume: (volume: number) => void;
  masterVoiceVolume: number;
  onLeaveRoom: () => Promise<void>;
  onCloseRoomView: () => void;
  onRefreshRoomData: () => Promise<void>;
  onRemoveMember: (targetUserId: string) => Promise<void>;
  onMuteMemberByAdmin: (targetUserId: string, isMuted: boolean) => void;
  onUpdateRoomSettings: (params: { name?: string; password?: string; description?: string }) => Promise<void>;
  onDeleteRoom: () => Promise<void>;
}

export const VoiceRoomScreen: React.FC<VoiceRoomScreenProps> = ({
  room,
  members,
  currentUser,
  connectionStatus,
  connectionMessage,
  peers,
  isMicMuted,
  isLocalSpeaking,
  onToggleMic,
  onConnectVoice,
  onDisconnectVoice,
  onSetPeerVolume,
  onSetPeerLocallyMuted,
  onSetMasterVoiceVolume,
  masterVoiceVolume,
  onLeaveRoom,
  onCloseRoomView,
  onRefreshRoomData,
  onRemoveMember,
  onMuteMemberByAdmin,
  onUpdateRoomSettings,
  onDeleteRoom,
}) => {
  const [copiedId, setCopiedId] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [showVolumeMixer, setShowVolumeMixer] = useState(false);
  const [selectedUserForMixer, setSelectedUserForMixer] = useState<string | null>(null);

  const isInVoice = connectionStatus === 'connected';
  const isAdminOrOwner = room.isOwner || room.myRole === 'admin';

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(room.roomId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Find peer state map for quick lookup
  const peerMap = new Map<string, PeerVoiceState>();
  peers.forEach((p) => peerMap.set(p.userId, p));

  return (
    <div id="voice-room-screen" className="flex flex-col h-full bg-[#0B0F19] text-white overflow-hidden select-none">
      {/* Top App Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#0E1424] border-b border-slate-800 shrink-0">
        <button
          id="room-back-btn"
          onClick={onCloseRoomView}
          className="flex items-center space-x-1.5 py-1 px-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-mono transition-colors"
        >
          <ChevronDown className="w-4 h-4 rotate-90" />
          <span>BACK</span>
        </button>

        <div className="text-center min-w-0 px-2">
          <h2 className="text-sm font-bold text-slate-100 truncate">{room.name}</h2>
          <button
            onClick={handleCopyRoomId}
            className="inline-flex items-center space-x-1 text-[10px] font-mono text-cyan-400 hover:text-cyan-300"
            title="Click to copy Room ID"
          >
            <span>ID: {room.roomId}</span>
            {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>

        <div className="flex items-center space-x-1">
          {isAdminOrOwner && (
            <button
              id="room-admin-btn"
              onClick={() => setIsAdminModalOpen(true)}
              className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 transition-colors"
              title="Admin Controls"
            >
              <Shield className="w-4 h-4" />
            </button>
          )}

          <button
            id="room-mixer-btn"
            onClick={() => setShowVolumeMixer(!showVolumeMixer)}
            className={`p-2 rounded-xl border transition-colors ${
              showVolumeMixer
                ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
            }`}
            title="Individual Volume Mixer"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Voice Status & Connectivity Banner */}
      <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800/60 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center space-x-2">
          <span
            className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected'
                ? 'bg-emerald-400 animate-pulse'
                : connectionStatus === 'connecting' || connectionStatus === 'reconnecting'
                ? 'bg-amber-400 animate-ping'
                : 'bg-slate-500'
            }`}
          />
          <span className="text-slate-300">
            {connectionStatus === 'connected'
              ? 'Voice Connected (Low Latency)'
              : connectionStatus === 'connecting'
              ? 'Connecting Voice...'
              : connectionStatus === 'reconnecting'
              ? 'Reconnecting...'
              : 'Voice Disconnected'}
          </span>
        </div>

        {isInVoice && (
          <div className="flex items-center space-x-1.5 text-emerald-400 text-[11px]">
            <Signal className="w-3.5 h-3.5" />
            <span>18ms Opus</span>
          </div>
        )}
      </div>

      {/* Main Content: Members List & Speaking Grid */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Connected Voice Participants Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              <span>Voice Comms ({isInVoice ? peers.length + 1 : peers.length})</span>
            </span>

            {isInVoice && (
              <span className="text-[10px] font-mono text-cyan-400">
                Tap user for Individual Volume
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Current User Card */}
            {isInVoice && (
              <div
                id="voice-card-self"
                className={`p-3 rounded-2xl border transition-all relative overflow-hidden ${
                  isLocalSpeaking
                    ? 'bg-emerald-950/40 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                    : 'bg-slate-900/90 border-slate-800'
                }`}
              >
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-2">
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.username}
                      className={`w-14 h-14 rounded-2xl object-cover bg-slate-800 p-0.5 transition-all ${
                        isLocalSpeaking
                          ? 'ring-4 ring-emerald-400 ring-offset-2 ring-offset-slate-950 animate-pulse'
                          : 'ring-1 ring-slate-700'
                      }`}
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute -bottom-1 -right-1 p-1 rounded-md bg-slate-900 border border-slate-700 text-xs">
                      {isMicMuted ? (
                        <MicOff className="w-3 h-3 text-rose-400" />
                      ) : (
                        <Mic className="w-3 h-3 text-emerald-400" />
                      )}
                    </span>
                  </div>

                  <span className="text-xs font-bold text-white truncate max-w-full">
                    {currentUser.username} (You)
                  </span>

                  <span className="text-[9px] font-mono text-emerald-400 mt-0.5">
                    {isLocalSpeaking ? 'Speaking...' : isMicMuted ? 'Mic Muted' : 'Connected'}
                  </span>
                </div>
              </div>
            )}

            {/* Remote Peers in Voice */}
            {peers.map((peer) => {
              const isSpeaking = peer.isSpeaking && !peer.isMuted;
              return (
                <div
                  key={peer.userId}
                  id={`voice-card-${peer.userId}`}
                  onClick={() => setSelectedUserForMixer(selectedUserForMixer === peer.userId ? null : peer.userId)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer relative overflow-hidden active:scale-98 ${
                    isSpeaking
                      ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="relative mb-2">
                      <img
                        src={peer.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${peer.username}`}
                        alt={peer.username}
                        className={`w-14 h-14 rounded-2xl object-cover bg-slate-800 p-0.5 transition-all ${
                          isSpeaking
                            ? 'ring-4 ring-cyan-400 ring-offset-2 ring-offset-slate-950 animate-pulse'
                            : 'ring-1 ring-slate-700'
                        }`}
                        referrerPolicy="no-referrer"
                      />
                      <span className="absolute -bottom-1 -right-1 p-1 rounded-md bg-slate-900 border border-slate-700 text-xs">
                        {peer.isLocallyMuted || peer.isMuted ? (
                          <VolumeX className="w-3 h-3 text-rose-400" />
                        ) : (
                          <Volume2 className="w-3 h-3 text-cyan-400" />
                        )}
                      </span>
                    </div>

                    <span className="text-xs font-bold text-white truncate max-w-full">{peer.username}</span>

                    {/* Volume Level indicator */}
                    <div className="flex items-center space-x-1 text-[9px] font-mono text-cyan-300 mt-0.5">
                      <span>Vol: {peer.isLocallyMuted ? 'Muted' : `${peer.localVolume}%`}</span>
                    </div>
                  </div>

                  {/* Highlight bar if selected for volume adjustment */}
                  {selectedUserForMixer === peer.userId && (
                    <div className="absolute top-1 right-1">
                      <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                  )}
                </div>
              );
            })}

            {!isInVoice && peers.length === 0 && (
              <div className="col-span-full p-6 text-center rounded-2xl bg-slate-900/40 border border-slate-800/60 text-slate-400">
                <Radio className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-300">Voice channel is empty</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Tap "Connect Voice" below to start speaking with your squad.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* INDIVIDUAL USER VOLUME MIXER PANEL (Requirement #7) */}
        {(showVolumeMixer || selectedUserForMixer) && (
          <div className="p-4 rounded-2xl bg-[#131B2E] border border-cyan-500/30 shadow-xl shadow-cyan-950/40 space-y-3.5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-cyan-300">
                  Individual User Volume Mixer
                </h4>
              </div>
              <span className="text-[10px] font-mono text-slate-400">Local Playback Gain (0% - 200%)</span>
            </div>

            {peers.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-2">
                No other users currently connected to voice.
              </p>
            ) : (
              <div className="space-y-3">
                {peers.map((peer) => (
                  <div
                    key={peer.userId}
                    className={`p-2.5 rounded-xl border transition-all ${
                      selectedUserForMixer === peer.userId
                        ? 'bg-cyan-950/40 border-cyan-500/50'
                        : 'bg-slate-900/80 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center space-x-2 min-w-0">
                        <img
                          src={peer.avatar}
                          alt={peer.username}
                          className="w-6 h-6 rounded-md object-cover bg-slate-800"
                          referrerPolicy="no-referrer"
                        />
                        <span className="text-xs font-bold text-slate-200 truncate">{peer.username}</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono font-bold text-cyan-400">
                          {peer.isLocallyMuted ? 'Muted' : `${peer.localVolume}%`}
                        </span>

                        <button
                          onClick={() => onSetPeerLocallyMuted(peer.userId, !peer.isLocallyMuted)}
                          className={`p-1 rounded-md text-[10px] font-mono border transition-colors ${
                            peer.isLocallyMuted
                              ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                              : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                          }`}
                          title="Local Mute This User"
                        >
                          {peer.isLocallyMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Volume Slider 0% - 200% */}
                    <div className="flex items-center space-x-2">
                      <Volume1 className="w-3.5 h-3.5 text-slate-500" />
                      <input
                        type="range"
                        min="0"
                        max="200"
                        step="5"
                        value={peer.isLocallyMuted ? 0 : peer.localVolume}
                        onChange={(e) => onSetPeerVolume(peer.userId, Number(e.target.value))}
                        disabled={peer.isLocallyMuted}
                        className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 disabled:opacity-40"
                      />
                      <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Master Voice Volume Slider */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Master Voice Output:</span>
              <div className="flex items-center space-x-2 w-1/2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={masterVoiceVolume}
                  onChange={(e) => onSetMasterVoiceVolume(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                />
                <span className="text-emerald-400 font-bold w-9 text-right">{masterVoiceVolume}%</span>
              </div>
            </div>
          </div>
        )}

        {/* All Persistent Room Members List */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>Room Members ({members.length})</span>
            </span>
          </div>

          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.userId}
                className="p-2.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between"
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="relative">
                    <img
                      src={member.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${member.username}`}
                      alt={member.username}
                      className="w-8 h-8 rounded-xl object-cover bg-slate-800 border border-slate-700"
                      referrerPolicy="no-referrer"
                    />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-[#0B0F19] ${
                        member.isConnectedToVoice ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'
                      }`}
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-semibold text-slate-200 truncate">{member.username}</span>
                      {member.isOwner && (
                        <span className="px-1.5 py-0.2 text-[8px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded">
                          HOST
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">
                      {member.isConnectedToVoice ? 'In voice chat' : 'Offline / Member'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  {member.userId !== currentUser.id && isInVoice && (
                    <button
                      onClick={() => {
                        setShowVolumeMixer(true);
                        setSelectedUserForMixer(member.userId);
                      }}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 transition-colors"
                      title="Adjust Volume"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Leave Room Button */}
        {!room.isOwner && (
          <div className="pt-2">
            <button
              id="room-leave-permanently-btn"
              onClick={onLeaveRoom}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-800 hover:bg-rose-950/30 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 text-xs font-mono flex items-center justify-center space-x-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Leave Room Permanently</span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom Voice Action Bar */}
      <div className="p-4 bg-[#0E1424] border-t border-slate-800 shrink-0">
        {isInVoice ? (
          <div className="flex items-center justify-between space-x-2">
            <button
              id="room-mic-toggle-btn"
              onClick={onToggleMic}
              className={`flex-1 py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-lg active:scale-98 ${
                isMicMuted
                  ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500/30'
                  : isLocalSpeaking
                  ? 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                  : 'bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700'
              }`}
            >
              {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              <span>{isMicMuted ? 'UNMUTE MIC' : 'MIC ACTIVE'}</span>
            </button>

            <button
              id="room-disconnect-voice-btn"
              onClick={onDisconnectVoice}
              className="py-3 px-5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-lg shadow-rose-950/50 active:scale-98 transition-all"
            >
              <PhoneOff className="w-4 h-4" />
              <span>DISCONNECT</span>
            </button>
          </div>
        ) : (
          <button
            id="room-connect-voice-btn"
            onClick={onConnectVoice}
            disabled={connectionStatus === 'connecting'}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 active:scale-98 transition-all disabled:opacity-50"
          >
            <Radio className="w-4 h-4" />
            <span>{connectionStatus === 'connecting' ? 'CONNECTING VOICE...' : 'CONNECT VOICE'}</span>
          </button>
        )}
      </div>

      {/* Admin Controls Modal */}
      {isAdminModalOpen && (
        <AdminControlsModal
          room={room}
          members={members}
          currentUserId={currentUser.id}
          isOpen={isAdminModalOpen}
          onClose={() => setIsAdminModalOpen(false)}
          onRemoveMember={onRemoveMember}
          onMuteMember={onMuteMemberByAdmin}
          onUpdateSettings={onUpdateRoomSettings}
          onDeleteRoom={onDeleteRoom}
        />
      )}
    </div>
  );
};
