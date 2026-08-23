import React, { useState } from 'react';
import { X, ShieldAlert, UserMinus, MicOff, Key, Trash2, Edit3, Check, AlertTriangle, ShieldCheck } from 'lucide-react';
import { RoomDetail, RoomMemberDetail } from '../types';

interface AdminControlsModalProps {
  room: RoomDetail;
  members: RoomMemberDetail[];
  currentUserId: string;
  isOpen: boolean;
  onClose: () => void;
  onRemoveMember: (targetUserId: string) => Promise<void>;
  onMuteMember: (targetUserId: string, isMuted: boolean) => void;
  onUpdateSettings: (params: { name?: string; password?: string; description?: string }) => Promise<void>;
  onDeleteRoom: () => Promise<void>;
}

export const AdminControlsModal: React.FC<AdminControlsModalProps> = ({
  room,
  members,
  currentUserId,
  isOpen,
  onClose,
  onRemoveMember,
  onMuteMember,
  onUpdateSettings,
  onDeleteRoom,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'members' | 'settings'>('members');
  const [newRoomName, setNewRoomName] = useState(room.name);
  const [newPassword, setNewPassword] = useState('');
  const [newDescription, setNewDescription] = useState(room.description || '');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    try {
      await onUpdateSettings({
        name: newRoomName.trim(),
        password: newPassword.trim() || undefined,
        description: newDescription.trim(),
      });
      setMsg('Settings updated successfully!');
      setTimeout(() => setMsg(''), 2500);
    } catch (err: any) {
      setMsg('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKick = async (targetUserId: string, username: string) => {
    if (!window.confirm(`Are you sure you want to remove ${username} from this room? They will lose access.`)) {
      return;
    }
    try {
      await onRemoveMember(targetUserId);
    } catch (err: any) {
      alert('Failed to remove member: ' + err.message);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setLoading(true);
    try {
      await onDeleteRoom();
      onClose();
    } catch (err: any) {
      alert('Failed to delete room: ' + err.message);
      setLoading(false);
    }
  };

  return (
    <div id="admin-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-md bg-[#0E1424] border border-amber-500/30 rounded-3xl p-5 shadow-2xl shadow-amber-950/40 text-white animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Room Admin Management</h3>
              <p className="text-[10px] text-slate-400 font-mono">{room.name} ({room.roomId})</p>
            </div>
          </div>
          <button
            id="admin-modal-close-btn"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex items-center space-x-2 my-3 p-1 rounded-xl bg-slate-900 border border-slate-800 shrink-0">
          <button
            onClick={() => setActiveTab('members')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold font-mono transition-colors ${
              activeTab === 'members'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            MEMBERS ({members.length})
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold font-mono transition-colors ${
              activeTab === 'settings'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ROOM SETTINGS
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {activeTab === 'members' ? (
            <div className="space-y-2">
              <p className="text-[11px] text-slate-400">
                Manage room access. Removing a member revokes their persistent access immediately.
              </p>

              <div className="space-y-2">
                {members.map((m) => {
                  const isSelf = m.userId === currentUserId;
                  const isRoomOwner = m.userId === room.ownerId;

                  return (
                    <div
                      key={m.userId}
                      className="p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <img
                          src={m.avatar}
                          alt={m.username}
                          className="w-9 h-9 rounded-xl object-cover bg-slate-800 border border-slate-700"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center space-x-1.5">
                            <span className="text-xs font-bold text-slate-200 truncate">{m.username}</span>
                            {isRoomOwner ? (
                              <span className="px-1.5 py-0.2 text-[8px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded">
                                OWNER
                              </span>
                            ) : m.role === 'admin' ? (
                              <span className="px-1.5 py-0.2 text-[8px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded">
                                ADMIN
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 text-[8px] font-mono text-slate-400 bg-slate-800 rounded">
                                MEMBER
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 font-mono">
                            <span className={m.isConnectedToVoice ? 'text-emerald-400' : 'text-slate-500'}>
                              {m.isConnectedToVoice ? '● In Voice' : '○ Offline'}
                            </span>
                            <span>•</span>
                            <span className="truncate max-w-[80px]">{m.userId}</span>
                          </div>
                        </div>
                      </div>

                      {/* Admin Actions for other members */}
                      {!isSelf && !isRoomOwner && (
                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => onMuteMember(m.userId, !m.isMutedByAdmin)}
                            className={`p-1.5 rounded-lg text-xs font-mono flex items-center space-x-1 border transition-colors ${
                              m.isMutedByAdmin
                                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-amber-300'
                            }`}
                            title={m.isMutedByAdmin ? 'Unmute Member' : 'Admin Mute'}
                          >
                            <MicOff className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleKick(m.userId, m.username)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-mono transition-colors"
                            title="Remove Member Permanently"
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSaveSettings} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-mono font-semibold uppercase text-slate-400 mb-1">
                  Room Name
                </label>
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  maxLength={40}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm font-medium text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono font-semibold uppercase text-slate-400 mb-1">
                  Change Password (Leave blank to keep existing)
                </label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New room password"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono font-semibold uppercase text-slate-400 mb-1">
                  Room Topic / Description
                </label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  maxLength={80}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm font-medium text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              {msg && (
                <div className={`p-2.5 rounded-xl text-xs font-mono ${msg.includes('Error') ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                  {msg}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-amber-500/20 transition-all disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Room Settings</span>
              </button>

              {/* Delete Room Danger Zone (Owner Only) */}
              {room.isOwner && (
                <div className="pt-3 border-t border-slate-800/80">
                  <div className="p-3 rounded-2xl bg-rose-950/30 border border-rose-500/30 space-y-2">
                    <div className="flex items-center space-x-1.5 text-rose-400 text-xs font-bold font-mono">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Danger Zone</span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Permanently delete this room and remove all member data.
                    </p>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={loading}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-bold font-mono flex items-center justify-center space-x-1.5 transition-all ${
                        confirmDelete
                          ? 'bg-rose-600 text-white animate-pulse'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{confirmDelete ? 'Click Again to Confirm Delete' : 'Delete Room'}</span>
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
