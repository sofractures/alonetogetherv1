"use client";

import { useEffect, useRef } from 'react';
import { MemoryForMap } from '@/types/memory';

interface MemoryPlayerProps {
  memory: MemoryForMap | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function MemoryPlayer({ memory, isOpen, onClose }: MemoryPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (isOpen && audioRef.current) {
      audioRef.current.load();
    }
  }, [isOpen, memory]);

  if (!isOpen || !memory) return null;

  // Get signed URL for audio playback
  // audioUrl from database is a path like "final/{uuid}.mp3"
  // We need to use the API route to get a signed URL from Supabase Storage
  const audioUrl = memory.audioUrl 
    ? (memory.audioUrl.startsWith('http') 
        ? memory.audioUrl  // Already a full URL (signed URL)
        : `/api/memory/${memory.id}/audio`)  // API route will create signed URL
    : null;

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

