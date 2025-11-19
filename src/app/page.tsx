"use client";
import AudioRecorder from "@/components/audio/AudioRecorder";
import MemoryGlobe from "@/components/3d/MemoryGlobe";
import MemoryPlayer from "@/components/audio/MemoryPlayer";
import LocationSelector from "@/components/location/LocationSelector";
import PlaybackModal from "@/components/flow/PlaybackModal";
import PinModal from "@/components/flow/PinModal";
import CelebrationScreen from "@/components/flow/CelebrationScreen";
import { WindowConstellation } from "@/components/ui/WindowConstellation";
import { useState, useEffect } from "react";
import { getAudioController, onRecordingStartFadeOutBackground, onRecordingStopResumeBackground } from "@/lib/audio-context";
import { useMemoryStore } from "@/store/memoryStore";
import { getBrowserLocation, getIPLocation, LocationData } from "@/lib/location";
import { MemoryForMap } from "@/types/memory";

type FlowState = 
  | 'idle'
  | 'recording'
  | 'processing'
  | 'playback'      // Show playback modal
  | 'pinning'       // Show pin modal
  | 'pinning-processing' // "Pinning your memory..."
  | 'celebrating'   // Show celebration screen
  | 'complete';     // On globe view

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
  // Spiral state management
  const [spiralOverlapId, setSpiralOverlapId] = useState<string | null>(null); // Track which spiral is open
  
  // New flow state management
  const [flowState, setFlowState] = useState<FlowState>('idle');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [_userName, setUserName] = useState<string | null>(null);
  const [pinnedMemoryId, setPinnedMemoryId] = useState<string | null>(null);
  const [pinnedLocation, setPinnedLocation] = useState<string | null>(null);
  
  // Memory store
  const { memories, fetchMemories, selectMemory, selectedMemory } = useMemoryStore();

  // Fetch memories on mount
  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  const handleStart = async () => {
    const c = getAudioController();
    c.setSrc("/assets/fullsong.mp3");
    c.setVolume(0.5);
    await c.play();
    // Show globe and welcome modal after title animation
    setHasStartedExploring(true);
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
      // Final refresh to ensure everything is up to date
      setTimeout(() => {
        fetchMemories();
      }, 500);
    }
    
    setProcessedAudioUrl(null);
    
    await onRecordingStopResumeBackground();
  };

  const onRecorderComplete = (blob: Blob, url: string) => {
    setPendingBlob(blob);
    setPendingUrl(url);
    setFlowState('idle'); // Reset flow state when new recording starts
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

  const proceedWithUpload = async (location: LocationData | null, email?: string, name?: string) => {
    if (!pendingBlob) return;
    
    try {
      // Ensure the recording overlay stays open for processing flow
      setIsOverlayOpen(true);
      setIsWelcomeOpen(false);
      setIsUploading(true);
      setUploadError(null);
      
      // Build multipart form data with file, location, email, and name
      const form = new FormData();
      form.append("file", pendingBlob, "recording.webm");
      if (location) {
        form.append("location", JSON.stringify(location));
        if (location.name) {
          form.append("display_name", location.name);
        }
      }
      if (email) {
        form.append("email", email);
      }
      if (name) {
        form.append("user_name", name);
      }
      
      const res = await fetch("/api/memory/record", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Upload failed");
      
      setPendingLocation(null); // Clear pending location after use
      setPinnedMemoryId(data.memoryId); // Store memory ID for later use
      
      if (!data.memoryId) {
        console.error('[v0] WARNING: Memory record was not created! memoryId is null');
      }
      
      // Begin processing step
      setIsProcessing(true);
      setFlowState('processing');
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
          setFlowState('playback'); // Move to playback modal
          
          // Immediately start refreshing memories so the new window appears
          // Refresh memories multiple times with increasing delays to catch DB updates
          fetchMemories().then(() => {
            const currentMemories = useMemoryStore.getState().memories;
            const newMemory = currentMemories.find(m => m.id === data.memoryId);
            if (newMemory) {
              setHighlightMemoryId(newMemory.id);
              selectMemory(newMemory.id);
              setTimeout(() => setHighlightMemoryId(null), 6000);
            }
          });
          
          setTimeout(() => {
            fetchMemories().then(() => {
              const mems = useMemoryStore.getState().memories;
              const found = mems.find(m => m.id === data.memoryId);
              if (found) {
                setHighlightMemoryId(found.id);
                selectMemory(found.id);
                setTimeout(() => setHighlightMemoryId(null), 6000);
              }
            });
          }, 1000);
          
          setTimeout(() => {
            fetchMemories().then(() => {
              const mems = useMemoryStore.getState().memories;
              const found = mems.find(m => m.id === data.memoryId);
              if (found) {
                setHighlightMemoryId(found.id);
                selectMemory(found.id);
                setTimeout(() => setHighlightMemoryId(null), 6000);
              }
            });
          }, 3000);
          
          setTimeout(() => {
            fetchMemories().then(() => {
              const mems = useMemoryStore.getState().memories;
              const found = mems.find(m => m.id === data.memoryId);
              if (found) {
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

  // New flow handlers
  const handleAddToGlobe = () => {
    setFlowState('pinning');
  };

  const handlePinMemory = async (data: { email: string; location: LocationData | null; name?: string }) => {
    setUserEmail(data.email);
    setUserName(data.name || null);
    // Store user email in localStorage for download permission checks
    if (typeof window !== 'undefined') {
      localStorage.setItem('userEmail', data.email);
    }
    setFlowState('pinning-processing');
    
    // Use the location that was provided (or null if skipped)
    // Don't auto-detect location if user explicitly skipped it
    const location = data.location;
    
    // Update the existing memory record with email, name, and location
    if (pinnedMemoryId) {
      try {
        const updateBody: {
          email: string;
          user_name?: string;
          location?: LocationData;
        } = {
          email: data.email,
        };
        
        if (data.name) {
          updateBody.user_name = data.name;
        }
        if (location) {
          updateBody.location = location;
        }
        
        const res = await fetch(`/api/memory/${pinnedMemoryId}/update`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateBody),
        });
        
        const result = await res.json();
        
        if (!res.ok) {
          throw new Error(result.error || 'Failed to update memory');
        }
        
        // Set the location string for display in celebration screen
        // Use the location that was actually entered
        if (location) {
          const locationStr = `${location.city || ''}${location.city && location.country ? ', ' : ''}${location.country || ''}`.trim();
          setPinnedLocation(locationStr || null);
        } else {
          setPinnedLocation(null);
        }
        
        // Refresh memories to show the updated pin
        await fetchMemories();
        
        // Move to celebration screen
        setFlowState('celebrating');
      } catch (error) {
        console.error('Error pinning memory:', error);
        setUploadError('Failed to pin memory. Please try again.');
        setFlowState('pinning');
      }
    } else {
      // If we don't have a memory ID yet, create it now with all the data
      await proceedWithUpload(location, data.email, data.name);
    }
  };

  const handleDownload = () => {
    if (processedAudioUrl) {
      const link = document.createElement('a');
      link.href = processedAudioUrl;
      link.download = `alone-together-${pinnedMemoryId || 'memory'}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleExploreGlobe = () => {
    setFlowState('complete');
    setIsOverlayOpen(false);
    setHasStartedExploring(true);
    
    // Highlight the new memory
    if (pinnedMemoryId) {
      setHighlightMemoryId(pinnedMemoryId);
      setTimeout(() => setHighlightMemoryId(null), 6000);
    }
    
    // Refresh memories one more time
    fetchMemories();
  };

  const handleCreateAnother = () => {
    // Reset everything for a new recording
    setFlowState('idle');
    setPendingBlob(null);
    setPendingUrl(null);
    setProcessedAudioUrl(null);
    setUserEmail(null);
    setUserName(null);
    setPinnedMemoryId(null);
    setPinnedLocation(null);
    setIsOverlayOpen(false);
    setIsWelcomeOpen(true);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      {/* 3D Scene - Only visible after user clicks "Start Exploring" */}
      {hasStartedExploring && (
        <>
          <div 
            className="absolute inset-0 bg-black"
            style={{ 
              pointerEvents: 'auto',
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
              autoRotate={true}
              highlightId={highlightMemoryId || undefined}
              restoreSpiralId={spiralOverlapId && !isMemoryPlayerOpen ? spiralOverlapId : null}
              onMemoryClick={(id) => {
                selectMemory(id);
                setIsMemoryPlayerOpen(true);
              }}
              onSpiralStateChange={(isOpen, overlapId) => {
                setSpiralOverlapId(isOpen ? overlapId : null);
              }}
            />
          </div>

          {/* Header Section - Top Left */}
          <div className="absolute top-0 left-0 z-10 p-4 md:p-6 max-w-2xl pointer-events-none">
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-2 uppercase">
              Alone Together
            </h1>
          </div>

          {/* Instructions - Bottom Left */}
          <div className="absolute bottom-0 left-0 z-10 p-4 md:p-6 pointer-events-none">
            <p className="text-xs text-muted-foreground">
              Drag to rotate • Scroll to zoom • Click to listen
            </p>
          </div>
        </>
      )}
      
      {/* Animated Title Screen - shown on initial load */}
      {!hasStartedExploring && (
        <div className="absolute inset-0 z-20 bg-black">
          <WindowConstellation onStart={handleStart} />
        </div>
      )}
      
      {/* Content overlays */}
      <div 
        className="relative z-10 flex flex-col items-center justify-center min-h-screen"
        style={{ pointerEvents: (isWelcomeOpen || isOverlayOpen) ? 'auto' : 'none' }}
      >
        {isWelcomeOpen && (
          <div className="fixed inset-0 z-40 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={() => setIsWelcomeOpen(false)} />
            <div className="relative z-10 w-full max-w-xl mx-4 rounded-xl border border-purple-400/30 bg-gray-900/80 backdrop-blur p-6 text-center">
              <h2 className="text-white text-2xl font-semibold mb-2">Welcome to Alone Together</h2>
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
              {isProcessing && !processedAudioUrl ? (
                // Simple processing view - hide everything else
                <div className="p-4 rounded bg-purple-900/30 border border-purple-400/30 text-purple-100 text-center">
                  Processing… we are creating your song.
                </div>
              ) : (
                <>
                  <div className="text-sm text-gray-300 mb-1">Prompt:</div>
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
                          onClick={() => proceedWithUpload(null)} 
                          disabled={isUploading || isProcessing || flowState !== 'idle'} 
                          className="px-4 py-2 rounded bg-purple-600 text-white disabled:opacity-60"
                        >
                          {isUploading ? 'Uploading…' : isProcessing ? 'Processing…' : 'Accept & Upload'}
                        </button>
                        <button onClick={closeOverlay} disabled={isUploading || isProcessing} className="ml-auto px-4 py-2 rounded border border-gray-500/40 text-gray-200 disabled:opacity-60">Close</button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Old flow - only show if not in new flow */}
              {processedAudioUrl && flowState === 'idle' && (
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
              
              {/* Pinning processing state */}
              {flowState === 'pinning-processing' && (
                <div className="mt-4 p-4 rounded bg-purple-900/30 border border-purple-400/30 text-center">
                  <div className="text-purple-100 font-semibold mb-2">Pinning your memory...</div>
                  <div className="text-gray-400 text-sm">Adding your window to the globe</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Memory Player Modal */}
      <MemoryPlayer
        memory={selectedMemory}
        isOpen={isMemoryPlayerOpen}
        onClose={() => {
          setIsMemoryPlayerOpen(false);
          selectMemory(null);
          // If spiral was open, it will be restored by MemoryGlobe's useEffect
        }}
      />
      
      {/* Location Selector Modal (old flow) */}
      {showLocationSelector && (
        <LocationSelector
          onLocationSelected={handleLocationSelected}
          onCancel={() => setShowLocationSelector(false)}
          initialLocation={pendingLocation}
        />
      )}

      {/* New Flow Modals */}
      
      {/* Playback Modal - Step 7 */}
      <PlaybackModal
        audioUrl={processedAudioUrl || ''}
        isOpen={flowState === 'playback' && !!processedAudioUrl}
        onAddToGlobe={handleAddToGlobe}
        onClose={() => {
          // Allow closing to go back, but encourage adding to globe
          if (confirm('Are you sure? You can add your memory to the globe and get your download link.')) {
            setFlowState('idle');
          }
        }}
      />

      {/* Pin Modal - Step 8 */}
      <PinModal
        isOpen={flowState === 'pinning'}
        onPin={handlePinMemory}
        onCancel={() => {
          setFlowState('playback'); // Go back to playback
        }}
        initialLocation={pendingLocation}
      />

      {/* Celebration Screen - Step 10 */}
      <CelebrationScreen
        isOpen={flowState === 'celebrating'}
        email={userEmail || ''}
        location={pinnedLocation || undefined}
        onDownload={handleDownload}
        onExploreGlobe={handleExploreGlobe}
        onCreateAnother={handleCreateAnother}
      />
    </div>
  );
}
