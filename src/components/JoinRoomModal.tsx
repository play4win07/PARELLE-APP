import React, { useState } from 'react';
import { X, LogIn, Lock, KeyRound, AlertCircle, ArrowRight } from 'lucide-react';

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoinRoom: (roomId: string, password: string) => Promise<{ success: boolean; roomId: string; name: string }>;
  onSuccess: (roomId: string) => void;
}

export const JoinRoomModal: React.FC<JoinRoomModalProps> = ({
  isOpen,
  onClose,
  onJoinRoom,
  onSuccess,
}) => {
  if (!isOpen) return null;

  const [roomId, setRoomId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId.trim() || !password.trim()) {
      setError('Please enter both Room ID and Room Password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await onJoinRoom(roomId.trim().toLowerCase(), password.trim());
      onSuccess(res.roomId);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Invalid Room ID or Password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="join-room-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-[#0E1424] border border-slate-800 rounded-3xl p-5 shadow-2xl shadow-cyan-950/60 text-white animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <LogIn className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-base">Join Voice Room</h3>
          </div>
          <button
            id="join-room-close-btn"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-mono font-semibold uppercase text-slate-400 mb-1">
              Room ID
            </label>
            <div className="relative">
              <input
                id="join-room-id-input"
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="e.g. apex-legends or squad-4891"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm font-mono text-cyan-300 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                autoFocus
              />
              <KeyRound className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono font-semibold uppercase text-slate-400 mb-1">
              Room Password
            </label>
            <div className="relative">
              <input
                id="join-room-pwd-input"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password from room host"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <Lock className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-[11px] text-slate-400">
            Joining permanently saves this room in your <span className="text-cyan-400 font-semibold">My Rooms</span> list. You can reconnect anytime.
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            id="join-room-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-cyan-500/20 active:scale-98 transition-all disabled:opacity-50"
          >
            <span>{loading ? 'Verifying Room Credentials...' : 'Join & Save to My Rooms'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
