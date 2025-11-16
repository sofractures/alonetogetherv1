"use client";

import { useRef, useEffect } from 'react';

interface PlaybackModalProps {
  audioUrl: string;
  isOpen: boolean;
  onAddToGlobe: () => void;
  onClose?: () => void;
}

export default function PlaybackModal({
  audioUrl,
  isOpen,
  onAddToGlobe,
  onClose,
}: PlaybackModalProps) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (isOpen && audioRef.current && audioUrl) {
      audioRef.current.load();
    }
  }, [isOpen, audioUrl]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-labelledby="playback-modal-title">
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm" 
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg mx-4 rounded-xl border border-purple-400/30 bg-gray-900/95 backdrop-blur p-6">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            aria-label="Close playback modal"
          >
            ✕
          </button>
        )}
        
        <h2 id="playback-modal-title" className="text-2xl font-semibold text-white mb-2">
          Your Song is Ready! 🎵
        </h2>
        
        <p className="text-gray-300 text-sm mb-6">
          This is <strong>YOUR unique version</strong> of &quot;Alone Together&quot; - your voice woven into the song.
        </p>

        <div className="mb-6">
          <audio
            ref={audioRef}
            src={audioUrl}
            controls
            className="w-full"
            autoPlay
          />
        </div>

        <div className="space-y-3">
          <button
            onClick={onAddToGlobe}
            className="w-full px-6 py-3 rounded bg-purple-600 text-white hover:bg-purple-700 transition-colors font-semibold text-lg"
          >
            Add to Globe
          </button>
          
          <p className="text-center text-gray-400 text-sm">
            Pin it to the globe and get your copy to download
          </p>
        </div>
      </div>
    </div>
  );
}

