import React, { useState } from 'react';
import { User, X, Copy, Check, Sparkles, Mic, Volume2, ShieldCheck, LogOut } from 'lucide-react';
import { User as UserType } from '../types';

interface ProfileModalProps {
  user: UserType;
  isOpen: boolean;
  onClose: () => void;
  onUpdateProfile: (username: string, avatar: string, bio: string) => Promise<void>;
  onLogout: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  user,
  isOpen,
  onClose,
  onUpdateProfile,
  onLogout,
}) => {
  if (!isOpen) return null;

  const [username, setUsername] = useState(user.username);
  const [bio, setBio] = useState(user.bio || '');
  const [avatar, setAvatar] = useState(user.avatar);
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const handleCopyId = () => {
    navigator.clipboard.writeText(user.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    setIsSaving(true);
    setMsg('');
    try {
      await onUpdateProfile(username.trim(), avatar, bio.trim());
      setMsg('Profile updated!');
      setTimeout(() => {
        setMsg('');
        onClose();
      }, 800);
    } catch (err: any) {
      setMsg('Failed to update: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const randomizeAvatar = () => {
    const seed = 'Gamer_' + Math.floor(Math.random() * 10000);
    setAvatar(`https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(seed)}`);
  };

  return (
    <div id="profile-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-[#0E1424] border border-slate-800 rounded-3xl p-5 shadow-2xl shadow-cyan-950/60 text-white animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-base">Gamer Profile</h3>
          </div>
          <button
            id="profile-modal-close-btn"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-3.5">
          {/* Avatar & User ID */}
          <div className="flex items-center space-x-3.5 p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80">
            <div className="relative">
              <img
                src={avatar}
                alt={user.username}
                className="w-14 h-14 rounded-xl object-cover bg-slate-800 border border-cyan-500/40 p-0.5"
                referrerPolicy="no-referrer"
              />
              <button
                type="button"
                onClick={randomizeAvatar}
                className="absolute -bottom-1 -right-1 p-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-md border border-slate-700 shadow-sm"
                title="Change Avatar"
              >
                <Sparkles className="w-3 h-3" />
              </button>
            </div>

            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-mono uppercase text-slate-400">Unique User ID</span>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className="font-mono text-xs text-cyan-300 truncate max-w-[140px]">{user.id}</span>
                <button
                  type="button"
                  id="profile-copy-id-btn"
                  onClick={handleCopyId}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="Copy User ID"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono">● Auto-synced</span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono font-semibold uppercase text-slate-400 mb-1">
              Username
            </label>
            <input
              id="profile-username-input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={24}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm font-medium text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono font-semibold uppercase text-slate-400 mb-1">
              Status / Bio
            </label>
            <input
              id="profile-bio-input"
              type="text"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={60}
              placeholder="e.g. Apex ranked grinding"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm font-medium text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Quick Voice Settings */}
          <div className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/80 text-[11px] text-slate-400 space-y-1.5 font-mono">
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <Mic className="w-3.5 h-3.5 text-cyan-400" />
                <span>Audio Engine</span>
              </span>
              <span className="text-emerald-400 font-bold">Opus Low-Latency</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Echo / Noise Filter</span>
              </span>
              <span className="text-emerald-400">Enabled</span>
            </div>
          </div>

          {msg && (
            <p className={`text-xs text-center font-medium ${msg.includes('Failed') ? 'text-rose-400' : 'text-emerald-400'}`}>
              {msg}
            </p>
          )}

          <div className="flex items-center space-x-2 pt-1">
            <button
              id="profile-save-btn"
              type="submit"
              disabled={isSaving}
              className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 active:scale-98 transition-all disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Profile'}
            </button>

            <button
              id="profile-logout-btn"
              type="button"
              onClick={onLogout}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 border border-slate-700 hover:border-rose-500/30 text-slate-300 hover:text-rose-400 transition-colors"
              title="Reset / Switch Account"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
