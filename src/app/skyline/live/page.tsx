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

/**
 * Display-only skyline for live events.
 *
 * Reads an optional event tag from the URL (?event=slug) and shows only that
 * event's memories, polling so new submissions rise live throughout the day.
 * There is no submission UI here — this view is intended for projection.
 */
export default function SkylineLivePage() {
  const [items, setItems] = useState<SkylineMemory[]>([]);
  const [newMemoryIndex, setNewMemoryIndex] = useState<number | undefined>(undefined);
  const [eventId, setEventId] = useState<string | null>(null);
  const [eventResolved, setEventResolved] = useState<boolean>(false);
  const [hasLoaded, setHasLoaded] = useState<boolean>(false);

  // Track ids we've already rendered so polls can detect genuinely new memories.
  const knownIdsRef = useRef<Set<string>>(new Set());
  const clearHighlightRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Resolve the event tag from the URL once on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const param = new URLSearchParams(window.location.search).get("event");
    if (param) {
      const slug = param
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "")
        .slice(0, 64);
      setEventId(slug || null);
    }
    setEventResolved(true);
  }, []);

  const fetchMemories = useCallback(async () => {
    try {
      const qs = eventId ? `?event=${encodeURIComponent(eventId)}` : "";
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
  }, [eventId]);

  // Initial load + polling. Waits for the event tag to resolve to avoid a flicker
  // of the full archive before the event filter is applied.
  useEffect(() => {
    if (!eventResolved) return;

    void fetchMemories();
    const interval = setInterval(() => void fetchMemories(), POLL_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      if (clearHighlightRef.current) clearTimeout(clearHighlightRef.current);
    };
  }, [eventResolved, fetchMemories]);

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

      {/* Minimal display chrome: subtle live count */}
      <div className="absolute top-4 left-4 z-[2] text-xs font-mono text-white/50">
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
