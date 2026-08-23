import React from 'react';
import { Mic, MicOff, PhoneOff, Radio, Volume2, VolumeX, Maximize2 } from 'lucide-react';
import { ConnectionStatus } from '../types';

interface ActiveVoiceBarProps {
  roomName: string;
  roomId: string;
  connectionStatus: ConnectionStatus;
  isMicMuted: boolean;
  isLocalSpeaking: boolean;
  onToggleMic: () => void;
  onDisconnect: () => void;
  onOpenRoomView: () => void;
  peersCount: number;
}

export const ActiveVoiceBar: React.FC<ActiveVoiceBarProps> = ({
  roomName,
  roomId,
  connectionStatus,
  isMicMuted,
  isLocalSpeaking,
  onToggleMic,
  onDisconnect,
  onOpenRoomView,
  peersCount,
}) => {
  return (
    <div
      id="active-voice-floating-bar"
      className="fixed bottom-[60px] left-0 right-0 z-30 px-3 py-1 pointer-events-none"
    >
      <div className="max-w-md mx-auto pointer-events-auto bg-[#131B2E]/95 border border-cyan-500/30 rounded-2xl shadow-xl shadow-cyan-950/40 backdrop-blur-md p-2.5 flex items-center justify-between text-white transition-all">
        {/* Left: Room & Voice info click to expand */}
        <button
          id="active-voice-expand-btn"
          onClick={onOpenRoomView}
          className="flex items-center space-x-2.5 flex-1 min-w-0 text-left mr-2 hover:opacity-90 transition-opacity"
        >
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              isLocalSpeaking
                ? 'bg-emerald-500/30 ring-2 ring-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                : 'bg-cyan-950/80 border border-cyan-500/30 text-cyan-400'
            }`}
          >
            <Radio className={`w-4 h-4 ${isLocalSpeaking ? 'animate-pulse' : ''}`} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-bold text-slate-100 truncate">{roomName}</span>
              <span className="px-1.5 py-0.2 text-[9px] font-mono bg-cyan-900/40 text-cyan-300 rounded border border-cyan-500/30">
                {peersCount + 1} live
              </span>
            </div>
            <div className="flex items-center space-x-1.5 text-[10px]">
              <span
                className={`inline-block w-1.5 h-1.5 rounded-full ${
                  connectionStatus === 'connected'
                    ? isLocalSpeaking
                      ? 'bg-emerald-400 animate-ping'
                      : 'bg-emerald-400'
                    : 'bg-amber-400 animate-pulse'
                }`}
              />
              <span className="text-slate-400 font-mono">
                {connectionStatus === 'connected'
                  ? isLocalSpeaking
                    ? 'Transmitting Voice...'
                    : 'Voice Connected'
                  : 'Reconnecting...'}
              </span>
            </div>
          </div>
        </button>

        {/* Right: Quick Mic & Disconnect Actions */}
        <div className="flex items-center space-x-1.5">
          <button
            id="voicebar-mic-toggle"
            onClick={onToggleMic}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
              isMicMuted
                ? 'bg-rose-500/20 border border-rose-500/40 text-rose-400 hover:bg-rose-500/30'
                : isLocalSpeaking
                ? 'bg-emerald-500 text-black font-bold shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                : 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
            title={isMicMuted ? 'Unmute Mic' : 'Mute Mic'}
          >
            {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <button
            id="voicebar-expand-icon-btn"
            onClick={onOpenRoomView}
            className="w-8 h-8 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 flex items-center justify-center hover:bg-slate-700 transition-colors"
            title="Open Room Full View"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          <button
            id="voicebar-disconnect-btn"
            onClick={onDisconnect}
            className="w-8 h-8 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-900/30 active:scale-95 transition-all"
            title="Disconnect Voice"
          >
            <PhoneOff className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
