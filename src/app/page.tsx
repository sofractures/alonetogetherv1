"use client";
import AudioRecorder from "@/components/audio/AudioRecorder";
import MemoryGlobe from "@/components/3d/MemoryGlobe";
import { useState, useEffect } from "react";
import { getAudioController, onRecordingStartFadeOutBackground, onRecordingStopResumeBackground } from "@/lib/audio-context";
import { useMemoryStore } from "@/store/memoryStore";
import { getBrowserLocation, getIPLocation, LocationData } from "@/lib/location";

export default function Home() {
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [processedAudioUrl, setProcessedAudioUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Memory store
  const { memories, fetchMemories, selectMemory, selectedMemory, addMemory } = useMemoryStore();

  // Fetch memories on mount
  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  const handleStart = async () => {
    const c = getAudioController();
    c.setSrc("/assets/fullsong.mp3");
    c.setVolume(0.5);
    await c.play();
    // Open welcome modal; do not pause audio yet
    setIsWelcomeOpen(true);
  };

  const closeOverlay = async () => {
    setIsOverlayOpen(false);
    setPendingBlob(null);
    setPendingUrl(null);
    setUploadError(null);
    
    // If we just finished processing, refresh memories to show the new window
    if (processedAudioUrl) {
      // Small delay to ensure database update has completed
      setTimeout(() => {
        fetchMemories();
      }, 1000);
    }
    
    setProcessedAudioUrl(null);
    
    await onRecordingStopResumeBackground();
  };

  const onRecorderComplete = (blob: Blob, url: string) => {
    setPendingBlob(blob);
    setPendingUrl(url);
  };

  const acceptRecording = async () => {
    if (!pendingBlob) return;
    try {
      // Ensure the recording overlay stays open for processing flow
      setIsOverlayOpen(true);
      setIsWelcomeOpen(false);
      setIsUploading(true);
      setUploadError(null);
      
      // Get user location
      let location: LocationData | null = null;
      try {
        location = await getBrowserLocation();
        // Fallback to IP-based location if browser geolocation fails
        if (!location) {
          location = await getIPLocation();
        }
      } catch (error) {
        console.warn('Location fetch error:', error);
      }
      
      const form = new FormData();
      form.append("file", pendingBlob, "recording.webm");
      if (location) {
        form.append("location", JSON.stringify(location));
      }
      
      const res = await fetch("/api/memory/record", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Upload failed");
      
      // Begin processing step
      setIsProcessing(true);
      try {
        const pres = await fetch('/api/process-audio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: data.path, memoryId: data.memoryId ?? null }),
        });
        const pdata = await pres.json();
        if (!pres.ok) {
          const msg = pdata?.error || 'Processing failed';
          setUploadError(msg);
          throw new Error(msg);
        }
        // Processing complete - store the processed audio URL for playback
        if (pdata.signedUrl) {
          setProcessedAudioUrl(pdata.signedUrl);
        }
      } finally {
        setIsProcessing(false);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Upload failed";
      setUploadError(message);
    } finally {
      setIsUploading(false);
    }
  };
  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* 3D Scene - Always visible in background */}
      <div className="absolute inset-0 z-0">
        <MemoryGlobe 
          memories={memories} 
          autoRotate={true}
          onMemoryClick={(id) => {
            selectMemory(id);
            // TODO: Open memory player modal
            console.log('Memory clicked:', id, selectedMemory);
          }}
        />
      </div>
      
      {/* Content overlays */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen">
        {/* Title and Start button - only show when no overlays are open */}
        {!isWelcomeOpen && !isOverlayOpen && (
          <div className="text-center">
            <h1 className="text-6xl font-bold text-white mb-4 drop-shadow-lg">
              Alone Together
            </h1>
            <p className="text-xl text-gray-200 mb-8 max-w-2xl mx-auto drop-shadow">
              Each window holds a memory. Add yours to the building.
            </p>
            <button 
              onClick={handleStart} 
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200 shadow-lg"
            >
              Start
            </button>
          </div>
        )}
        {isWelcomeOpen && (
          <div className="fixed inset-0 z-40 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={() => setIsWelcomeOpen(false)} />
            <div className="relative z-10 w-full max-w-xl mx-4 rounded-xl border border-purple-400/30 bg-gray-900/80 backdrop-blur p-6 text-center">
              <h2 className="text-white text-2xl font-semibold mb-2">Welcome to aLone Together</h2>
              <p className="text-gray-300 mb-6">Record your memory to create your own personal song, or explore others on the map.</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => { setIsWelcomeOpen(false); setIsOverlayOpen(true); }} className="px-5 py-2 rounded bg-purple-600 text-white">Create</button>
                <button onClick={() => setIsWelcomeOpen(false)} className="px-5 py-2 rounded border border-gray-500/40 text-gray-200">Explore</button>
              </div>
            </div>
          </div>
        )}

        {isOverlayOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => {
                if (isUploading || isProcessing || processedAudioUrl) return;
                closeOverlay();
              }}
            />
            <div className="relative z-10 w-full max-w-lg mx-4 rounded-xl border border-purple-400/30 bg-gray-900/80 backdrop-blur p-5">
              <div className="text-sm text-gray-300 mb-1">Record your memory</div>
              <div className="text-lg font-semibold text-white mb-4">Share a time when you felt a part of something bigger than you</div>

              {!pendingBlob && (
                <AudioRecorder onComplete={onRecorderComplete} onStartRecording={onRecordingStartFadeOutBackground} />
              )}

              {pendingBlob && !processedAudioUrl && (
                <div>
                  <div className="text-gray-300 text-sm mb-2">Preview your recording</div>
                  {pendingUrl && <audio src={pendingUrl} controls className="w-full" />}
                  {uploadError && <div className="text-red-300 text-sm mt-2">{uploadError}</div>}
                  <div className="flex gap-2 mt-4 items-center">
                    <button onClick={() => { setPendingBlob(null); setPendingUrl(null); }} className="px-4 py-2 rounded border border-purple-400/40 text-purple-200">
                      Re-record
                    </button>
                    <button onClick={acceptRecording} disabled={isUploading || isProcessing} className="px-4 py-2 rounded bg-purple-600 text-white disabled:opacity-60">
                      {isUploading ? 'Uploading…' : isProcessing ? 'Processing…' : 'Accept & Upload'}
                    </button>
                    <button onClick={closeOverlay} disabled={isUploading || isProcessing} className="ml-auto px-4 py-2 rounded border border-gray-500/40 text-gray-200 disabled:opacity-60">Close</button>
                  </div>
                </div>
              )}

              {isProcessing && !processedAudioUrl && (
                <div className="mt-4 p-4 rounded bg-purple-900/30 border border-purple-400/30 text-purple-100">
                  Processing… we are creating your song.
                </div>
              )}

              {processedAudioUrl && (
                <div className="mt-4 p-4 rounded bg-purple-900/30 border border-purple-400/30">
                  <div className="text-purple-100 font-semibold mb-3">Your song is ready!</div>
                  <audio src={processedAudioUrl} controls className="w-full mb-4" />
                  <div className="flex gap-2">
                    <button 
                      onClick={closeOverlay} 
                      className="px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700 transition-colors"
                    >
                      Done
                    </button>
                    <a 
                      href={processedAudioUrl} 
                      download="my-song.mp3"
                      className="px-4 py-2 rounded border border-purple-400/40 text-purple-200 hover:bg-purple-800/30 transition-colors"
                    >
                      Download
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
