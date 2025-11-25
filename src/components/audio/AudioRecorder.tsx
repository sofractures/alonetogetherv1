"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import useRecorder from "@/hooks/useRecorder";

function formatMs(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const s = Math.max(0, totalSeconds);
  const mm = Math.floor(s / 60).toString().padStart(2, '0');
  const ss = (s % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

export interface AudioRecorderProps {
  onComplete?: (blob: Blob, url: string) => void;
  onStartRecording?: () => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onComplete, onStartRecording }) => {
  const {
    isRecording,
    timeLeftMs,
    audioBlob,
    audioUrl,
    error,
    start,
    stop,
    reset,
    getCurrentLevel,
  } = useRecorder();

  const [level, setLevel] = useState(0);
  const rafRef = useRef<number | null>(null);

  // Animate level meter while recording
  useEffect(() => {
    if (!isRecording) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setLevel(0);
      return;
    }
    const tick = () => {
      setLevel(getCurrentLevel());
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isRecording, getCurrentLevel]);

  // Notify parent when ready
  useEffect(() => {
    if (audioBlob && audioUrl && onComplete) {
      onComplete(audioBlob, audioUrl);
    }
  }, [audioBlob, audioUrl, onComplete]);

  const canStart = useMemo(() => !isRecording && !audioBlob, [isRecording, audioBlob]);

  const handleStartClick = async () => {
    try {
      onStartRecording?.();
    } finally {
      await start();
    }
  };

  return (
    <div
      style={{
        background: 'rgba(10,10,14,0.6)',
        border: '1px solid rgba(167,139,250,0.25)',
        borderRadius: 12,
        padding: 16,
        color: '#e5e7eb',
        maxWidth: 480,
        margin: '0 auto',
        backdropFilter: 'blur(6px)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ fontSize: 14, color: '#cbd5e1' }}>Recording limit: 00:30</div>
        <div style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: '#a78bfa' }}>{formatMs(timeLeftMs)}</div>
      </div>

      {/* Level meter */}
      <div style={{ marginTop: 12 }}>
        <div style={{ height: 12, background: 'rgba(255,255,255,0.08)', borderRadius: 9999, overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${Math.round(level * 100)}%`,
              background: 'linear-gradient(90deg, #6d28d9, #a78bfa)',
              transition: 'width 80ms linear',
            }}
          />
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 16 }}>
        {canStart && (
          <button
            onClick={handleStartClick}
            aria-label="Start recording"
            className="px-4 py-2 rounded border border-white/30 hover:bg-white/10 transition-colors"
            style={{
              color: '#e5ddc7',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ● Record
          </button>
        )}

        {isRecording && (
          <button
            onClick={stop}
            aria-label="Stop recording"
            className="px-4 py-2 rounded border border-white/30 hover:bg-white/10 transition-colors"
            style={{
              color: '#e5ddc7',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Stop
          </button>
        )}

        {!!audioBlob && !isRecording && (
          <>
            <button
              onClick={reset}
              aria-label="Re-record"
              className="px-4 py-2 rounded border border-white/30 hover:bg-white/10 transition-colors"
              style={{
                color: '#e5ddc7',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Re-record
            </button>
          </>
        )}
      </div>

      {error && (
        <div style={{ color: '#fca5a5', fontSize: 13, marginTop: 10 }}>{error}</div>
      )}

      {/* Preview */}
      {!!audioUrl && !isRecording && (
        <div style={{ marginTop: 16 }}>
          <audio src={audioUrl} controls style={{ width: '100%' }} />
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>Format: WebM/Opus (converted to MP3 later)</div>
        </div>
      )}

    </div>
  );
};

export default AudioRecorder;



