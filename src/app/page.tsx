"use client";
import AudioRecorder from "@/components/audio/AudioRecorder";
import MemoryGlobe from "@/components/3d/MemoryGlobe";
import MemoryPlayer from "@/components/audio/MemoryPlayer";
import LocationSelector from "@/components/location/LocationSelector";
import { useState, useEffect } from "react";
import { getAudioController, onRecordingStartFadeOutBackground, onRecordingStopResumeBackground } from "@/lib/audio-context";
import { useMemoryStore } from "@/store/memoryStore";
import { getBrowserLocation, getIPLocation, LocationData } from "@/lib/location";
import { MemoryForMap } from "@/types/memory";

export default function Home() {
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
  const [hasStartedExploring, setHasStartedExploring] = useState(false);
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [processedAudioUrl, setProcessedAudioUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMemoryPlayerOpen, setIsMemoryPlayerOpen] = useState(false);
  const [highlightMemoryId, setHighlightMemoryId] = useState<string | null>(null);
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [pendingLocation, setPendingLocation] = useState<LocationData | null>(null);
  const [selectedMemoryPlaylist, setSelectedMemoryPlaylist] = useState<MemoryForMap[] | undefined>(undefined);
  const [spiralOverlapId, setSpiralOverlapId] = useState<string | null>(null); // Track which spiral is open
  
  // Memory store
  const { memories, fetchMemories, selectMemory, selectedMemory, isLoading, error } = useMemoryStore();
  const [showDebug, setShowDebug] = useState(false);

  // Fetch memories on mount
  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);
  
  // Debug: Log memories
  useEffect(() => {
    console.log('Page: Current memories count:', memories.length, memories);
  }, [memories]);
  
  // Toggle debug panel with 'D' key
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'd' || e.key === 'D') {
        setShowDebug(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

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
    
    // If we just finished processing, mark as exploring (window should already be visible from earlier refresh)
    if (processedAudioUrl) {
      setHasStartedExploring(true); // Hide title/Start button overlay
      console.log('[v0] Closing overlay after processing - window should already be visible');
      // Final refresh to ensure everything is up to date
      setTimeout(() => {
        console.log('[v0] Final refresh after closing overlay...');
        fetchMemories();
      }, 500);
    }
    
    setProcessedAudioUrl(null);
    
    await onRecordingStopResumeBackground();
  };

  const onRecorderComplete = (blob: Blob, url: string) => {
    setPendingBlob(blob);
    setPendingUrl(url);
  };

  const handleLocationSelected = async (location: LocationData | null) => {
    setShowLocationSelector(false);
    
    // If location is null, try to get it automatically
    if (!location) {
      try {
        location = await getBrowserLocation();
        if (!location) {
          location = await getIPLocation();
        }
      } catch (error) {
        console.warn('Location fetch error:', error);
      }
    }
    
    setPendingLocation(location);
    // Continue with upload
    await proceedWithUpload(location);
  };

  const proceedWithUpload = async (location: LocationData | null) => {
    if (!pendingBlob) return;
    
    try {
      // Ensure the recording overlay stays open for processing flow
      setIsOverlayOpen(true);
      setIsWelcomeOpen(false);
      setIsUploading(true);
      setUploadError(null);
      
      // Build multipart form data with file and optional location
      const form = new FormData();
      form.append("file", pendingBlob, "recording.webm");
      if (location) {
        form.append("location", JSON.stringify(location));
        if (location.name) {
          form.append("display_name", location.name);
        }
      }
      
      const res = await fetch("/api/memory/record", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Upload failed");
      
      console.log('[v0] Memory record created:', {
        memoryId: data.memoryId,
        path: data.path,
        hasLocation: !!location,
        location: location
      });
      setPendingLocation(null); // Clear pending location after use
      
      if (!data.memoryId) {
        console.error('[v0] WARNING: Memory record was not created! memoryId is null');
        console.error('[v0] This means the memory cannot be updated with audio_url after processing');
      }
      
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
          
          console.log('[v0] Processing complete for memoryId:', data.memoryId);
          console.log('[v0] Processed audio URL:', pdata.signedUrl);
          console.log('[v0] Processed path:', pdata.processedPath);
          console.log('[v0] Your song is ready! Starting memory refresh to show new window...');
          
          // Immediately start refreshing memories so the new window appears while user sees "Your song is ready"
          // Refresh memories multiple times with increasing delays to catch DB updates
          fetchMemories().then(() => {
            console.log('[v0] Initial fetch complete. Checking if new memory is in store...');
            const currentMemories = useMemoryStore.getState().memories;
            const newMemory = currentMemories.find(m => m.id === data.memoryId);
            if (newMemory) {
              console.log('[v0] ✅ New memory found in store:', {
                id: newMemory.id,
                location: newMemory.location,
                hasAudio: !!newMemory.audioUrl,
                audioUrl: newMemory.audioUrl
              });
              // Highlight and preselect the newly created memory
              setHighlightMemoryId(newMemory.id);
              selectMemory(newMemory.id);
              // Don't auto-open player - let user click Done first to go to globe
              // They can then double-click the highlighted window to play
              // Remove highlight after a few seconds
              setTimeout(() => setHighlightMemoryId(null), 6000);
            } else {
              console.warn('[v0] ⚠️ New memory NOT found in store. Available IDs:', currentMemories.map(m => m.id));
            }
          });
          
          setTimeout(() => {
            console.log('[v0] Refresh 1: 1 second delay');
            fetchMemories().then(() => {
              const mems = useMemoryStore.getState().memories;
              const found = mems.find(m => m.id === data.memoryId);
              console.log('[v0] After 1s refresh:', found ? '✅ Found' : '❌ Not found');
              if (found) {
                setHighlightMemoryId(found.id);
                selectMemory(found.id);
                setTimeout(() => setHighlightMemoryId(null), 6000);
              }
            });
          }, 1000);
          
          setTimeout(() => {
            console.log('[v0] Refresh 2: 3 second delay');
            fetchMemories().then(() => {
              const mems = useMemoryStore.getState().memories;
              const found = mems.find(m => m.id === data.memoryId);
              console.log('[v0] After 3s refresh:', found ? '✅ Found' : '❌ Not found');
              if (found) {
                setHighlightMemoryId(found.id);
                selectMemory(found.id);
                setTimeout(() => setHighlightMemoryId(null), 6000);
              }
            });
          }, 3000);
          
          setTimeout(() => {
            console.log('[v0] Refresh 3: 5 second delay');
            fetchMemories().then(() => {
              const mems = useMemoryStore.getState().memories;
              const found = mems.find(m => m.id === data.memoryId);
              console.log('[v0] After 5s refresh:', found ? '✅ Found' : '❌ Not found');
              if (!found) {
                console.error('[v0] ❌ CRITICAL: New memory still not found after 5 seconds!');
                console.error('[v0] Expected memoryId:', data.memoryId);
                console.error('[v0] Available memories:', mems.map(m => ({ id: m.id, location: m.location, hasAudio: !!m.audioUrl })));
              } else {
                setHighlightMemoryId(found.id);
                selectMemory(found.id);
                setTimeout(() => setHighlightMemoryId(null), 6000);
              }
            });
          }, 5000);
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
      <div 
        className="absolute inset-0"
        style={{ 
          pointerEvents: hasStartedExploring ? 'auto' : 'none',
          zIndex: 0,
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0
        }}
      >
        <MemoryGlobe 
          memories={memories} 
          autoRotate={!hasStartedExploring}
          highlightId={highlightMemoryId || undefined}
          restoreSpiralId={spiralOverlapId && !isMemoryPlayerOpen ? spiralOverlapId : null}
          onMemoryClick={(id, overlappingMemories, keepSpiralOpen) => {
            console.log('[v0] Opening modal for memory:', id, 'with playlist:', overlappingMemories?.length || 0, 'keepSpiralOpen:', keepSpiralOpen);
            selectMemory(id);
            setSelectedMemoryPlaylist(overlappingMemories);
            setIsMemoryPlayerOpen(true);
            // If keepSpiralOpen is true, we're in spiral mode - track the spiral state
            // The spiral state is already tracked in MemoryGlobe, we just need to know it exists
          }}
          onSpiralStateChange={(isOpen, overlapId) => {
            console.log('[v0] Spiral state changed:', isOpen, 'overlapId:', overlapId);
            setSpiralOverlapId(isOpen ? overlapId : null);
          }}
        />
      </div>
      
      {/* Debug Panel Toggle Button */}
      <button
        onClick={() => setShowDebug(!showDebug)}
        className="fixed top-4 right-4 z-50 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-xs font-mono shadow-lg"
        title="Press 'D' or click to toggle debug panel"
      >
        {showDebug ? 'Hide Debug' : 'Show Debug (D)'}
      </button>
      
      {/* Debug Panel - Toggle with 'D' key or button */}
      {showDebug && (
        <div className="fixed top-16 right-4 z-50 bg-black/90 text-white p-4 rounded-lg text-xs font-mono max-w-md max-h-96 overflow-auto shadow-xl border border-purple-400/30">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-purple-300">Debug Info</h3>
            <button onClick={() => setShowDebug(false)} className="text-gray-400 hover:text-white">✕</button>
          </div>
          <div className="space-y-1">
            <div>Memories: {memories.length}</div>
            <div>Loading: {isLoading ? 'Yes' : 'No'}</div>
            <div className={error ? 'text-red-400' : ''}>
              Error: {error || 'None'}
            </div>
            {error && (
              <div className="mt-2 pt-2 border-t border-gray-600 text-red-300 text-xs break-all">
                <div className="font-bold">API Error Details:</div>
                <div>{error}</div>
              </div>
            )}
            <div>Has Started Exploring: {hasStartedExploring ? 'Yes' : 'No'}</div>
            <div>Processing: {isProcessing ? 'Yes' : 'No'}</div>
            <div>Processed Audio: {processedAudioUrl ? 'Yes' : 'No'}</div>
            <div className="mt-2 pt-2 border-t border-gray-600">
              <div className="font-bold mb-1">Memory Details:</div>
              {memories.length > 0 ? (
                memories.map((m) => (
                  <div key={m.id} className="ml-2 text-xs">
                    • {m.location || 'No location'} (ID: {m.id.substring(0, 8)}...)
                    <br />
                    &nbsp;&nbsp;Lat: {m.latitude}, Lng: {m.longitude}, Audio: {m.audioUrl ? 'Yes' : 'No'}
                  </div>
                ))
              ) : (
                <div className="text-yellow-400">No memories found</div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Content overlays */}
      <div 
        className="relative z-10 flex flex-col items-center justify-center min-h-screen"
        style={{ pointerEvents: (isWelcomeOpen || isOverlayOpen || (!hasStartedExploring && !isWelcomeOpen && !isOverlayOpen)) ? 'auto' : 'none' }}
      >
        {/* Title and Start button - only show on initial landing, before user starts exploring */}
        {!hasStartedExploring && !isWelcomeOpen && !isOverlayOpen && (
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
                <button onClick={() => { setIsWelcomeOpen(false); setHasStartedExploring(true); }} className="px-5 py-2 rounded border border-gray-500/40 text-gray-200">Explore</button>
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
                    <button 
                      onClick={() => setShowLocationSelector(true)} 
                      disabled={isUploading || isProcessing} 
                      className="px-4 py-2 rounded bg-purple-600 text-white disabled:opacity-60"
                    >
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
                  <div className="flex gap-2 justify-center">
                    <button 
                      onClick={closeOverlay} 
                      className="px-6 py-2 rounded bg-purple-600 text-white hover:bg-purple-700 transition-colors font-semibold flex-1"
                    >
                      Done
                    </button>
                    <a 
                      href={processedAudioUrl} 
                      download="my-song.mp3"
                      className="px-6 py-2 rounded border border-purple-400/40 text-purple-200 hover:bg-purple-800/30 transition-colors text-center flex-1"
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
      
      {/* Memory Player Modal */}
      <MemoryPlayer
        memory={selectedMemory}
        memories={selectedMemoryPlaylist}
        isOpen={isMemoryPlayerOpen}
        onClose={() => {
          console.log('[v0] Closing memory player modal');
          setIsMemoryPlayerOpen(false);
          selectMemory(null);
          setSelectedMemoryPlaylist(undefined);
        }}
      />
      
      {/* Location Selector Modal */}
      {showLocationSelector && (
        <LocationSelector
          onLocationSelected={handleLocationSelected}
          onCancel={() => setShowLocationSelector(false)}
          initialLocation={pendingLocation}
        />
      )}
    </div>
  );
}
