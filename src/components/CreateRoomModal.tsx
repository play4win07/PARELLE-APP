import React, { useState } from 'react';
import { X, Shield, Copy, Check, Share2, Sparkles, Lock, ArrowRight, Radio } from 'lucide-react';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: (params: {
    name: string;
    password?: string;
    description?: string;
  }) => Promise<{ room: any; credentials: { roomId: string; password: string } }>;
  onJoinCreatedRoom: (roomId: string) => void;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  onClose,
  onCreateRoom,
  onJoinCreatedRoom,
}) => {
  if (!isOpen) return null;

  const [roomName, setRoomName] = useState('');
  const [description, setDescription] = useState('');
  const [customPassword, setCustomPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Result state after creation
  const [createdCredentials, setCreatedCredentials] = useState<{
    roomId: string;
    password: string;
    name: string;
  } | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) {
      setError('Please enter a room name');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await onCreateRoom({
        name: roomName.trim(),
        password: customPassword.trim() || undefined,
        description: description.trim() || undefined,
      });
      setCreatedCredentials({
        roomId: res.credentials.roomId,
        password: res.credentials.password,
        name: res.room.name,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  const invitationText = createdCredentials
    ? `🎮 Join my AeroVoice Room!\nRoom: ${createdCredentials.name}\nRoom ID: ${createdCredentials.roomId}\nPassword: ${createdCredentials.password}`
    : '';

  const handleCopyInvitation = () => {
    if (!invitationText) return;
    navigator.clipboard.writeText(invitationText);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleShare = async () => {
    if (!invitationText) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${createdCredentials?.name} on AeroVoice`,
          text: invitationText,
        });
      } catch (e) {
        handleCopyInvitation();
      }
    } else {
      handleCopyInvitation();
    }
  };

  return (
    <div id="create-room-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-[#0E1424] border border-slate-800 rounded-3xl p-5 shadow-2xl shadow-cyan-950/60 text-white animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Radio className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-base">Create Voice Room</h3>
          </div>
          <button
            id="create-room-close-btn"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!createdCredentials ? (
          <form onSubmit={handleCreate} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-mono font-semibold uppercase text-slate-400 mb-1">
                Room Name *
              </label>
              <input
                id="create-room-name-input"
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                maxLength={40}
                placeholder="e.g. Squad Warzone Alpha"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm font-medium text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono font-semibold uppercase text-slate-400 mb-1">
                Room Password (Auto-generated if blank)
              </label>
              <div className="relative">
                <input
                  id="create-room-pwd-input"
                  type="text"
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                  maxLength={30}
                  placeholder="Leave blank for secure unguessable key"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <Lock className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono font-semibold uppercase text-slate-400 mb-1">
                Description / Game (Optional)
              </label>
              <input
                id="create-room-desc-input"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={80}
                placeholder="e.g. Competitive ranked games + chill music"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm font-medium text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-[11px] text-slate-400 flex items-start space-x-2">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>You will automatically become the Room Owner & Administrator.</span>
            </div>

            {error && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {error}
              </div>
            )}

            <button
              id="create-room-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 active:scale-98 transition-all disabled:opacity-50"
            >
              <span>{loading ? 'Generating Room...' : 'Create & Generate Invitation'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          /* Shareable Room Invitation Screen */
          <div className="space-y-4 animate-in fade-in zoom-in-95">
            <div className="text-center p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
              <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold">Room Created Successfully</span>
              <h4 className="text-base font-bold text-white mt-0.5 truncate">{createdCredentials.name}</h4>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5 font-mono text-xs">
              <div>
                <span className="text-[10px] uppercase text-slate-500">Room ID (Unique)</span>
                <div className="flex items-center justify-between text-cyan-300 font-bold mt-0.5 bg-slate-950/60 px-2.5 py-1.5 rounded-lg border border-slate-800">
                  <span>{createdCredentials.roomId}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase text-slate-500">Secure Password</span>
                <div className="flex items-center justify-between text-emerald-400 font-bold mt-0.5 bg-slate-950/60 px-2.5 py-1.5 rounded-lg border border-slate-800">
                  <span>{createdCredentials.password}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                id="create-room-copy-btn"
                type="button"
                onClick={handleCopyInvitation}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center space-x-1.5 transition-colors"
              >
                {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedAll ? 'Copied!' : 'Copy Info'}</span>
              </button>

              <button
                id="create-room-share-btn"
                type="button"
                onClick={handleShare}
                className="py-2.5 px-3 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/40 text-cyan-300 font-semibold text-xs flex items-center justify-center space-x-1.5 transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share</span>
              </button>
            </div>

            <button
              id="create-room-enter-now-btn"
              type="button"
              onClick={() => {
                onJoinCreatedRoom(createdCredentials.roomId);
                onClose();
              }}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-cyan-500/20 active:scale-98 transition-all"
            >
              <Radio className="w-4 h-4" />
              <span>Enter Voice Room Now</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
