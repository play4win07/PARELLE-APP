export interface User {
  id: string;
  username: string;
  avatar: string;
  color: string;
  bio?: string;
  createdAt: number;
}

export interface RoomSummary {
  id: string;
  roomId: string;
  name: string;
  ownerId: string;
  createdAt: number;
  icon: string;
  description: string;
  totalMembers: number;
  connectedUsersCount: number;
  myRole: 'owner' | 'admin' | 'member' | null;
  isOwner: boolean;
}

export interface RoomMemberDetail {
  userId: string;
  username: string;
  avatar: string;
  color: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: number;
  isConnectedToVoice: boolean;
  isMutedByAdmin: boolean;
  isOwner: boolean;
}

export interface RoomDetail {
  id: string;
  roomId: string;
  name: string;
  ownerId: string;
  createdAt: number;
  icon: string;
  description: string;
  isOwner: boolean;
  myRole: 'owner' | 'admin' | 'member' | null;
  connectedUsersCount: number;
}

export interface PeerVoiceState {
  userId: string;
  username: string;
  avatar: string;
  isMuted: boolean;
  isSpeaking: boolean;
  pingMs: number;
  localVolume: number; // 0 to 200 (percentage)
  isLocallyMuted: boolean;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface MusicTrack {
  id: string; // YouTube Video ID
  title: string;
  channel: string;
  duration: string;
  category: string;
  thumbnail: string;
}

export type NavigationTab = 'home' | 'rooms' | 'music' | 'profile';
