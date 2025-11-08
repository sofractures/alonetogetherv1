"use client";

import { useEffect, useRef, useState } from 'react';
import { MemoryForMap } from '@/types/memory';

interface MemoryPlayerProps {
  memory: MemoryForMap | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function MemoryPlayer({ memory, isOpen, onClose }: MemoryPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  // Fetch signed URL when modal opens and memory is available
  useEffect(() => {
    if (!isOpen || !memory) {
      setAudioUrl(null);
      return;
    }

    console.log('[v0] MemoryPlayer: Opening modal for memory:', {
      id: memory.id,
      location: memory.location,
      audioUrl: memory.audioUrl,
      hasAudioUrl: !!memory.audioUrl
    });

    // If audioUrl is already a full URL, use it directly
    if (memory.audioUrl?.startsWith('http')) {
      console.log('[v0] MemoryPlayer: Using direct URL:', memory.audioUrl);
      setAudioUrl(memory.audioUrl);
      return;
    }

    // Otherwise, fetch signed URL from API
    if (memory.audioUrl) {
      console.log('[v0] MemoryPlayer: Fetching signed URL for memory ID:', memory.id, 'audioUrl path:', memory.audioUrl);
      setIsLoadingAudio(true);
      fetch(`/api/memory/${memory.id}/audio`)
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
  }, [isOpen, memory]);

  useEffect(() => {
    if (isOpen && audioRef.current && audioUrl) {
      audioRef.current.load();
    }
  }, [isOpen, audioUrl]);

  if (!isOpen || !memory) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm" 
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg mx-4 rounded-xl border border-purple-400/30 bg-gray-900/95 backdrop-blur p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          ✕
        </button>
        
        <h2 className="text-2xl font-semibold text-white mb-2">
          Memory from {memory.location || 'Unknown Location'}
        </h2>
        
        {memory.location && (
          <p className="text-gray-300 text-sm mb-4">
            📍 {memory.location}
          </p>
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
            />
            <a
              href={audioUrl}
              download={`memory-${memory.id}.mp3`}
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

