"use client";
import AudioRecorder from "@/components/audio/AudioRecorder";
import { useState } from "react";
import { getAudioController, onRecordingStartFadeOutBackground, onRecordingStopResumeBackground } from "@/lib/audio-context";

export default function Home() {
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // Removed uploadedPath (unused)
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedPath, setProcessedPath] = useState<string | null>(null);
  const [processedSignedUrl, setProcessedSignedUrl] = useState<string | null>(null);
  const [showPlayback, setShowPlayback] = useState(false);

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
      const form = new FormData();
      form.append("file", pendingBlob, "recording.webm");
      const res = await fetch("/api/memory/record", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Upload failed");
      // TEMP: surface upload diagnostics
      console.log('upload response', data);
      if (typeof window !== 'undefined') {
        const diag = data?.diagnostics;
        const msg = `Uploaded to: ${data?.path || 'unknown'}\nListCount: ${diag?.listCount ?? 'n/a'}\nHas Signed URL: ${diag?.signedUrl ? 'yes' : 'no'}`;
        alert(msg);
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
          // Surface error clearly in UI for production debugging
          const msg = pdata?.error || 'Processing failed';
          setUploadError(msg);
          // eslint-disable-next-line no-alert
          alert(`Processing error: ${msg}`);
          throw new Error(msg);
        }
        setProcessedPath(pdata.processedPath);
        if (pdata.signedUrl) setProcessedSignedUrl(pdata.signedUrl);
        setShowPlayback(true);
      } finally {
        setIsProcessing(false);
      }
      // Keep overlay to show playback modal
    } catch (e) {
      const message = e instanceof Error ? e.message : "Upload failed";
      setUploadError(message);
    } finally {
      setIsUploading(false);
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Alone Together
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            A modern React application built with Next.js, TypeScript, and Tailwind CSS. 
            Ready for your next great idea.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200">
              Get Started
            </button>
            <button className="bg-white hover:bg-gray-50 text-gray-900 font-semibold py-3 px-6 rounded-lg border border-gray-300 transition-colors duration-200 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-white dark:border-gray-600">
              Learn More
            </button>
          </div>
        </div>

        {/* Hero with Start button */}
        <div className="mt-16 max-w-2xl mx-auto text-center">
          <button onClick={handleStart} className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200">
            Start
          </button>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Fast Development</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Built with Next.js 15 and React 19 for optimal performance and developer experience.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Type Safe</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Full TypeScript support with strict type checking for reliable code.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Responsive Design</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Beautiful UI with Tailwind CSS that works perfectly on all devices.
            </p>
          </div>
        </div>
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
                if (isUploading || isProcessing) return;
                closeOverlay();
              }}
            />
            <div className="relative z-10 w-full max-w-lg mx-4 rounded-xl border border-purple-400/30 bg-gray-900/80 backdrop-blur p-5">
              <div className="text-sm text-gray-300 mb-1">Record your memory</div>
              <div className="text-lg font-semibold text-white mb-4">Share a time when you felt a part of something bigger than you</div>

              {!pendingBlob && (
                <AudioRecorder onComplete={onRecorderComplete} onStartRecording={onRecordingStartFadeOutBackground} />
              )}

              {pendingBlob && (
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

              {isProcessing && (
                <div className="mt-4 p-4 rounded bg-purple-900/30 border border-purple-400/30 text-purple-100">
                  Processing… we are creating your song.
                </div>
              )}
            </div>
          </div>
        )}

        {showPlayback && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={() => setShowPlayback(false)} />
            <div className="relative z-10 w-full max-w-lg mx-4 rounded-xl border border-purple-400/30 bg-gray-900/80 backdrop-blur p-5">
              <div className="text-lg font-semibold text-white mb-3">Your song is ready</div>
              {processedSignedUrl ? (
                <audio src={processedSignedUrl} controls className="w-full" />
              ) : processedPath ? (
                <div className="text-gray-300 text-sm">Processed path: {processedPath}</div>
              ) : (
                <div className="text-gray-300 text-sm">No processed file available.</div>
              )}
              <div className="flex gap-2 mt-4 items-center">
                {processedSignedUrl && (
                  <a href={processedSignedUrl} download className="px-4 py-2 rounded bg-purple-600 text-white">Download</a>
                )}
                <button
                  onClick={() => {
                    // Placeholder for pinning to map; to be wired when 3D map is implemented
                    // eslint-disable-next-line no-alert
                    alert('Pinned to map (placeholder).');
                  }}
                  className="px-4 py-2 rounded border border-purple-400/40 text-purple-200"
                >
                  Pin to Map
                </button>
                <button onClick={() => { setShowPlayback(false); setIsOverlayOpen(false); setPendingBlob(null); setPendingUrl(null); }} className="ml-auto px-4 py-2 rounded border border-gray-500/40 text-gray-200">Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
