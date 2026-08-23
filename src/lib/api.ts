import { User, RoomSummary, RoomDetail, RoomMemberDetail, MusicTrack } from '../types';

const TOKEN_KEY = 'aerovoice_token';
const USER_KEY = 'aerovoice_user';

export function getStoredAuth(): { user: User | null; token: string | null } {
  try {
    const rawUser = localStorage.getItem(USER_KEY);
    const token = localStorage.getItem(TOKEN_KEY);
    const user = rawUser ? JSON.parse(rawUser) : null;
    return { user, token };
  } catch (e) {
    return { user: null, token: null };
  }
}

export function saveAuth(user: User, token: string) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuth() {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || 'Request failed');
  }

  return data;
}

export const api = {
  // Auth & Profile
  async saveProfile(params: {
    username: string;
    avatar?: string;
    bio?: string;
    color?: string;
    userId?: string;
  }): Promise<{ user: User; token: string }> {
    const res = await request<{ user: User; token: string }>('/api/auth/profile', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    saveAuth(res.user, res.token);
    return res;
  },

  async getCurrentUser(): Promise<User> {
    const res = await request<{ user: User }>('/api/auth/me');
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    return res.user;
  },

  // Rooms
  async getMyRooms(): Promise<RoomSummary[]> {
    const res = await request<{ rooms: RoomSummary[] }>('/api/rooms');
    return res.rooms;
  },

  async createRoom(params: {
    name: string;
    password?: string;
    icon?: string;
    description?: string;
  }): Promise<{ room: any; credentials: { roomId: string; password: string } }> {
    return await request('/api/rooms/create', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async joinRoom(params: {
    roomId: string;
    password: string;
  }): Promise<{ success: boolean; message: string; roomId: string; name: string }> {
    return await request('/api/rooms/join', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async getRoomDetails(roomId: string): Promise<{ room: RoomDetail; members: RoomMemberDetail[] }> {
    return await request(`/api/rooms/${roomId}`);
  },

  async leaveRoom(roomId: string): Promise<{ success: boolean; message: string }> {
    return await request(`/api/rooms/${roomId}/leave`, {
      method: 'POST',
    });
  },

  // Admin controls
  async removeMember(roomId: string, targetUserId: string): Promise<{ success: boolean; message: string }> {
    return await request(`/api/rooms/${roomId}/admin/members/${targetUserId}`, {
      method: 'DELETE',
    });
  },

  async updateRoomSettings(
    roomId: string,
    params: { name?: string; password?: string; description?: string }
  ): Promise<{ success: boolean; room: any }> {
    return await request(`/api/rooms/${roomId}/admin/settings`, {
      method: 'PATCH',
      body: JSON.stringify(params),
    });
  },

  async deleteRoom(roomId: string): Promise<{ success: boolean; message: string }> {
    return await request(`/api/rooms/${roomId}/admin/delete`, {
      method: 'DELETE',
    });
  },

  // Music
  async searchMusic(query: string = ''): Promise<MusicTrack[]> {
    const res = await request<{ tracks: MusicTrack[] }>(`/api/music/search?q=${encodeURIComponent(query)}`);
    return res.tracks;
  },
};
