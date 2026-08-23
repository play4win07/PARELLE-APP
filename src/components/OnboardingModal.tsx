import React, { useState } from 'react';
import { User, Shield, Sparkles, RefreshCw, ArrowRight } from 'lucide-react';

interface OnboardingModalProps {
  onComplete: (username: string, avatar: string, bio: string) => Promise<void>;
}

const GAMER_NAMES = [
  'GhostSniper',
  'VortexRider',
  'CyberViper',
  'ShadowKnight',
  'NovaStriker',
  'ApexRogue',
  'PixelTitan',
  'EchoWarrior',
  'FrostGamer',
  'BlazeAce',
];

const PRESET_AVATARS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=ShadowGamer',
  'https://api.dicebear.com/7.x/bottts/svg?seed=CyberStrike',
  'https://api.dicebear.com/7.x/bottts/svg?seed=ApexViper',
  'https://api.dicebear.com/7.x/bottts/svg?seed=GhostNinja',
  'https://api.dicebear.com/7.x/bottts/svg?seed=NovaTitan',
  'https://api.dicebear.com/7.x/bottts/svg?seed=PixelRaptor',
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onComplete }) => {
  const [username, setUsername] = useState('Gamer_' + Math.floor(100 + Math.random() * 900));
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0]);
  const [bio, setBio] = useState('Squad Voice Comms Ready');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRandomizeName = () => {
    const random = GAMER_NAMES[Math.floor(Math.random() * GAMER_NAMES.length)];
    const suffix = Math.floor(10 + Math.random() * 90);
    const newName = `${random}_${suffix}`;
    setUsername(newName);
    setSelectedAvatar(`https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(newName)}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onComplete(username.trim(), selectedAvatar, bio.trim());
    } catch (err: any) {
      setError(err.message || 'Failed to setup profile');
      setLoading(false);
    }
  };

  return (
    <div id="onboarding-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-sm bg-[#0E1424] border border-slate-800 rounded-3xl p-6 shadow-2xl shadow-cyan-950/50 text-white animate-in fade-in zoom-in-95 duration-200">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-emerald-500 shadow-lg shadow-emerald-500/20 mb-3">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-bold font-sans tracking-wide">Welcome to AeroVoice</h2>
          <p className="text-xs text-slate-400 mt-1">Lightweight Gaming Comms & Music Rooms</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar Selector */}
          <div className="flex flex-col items-center">
            <div className="relative mb-3">
              <img
                src={selectedAvatar}
                alt="Avatar"
                className="w-20 h-20 rounded-2xl object-cover bg-slate-900 border-2 border-cyan-500/50 p-1 shadow-md shadow-cyan-500/20"
                referrerPolicy="no-referrer"
              />
              <button
                type="button"
                onClick={handleRandomizeName}
                className="absolute -bottom-1 -right-1 p-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-full border border-slate-700 active:scale-95 transition-all shadow-md"
                title="Randomize Avatar & Tag"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center space-x-2">
              {PRESET_AVATARS.map((av, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setSelectedAvatar(av)}
                  className={`w-7 h-7 rounded-lg overflow-hidden border transition-all ${
                    selectedAvatar === av
                      ? 'border-cyan-400 scale-110 shadow-sm shadow-cyan-400/50'
                      : 'border-slate-800 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={av} alt="Preset" className="w-full h-full bg-slate-900" referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          </div>

          {/* Username Input */}
          <div>
            <label className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Gamer Tag / Username
            </label>
            <div className="relative">
              <input
                id="onboarding-username-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={24}
                placeholder="Enter gamer tag"
                className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-sm font-medium text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
              />
              <button
                type="button"
                onClick={handleRandomizeName}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-400 p-1"
                title="Randomize name"
              >
                <Sparkles className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Bio Input */}
          <div>
            <label className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Status / Bio (Optional)
            </label>
            <input
              id="onboarding-bio-input"
              type="text"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={40}
              placeholder="e.g. Competitive Valorant, Lo-Fi chill"
              className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-sm font-medium text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
            />
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {error}
            </div>
          )}

          <button
            id="onboarding-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-cyan-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <span>{loading ? 'Creating Profile...' : 'Enter AeroVoice'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
