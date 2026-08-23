import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import bcrypt from 'bcryptjs';
import { createServer as createViteServer } from 'vite';
import { db, User, Room } from './server/db.js';
import { SignalingService } from './server/signaling.js';

// Pre-curated gaming music catalog & dynamic YouTube helper
const GAMING_TRACKS = [
  {
    id: 'jfKfPfyJRdk',
    title: 'lofi hip hop radio 📚 - beats to relax/study/game to',
    channel: 'Lofi Girl',
    duration: 'LIVE',
    category: 'Lofi & Chill',
    thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: '5qap5aO4i9A',
    title: 'Lofi Beats for Gaming & Coding (Chillhop Mix)',
    channel: 'ChilledCow',
    duration: '3:45:20',
    category: 'Lofi & Chill',
    thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: '4xDzrJKXOOY',
    title: 'Synthwave / Cyberpunk Gamer Radio - Night City Drives',
    channel: 'Synthwave Boy',
    duration: '2:15:40',
    category: 'Synthwave & Cyberpunk',
    thumbnail: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: '7NOSDKb0HlU',
    title: 'DOOM Eternal OST - The Only Thing They Fear Is You',
    channel: 'Mick Gordon Official',
    duration: '6:53',
    category: 'High Energy & Action',
    thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'wOMwO52bSTU',
    title: 'Valorant Champions Anthem - Die For You (Acoustic & Synth Remix)',
    channel: 'Riot Games Music',
    duration: '3:35',
    category: 'Esports & Gaming OST',
    thumbnail: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: '9bZkp7q19f0',
    title: 'Gangnam Style / K-Pop Gamer Remix 2026',
    channel: 'Official Music',
    duration: '4:12',
    category: 'Pop & EDM',
    thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'fJ9rUzIMcZQ',
    title: 'Queen - Bohemian Rhapsody (Official Video Remastered)',
    channel: 'Queen Official',
    duration: '5:59',
    category: 'Rock & Classics',
    thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'kXYiU_JCYtU',
    title: 'Linkin Park - Numb (Official Rock Gamer Anthem)',
    channel: 'Linkin Park',
    duration: '3:07',
    category: 'Rock & Classics',
    thumbnail: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=300&auto=format&fit=crop&q=80',
  },
];

