import React, { useState, useEffect } from 'react';
import {
  Search,
  Music,
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  Radio,
  ExternalLink,
  Sparkles,
  Layers,
  Flame,
  Headphones,
  Sliders,
  Check,
} from 'lucide-react';
import { MusicTrack, ConnectionStatus } from '../types';

interface MusicPlayerScreenProps {
  tracks: MusicTrack[];
  onSearch: (query: string) => Promise<MusicTrack[]>;
  isInVoice: boolean;
  activeRoomName?: string;
  musicVolume: number;
  onSetMusicVolume: (volume: number) => void;
  voiceVolume: number;
  onSetVoiceVolume: (volume: number) => void;
  onOpenVoiceRoom?: () => void;
}

export const MusicPlayerScreen: React.FC<MusicPlayerScreenProps> = ({
  tracks,
  onSearch,
  isInVoice,
  activeRoomName,
  musicVolume,
  onSetMusicVolume,
  voiceVolume,
  onSetVoiceVolume,
  onOpenVoiceRoom,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(tracks[0] || null);
  const [displayedTracks, setDisplayedTracks] = useState<MusicTrack[]>(tracks);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isMusicMuted, setIsMusicMuted] = useState(false);

  useEffect(() => {
    if (tracks.length > 0 && !currentTrack) {
      setCurrentTrack(tracks[0]);
    }
    setDisplayedTracks(tracks);
  }, [tracks]);

  const categories = ['All', 'Lofi & Chill', 'Synthwave & Cyberpunk', 'High Energy & Action', 'Esports & Gaming OST', 'Rock & Classics'];

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    try {
      const results = await onSearch(searchQuery);
      setDisplayedTracks(results);
      if (results.length > 0 && !currentTrack) {
        setCurrentTrack(results[0]);
      }
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCategoryClick = async (cat: string) => {
    setSelectedCategory(cat);
    if (cat === 'All') {
      const results = await onSearch('');
      setDisplayedTracks(results);
    } else {
      const results = await onSearch(cat);
      setDisplayedTracks(results);
    }
  };

  const effectiveMusicVolume = isMusicMuted ? 0 : musicVolume;

  return (
    <div id="music-player-screen" className="flex flex-col h-full bg-[#0B0F19] text-white overflow-y-auto pb-28">
      {/* Header */}
      <div className="p-4 bg-[#0E1424] border-b border-slate-800 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Music className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-sm">Gaming Music & YouTube Player</h2>
              <p className="text-[10px] text-slate-400 font-mono">Simultaneous Voice Comms + In-App Audio</p>
            </div>
          </div>

          {isInVoice && (
            <button
              onClick={onOpenVoiceRoom}
              className="flex items-center space-x-1.5 py-1 px-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono hover:bg-emerald-500/30 transition-colors"
            >
              <Radio className="w-3 h-3 animate-pulse" />
              <span className="truncate max-w-[80px]">{activeRoomName || 'Voice Active'}</span>
            </button>
          )}
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <input
            id="music-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search YouTube gaming music, Lo-Fi, OST, or paste URL..."
            className="w-full pl-9 pr-20 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <button
            type="submit"
            disabled={isSearching}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-[11px] font-semibold text-white transition-colors"
          >
            {isSearching ? '...' : 'Search'}
          </button>
        </form>

        {/* Category Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pt-3 pb-1 no-scrollbar text-[10px] font-mono">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryClick(cat)}
              className={`px-2.5 py-1 rounded-full whitespace-nowrap border transition-all ${
                selectedCategory === cat
                  ? 'bg-indigo-600/30 border-indigo-400 text-indigo-300 font-bold'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Active Embedded YouTube Player Card */}
        {currentTrack && (
          <div className="rounded-3xl bg-[#0E1424] border border-indigo-500/30 overflow-hidden shadow-xl shadow-indigo-950/40">
            {/* Embedded YouTube Official Iframe */}
            <div className="relative aspect-video w-full bg-black">
              <iframe
                id="youtube-official-embed-player"
                src={`https://www.youtube.com/embed/${currentTrack.id}?autoplay=1&enablejsapi=1&origin=${encodeURIComponent(
                  window.location.origin
                )}`}
                title={currentTrack.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>

            {/* Track Info & Simultaneous Volume Controls */}
            <div className="p-3.5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="min-w-0 pr-2">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-indigo-400 font-bold">
                    Now Playing ({currentTrack.category})
                  </span>
                  <h3 className="text-xs font-bold text-white truncate mt-0.5">{currentTrack.title}</h3>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">{currentTrack.channel}</p>
                </div>
              </div>

              {/* SIMULTANEOUS INDEPENDENT VOLUME CONTROLS (Requirement #11) */}
              <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2.5 text-xs font-mono">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80">
                  <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center space-x-1">
                    <Sliders className="w-3 h-3 text-cyan-400" />
                    <span>Independent Audio Routing</span>
                  </span>
                  <span className="text-[9px] text-emerald-400">● Simultaneous Voice Comms</span>
                </div>

                {/* Music Volume Slider */}
                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-indigo-300 font-semibold flex items-center space-x-1">
                      <Music className="w-3 h-3 text-indigo-400" />
                      <span>Music Volume</span>
                    </span>
                    <span className="text-indigo-300 font-bold">
                      {isMusicMuted ? 'Muted' : `${musicVolume}%`}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setIsMusicMuted(!isMusicMuted)}
                      className="text-slate-400 hover:text-white"
                      title={isMusicMuted ? 'Unmute Music' : 'Mute Music'}
                    >
                      {isMusicMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume1 className="w-3.5 h-3.5" />}
                    </button>
                    <input
                      id="music-volume-slider"
                      type="range"
                      min="0"
                      max="100"
                      value={isMusicMuted ? 0 : musicVolume}
                      onChange={(e) => {
                        setIsMusicMuted(false);
                        onSetMusicVolume(Number(e.target.value));
                      }}
                      className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                    />
                    <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                </div>

                {/* Voice Volume Slider */}
                {isInVoice && (
                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-emerald-300 font-semibold flex items-center space-x-1">
                        <Radio className="w-3 h-3 text-emerald-400" />
                        <span>Voice Comms Volume</span>
                      </span>
                      <span className="text-emerald-300 font-bold">{voiceVolume}%</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Volume1 className="w-3.5 h-3.5 text-slate-500" />
                      <input
                        id="voice-volume-simultaneous-slider"
                        type="range"
                        min="0"
                        max="100"
                        value={voiceVolume}
                        onChange={(e) => onSetVoiceVolume(Number(e.target.value))}
                        className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                      />
                      <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tracks List */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
              YouTube Gaming Audio Catalog ({displayedTracks.length})
            </span>
          </div>

          <div className="space-y-2">
            {displayedTracks.map((track) => {
              const isSelected = currentTrack?.id === track.id;

              return (
                <div
                  key={track.id}
                  id={`track-item-${track.id}`}
                  onClick={() => setCurrentTrack(track)}
                  className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-500/50 shadow-md shadow-indigo-950/40'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-800 shrink-0">
                      <img
                        src={track.thumbnail}
                        alt={track.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <Play className={`w-4 h-4 ${isSelected ? 'text-indigo-400' : 'text-white'}`} />
                      </div>
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-slate-100 truncate">{track.title}</h4>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">{track.channel}</p>
                      <span className="inline-block text-[9px] font-mono text-indigo-400 bg-indigo-950/60 px-1.5 py-0.2 rounded border border-indigo-500/20 mt-1">
                        {track.category}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0 pl-2">
                    <span className="text-[10px] font-mono text-slate-400 font-medium">{track.duration}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
