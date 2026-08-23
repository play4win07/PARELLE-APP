import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

export interface User {
  id: string;
  username: string;
  avatar: string;
  color: string;
  bio?: string;
  createdAt: number;
}

export interface Room {
  id: string; // Internal UUID
  roomId: string; // User-friendly identifier, e.g. "squad-9281"
  name: string;
  passwordHash: string;
  ownerId: string;
  createdAt: number;
  icon?: string;
  description?: string;
}

export interface RoomMember {
  roomId: string;
  userId: string;
  joinedAt: number;
  role: 'owner' | 'admin' | 'member';
  isMutedByAdmin?: boolean;
}

export interface Session {
  token: string;
  userId: string;
  expiresAt: number;
}

interface DatabaseSchema {
  users: Record<string, User>;
  rooms: Record<string, Room>;
  roomMembers: RoomMember[];
  sessions: Record<string, Session>;
}

const DB_FILE = path.join(process.cwd(), 'data_store.json');

class Database {
  private data: DatabaseSchema = {
    users: {},
    rooms: {},
    roomMembers: [],
    sessions: {},
  };

  constructor() {
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
      } else {
        this.seedInitialData();
        this.save();
      }
    } catch (err) {
      console.warn('Failed to load database file, initializing defaults:', err);
      this.seedInitialData();
    }
  }

  private save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist database:', err);
    }
  }

  private seedInitialData() {
    // Seed a couple of public/starter gamer squad rooms
    const defaultOwner: User = {
      id: 'usr_system_captain',
      username: 'ShadowGamer',
      avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80',
      color: '#10B981',
      bio: 'Squad Leader & Strategy Gamer',
      createdAt: Date.now() - 86400000 * 5,
    };

    const starterRoom: Room = {
      id: 'room_apex_legends',
      roomId: 'apex-legends',
      name: 'Apex Legends Squad Alpha',
      passwordHash: bcrypt.hashSync('squad123', 8),
      ownerId: defaultOwner.id,
      createdAt: Date.now() - 86400000 * 4,
      icon: 'zap',
      description: 'Competitive ranked squad & chill voice comms',
    };

    const lofiRoom: Room = {
      id: 'room_chill_lofi',
      roomId: 'chill-grind',
      name: 'Late Night Chill & Grind',
      passwordHash: bcrypt.hashSync('grind123', 8),
      ownerId: defaultOwner.id,
      createdAt: Date.now() - 86400000 * 3,
      icon: 'headphones',
      description: 'Casual gaming, background beats & relaxed voice talk',
    };

    this.data.users[defaultOwner.id] = defaultOwner;
    this.data.rooms[starterRoom.roomId] = starterRoom;
    this.data.rooms[lofiRoom.roomId] = lofiRoom;

    this.data.roomMembers.push(
      {
        roomId: starterRoom.roomId,
        userId: defaultOwner.id,
        joinedAt: Date.now() - 86400000 * 4,
        role: 'owner',
      },
      {
        roomId: lofiRoom.roomId,
        userId: defaultOwner.id,
        joinedAt: Date.now() - 86400000 * 3,
        role: 'owner',
      }
    );
  }

  // User methods
  getUser(id: string): User | undefined {
    return this.data.users[id];
  }

  createUser(user: User): User {
    this.data.users[user.id] = user;
    this.save();
    return user;
  }

  updateUser(id: string, updates: Partial<User>): User | undefined {
    if (!this.data.users[id]) return undefined;
    this.data.users[id] = { ...this.data.users[id], ...updates };
    this.save();
    return this.data.users[id];
  }

  // Session methods
  createSession(userId: string): Session {
    const token = 'tok_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const session: Session = {
      token,
      userId,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    };
    this.data.sessions[token] = session;
    this.save();
    return session;
  }

  getSession(token: string): Session | undefined {
    const session = this.data.sessions[token];
    if (session && session.expiresAt > Date.now()) {
      return session;
    }
    return undefined;
  }

  // Room methods
  getRoom(roomId: string): Room | undefined {
    return this.data.rooms[roomId];
  }

  getAllRooms(): Room[] {
    return Object.values(this.data.rooms);
  }

  createRoom(room: Room): Room {
    this.data.rooms[room.roomId] = room;
    // Add owner as member
    this.data.roomMembers.push({
      roomId: room.roomId,
      userId: room.ownerId,
      joinedAt: Date.now(),
      role: 'owner',
    });
    this.save();
    return room;
  }

  updateRoom(roomId: string, updates: Partial<Room>): Room | undefined {
    const room = this.data.rooms[roomId];
    if (!room) return undefined;
    this.data.rooms[roomId] = { ...room, ...updates };
    this.save();
    return this.data.rooms[roomId];
  }

  deleteRoom(roomId: string): boolean {
    if (!this.data.rooms[roomId]) return false;
    delete this.data.rooms[roomId];
    this.data.roomMembers = this.data.roomMembers.filter((m) => m.roomId !== roomId);
    this.save();
    return true;
  }

  // Room Members
  getRoomMembers(roomId: string): RoomMember[] {
    return this.data.roomMembers.filter((m) => m.roomId === roomId);
  }

  getUserRooms(userId: string): Room[] {
    const memberships = this.data.roomMembers.filter((m) => m.userId === userId);
    return memberships
      .map((m) => this.data.rooms[m.roomId])
      .filter((r): r is Room => Boolean(r));
  }

  isUserInRoom(roomId: string, userId: string): boolean {
    return this.data.roomMembers.some((m) => m.roomId === roomId && m.userId === userId);
  }

  getUserRoomRole(roomId: string, userId: string): 'owner' | 'admin' | 'member' | null {
    const m = this.data.roomMembers.find((item) => item.roomId === roomId && item.userId === userId);
    return m ? m.role : null;
  }

  addMemberToRoom(roomId: string, userId: string, role: 'owner' | 'admin' | 'member' = 'member'): boolean {
    if (this.isUserInRoom(roomId, userId)) {
      return true;
    }
    this.data.roomMembers.push({
      roomId,
      userId,
      joinedAt: Date.now(),
      role,
    });
    this.save();
    return true;
  }

  removeMemberFromRoom(roomId: string, userId: string): boolean {
    const initialLen = this.data.roomMembers.length;
    this.data.roomMembers = this.data.roomMembers.filter(
      (m) => !(m.roomId === roomId && m.userId === userId)
    );
    const changed = this.data.roomMembers.length !== initialLen;
    if (changed) this.save();
    return changed;
  }

  updateMemberRole(roomId: string, userId: string, role: 'owner' | 'admin' | 'member'): boolean {
    const m = this.data.roomMembers.find((item) => item.roomId === roomId && item.userId === userId);
    if (!m) return false;
    m.role = role;
    this.save();
    return true;
  }

  setMemberAdminMute(roomId: string, userId: string, isMuted: boolean): boolean {
    const m = this.data.roomMembers.find((item) => item.roomId === roomId && item.userId === userId);
    if (!m) return false;
    m.isMutedByAdmin = isMuted;
    this.save();
    return true;
  }
}

export const db = new Database();