async function startServer() {
  const app = express();
  const PORT = 3000;
  const server = http.createServer(app);

  app.use(express.json());

  // Attach real-time WebSocket signaling service
  const signalingService = new SignalingService(server);

  // Health check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Auth / Profile creation or sync
  app.post('/api/auth/profile', (req: Request, res: Response) => {
    const { username, avatar, bio, color, userId } = req.body;

    if (!username || username.trim().length === 0) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const cleanUsername = username.trim().slice(0, 30);
    const existingId = userId && db.getUser(userId);

    let user: User;
    if (existingId) {
      user = db.updateUser(userId, {
        username: cleanUsername,
        avatar: avatar || existingId.avatar,
        bio: bio ?? existingId.bio,
        color: color || existingId.color,
      })!;
    } else {
      const generatedId = 'usr_' + Math.random().toString(36).substring(2, 9);
      user = db.createUser({
        id: generatedId,
        username: cleanUsername,
        avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanUsername)}`,
        color: color || '#10B981',
        bio: bio || 'Ready for squad matches',
        createdAt: Date.now(),
      });
    }

    const session = db.createSession(user.id);
    return res.json({ user, token: session.token });
  });

  // Get current user profile
  app.get('/api/auth/me', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.replace('Bearer ', '');
    const session = db.getSession(token);
    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }
    const user = db.getUser(session.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({ user });
  });

  // Helper middleware for auth
  const requireAuth = (req: any, res: Response, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const token = authHeader.replace('Bearer ', '');
    const session = db.getSession(token);
    if (!session) {
      return res.status(401).json({ error: 'Session expired, please log in again' });
    }
    req.userId = session.userId;
    next();
  };

  // Get User's Rooms ("My Rooms" with real-time stats)
  app.get('/api/rooms', requireAuth, (req: any, res: Response) => {
    const userId = req.userId;
    const userRooms = db.getUserRooms(userId);

    const roomsWithStats = userRooms.map((room) => {
      const members = db.getRoomMembers(room.roomId);
      const connectedCount = signalingService.getConnectedVoiceCount(room.roomId);
      const userRole = db.getUserRoomRole(room.roomId, userId);

      return {
        id: room.id,
        roomId: room.roomId,
        name: room.name,
        ownerId: room.ownerId,
        createdAt: room.createdAt,
        icon: room.icon || 'shield',
        description: room.description || '',
        totalMembers: members.length,
        connectedUsersCount: connectedCount,
        myRole: userRole,
        isOwner: room.ownerId === userId,
      };
    });

    return res.json({ rooms: roomsWithStats });
  });

  // Create Room
  app.post('/api/rooms/create', requireAuth, (req: any, res: Response) => {
    const userId = req.userId;
    const { name, password, icon, description } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Room name is required' });
    }

    // Auto-generate clean, unique room identifier (e.g., "squad-4891")
    const cleanPrefix = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 12);
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const uniqueRoomId = `${cleanPrefix || 'squad'}-${randomSuffix}`;

    // Auto-generate secure password if not provided
    const securePassword = password && password.trim() ? password.trim() : Math.random().toString(36).slice(-8);

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(securePassword, salt);

    const newRoom: Room = {
      id: 'rm_' + Math.random().toString(36).substring(2, 9),
      roomId: uniqueRoomId,
      name: name.trim().slice(0, 40),
      passwordHash,
      ownerId: userId,
      createdAt: Date.now(),
      icon: icon || 'gamepad-2',
      description: description ? description.trim().slice(0, 120) : 'Private squad voice room',
    };

    db.createRoom(newRoom);

    return res.json({
      room: {
        id: newRoom.id,
        roomId: newRoom.roomId,
        name: newRoom.name,
        ownerId: newRoom.ownerId,
        createdAt: newRoom.createdAt,
        icon: newRoom.icon,
        description: newRoom.description,
      },
      credentials: {
        roomId: newRoom.roomId,
        password: securePassword,
      },
    });
  });

  // Join Room
  app.post('/api/rooms/join', requireAuth, (req: any, res: Response) => {
    const userId = req.userId;
    const { roomId, password } = req.body;

    if (!roomId || !password) {
      return res.status(400).json({ error: 'Room ID and Password are required' });
    }

    const room = db.getRoom(roomId.trim().toLowerCase());
    if (!room) {
      return res.status(404).json({ error: 'Room not found. Check the Room ID and try again.' });
    }

    const isMatch = bcrypt.compareSync(password.trim(), room.passwordHash);
    if (!isMatch) {
      return res.status(403).json({ error: 'Invalid room password.' });
    }

    // Persistently add user to room members
    db.addMemberToRoom(room.roomId, userId, room.ownerId === userId ? 'owner' : 'member');

    return res.json({
      success: true,
      message: 'Joined room successfully',
      roomId: room.roomId,
      name: room.name,
    });
  });

  // Get Room Details & Members
  app.get('/api/rooms/:roomId', requireAuth, (req: any, res: Response) => {
    const userId = req.userId;
    const { roomId } = req.params;

    const room = db.getRoom(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const isMember = db.isUserInRoom(roomId, userId);
    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this room' });
    }

    const memberEntities = db.getRoomMembers(roomId);
    const connectedVoiceUserIds = new Set(signalingService.getConnectedVoiceUsers(roomId));

    const members = memberEntities.map((m) => {
      const user = db.getUser(m.userId);
      return {
        userId: m.userId,
        username: user?.username || 'Gamer',
        avatar: user?.avatar || '',
        color: user?.color || '#10B981',
        role: m.role,
        joinedAt: m.joinedAt,
        isConnectedToVoice: connectedVoiceUserIds.has(m.userId),
        isMutedByAdmin: !!m.isMutedByAdmin,
        isOwner: m.userId === room.ownerId,
      };
    });

    const userRole = db.getUserRoomRole(roomId, userId);

    return res.json({
      room: {
        id: room.id,
        roomId: room.roomId,
        name: room.name,
        ownerId: room.ownerId,
        createdAt: room.createdAt,
        icon: room.icon || 'shield',
        description: room.description,
        isOwner: room.ownerId === userId,
        myRole: userRole,
        connectedUsersCount: connectedVoiceUserIds.size,
      },
      members,
    });
  });

  // Leave Room Permanently
  app.post('/api/rooms/:roomId/leave', requireAuth, (req: any, res: Response) => {
    const userId = req.userId;
    const { roomId } = req.params;

    const room = db.getRoom(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.ownerId === userId) {
      return res.status(400).json({
        error: 'Room owner cannot leave without transferring ownership or deleting the room.',
      });
    }

    db.removeMemberFromRoom(roomId, userId);
    return res.json({ success: true, message: 'You have left the room' });
  });

  // Admin: Remove Member
  app.delete('/api/rooms/:roomId/admin/members/:targetUserId', requireAuth, (req: any, res: Response) => {
    const userId = req.userId;
    const { roomId, targetUserId } = req.params;

    const role = db.getUserRoomRole(roomId, userId);
    if (role !== 'owner' && role !== 'admin') {
      return res.status(403).json({ error: 'Admin permission required' });
    }

    const room = db.getRoom(roomId);
    if (room && room.ownerId === targetUserId) {
      return res.status(400).json({ error: 'Cannot remove the room owner' });
    }

    db.removeMemberFromRoom(roomId, targetUserId);
    return res.json({ success: true, message: 'Member removed from room' });
  });

  // Admin: Update Room Settings (Name, Password)
  app.patch('/api/rooms/:roomId/admin/settings', requireAuth, (req: any, res: Response) => {
    const userId = req.userId;
    const { roomId } = req.params;
    const { name, password, description } = req.body;

    const role = db.getUserRoomRole(roomId, userId);
    if (role !== 'owner' && role !== 'admin') {
      return res.status(403).json({ error: 'Admin permission required' });
    }

    const updates: Partial<Room> = {};
    if (name && name.trim()) {
      updates.name = name.trim().slice(0, 40);
    }
    if (description !== undefined) {
      updates.description = description.trim().slice(0, 120);
    }
    if (password && password.trim()) {
      const salt = bcrypt.genSaltSync(10);
      updates.passwordHash = bcrypt.hashSync(password.trim(), salt);
    }

    const updated = db.updateRoom(roomId, updates);
    return res.json({ success: true, room: updated });
  });

  // Admin / Owner: Delete Room
  app.delete('/api/rooms/:roomId/admin/delete', requireAuth, (req: any, res: Response) => {
    const userId = req.userId;
    const { roomId } = req.params;

    const room = db.getRoom(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.ownerId !== userId) {
      return res.status(403).json({ error: 'Only the room owner can delete this room' });
    }

    db.deleteRoom(roomId);
    return res.json({ success: true, message: 'Room deleted successfully' });
  });

  // YouTube / Music Search & Catalog
  app.get('/api/music/search', (req: Request, res: Response) => {
    const query = (req.query.q as string || '').trim().toLowerCase();

    // Check if query is a direct YouTube URL or 11-char ID
    const ytIdMatch = query.match(/(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]{11})/) ||
      (query.length === 11 && query.match(/^[a-zA-Z0-9_-]{11}$/) ? [null, query] : null);

    if (ytIdMatch && ytIdMatch[1]) {
      const videoId = ytIdMatch[1];
      return res.json({
        tracks: [
          {
            id: videoId,
            title: `Custom YouTube Video (${videoId})`,
            channel: 'YouTube Video',
            duration: 'Custom',
            category: 'Direct URL',
            thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          },
        ],
      });
    }

    if (!query) {
      return res.json({ tracks: GAMING_TRACKS });
    }

    // Filter from catalog or synthesize matching result for official player
    const filtered = GAMING_TRACKS.filter(
      (t) =>
        t.title.toLowerCase().includes(query) ||
        t.channel.toLowerCase().includes(query) ||
        t.category.toLowerCase().includes(query)
    );

    // If no direct keyword match, create search-ready item for the official player
    if (filtered.length === 0) {
      filtered.push({
        id: 'jfKfPfyJRdk',
        title: `Gaming Vibes - "${query}" Mix`,
        channel: 'YouTube Music Stream',
        duration: 'LIVE',
        category: 'Search Result',
        thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80',
      });
    }

    return res.json({ tracks: filtered });
  });

  // Setup Vite or static serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`AeroVoice server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
