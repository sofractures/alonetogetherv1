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
        className="absolute inset-0 bg-black/40 backdrop-blur-md" 
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg mx-4 rounded-xl border border-white/20 bg-black/80 backdrop-blur-xl p-6">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 transition-colors"
            style={{ color: '#e5ddc7' }}
            aria-label="Close playback modal"
          >
            ✕
          </button>
        )}
        
        <h2 id="playback-modal-title" className="text-2xl font-semibold mb-2" style={{ color: '#e5ddc7' }}>
          Your Song is Ready! 🎵
        </h2>
        
        <p className="text-sm mb-6" style={{ color: '#e5ddc7' }}>
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
            className="w-full px-6 py-3 rounded bg-white text-black hover:bg-gray-100 transition-colors font-semibold text-lg"
          >
            Add to Globe
          </button>
          
          <p className="text-center text-sm" style={{ color: '#e5ddc7' }}>
            Pin it to the globe and get your copy to download
          </p>
        </div>
      </div>
    </div>
  );
}

