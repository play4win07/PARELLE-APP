import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api, getStoredAuth, saveAuth, clearAuth } from './lib/api';
import { VoiceManager } from './lib/voiceManager';
import {
  User,
  RoomSummary,
  RoomDetail,
  RoomMemberDetail,
  PeerVoiceState,
  ConnectionStatus,
  MusicTrack,
  NavigationTab,
} from './types';
import { AndroidHeader } from './components/AndroidHeader';
import { BottomNavigation } from './components/BottomNavigation';
import { ActiveVoiceBar } from './components/ActiveVoiceBar';
import { OnboardingModal } from './components/OnboardingModal';
import { ProfileModal } from './components/ProfileModal';
import { CreateRoomModal } from './components/CreateRoomModal';
import { JoinRoomModal } from './components/JoinRoomModal';
import { HomeScreen } from './components/HomeScreen';
import { MyRoomsScreen } from './components/MyRoomsScreen';
import { VoiceRoomScreen } from './components/VoiceRoomScreen';
import { MusicPlayerScreen } from './components/MusicPlayerScreen';
import { ProfileScreen } from './components/ProfileScreen';

export default function App() {
  // 1. Auth & User state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // 2. Navigation state
  const [activeTab, setActiveTab] = useState<NavigationTab>('home');
  const [isDedicatedRoomViewOpen, setIsDedicatedRoomViewOpen] = useState(false);

  // 3. Rooms state
  const [myRooms, setMyRooms] = useState<RoomSummary[]>([]);
  const [currentSelectedRoomId, setCurrentSelectedRoomId] = useState<string | null>(null);
  const [currentRoomDetail, setCurrentRoomDetail] = useState<RoomDetail | null>(null);
  const [currentRoomMembers, setCurrentRoomMembers] = useState<RoomMemberDetail[]>([]);
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [isJoinRoomOpen, setIsJoinRoomOpen] = useState(false);

  // 4. Voice State
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [peers, setPeers] = useState<PeerVoiceState[]>([]);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isLocalSpeaking, setIsLocalSpeaking] = useState(false);
  const [masterVoiceVolume, setMasterVoiceVolume] = useState(100);

  // 5. Music State
  const [musicTracks, setMusicTracks] = useState<MusicTrack[]>([]);
  const [musicVolume, setMusicVolume] = useState(80);

  // 6. Voice Manager instance ref
  const voiceManagerRef = useRef<VoiceManager | null>(null);

  // Initialize Voice Manager
  useEffect(() => {
    const vm = new VoiceManager({
      onConnectionStatusChange: (status, message) => {
        setConnectionStatus(status);
        if (message) setConnectionMessage(message);
      },
      onPeersChange: (updatedPeers) => {
        setPeers(updatedPeers);
      },
      onLocalSpeakingChange: (speaking) => {
        setIsLocalSpeaking(speaking);
      },
      onRemoteMuteByAdmin: (muted) => {
        setIsMicMuted(muted);
        alert(muted ? 'An admin has muted your microphone.' : 'An admin has unmuted your microphone.');
      },
      onKickedFromRoom: (kickedRoomId) => {
        alert('You have been removed from this room by the room administrator.');
        setIsDedicatedRoomViewOpen(false);
        setCurrentSelectedRoomId(null);
        setCurrentRoomDetail(null);
        fetchMyRooms();
      },
    });

    voiceManagerRef.current = vm;

    return () => {
      vm.leaveVoiceRoom();
    };
  }, []);

  // Sync user info into VoiceManager
  useEffect(() => {
    if (currentUser && voiceManagerRef.current) {
      voiceManagerRef.current.initUser(currentUser.id, currentUser.username, currentUser.avatar);
    }
  }, [currentUser]);

  // Initial Load: check session & fetch rooms & music
  useEffect(() => {
    const initApp = async () => {
      const stored = getStoredAuth();
      if (stored.user && stored.token) {
        setCurrentUser(stored.user);
        setAuthToken(stored.token);
        try {
          const freshUser = await api.getCurrentUser();
          setCurrentUser(freshUser);
        } catch (e) {
          console.warn('Session refresh notice, continuing with stored user', e);
        }
      } else {
        setIsOnboardingOpen(true);
      }

      // Fetch starter music catalog
      try {
        const tracks = await api.searchMusic('');
        setMusicTracks(tracks);
      } catch (e) {
        console.warn('Music catalog load error', e);
      }
    };

    initApp();
  }, []);

  // Fetch user rooms
  const fetchMyRooms = useCallback(async () => {
    if (!currentUser) return;
    try {
      const rooms = await api.getMyRooms();
      setMyRooms(rooms);
    } catch (err) {
      console.error('Failed to fetch rooms', err);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchMyRooms();
      const interval = setInterval(fetchMyRooms, 8000);
      return () => clearInterval(interval);
    }
  }, [currentUser, fetchMyRooms]);

  // Fetch details for currently selected room
  const fetchRoomDetails = useCallback(async (roomId: string) => {
    try {
      const res = await api.getRoomDetails(roomId);
      setCurrentRoomDetail(res.room);
      setCurrentRoomMembers(res.members);
    } catch (err: any) {
      console.error('Failed to get room details', err);
    }
  }, []);

  useEffect(() => {
    if (currentSelectedRoomId) {
      fetchRoomDetails(currentSelectedRoomId);
      const interval = setInterval(() => {
        fetchRoomDetails(currentSelectedRoomId);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [currentSelectedRoomId, fetchRoomDetails]);

  // Handlers for User / Profile
  const handleOnboardingComplete = async (username: string, avatar: string, bio: string) => {
    const res = await api.saveProfile({ username, avatar, bio });
    setCurrentUser(res.user);
    setAuthToken(res.token);
    setIsOnboardingOpen(false);
    await fetchMyRooms();
  };

  const handleUpdateProfile = async (username: string, avatar: string, bio: string) => {
    if (!currentUser) return;
    const res = await api.saveProfile({
      username,
      avatar,
      bio,
      userId: currentUser.id,
    });
    setCurrentUser(res.user);
  };

  const handleLogout = () => {
    if (voiceManagerRef.current) {
      voiceManagerRef.current.leaveVoiceRoom();
    }
    clearAuth();
    setCurrentUser(null);
    setAuthToken(null);
    setMyRooms([]);
    setCurrentSelectedRoomId(null);
    setCurrentRoomDetail(null);
    setIsDedicatedRoomViewOpen(false);
    setIsProfileModalOpen(false);
    setIsOnboardingOpen(true);
  };

  // Handlers for Room creation & joining
  const handleCreateRoom = async (params: { name: string; password?: string; description?: string }) => {
    const res = await api.createRoom(params);
    await fetchMyRooms();
    return res;
  };

  const handleJoinCreatedRoom = async (roomId: string) => {
    setCurrentSelectedRoomId(roomId);
    setIsDedicatedRoomViewOpen(true);
    await fetchRoomDetails(roomId);
    // Connect voice directly
    if (voiceManagerRef.current) {
      await voiceManagerRef.current.joinVoiceRoom(roomId);
    }
  };

  const handleJoinRoom = async (roomId: string, password: string) => {
    const res = await api.joinRoom({ roomId, password });
    await fetchMyRooms();
    return res;
  };

  const handleSelectRoom = async (roomId: string) => {
    setCurrentSelectedRoomId(roomId);
    setIsDedicatedRoomViewOpen(true);
    await fetchRoomDetails(roomId);
  };

  // Voice Connection Handlers
  const handleConnectVoice = async () => {
    if (!currentSelectedRoomId || !voiceManagerRef.current) return;
    await voiceManagerRef.current.joinVoiceRoom(currentSelectedRoomId);
  };

  const handleDisconnectVoice = () => {
    if (voiceManagerRef.current) {
      voiceManagerRef.current.leaveVoiceRoom();
    }
  };

  const handleToggleMic = () => {
    if (!voiceManagerRef.current) return;
    const nextMuted = !isMicMuted;
    setIsMicMuted(nextMuted);
    voiceManagerRef.current.setMicMuted(nextMuted);
  };

  const handleSetPeerVolume = (peerUserId: string, volume: number) => {
    if (voiceManagerRef.current) {
      voiceManagerRef.current.setPeerVolume(peerUserId, volume);
    }
  };

  const handleSetPeerLocallyMuted = (peerUserId: string, muted: boolean) => {
    if (voiceManagerRef.current) {
      voiceManagerRef.current.setPeerLocallyMuted(peerUserId, muted);
    }
  };

  const handleSetMasterVoiceVolume = (volume: number) => {
    setMasterVoiceVolume(volume);
    if (voiceManagerRef.current) {
      voiceManagerRef.current.setMasterVoiceVolume(volume);
    }
  };

  // Room Admin Handlers
  const handleRemoveMember = async (targetUserId: string) => {
    if (!currentSelectedRoomId) return;
    await api.removeMember(currentSelectedRoomId, targetUserId);
    await fetchRoomDetails(currentSelectedRoomId);
  };

  const handleMuteMemberByAdmin = (targetUserId: string, isMuted: boolean) => {
    if (!currentSelectedRoomId || !voiceManagerRef.current) return;
    // Send admin mute via socket
    (voiceManagerRef.current as any).send({
      type: 'admin:mute_user',
      roomId: currentSelectedRoomId,
      targetUserId,
      isMuted,
    });
  };

  const handleUpdateRoomSettings = async (params: { name?: string; password?: string; description?: string }) => {
    if (!currentSelectedRoomId) return;
    await api.updateRoomSettings(currentSelectedRoomId, params);
    await fetchRoomDetails(currentSelectedRoomId);
    await fetchMyRooms();
  };

  const handleDeleteRoom = async () => {
    if (!currentSelectedRoomId) return;
    handleDisconnectVoice();
    await api.deleteRoom(currentSelectedRoomId);
    setCurrentSelectedRoomId(null);
    setCurrentRoomDetail(null);
    setIsDedicatedRoomViewOpen(false);
    await fetchMyRooms();
  };

  const handleLeaveRoom = async () => {
    if (!currentSelectedRoomId) return;
    handleDisconnectVoice();
    await api.leaveRoom(currentSelectedRoomId);
    setCurrentSelectedRoomId(null);
    setCurrentRoomDetail(null);
    setIsDedicatedRoomViewOpen(false);
    await fetchMyRooms();
  };

  // Music Search handler
  const handleSearchMusic = async (query: string) => {
    return await api.searchMusic(query);
  };

  const isInVoice = connectionStatus === 'connected';
  const activeVoiceRoomName = currentRoomDetail?.name || myRooms.find((r) => r.roomId === voiceManagerRef.current?.currentRoomId)?.name || 'Voice Room';

  return (
    <div className="flex justify-center min-h-screen bg-[#060911] font-sans antialiased text-slate-100">
      {/* Mobile/Android Device Container Viewport */}
      <div className="w-full max-w-md bg-[#0B0F19] min-h-screen flex flex-col relative border-x border-slate-800/80 shadow-2xl overflow-hidden">
        {/* Android Status Bar & Top App Bar */}
        <AndroidHeader
          user={currentUser}
          onOpenProfile={() => setIsProfileModalOpen(true)}
          isInVoice={isInVoice}
          activeRoomName={activeVoiceRoomName}
          onOpenActiveRoom={() => setIsDedicatedRoomViewOpen(true)}
        />

        {/* Main Body Screen Router */}
        <main className="flex-1 overflow-hidden relative">
          {/* If dedicated room view is active */}
          {isDedicatedRoomViewOpen && currentRoomDetail && currentUser ? (
            <VoiceRoomScreen
              room={currentRoomDetail}
              members={currentRoomMembers}
              currentUser={currentUser}
              connectionStatus={connectionStatus}
              connectionMessage={connectionMessage}
              peers={peers}
              isMicMuted={isMicMuted}
              isLocalSpeaking={isLocalSpeaking}
              onToggleMic={handleToggleMic}
              onConnectVoice={handleConnectVoice}
              onDisconnectVoice={handleDisconnectVoice}
              onSetPeerVolume={handleSetPeerVolume}
              onSetPeerLocallyMuted={handleSetPeerLocallyMuted}
              onSetMasterVoiceVolume={handleSetMasterVoiceVolume}
              masterVoiceVolume={masterVoiceVolume}
              onLeaveRoom={handleLeaveRoom}
              onCloseRoomView={() => setIsDedicatedRoomViewOpen(false)}
              onRefreshRoomData={() => fetchRoomDetails(currentRoomDetail.roomId)}
              onRemoveMember={handleRemoveMember}
              onMuteMemberByAdmin={handleMuteMemberByAdmin}
              onUpdateRoomSettings={handleUpdateRoomSettings}
              onDeleteRoom={handleDeleteRoom}
            />
          ) : (
            <>
              {activeTab === 'home' && currentUser && (
                <HomeScreen
                  user={currentUser}
                  myRooms={myRooms}
                  onOpenCreateRoom={() => setIsCreateRoomOpen(true)}
                  onOpenJoinRoom={() => setIsJoinRoomOpen(true)}
                  onSelectRoom={handleSelectRoom}
                  onNavigateTab={(tab) => setActiveTab(tab)}
                  isInVoice={isInVoice}
                  activeRoomId={voiceManagerRef.current?.currentRoomId || undefined}
                />
              )}

              {activeTab === 'rooms' && currentUser && (
                <MyRoomsScreen
                  rooms={myRooms}
                  currentUser={currentUser}
                  onSelectRoom={handleSelectRoom}
                  onOpenCreateRoom={() => setIsCreateRoomOpen(true)}
                  onOpenJoinRoom={() => setIsJoinRoomOpen(true)}
                  isInVoice={isInVoice}
                  activeRoomId={voiceManagerRef.current?.currentRoomId || undefined}
                />
              )}

              {activeTab === 'music' && (
                <MusicPlayerScreen
                  tracks={musicTracks}
                  onSearch={handleSearchMusic}
                  isInVoice={isInVoice}
                  activeRoomName={activeVoiceRoomName}
                  musicVolume={musicVolume}
                  onSetMusicVolume={setMusicVolume}
                  voiceVolume={masterVoiceVolume}
                  onSetVoiceVolume={handleSetMasterVoiceVolume}
                  onOpenVoiceRoom={() => setIsDedicatedRoomViewOpen(true)}
                />
              )}

              {activeTab === 'profile' && currentUser && (
                <ProfileScreen
                  user={currentUser}
                  onOpenEditProfile={() => setIsProfileModalOpen(true)}
                  onLogout={handleLogout}
                  isMicMuted={isMicMuted}
                  onToggleMic={handleToggleMic}
                  masterVoiceVolume={masterVoiceVolume}
                  onSetMasterVoiceVolume={handleSetMasterVoiceVolume}
                  musicVolume={musicVolume}
                  onSetMusicVolume={setMusicVolume}
                  isInVoice={isInVoice}
                  activeRoomName={activeVoiceRoomName}
                />
              )}
            </>
          )}
        </main>

        {/* Persistent Floating Active Voice Comms Bar when not in dedicated room view */}
        {isInVoice && !isDedicatedRoomViewOpen && (
          <ActiveVoiceBar
            roomName={activeVoiceRoomName}
            roomId={voiceManagerRef.current?.currentRoomId || ''}
            connectionStatus={connectionStatus}
            isMicMuted={isMicMuted}
            isLocalSpeaking={isLocalSpeaking}
            onToggleMic={handleToggleMic}
            onDisconnect={handleDisconnectVoice}
            onOpenRoomView={() => setIsDedicatedRoomViewOpen(true)}
            peersCount={peers.length}
          />
        )}

        {/* Bottom Navigation */}
        {!isDedicatedRoomViewOpen && (
          <BottomNavigation
            activeTab={activeTab}
            onTabChange={(tab) => setActiveTab(tab)}
            isInVoice={isInVoice}
          />
        )}

        {/* First-time Onboarding Modal */}
        {isOnboardingOpen && <OnboardingModal onComplete={handleOnboardingComplete} />}

        {/* Profile Modal */}
        {isProfileModalOpen && currentUser && (
          <ProfileModal
            user={currentUser}
            isOpen={isProfileModalOpen}
            onClose={() => setIsProfileModalOpen(false)}
            onUpdateProfile={handleUpdateProfile}
            onLogout={handleLogout}
          />
        )}

        {/* Create Room Modal */}
        {isCreateRoomOpen && (
          <CreateRoomModal
            isOpen={isCreateRoomOpen}
            onClose={() => setIsCreateRoomOpen(false)}
            onCreateRoom={handleCreateRoom}
            onJoinCreatedRoom={handleJoinCreatedRoom}
          />
        )}

        {/* Join Room Modal */}
        {isJoinRoomOpen && (
          <JoinRoomModal
            isOpen={isJoinRoomOpen}
            onClose={() => setIsJoinRoomOpen(false)}
            onJoinRoom={handleJoinRoom}
            onSuccess={handleJoinCreatedRoom}
          />
        )}
      </div>
    </div>
  );
}
