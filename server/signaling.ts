import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { db } from './db.js';

interface ClientConnection {
  ws: WebSocket;
  userId: string;
  username: string;
  avatar: string;
  currentRoomId: string | null;
  isInVoice: boolean;
  isMuted: boolean;
  isSpeaking: boolean;
  pingMs: number;
  lastPingTime: number;
}

export class SignalingService {
  private wss: WebSocketServer;
  private clients: Map<WebSocket, ClientConnection> = new Map();
  // RoomId -> Set of WebSockets currently connected to voice in that room
  private roomVoiceClients: Map<string, Set<WebSocket>> = new Map();

  constructor(server: HttpServer) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.init();
  }

  private init() {
    this.wss.on('connection', (ws: WebSocket) => {
      const client: ClientConnection = {
        ws,
        userId: '',
        username: 'Anonymous',
        avatar: '',
        currentRoomId: null,
        isInVoice: false,
        isMuted: false,
        isSpeaking: false,
        pingMs: 24,
        lastPingTime: Date.now(),
      };
      this.clients.set(ws, client);

      ws.on('message', (messageData: string) => {
        try {
          const data = JSON.parse(messageData.toString());
          this.handleMessage(ws, data);
        } catch (err) {
          console.error('Error handling WS message:', err);
        }
      });

      ws.on('close', () => {
        this.handleDisconnect(ws);
      });

      ws.on('error', (err) => {
        console.error('WebSocket client error:', err);
        this.handleDisconnect(ws);
      });
    });

    // Periodic heartbeat / ping
    setInterval(() => {
      for (const [ws, client] of this.clients.entries()) {
        if (ws.readyState === WebSocket.OPEN) {
          client.lastPingTime = Date.now();
          ws.send(JSON.stringify({ type: 'server:ping', timestamp: client.lastPingTime }));
        }
      }
    }, 15000);
  }

  private handleMessage(ws: WebSocket, data: any) {
    const client = this.clients.get(ws);
    if (!client) return;

    switch (data.type) {
      case 'auth': {
        const { userId, username, avatar } = data;
        client.userId = userId;
        client.username = username || 'Gamer';
        client.avatar = avatar || '';
        ws.send(
          JSON.stringify({
            type: 'auth:ack',
            userId: client.userId,
          })
        );
        break;
      }

      case 'client:pong': {
        const now = Date.now();
        const sentTime = data.timestamp || client.lastPingTime;
        client.pingMs = Math.max(8, Math.round((now - sentTime) / 2));
        break;
      }

      case 'voice:join': {
        const { roomId, isMuted } = data;
        if (!client.userId) {
          ws.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }));
          return;
        }

        // Verify membership in DB
        const isMember = db.isUserInRoom(roomId, client.userId);
        if (!isMember) {
          ws.send(JSON.stringify({ type: 'error', message: 'You are not a member of this room' }));
          return;
        }

        // Leave any previous voice room
        if (client.currentRoomId && client.currentRoomId !== roomId) {
          this.leaveVoice(ws, client.currentRoomId);
        }

        client.currentRoomId = roomId;
        client.isInVoice = true;
        client.isMuted = !!isMuted;
        client.isSpeaking = false;

        if (!this.roomVoiceClients.has(roomId)) {
          this.roomVoiceClients.set(roomId, new Set());
        }
        const roomSet = this.roomVoiceClients.get(roomId)!;
        roomSet.add(ws);

        // Get existing peers in the room
        const existingPeers: Array<{
          userId: string;
          username: string;
          avatar: string;
          isMuted: boolean;
          isSpeaking: boolean;
          pingMs: number;
        }> = [];

        for (const otherWs of roomSet) {
          if (otherWs !== ws && otherWs.readyState === WebSocket.OPEN) {
            const otherClient = this.clients.get(otherWs);
            if (otherClient) {
              existingPeers.push({
                userId: otherClient.userId,
                username: otherClient.username,
                avatar: otherClient.avatar,
                isMuted: otherClient.isMuted,
                isSpeaking: otherClient.isSpeaking,
                pingMs: otherClient.pingMs,
              });

              // Notify existing peer that a new user joined voice
              otherWs.send(
                JSON.stringify({
                  type: 'voice:user_joined',
                  roomId,
                  user: {
                    userId: client.userId,
                    username: client.username,
                    avatar: client.avatar,
                    isMuted: client.isMuted,
                    isSpeaking: client.isSpeaking,
                    pingMs: client.pingMs,
                  },
                })
              );
            }
          }
        }

        // Send confirmation and current voice state to the joining user
        ws.send(
          JSON.stringify({
            type: 'voice:joined_success',
            roomId,
            peers: existingPeers,
          })
        );
        break;
      }

      case 'voice:leave': {
        const { roomId } = data;
        this.leaveVoice(ws, roomId || client.currentRoomId);
        break;
      }

      case 'voice:mute_state': {
        const { roomId, isMuted } = data;
        client.isMuted = isMuted;
        if (isMuted) {
          client.isSpeaking = false;
        }
        this.broadcastToRoom(roomId || client.currentRoomId, {
          type: 'voice:user_mute_state',
          userId: client.userId,
          isMuted: client.isMuted,
        }, ws);
        break;
      }

      case 'voice:speaking_state': {
        const { roomId, isSpeaking } = data;
        client.isSpeaking = !client.isMuted && !!isSpeaking;
        this.broadcastToRoom(roomId || client.currentRoomId, {
          type: 'voice:user_speaking_state',
          userId: client.userId,
          isSpeaking: client.isSpeaking,
        }, ws);
        break;
      }

      // WebRTC Mesh Signaling (offer / answer / ice-candidate)
      case 'signal:offer': {
        const { targetUserId, offer, roomId } = data;
        this.sendToTargetUserInRoom(roomId, targetUserId, {
          type: 'signal:offer',
          fromUserId: client.userId,
          offer,
          roomId,
        });
        break;
      }

      case 'signal:answer': {
        const { targetUserId, answer, roomId } = data;
        this.sendToTargetUserInRoom(roomId, targetUserId, {
          type: 'signal:answer',
          fromUserId: client.userId,
          answer,
          roomId,
        });
        break;
      }

      case 'signal:ice_candidate': {
        const { targetUserId, candidate, roomId } = data;
        this.sendToTargetUserInRoom(roomId, targetUserId, {
          type: 'signal:ice_candidate',
          fromUserId: client.userId,
          candidate,
          roomId,
        });
        break;
      }

      // Admin moderation realtime events
      case 'admin:mute_user': {
        const { roomId, targetUserId, isMuted } = data;
        // Verify caller is admin
        const role = db.getUserRoomRole(roomId, client.userId);
        if (role === 'owner' || role === 'admin') {
          db.setMemberAdminMute(roomId, targetUserId, isMuted);
          this.broadcastToRoom(roomId, {
            type: 'admin:user_muted_by_admin',
            targetUserId,
            isMuted,
            byUserId: client.userId,
          });
        }
        break;
      }

      case 'admin:kick_user': {
        const { roomId, targetUserId } = data;
        const role = db.getUserRoomRole(roomId, client.userId);
        if (role === 'owner' || role === 'admin') {
          db.removeMemberFromRoom(roomId, targetUserId);
          // Find target ws and force disconnect from room voice
          this.broadcastToRoom(roomId, {
            type: 'admin:user_kicked',
            targetUserId,
            roomId,
          });
        }
        break;
      }

      default:
        break;
    }
  }

  private leaveVoice(ws: WebSocket, roomId: string | null) {
    const client = this.clients.get(ws);
    if (!client) return;

    const rId = roomId || client.currentRoomId;
    if (rId && this.roomVoiceClients.has(rId)) {
      const roomSet = this.roomVoiceClients.get(rId)!;
      roomSet.delete(ws);
      if (roomSet.size === 0) {
        this.roomVoiceClients.delete(rId);
      }

      // Broadcast leave to remaining peers
      this.broadcastToRoom(rId, {
        type: 'voice:user_left',
        roomId: rId,
        userId: client.userId,
      }, ws);
    }

    client.currentRoomId = null;
    client.isInVoice = false;
    client.isSpeaking = false;

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'voice:left_success', roomId: rId }));
    }
  }

  private handleDisconnect(ws: WebSocket) {
    const client = this.clients.get(ws);
    if (client) {
      if (client.isInVoice && client.currentRoomId) {
        this.leaveVoice(ws, client.currentRoomId);
      }
      this.clients.delete(ws);
    }
  }

  private broadcastToRoom(roomId: string | null, payload: any, senderWs?: WebSocket) {
    if (!roomId || !this.roomVoiceClients.has(roomId)) return;
    const roomSet = this.roomVoiceClients.get(roomId)!;
    const message = JSON.stringify(payload);

    for (const ws of roomSet) {
      if (ws !== senderWs && ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    }
  }

  private sendToTargetUserInRoom(roomId: string, targetUserId: string, payload: any) {
    if (!this.roomVoiceClients.has(roomId)) return;
    const roomSet = this.roomVoiceClients.get(roomId)!;
    const message = JSON.stringify(payload);

    for (const ws of roomSet) {
      const c = this.clients.get(ws);
      if (c && c.userId === targetUserId && ws.readyState === WebSocket.OPEN) {
        ws.send(message);
        break;
      }
    }
  }

  public getConnectedVoiceCount(roomId: string): number {
    const set = this.roomVoiceClients.get(roomId);
    return set ? set.size : 0;
  }

  public getConnectedVoiceUsers(roomId: string): string[] {
    const set = this.roomVoiceClients.get(roomId);
    if (!set) return [];
    const userIds: string[] = [];
    for (const ws of set) {
      const c = this.clients.get(ws);
      if (c && c.userId) userIds.push(c.userId);
    }
    return userIds;
  }
}
