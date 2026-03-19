"use client";

import { useEffect, useState, useCallback } from "react";
import { InteractiveSkyline } from "@/components/ui/InteractiveSkyline";

interface SkylineMemory {
  id: string;
  text: string;
  prompt?: string | null;
  created_at: string;
}

const POLL_INTERVAL_MS = 45000; // 45 seconds

export default function SkylineDisplayPage() {
  const [memories, setMemories] = useState<string[]>([]);
  const [isLoadingMemories, setIsLoadingMemories] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [newMemoryIndex, setNewMemoryIndex] = useState<number | undefined>(
    undefined
  );

  const fetchSkylineMemories = useCallback(async () => {
    try {
      setIsLoadingMemories(true);
      setLoadError(null);

      const res = await fetch("/api/skyline-memories");
      if (!res.ok) {
        throw new Error("Failed to fetch skyline memories");
      }

      const data: { memories: SkylineMemory[] } = await res.json();
      const memoriesArray = (data.memories ?? [])
        .map((m) => (m.text || "").trim())
        .filter((t) => t.length > 0);

      setMemories((prev) => {
        const prevLen = prev.length;
        const nextLen = memoriesArray.length;

        if (nextLen > prevLen) {
          setNewMemoryIndex(nextLen - 1);
        }

        return memoriesArray;
      });
    } catch (err) {
      console.error(err);
      setLoadError(
        "Could not load skyline memories. The city awaits its first lights."
      );
      setMemories([]);
    } finally {
      setIsLoadingMemories(false);
    }
  }, []);

  useEffect(() => {
    void fetchSkylineMemories();
  }, [fetchSkylineMemories]);

  // Poll for new memories so the installation view grows as people submit
  useEffect(() => {
    const interval = setInterval(() => {
      void fetchSkylineMemories();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchSkylineMemories]);

  // Clear the new memory highlight after the scroll/animation window
  useEffect(() => {
    if (newMemoryIndex === undefined) return;
    const timeout = setTimeout(() => setNewMemoryIndex(undefined), 3000);
    return () => clearTimeout(timeout);
  }, [newMemoryIndex]);

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-black">
      {/* Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 w-full h-full object-cover z-0"
        style={{
          opacity: 0.6,
          pointerEvents: "none",
        }}
      >
        <source src="/assets/video_clip_skyline.mp4" type="video/mp4" />
      </video>

      {/* No ExploreMenu - clean kiosk/installation view */}

      {/* Optional subtle loading state */}
      {isLoadingMemories && memories.length === 0 && (
        <div className="absolute bottom-72 left-4 z-[2] text-xs font-mono text-white/50">
          Loading skyline...
        </div>
      )}
      {loadError && !isLoadingMemories && memories.length === 0 && (
        <div className="absolute bottom-72 left-4 z-[2] text-xs font-mono text-white/50 max-w-xs">
          {loadError}
        </div>
      )}

      {/* Skyline positioned at bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-[2] h-64 flex items-end pb-4">
        <InteractiveSkyline
          memories={memories}
          newMemoryIndex={newMemoryIndex}
          className="w-full h-full"
        />
      </div>
    </div>
  );
}
