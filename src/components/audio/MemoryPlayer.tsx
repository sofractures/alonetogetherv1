"use client";

import { useEffect, useRef, useState } from 'react';
import { MemoryForMap } from '@/types/memory';
import { onMemoryPlaybackStartMuteBackground, onMemoryPlaybackStopUnmuteBackground } from '@/lib/audio-context';

interface MemoryPlayerProps {
  memory: MemoryForMap | null;
  memories?: MemoryForMap[]; // Optional: playlist of overlapping memories
  isOpen: boolean;
  onClose: () => void;
}

export default function MemoryPlayer({ memory, memories, isOpen, onClose }: MemoryPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  
  // Use playlist if provided, otherwise single memory
  const playlist = memories && memories.length > 1 ? memories : (memory ? [memory] : []);
  const currentMemory = playlist[currentTrackIndex] || memory;
  const title = currentMemory?.name || currentMemory?.location || 'Memory';

  // Reset track index when playlist changes
  useEffect(() => {
    if (playlist.length > 0) {
      setCurrentTrackIndex(0);
    }
  }, [playlist.length]);

  // Fetch signed URL when modal opens and memory is available
  useEffect(() => {
    if (!isOpen || !currentMemory) {
      setAudioUrl(null);
      return;
    }

    console.log('[v0] MemoryPlayer: Opening modal for memory:', {
      id: currentMemory.id,
      location: currentMemory.location,
      audioUrl: currentMemory.audioUrl,
      hasAudioUrl: !!currentMemory.audioUrl,
      playlistLength: playlist.length,
      currentTrack: currentTrackIndex + 1
    });

    // If audioUrl is already a full URL, use it directly
    if (currentMemory.audioUrl?.startsWith('http')) {
      console.log('[v0] MemoryPlayer: Using direct URL:', currentMemory.audioUrl);
      setAudioUrl(currentMemory.audioUrl);
      return;
    }

    // Otherwise, fetch signed URL from API
    if (currentMemory.audioUrl) {
      console.log('[v0] MemoryPlayer: Fetching signed URL for memory ID:', currentMemory.id, 'audioUrl path:', currentMemory.audioUrl);
      setIsLoadingAudio(true);
      fetch(`/api/memory/${currentMemory.id}/audio`)
        .then(res => res.json())
        .then(data => {
          if (data.url) {
            setAudioUrl(data.url);
          } else {
            console.error('[v0] MemoryPlayer: No URL in response:', data);
          }
        })
        .catch(error => {
          console.error('[v0] MemoryPlayer: Error fetching audio URL:', error);
        })
        .finally(() => {
          setIsLoadingAudio(false);
        });
    }
  }, [isOpen, currentMemory, currentTrackIndex]);

  useEffect(() => {
    if (isOpen && audioRef.current && audioUrl) {
      audioRef.current.load();
    }
  }, [isOpen, audioUrl]);

  // Fade out background music when memory player opens
  useEffect(() => {
    if (isOpen) {
      onMemoryPlaybackStartMuteBackground();
      // Resume background music when modal closes
      return () => {
        onMemoryPlaybackStopUnmuteBackground();
      };
    }
  }, [isOpen]);

  if (!isOpen || !currentMemory) return null;

  const handleNextTrack = () => {
    if (playlist.length > 1) {
      setCurrentTrackIndex((prev) => (prev + 1) % playlist.length);
    }
  };

  const handlePrevTrack = () => {
    if (playlist.length > 1) {
      setCurrentTrackIndex((prev) => (prev - 1 + playlist.length) % playlist.length);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-labelledby="memory-player-title" aria-describedby="memory-player-description">
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm" 
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg mx-4 rounded-xl border border-purple-400/30 bg-gray-900/95 backdrop-blur p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          aria-label="Close memory player"
        >
          ✕
        </button>
        
        <h2 id="memory-player-title" className="text-2xl font-semibold text-white mb-2">
          {playlist.length > 1 ? `Playlist (${currentTrackIndex + 1}/${playlist.length})` : title}
        </h2>
        
        {currentMemory.location && (
          <p id="memory-player-description" className="text-gray-300 text-sm mb-4">
            📍 {currentMemory.location}
            {playlist.length > 1 && (
              <span className="ml-2 text-purple-300">
                ({playlist.length} memories at this location)
              </span>
            )}
          </p>
        )}

        {/* Playlist view for overlapping memories */}
        {playlist.length > 1 && (
          <div className="mb-4 max-h-48 overflow-y-auto border border-purple-400/20 rounded p-2">
            <p className="text-sm text-purple-200 mb-2 font-semibold">All memories at this location:</p>
            <div className="space-y-1">
              {playlist.map((mem, idx) => (
                <button
                  key={mem.id}
                  onClick={() => setCurrentTrackIndex(idx)}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                    idx === currentTrackIndex
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>
                      {idx + 1}. {mem.name || `Memory ${idx + 1}`}
                    </span>
                    {mem.location && (
                      <span className={`text-xs ml-2 ${
                        idx === currentTrackIndex ? 'text-purple-200' : 'text-gray-400'
                      }`}>
                        📍 {mem.location}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {isLoadingAudio ? (
          <p className="text-gray-400 mt-4">Loading audio...</p>
        ) : audioUrl ? (
          <div className="mt-4">
            <audio
              ref={audioRef}
              src={audioUrl}
              controls
              className="w-full"
              autoPlay
              onEnded={() => {
                // Auto-advance to next track in playlist
                if (playlist.length > 1) {
                  handleNextTrack();
                }
              }}
            />
            {playlist.length > 1 && (
              <div className="flex gap-2 mt-3 justify-center">
                <button
                  onClick={handlePrevTrack}
                  className="px-4 py-2 rounded bg-gray-700 text-white hover:bg-gray-600 transition-colors"
                >
                  ← Previous
                </button>
                <button
                  onClick={handleNextTrack}
                  className="px-4 py-2 rounded bg-gray-700 text-white hover:bg-gray-600 transition-colors"
                >
                  Next →
                </button>
              </div>
            )}
            <a
              href={audioUrl}
              download={`memory-${currentMemory.id}.mp3`}
              className="mt-4 inline-block px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700 transition-colors"
            >
              Download
            </a>
          </div>
        ) : (
          <p className="text-gray-400 mt-4">Audio not available</p>
        )}
      </div>
    </div>
  );
}

