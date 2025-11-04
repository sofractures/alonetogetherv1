import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseRecorderReturn {
  isRecording: boolean;
  isPermissionGranted: boolean;
  timeLeftMs: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
  getCurrentLevel: () => number; // range ~0..1
}

const MAX_DURATION_MS = 30_000; // 30 seconds cap

type ExtendedWindow = Window & {
  MediaRecorder?: typeof MediaRecorder;
  webkitAudioContext?: typeof AudioContext;
};

function getSupportedMimeType(): string | undefined {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ];
  for (const type of candidates) {
    if (typeof window !== 'undefined' && (window as ExtendedWindow).MediaRecorder && MediaRecorder.isTypeSupported?.(type)) {
      return type;
    }
  }
  return undefined;
}

export function useRecorder(): UseRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const [timeLeftMs, setTimeLeftMs] = useState(MAX_DURATION_MS);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);

  // Web Audio nodes for level metering
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const timeDomainBufferRef = useRef<Uint8Array | null>(null);

  const cleanupStream = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
    if (audioContextRef.current) {
      // Do not close immediately if other audio uses exist; for now we close to free resources
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    stopTimer();
    setIsRecording(false);
    setTimeLeftMs(MAX_DURATION_MS);
    setError(null);
    chunksRef.current = [];
    mediaRecorderRef.current = null;
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setAudioBlob(null);
    cleanupStream();
  }, [audioUrl, cleanupStream, stopTimer]);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    stopTimer();
  }, [stopTimer]);

  const start = useCallback(async () => {
    try {
      setError(null);
      setAudioBlob(null);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      setIsPermissionGranted(true);

      // Setup Web Audio analyser for level meter
      const win = window as ExtendedWindow;
      const AudioCtx: typeof AudioContext = win.AudioContext ?? (win.webkitAudioContext as unknown as typeof AudioContext);
      const audioContext = new AudioCtx();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;
      source.connect(analyser);
      timeDomainBufferRef.current = new Uint8Array(analyser.frequencyBinCount);

      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType ?? 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        cleanupStream();
      };

      recorder.start(100); // collect data in small chunks
      setIsRecording(true);
      setTimeLeftMs(MAX_DURATION_MS);

      // Countdown timer
      const startTime = Date.now();
      timerRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, MAX_DURATION_MS - elapsed);
        setTimeLeftMs(remaining);
        if (remaining <= 0) {
          stop();
        }
      }, 100);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Microphone access failed';
      setError(message);
      setIsPermissionGranted(false);
      cleanupStream();
    }
  }, [audioUrl, cleanupStream, stop]);

  // Compute current audio level [0..1]
  const getCurrentLevel = useCallback((): number => {
    const analyser = analyserRef.current;
    const buffer = timeDomainBufferRef.current;
    if (!analyser || !buffer) return 0;
    analyser.getByteTimeDomainData(buffer);
    // Compute RMS
    let sumSquares = 0;
    for (let i = 0; i < buffer.length; i++) {
      const v = (buffer[i] - 128) / 128; // normalize -1..1
      sumSquares += v * v;
    }
    const rms = Math.sqrt(sumSquares / buffer.length);
    // Clamp and apply slight scaling for UI responsiveness
    return Math.min(1, rms * 2);
  }, []);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      stopTimer();
      cleanupStream();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl, cleanupStream, stopTimer]);

  return {
    isRecording,
    isPermissionGranted,
    timeLeftMs,
    audioBlob,
    audioUrl,
    error,
    start,
    stop,
    reset,
    getCurrentLevel,
  };
}

export default useRecorder;



