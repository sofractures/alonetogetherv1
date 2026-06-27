"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { InteractiveSkyline } from "@/components/ui/InteractiveSkyline";

interface SkylineMemory {
  id: string;
  text: string;
  prompt?: string | null;
  created_at: string;
}

// How often the display screen checks for newly submitted memories.
const POLL_INTERVAL_MS = 12000;

// Patron credits shown as a scrolling marquee across the top of the display.
const PATRON_CREDITS =
  "Alone Together is made possible by a core group of patrons.  \u00B7  Executive Producer C.Y. Lee  \u00B7  Supported by Carl Tyingco + Tom Merry";

// Event start cutoff. The live display shows every memory created at/after this
// time, regardless of how it was tagged — so anything entered on the main
// skyline page during the event appears here. Update this for each new event.
const EVENT_START_ISO = "2026-06-26T00:00:00+01:00";

/**
 * Display-only skyline for live events.
 *
 * Shows all memories created since EVENT_START_ISO (regardless of event tag),
 * polling so new submissions rise live throughout the event. There is no
 * submission UI here — this view is intended for projection.
 */
export default function SkylineLivePage() {
  const [items, setItems] = useState<SkylineMemory[]>([]);
  const [newMemoryIndex, setNewMemoryIndex] = useState<number | undefined>(undefined);
  const [hasLoaded, setHasLoaded] = useState<boolean>(false);

  // Track ids we've already rendered so polls can detect genuinely new memories.
  const knownIdsRef = useRef<Set<string>>(new Set());
  const clearHighlightRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchMemories = useCallback(async () => {
    try {
      // Show everything created since the event start, regardless of event tag,
      // so memories entered on the main skyline page during the event appear here.
      const qs = `?since=${encodeURIComponent(EVENT_START_ISO)}`;
      const res = await fetch(`/api/skyline-memories${qs}`, { cache: "no-store" });
      if (!res.ok) return;

      const data: { memories: SkylineMemory[] } = await res.json();
      const fresh = (data.memories ?? []).filter(
        (m) => (m.text || "").trim().length > 0
      );

      const known = knownIdsRef.current;
      const hadAny = known.size > 0;
      const newOnes = fresh.filter((m) => !known.has(m.id));

      setItems(fresh);

      // Only animate/scroll-to-newest after the initial load, when new memories arrive.
      if (hadAny && newOnes.length > 0) {
        setNewMemoryIndex(fresh.length - 1);
        if (clearHighlightRef.current) clearTimeout(clearHighlightRef.current);
        clearHighlightRef.current = setTimeout(() => setNewMemoryIndex(undefined), 3000);
      }

      knownIdsRef.current = new Set(fresh.map((m) => m.id));
    } catch (err) {
      console.error("Live skyline fetch failed:", err);
    } finally {
      setHasLoaded(true);
    }
  }, []);

  // Initial load + polling so new submissions rise live throughout the event.
  useEffect(() => {
    void fetchMemories();
    const interval = setInterval(() => void fetchMemories(), POLL_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      if (clearHighlightRef.current) clearTimeout(clearHighlightRef.current);
    };
  }, [fetchMemories]);

  const memoryTexts = items.map((m) => m.text.trim());

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-black">
      {/* Video background for visual consistency with the public skyline */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 w-full h-full object-cover z-0"
        style={{ opacity: 0.6, pointerEvents: "none" }}
      >
        <source src="/assets/video_clip_skyline.mp4" type="video/mp4" />
      </video>

      {/* Patron credits — continuous marquee across the top of the screen */}
      <div className="absolute top-0 left-0 right-0 z-[3] overflow-hidden bg-black/30 backdrop-blur-sm border-b border-white/10 py-2">
        <div className="credits-track whitespace-nowrap will-change-transform">
          {/* Two copies enable a seamless, gapless loop */}
          <span className="text-xs sm:text-sm font-mono tracking-[0.15em] uppercase text-white/70 px-8">
            {PATRON_CREDITS}
          </span>
          <span
            className="text-xs sm:text-sm font-mono tracking-[0.15em] uppercase text-white/70 px-8"
            aria-hidden="true"
          >
            {PATRON_CREDITS}
          </span>
        </div>
        <style jsx>{`
          .credits-track {
            display: inline-block;
            animation: credits-scroll 40s linear infinite;
          }
          @keyframes credits-scroll {
            0% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(-50%);
            }
          }
          @media (prefers-reduced-motion: reduce) {
            .credits-track {
              animation: none;
            }
          }
        `}</style>
      </div>

      {/* Minimal display chrome: subtle live count (offset below the credits bar) */}
      <div className="absolute top-12 left-4 z-[2] text-xs font-mono text-white/50">
        {!hasLoaded
          ? "Loading memories…"
          : memoryTexts.length === 0
          ? "The city awaits its first memory"
          : `${memoryTexts.length} ${
              memoryTexts.length === 1 ? "memory" : "memories"
            } in the skyline`}
      </div>

      {/* Skyline anchored at the bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-[2] h-64 flex items-end pb-4">
        <InteractiveSkyline
          memories={memoryTexts}
          newMemoryIndex={newMemoryIndex}
          className="w-full h-full"
        />
      </div>
    </div>
  );
}
