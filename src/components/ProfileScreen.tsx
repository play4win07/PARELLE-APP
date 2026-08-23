import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  Copy,
  Check,
  Mic,
  Volume2,
  Shield,
  Sparkles,
  Smartphone,
  Cpu,
  RefreshCw,
  LogOut,
  Edit2,
  Radio,
  Sliders,
} from 'lucide-react';
import { User } from '../types';

interface ProfileScreenProps {
  user: User;
  onOpenEditProfile: () => void;
  onLogout: () => void;
  isMicMuted: boolean;
  onToggleMic: () => void;
  masterVoiceVolume: number;
  onSetMasterVoiceVolume: (volume: number) => void;
  musicVolume: number;
  onSetMusicVolume: (volume: number) => void;
  isInVoice: boolean;
  activeRoomName?: string;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user,
  onOpenEditProfile,
  onLogout,
  isMicMuted,
  onToggleMic,
  masterVoiceVolume,
  onSetMasterVoiceVolume,
  musicVolume,
  onSetMusicVolume,
  isInVoice,
  activeRoomName,
}) => {
  const [copied, setCopied] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [isTestingMic, setIsTestingMic] = useState(false);

  const handleCopyId = () => {
    navigator.clipboard.writeText(user.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Mic test analyzer
  useEffect(() => {
    let animFrame: number;
    let audioCtx: AudioContext | null = null;
    let stream: MediaStream | null = null;

    if (isTestingMic) {
      navigator.mediaDevices
        .getUserMedia({ audio: true, video: false })
        .then((s) => {
          stream = s;
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          audioCtx = new AudioCtx();
          const source = audioCtx.createMediaStreamSource(s);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          const dataArray = new Uint8Array(analyser.frequencyBinCount);

          const checkVolume = () => {
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
            const avg = sum / dataArray.length;
            setMicLevel(Math.min(100, Math.round(avg * 2)));
            animFrame = requestAnimationFrame(checkVolume);
          };
          checkVolume();
        })
        .catch((e) => {
          console.warn('Mic test error:', e);
          setIsTestingMic(false);
        });
    } else {
      setMicLevel(0);
    }

    return () => {
      cancelAnimationFrame(animFrame);
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (audioCtx && audioCtx.state !== 'closed') audioCtx.close().catch(() => {});
    };
  }, [isTestingMic]);

  return (
    <div id="profile-screen" className="flex flex-col h-full bg-[#0B0F19] text-white overflow-y-auto pb-28">
      {/* Header */}
      <div className="p-4 bg-[#0E1424] border-b border-slate-800 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-500 flex items-center justify-center shadow-md shadow-emerald-500/20">
              <UserIcon className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-sm">Gamer Identity & Audio Settings</h2>
              <p className="text-[10px] text-slate-400 font-mono">Persistent Account & Hardware Config</p>
            </div>
          </div>

          <button
            onClick={onOpenEditProfile}
            className="flex items-center space-x-1 py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold font-mono border border-slate-700 transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Profile Card */}
        <div className="p-4 rounded-3xl bg-[#0E1424] border border-slate-800 shadow-xl shadow-cyan-950/20 space-y-3">
          <div className="flex items-center space-x-3.5">
            <div className="relative">
              <img
                src={user.avatar}
                alt={user.username}
                className="w-16 h-16 rounded-2xl object-cover bg-slate-800 border-2 border-cyan-500/40 p-0.5 shadow-md shadow-cyan-500/20"
                referrerPolicy="no-referrer"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-[#0E1424]" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-base text-slate-100 truncate">{user.username}</h3>
                <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
                  ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{user.bio || 'Squad Voice Comms'}</p>
            </div>
          </div>

          {/* Unique ID Box */}
          <div className="p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between font-mono text-xs">
            <div>
              <span className="text-[9px] uppercase text-slate-500 block">Unique Gamer User ID</span>
              <span className="text-cyan-300 font-bold">{user.id}</span>
            </div>
            <button
              onClick={handleCopyId}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Copy User ID"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Audio Diagnostics & Live Mic Meter */}
        <div className="p-4 rounded-3xl bg-[#0E1424] border border-slate-800 space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Mic className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-200">
                Microphone & Input Diagnostics
              </h4>
            </div>
            <button
              onClick={() => setIsTestingMic(!isTestingMic)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-colors ${
                isTestingMic
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30'
              }`}
            >
              {isTestingMic ? 'Stop Test' : 'Test Mic Level'}
            </button>
          </div>

          {/* Live Level Bar */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-mono mb-1">
              <span className="text-slate-400">Live Voice Input Energy</span>
              <span className="text-emerald-400 font-bold">{micLevel}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-0.5">
              <div
                className="h-full rounded-full transition-all duration-75 bg-gradient-to-r from-emerald-500 via-cyan-400 to-rose-500"
                style={{ width: `${micLevel}%` }}
              />
            </div>
          </div>

          {/* Hardware & Codec specs */}
          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400">
            <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/60">
              <span className="text-slate-500 block">VOICE CODEC</span>
              <span className="text-slate-200 font-bold">Opus Fullband (48kHz)</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/60">
              <span className="text-slate-500 block">LATENCY PROFILE</span>
              <span className="text-emerald-400 font-bold">Ultra Low (P2P Mesh)</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/60">
              <span className="text-slate-500 block">ECHO CANCELLATION</span>
              <span className="text-emerald-400 font-bold">Hardware Active</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/60">
              <span className="text-slate-500 block">NOISE SUPPRESSION</span>
              <span className="text-emerald-400 font-bold">VAD Filtered</span>
            </div>
          </div>
        </div>

        {/* Local Master Audio Controls */}
        <div className="p-4 rounded-3xl bg-[#0E1424] border border-slate-800 space-y-3 font-mono text-xs">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span>Master Volume Mixers</span>
          </h4>

          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-slate-400">Master Voice Output:</span>
              <span className="text-emerald-400 font-bold">{masterVoiceVolume}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={masterVoiceVolume}
              onChange={(e) => onSetMasterVoiceVolume(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-slate-400">Master Music Output:</span>
              <span className="text-indigo-400 font-bold">{musicVolume}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={musicVolume}
              onChange={(e) => onSetMusicVolume(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
            />
          </div>
        </div>

        {/* Switch Profile / Logout */}
        <button
          onClick={onLogout}
          className="w-full py-3 px-4 rounded-2xl bg-slate-900 border border-slate-800 hover:bg-rose-950/30 hover:border-rose-500/30 text-rose-400 text-xs font-mono font-bold flex items-center justify-center space-x-2 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Switch Account / Reset Local Profile</span>
        </button>
      </div>
    </div>
  );
};
