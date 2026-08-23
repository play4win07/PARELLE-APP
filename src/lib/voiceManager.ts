import { PeerVoiceState, ConnectionStatus } from '../types';

export interface VoiceManagerCallbacks {
  onConnectionStatusChange: (status: ConnectionStatus, message?: string) => void;
  onPeersChange: (peers: PeerVoiceState[]) => void;
  onLocalSpeakingChange: (isSpeaking: boolean) => void;
  onRemoteMuteByAdmin?: (isMuted: boolean) => void;
  onKickedFromRoom?: (roomId: string) => void;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export class VoiceManager {
  private ws: WebSocket | null = null;
  private localStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private localAnalyser: AnalyserNode | null = null;
  private vadInterval: number | null = null;

  // Peer ID -> RTCPeerConnection
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  // Peer ID -> GainNode for individual volume mixing
  private peerGainNodes: Map<string, GainNode> = new Map();
  // Peer ID -> HTMLAudioElement
  private peerAudioElements: Map<string, HTMLAudioElement> = new Map();

  // Peer states list
  private peers: Map<string, PeerVoiceState> = new Map();

  // Local state
  public currentRoomId: string | null = null;
  public userId: string = '';
  public username: string = '';
  public avatar: string = '';
  public isMicMuted: boolean = false;
  public isLocalSpeaking: boolean = false;
  public masterVoiceVolume: number = 100; // 0 - 100%
  public outputDeviceId: string = 'default';

  private callbacks: VoiceManagerCallbacks;
  private isConnecting: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimeout: any = null;

  constructor(callbacks: VoiceManagerCallbacks) {
    this.callbacks = callbacks;
  }

  public initUser(userId: string, username: string, avatar: string) {
    this.userId = userId;
    this.username = username;
    this.avatar = avatar;
  }

  // Connect WebSocket signaling channel
  public connectSocket(): Promise<void> {
    return new Promise((resolve) => {
      if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
        resolve();
        return;
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        // Authenticate with socket
        this.send({
          type: 'auth',
          userId: this.userId,
          username: this.username,
          avatar: this.avatar,
        });
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleSocketMessage(data);
        } catch (e) {
          console.error('Error parsing WS message', e);
        }
      };

      this.ws.onclose = () => {
        if (this.currentRoomId) {
          this.handleSocketDisconnect();
        }
      };

      this.ws.onerror = (err) => {
        console.warn('WebSocket connection error:', err);
      };
    });
  }

  private send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  // Join a voice room
  public async joinVoiceRoom(roomId: string): Promise<boolean> {
    if (this.isConnecting) return false;
    this.isConnecting = true;
    this.callbacks.onConnectionStatusChange('connecting', 'Acquiring microphone & connecting...');

    try {
      await this.connectSocket();

      // Acquire microphone with gaming low-latency & echo-cancellation constraints
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000,
            channelCount: 1,
          },
          video: false,
        });
      } catch (mediaErr: any) {
        console.error('Microphone permission denied or device error:', mediaErr);
        this.callbacks.onConnectionStatusChange('error', 'Microphone access denied. Please allow microphone permission.');
        this.isConnecting = false;
        return false;
      }

      // Initialize Web Audio API for Voice Activity Detection (VAD)
      this.initLocalAudioProcessing();

      this.currentRoomId = roomId;

      // Notify server we are joining room voice
      this.send({
        type: 'voice:join',
        roomId,
        isMuted: this.isMicMuted,
      });

      this.isConnecting = false;
      return true;
    } catch (err: any) {
      console.error('Failed to join voice room:', err);
      this.callbacks.onConnectionStatusChange('error', err.message || 'Failed to join voice');
      this.isConnecting = false;
      return false;
    }
  }

  // Leave active voice room
  public leaveVoiceRoom() {
    if (this.currentRoomId) {
      this.send({
        type: 'voice:leave',
        roomId: this.currentRoomId,
      });
    }

    this.cleanupVoiceSession();
    this.callbacks.onConnectionStatusChange('disconnected', 'Disconnected from voice');
  }

  private cleanupVoiceSession() {
    // 1. Stop all mic tracks immediately
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    // 2. Stop VAD loop
    if (this.vadInterval) {
      clearInterval(this.vadInterval);
      this.vadInterval = null;
    }

    // 3. Close AudioContext
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    // 4. Close all peer connections
    for (const [peerId, pc] of this.peerConnections.entries()) {
      pc.close();
    }
    this.peerConnections.clear();

    // 5. Remove peer audio elements & gain nodes
    for (const [peerId, el] of this.peerAudioElements.entries()) {
      el.srcObject = null;
      el.remove();
    }
    this.peerAudioElements.clear();
    this.peerGainNodes.clear();
    this.peers.clear();

    this.currentRoomId = null;
    this.isLocalSpeaking = false;
    this.callbacks.onLocalSpeakingChange(false);
    this.callbacks.onPeersChange([]);
  }

  // Setup local audio analyzer to detect speaking
  private initLocalAudioProcessing() {
    if (!this.localStream) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();

      const source = this.audioContext.createMediaStreamSource(this.localStream);
      this.localAnalyser = this.audioContext.createAnalyser();
      this.localAnalyser.fftSize = 512;
      this.localAnalyser.smoothingTimeConstant = 0.4;
      source.connect(this.localAnalyser);

      const bufferLength = this.localAnalyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let speakingCounter = 0;

      this.vadInterval = window.setInterval(() => {
        if (!this.localAnalyser || this.isMicMuted || !this.localStream) {
          if (this.isLocalSpeaking) {
            this.setLocalSpeaking(false);
          }
          return;
        }

        this.localAnalyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;

        // VAD threshold for gaming comms (approx > 18 on 0-255 scale)
        if (average > 16) {
          speakingCounter = 4; // Hangover frames (~200ms)
          if (!this.isLocalSpeaking) {
            this.setLocalSpeaking(true);
          }
        } else {
          if (speakingCounter > 0) {
            speakingCounter--;
          } else if (this.isLocalSpeaking) {
            this.setLocalSpeaking(false);
          }
        }
      }, 50);
    } catch (e) {
      console.warn('Audio processing init warning:', e);
    }
  }

  private setLocalSpeaking(isSpeaking: boolean) {
    this.isLocalSpeaking = isSpeaking;
    this.callbacks.onLocalSpeakingChange(isSpeaking);
    if (this.currentRoomId) {
      this.send({
        type: 'voice:speaking_state',
        roomId: this.currentRoomId,
        isSpeaking,
      });
    }
  }

  // Toggle Microphone Mute
  public setMicMuted(muted: boolean) {
    this.isMicMuted = muted;
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }

    if (muted && this.isLocalSpeaking) {
      this.setLocalSpeaking(false);
    }

    if (this.currentRoomId) {
      this.send({
        type: 'voice:mute_state',
        roomId: this.currentRoomId,
        isMuted: muted,
      });
    }
  }

  // Individual Peer Volume Control (0% to 200%)
  public setPeerVolume(peerUserId: string, volumePercent: number) {
    const peer = this.peers.get(peerUserId);
    if (!peer) return;

    peer.localVolume = Math.max(0, Math.min(200, volumePercent));
    this.updatePeerAudioGain(peerUserId);
    this.notifyPeersChanged();
  }

  // Individual Peer Local Mute
  public setPeerLocallyMuted(peerUserId: string, locallyMuted: boolean) {
    const peer = this.peers.get(peerUserId);
    if (!peer) return;

    peer.isLocallyMuted = locallyMuted;
    this.updatePeerAudioGain(peerUserId);
    this.notifyPeersChanged();
  }

  // Master Voice Volume (0% to 100%)
  public setMasterVoiceVolume(volumePercent: number) {
    this.masterVoiceVolume = Math.max(0, Math.min(100, volumePercent));
    for (const peerId of this.peers.keys()) {
      this.updatePeerAudioGain(peerId);
    }
  }

  // Update GainNode multiplier for a peer
  private updatePeerAudioGain(peerUserId: string) {
    const gainNode = this.peerGainNodes.get(peerUserId);
    const peer = this.peers.get(peerUserId);
    if (!gainNode || !peer) return;

    if (peer.isLocallyMuted || peer.isMuted) {
      gainNode.gain.value = 0;
    } else {
      // Calculate multiplier: (peerVolume / 100) * (masterVolume / 100)
      const factor = (peer.localVolume / 100) * (this.masterVoiceVolume / 100);
      gainNode.gain.value = factor;
    }
  }

  // Create WebRTC Peer Connection
  private createPeerConnection(peerUserId: string, isInitiator: boolean): RTCPeerConnection {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    this.peerConnections.set(peerUserId, pc);

    // Add local mic audio tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && this.currentRoomId) {
        this.send({
          type: 'signal:ice_candidate',
          roomId: this.currentRoomId,
          targetUserId: peerUserId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      this.handleRemoteTrack(peerUserId, event.streams[0]);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.removePeer(peerUserId);
      }
    };

    if (isInitiator) {
      pc.onnegotiationneeded = async () => {
        try {
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: false,
          });
          await pc.setLocalDescription(offer);
          this.send({
            type: 'signal:offer',
            roomId: this.currentRoomId,
            targetUserId: peerUserId,
            offer,
          });
        } catch (err) {
          console.error('Error creating offer for peer:', peerUserId, err);
        }
      };
    }

    return pc;
  }

  // Route remote audio stream through dedicated Web Audio GainNode mixer
  private handleRemoteTrack(peerUserId: string, stream: MediaStream) {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = this.audioContext || new AudioCtx();
      if (!this.audioContext) this.audioContext = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const gainNode = ctx.createGain();
      const destination = ctx.createMediaStreamDestination();

      source.connect(gainNode);
      gainNode.connect(destination);
      this.peerGainNodes.set(peerUserId, gainNode);

      // Create audio element for playback
      let audioEl = this.peerAudioElements.get(peerUserId);
      if (!audioEl) {
        audioEl = new Audio();
        audioEl.autoplay = true;
        (audioEl as any).playsInline = true;
        this.peerAudioElements.set(peerUserId, audioEl);
      }
      audioEl.srcObject = destination.stream;
      audioEl.play().catch((e) => console.warn('Audio auto-play waiting for user interaction:', e));

      this.updatePeerAudioGain(peerUserId);
    } catch (e) {
      console.error('Error routing remote audio stream:', e);
    }
  }

  private handleSocketMessage(data: any) {
    switch (data.type) {
      case 'server:ping':
        this.send({ type: 'client:pong', timestamp: data.timestamp });
        break;

      case 'voice:joined_success': {
        this.callbacks.onConnectionStatusChange('connected', 'Connected to voice room');
        const peersList: PeerVoiceState[] = data.peers.map((p: any) => ({
          userId: p.userId,
          username: p.username,
          avatar: p.avatar,
          isMuted: p.isMuted,
          isSpeaking: p.isSpeaking,
          pingMs: p.pingMs || 24,
          localVolume: 100,
          isLocallyMuted: false,
        }));

        peersList.forEach((peer) => {
          this.peers.set(peer.userId, peer);
          // Existing peer creates connection offer
          this.createPeerConnection(peer.userId, true);
        });

        this.notifyPeersChanged();
        break;
      }

      case 'voice:user_joined': {
        const p = data.user;
        const newPeer: PeerVoiceState = {
          userId: p.userId,
          username: p.username,
          avatar: p.avatar,
          isMuted: p.isMuted,
          isSpeaking: p.isSpeaking,
          pingMs: p.pingMs || 24,
          localVolume: 100,
          isLocallyMuted: false,
        };
        this.peers.set(newPeer.userId, newPeer);
        // Note: Joining user will receive offer from existing user
        this.notifyPeersChanged();
        break;
      }

      case 'voice:user_left': {
        this.removePeer(data.userId);
        break;
      }

      case 'voice:user_mute_state': {
        const peer = this.peers.get(data.userId);
        if (peer) {
          peer.isMuted = data.isMuted;
          if (data.isMuted) peer.isSpeaking = false;
          this.updatePeerAudioGain(data.userId);
          this.notifyPeersChanged();
        }
        break;
      }

      case 'voice:user_speaking_state': {
        const peer = this.peers.get(data.userId);
        if (peer) {
          peer.isSpeaking = data.isSpeaking;
          this.notifyPeersChanged();
        }
        break;
      }

      case 'signal:offer': {
        this.handleSignalOffer(data.fromUserId, data.offer);
        break;
      }

      case 'signal:answer': {
        this.handleSignalAnswer(data.fromUserId, data.answer);
        break;
      }

      case 'signal:ice_candidate': {
        this.handleSignalCandidate(data.fromUserId, data.candidate);
        break;
      }

      case 'admin:user_muted_by_admin': {
        if (data.targetUserId === this.userId) {
          this.setMicMuted(data.isMuted);
          if (this.callbacks.onRemoteMuteByAdmin) {
            this.callbacks.onRemoteMuteByAdmin(data.isMuted);
          }
        }
        break;
      }

      case 'admin:user_kicked': {
        if (data.targetUserId === this.userId) {
          this.leaveVoiceRoom();
          if (this.callbacks.onKickedFromRoom) {
            this.callbacks.onKickedFromRoom(data.roomId);
          }
        } else {
          this.removePeer(data.targetUserId);
        }
        break;
      }

      case 'error': {
        this.callbacks.onConnectionStatusChange('error', data.message);
        break;
      }
    }
  }

  private async handleSignalOffer(fromUserId: string, offer: RTCSessionDescriptionInit) {
    let pc = this.peerConnections.get(fromUserId);
    if (!pc) {
      pc = this.createPeerConnection(fromUserId, false);
    }
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.send({
        type: 'signal:answer',
        roomId: this.currentRoomId,
        targetUserId: fromUserId,
        answer,
      });
    } catch (e) {
      console.error('Error handling offer from peer:', fromUserId, e);
    }
  }

  private async handleSignalAnswer(fromUserId: string, answer: RTCSessionDescriptionInit) {
    const pc = this.peerConnections.get(fromUserId);
    if (pc) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (e) {
        console.error('Error handling answer from peer:', fromUserId, e);
      }
    }
  }

  private async handleSignalCandidate(fromUserId: string, candidate: RTCIceCandidateInit) {
    const pc = this.peerConnections.get(fromUserId);
    if (pc) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error('Error adding ICE candidate:', e);
      }
    }
  }

  private removePeer(peerUserId: string) {
    const pc = this.peerConnections.get(peerUserId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(peerUserId);
    }

    const audioEl = this.peerAudioElements.get(peerUserId);
    if (audioEl) {
      audioEl.srcObject = null;
      audioEl.remove();
      this.peerAudioElements.delete(peerUserId);
    }

    this.peerGainNodes.delete(peerUserId);
    this.peers.delete(peerUserId);
    this.notifyPeersChanged();
  }

  private notifyPeersChanged() {
    this.callbacks.onPeersChange(Array.from(this.peers.values()));
  }

  private handleSocketDisconnect() {
    this.callbacks.onConnectionStatusChange('reconnecting', 'Reconnecting to voice server...');
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 5000);
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = setTimeout(() => {
        this.connectSocket().then(() => {
          if (this.currentRoomId) {
            this.send({
              type: 'voice:join',
              roomId: this.currentRoomId,
              isMuted: this.isMicMuted,
            });
          }
        });
      }, delay);
    } else {
      this.callbacks.onConnectionStatusChange('error', 'Lost connection to voice server.');
    }
  }
}
