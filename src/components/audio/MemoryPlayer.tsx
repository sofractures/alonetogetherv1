"use client";

import { useEffect, useRef, useState } from 'react';
import { MemoryForMap } from '@/types/memory';
import { onMemoryPlaybackStartMuteBackground, onMemoryPlaybackStopUnmuteBackground } from '@/lib/audio-context';

interface MemoryPlayerProps {
  memory: MemoryForMap | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function MemoryPlayer({ memory, isOpen, onClose }: MemoryPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  
  // Get user email from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedEmail = localStorage.getItem('userEmail');
      setUserEmail(storedEmail);
    }
  }, []);
  
  const currentMemory = memory;
  const title = currentMemory?.name || currentMemory?.location || 'Memory';
  
  // Check if current memory belongs to the user
  const isUserMemory = userEmail && currentMemory?.email && 
    userEmail.toLowerCase() === currentMemory.email.toLowerCase();

  // Fetch signed URL when modal opens and memory is available
  useEffect(() => {
    if (!isOpen || !currentMemory) {
      setAudioUrl(null);
      return;
    }

        // If audioUrl is already a full URL, use it directly
        if (currentMemory.audioUrl?.startsWith('http')) {
          setAudioUrl(currentMemory.audioUrl);
          return;
        }
        
        // Otherwise, fetch signed URL from API
        if (currentMemory.audioUrl) {
          setIsLoadingAudio(true);
          fetch(`/api/memory/${currentMemory.id}/audio`)
            .then(res => res.json())
            .then(data => {
              if (data.url) {
                setAudioUrl(data.url);
              } else {
                console.error('[v0] MemoryPlayer: No URL in response');
              }
            })
            .catch(error => {
              console.error('[v0] MemoryPlayer: Error fetching audio URL:', error);
            })
            .finally(() => {
              setIsLoadingAudio(false);
            });
        }
  }, [isOpen, currentMemory]);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-labelledby="memory-player-title" aria-describedby="memory-player-description">
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-md" 
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg mx-4 rounded-xl border border-white/20 bg-black/80 backdrop-blur-xl p-4 sm:p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 transition-colors"
          style={{ color: '#e5ddc7' }}
          aria-label="Close memory player"
        >
          ✕
        </button>
        
        <div className="flex items-center justify-between mb-2">
          <h2 id="memory-player-title" className="text-2xl font-semibold" style={{ color: '#e5ddc7' }}>
            {title}
          </h2>
          {isUserMemory && (
            <span className="px-2 py-1 rounded text-xs bg-white/20 border border-white/30" style={{ color: '#e5ddc7' }}>
              Your Memory
            </span>
          )}
        </div>
        
        {currentMemory.location && (
          <p id="memory-player-description" className="text-sm mb-4" style={{ color: '#e5ddc7' }}>
            📍 {currentMemory.location}
          </p>
        )}

        {isLoadingAudio ? (
          <p className="mt-4" style={{ color: '#e5ddc7' }}>Loading audio...</p>
        ) : audioUrl ? (
          <div className="mt-4">
            <audio
              ref={audioRef}
              src={audioUrl}
              controls
              className="w-full"
              autoPlay
            />
            {/* Only show download button if this is the user's memory */}
            {isUserMemory && (
              <a
                href={audioUrl}
                download={`memory-${currentMemory.id}.mp3`}
                className="mt-4 inline-block px-4 py-2 rounded bg-white text-black hover:bg-gray-100 transition-colors"
              >
                ⬇ Download Your Song
              </a>
            )}
            {!isUserMemory && (
              <p className="mt-4 text-sm italic" style={{ color: '#e5ddc7' }}>
                You can listen to everyone&apos;s memories, but downloads are only available for your own songs.
              </p>
            )}
          </div>
        ) : (
          <p className="mt-4" style={{ color: '#e5ddc7' }}>Audio not available</p>
        )}
      </div>
    </div>
  );
}

