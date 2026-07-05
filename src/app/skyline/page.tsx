"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  InteractiveSkyline,
  type InteractiveSkylineHandle,
  type SkylineMemoryItem,
} from "@/components/ui/InteractiveSkyline";
import { ExploreMenu } from "@/components/ui/ExploreMenu";

interface SkylineMemory {
  id: string;
  text: string;
  prompt?: string | null;
  created_at: string;
}

type SkylineFilterId = "all" | "pilot" | "event2";

const SKYLINE_FILTER_ORDER: SkylineFilterId[] = ["all", "pilot", "event2"];

const SKYLINE_FILTERS: Record<
  SkylineFilterId,
  { label: string; since?: string; until?: string }
> = {
  all: {
    label: "All memories",
  },
  pilot: {
    label: "Pilot · 19 Mar",
    since: "2026-03-19T00:00:00Z",
    until: "2026-03-20T00:00:00Z",
  },
  event2: {
    label: "Event 2 · 27 Jun",
    since: "2026-06-27T00:00:00+01:00",
    until: "2026-06-28T00:00:00+01:00",
  },
};

const PROMPTS: string[] = [
  "Share a moment when music made you feel connected to others.",
  "Describe a time when a crowd felt like a single heartbeat.",
  "Share a memory that shaped you.",
  "Tell us about a moment when you felt the city listening with you.",
  "Share a memory of dancing where everyone moved as one.",
];

function buildFilterQuery(filterId: SkylineFilterId): string {
  const filter = SKYLINE_FILTERS[filterId];
  const params = new URLSearchParams();
  if (filter.since) params.set("since", filter.since);
  if (filter.until) params.set("until", filter.until);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

function formatMemoryDate(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function ScrollArrow({
  direction,
  onClick,
  disabled,
}: {
  direction: "left" | "right";
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`fixed top-1/2 -translate-y-1/2 z-[4] w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-full border border-white/35 bg-black/70 backdrop-blur-sm text-white/90 hover:bg-black/90 hover:text-white transition-all ${
        direction === "left" ? "left-3 sm:left-4" : "right-3 sm:right-4"
      } ${disabled ? "opacity-30 pointer-events-none" : "opacity-100"}`}
      aria-label={direction === "left" ? "Scroll left" : "Scroll right"}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {direction === "left" ? (
          <polyline points="15 18 9 12 15 6" />
        ) : (
          <polyline points="9 18 15 12 9 6" />
        )}
      </svg>
    </button>
  );
}

export default function SkylinePage() {
  const skylineRef = useRef<InteractiveSkylineHandle>(null);
  const [memories, setMemories] = useState<SkylineMemoryItem[]>([]);
  const [isLoadingMemories, setIsLoadingMemories] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [newMemoryIndex, setNewMemoryIndex] = useState<number | undefined>(
    undefined
  );
  const [activeFilter, setActiveFilter] = useState<SkylineFilterId>("all");
  const [trailingGapPx, setTrailingGapPx] = useState(320);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [visibleRange, setVisibleRange] = useState<{
    startIndex: number;
    endIndex: number;
    startDate?: string;
    endDate?: string;
  } | null>(null);

  const [eventId, setEventId] = useState<string | null>(null);

  const [showPromptModal, setShowPromptModal] = useState<boolean>(true);
  const [isIntroStep, setIsIntroStep] = useState<boolean>(true);
  const [currentPrompt, setCurrentPrompt] = useState<string>(PROMPTS[0]);
  const [inputValue, setInputValue] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const isExploring = !showPromptModal;

  const fetchSkylineMemories = useCallback(async (filterId: SkylineFilterId) => {
    try {
      setIsLoadingMemories(true);
      setLoadError(null);
      setNewMemoryIndex(undefined);

      const res = await fetch(`/api/skyline-memories${buildFilterQuery(filterId)}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error("Failed to fetch skyline memories");
      }

      const data: { memories: SkylineMemory[] } = await res.json();
      const memoriesArray: SkylineMemoryItem[] = (data.memories ?? [])
        .map((m) => ({
          text: (m.text || "").trim(),
          createdAt: m.created_at,
        }))
        .filter((m) => m.text.length > 0);

      setMemories(memoriesArray);
      setVisibleRange(null);
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
    if (PROMPTS.length > 0) {
      const idx = Math.floor(Math.random() * PROMPTS.length);
      setCurrentPrompt(PROMPTS[idx]);
    }

    if (typeof window !== "undefined") {
      const param = new URLSearchParams(window.location.search).get("event");
      if (param) {
        const slug = param
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9_-]/g, "")
          .slice(0, 64);
        if (slug) setEventId(slug);
      }
    }
  }, []);

  useEffect(() => {
    void fetchSkylineMemories(activeFilter);
  }, [activeFilter, fetchSkylineMemories]);

  useEffect(() => {
    const updateGap = () => {
      setTrailingGapPx(Math.max(200, Math.round(window.innerWidth * 0.35)));
    };
    updateGap();
    window.addEventListener("resize", updateGap);
    return () => window.removeEventListener("resize", updateGap);
  }, []);

  const openAddMemoryFlow = () => {
    setActiveFilter("all");
    setShowPromptModal(true);
    setIsIntroStep(false);
    setSubmitError(null);
    setValidationError(null);
  };

  const handleExploreFirst = () => {
    setShowPromptModal(false);
    setIsIntroStep(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError(null);
    setValidationError(null);
    setSubmitSuccess(null);

    const value = inputValue.trim();
    if (value.length < 5) {
      setValidationError(
        "Please share a bit more so your memory can shape the skyline."
      );
      return;
    }

    if (value.length > 1000) {
      setValidationError("Please keep your memory under 1000 characters.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/skyline-memories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: value,
          prompt: currentPrompt,
          ...(eventId ? { event_id: eventId } : {}),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const message =
          body?.error ||
          "Something went wrong saving your memory. Please try again.";
        setSubmitError(message);
        return;
      }

      const data: { memory: SkylineMemory } = await res.json();
      const newItem: SkylineMemoryItem = {
        text: data.memory?.text?.trim() ?? value,
        createdAt: data.memory?.created_at,
      };

      if (activeFilter === "all") {
        setMemories((prev) => {
          const newMemories = [...prev, newItem];
          setNewMemoryIndex(newMemories.length - 1);
          return newMemories;
        });
      } else {
        const prevCount = memories.length;
        const filterRes = await fetch(
          `/api/skyline-memories${buildFilterQuery(activeFilter)}`,
          { cache: "no-store" }
        );
        if (filterRes.ok) {
          const filterData: { memories: SkylineMemory[] } = await filterRes.json();
          const memoriesArray: SkylineMemoryItem[] = (filterData.memories ?? [])
            .map((m) => ({
              text: (m.text || "").trim(),
              createdAt: m.created_at,
            }))
            .filter((m) => m.text.length > 0);
          setMemories(memoriesArray);
          if (memoriesArray.length > prevCount) {
            setNewMemoryIndex(memoriesArray.length - 1);
          }
        }
      }

      setInputValue("");
      setShowPromptModal(false);
      setIsIntroStep(false);
      setSubmitSuccess("Your memory has risen in the skyline.");

      setTimeout(() => setNewMemoryIndex(undefined), 3000);
    } catch (err) {
      console.error(err);
      setSubmitError(
        "Unexpected error while saving your memory. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const combinedHelperText = useMemo(() => {
    if (validationError) return validationError;
    if (submitError) return submitError;
    return "Your words will become a building in the city.";
  }, [validationError, submitError]);

  useEffect(() => {
    if (!submitSuccess) return;
    const timeout = setTimeout(() => setSubmitSuccess(null), 6000);
    return () => clearTimeout(timeout);
  }, [submitSuccess]);

  const filterLabel = SKYLINE_FILTERS[activeFilter].label;

  const visibleRangeLabel = useMemo(() => {
    if (!visibleRange || memories.length === 0) return null;

    const start = formatMemoryDate(visibleRange.startDate);
    const end = formatMemoryDate(visibleRange.endDate);
    const position = `buildings ${visibleRange.startIndex + 1}–${visibleRange.endIndex + 1} of ${memories.length}`;

    if (start && end) {
      if (start === end) {
        return `On screen: ${start} · ${position}`;
      }
      return `On screen: ${start} – ${end} · ${position}`;
    }

    return `On screen: ${position}`;
  }, [visibleRange, memories.length]);

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-black">
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

      <div className="relative z-10">
        <ExploreMenu currentPage="skyline" />
      </div>

      {/* Explore mode: add memory + filters top-left */}
      {isExploring && (
        <div className="absolute top-4 left-4 z-[3] flex flex-col gap-2 max-w-xl pr-16">
          <button
            type="button"
            onClick={openAddMemoryFlow}
            className="self-start px-4 py-2 rounded-md border border-white/30 bg-black/60 hover:bg-black/80 text-xs sm:text-sm font-mono text-white/80 hover:text-white transition-all"
          >
            + Add a memory
          </button>

          <div
            className="flex flex-wrap gap-1.5"
            role="group"
            aria-label="Filter skyline memories by event"
          >
            {SKYLINE_FILTER_ORDER.map((id) => {
              const isActive = activeFilter === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveFilter(id)}
                  className={`px-3 py-1.5 rounded-md border text-xs font-mono transition-all ${
                    isActive
                      ? "border-white/50 bg-white/15 text-white"
                      : "border-white/20 bg-black/50 text-white/60 hover:text-white/80 hover:border-white/30"
                  }`}
                  aria-pressed={isActive}
                >
                  {SKYLINE_FILTERS[id].label}
                </button>
              );
            })}
          </div>

          <p className="text-xs font-mono text-white/50">
            {isLoadingMemories
              ? "Loading memories..."
              : memories.length === 0
              ? `No memories for ${filterLabel}`
              : `${memories.length} ${
                  memories.length === 1 ? "memory" : "memories"
                } · ${filterLabel}`}
          </p>
          {visibleRangeLabel && !isLoadingMemories && (
            <p className="text-xs font-mono text-white/40">{visibleRangeLabel}</p>
          )}
          {hasOverflow && !isLoadingMemories && (
            <p className="text-xs font-mono text-white/35">
              Scroll or use arrows to pan — older memories are to the left
            </p>
          )}
        </div>
      )}

      {isExploring && hasOverflow && (
        <>
          <ScrollArrow
            direction="left"
            onClick={() => skylineRef.current?.scrollOlder()}
            disabled={!canScrollLeft}
          />
          <ScrollArrow
            direction="right"
            onClick={() => skylineRef.current?.scrollNewer()}
            disabled={!canScrollRight}
          />
        </>
      )}

      {loadError && !isLoadingMemories && isExploring && (
        <div className="absolute bottom-[44vh] left-4 z-[2] text-xs font-mono text-white/50 max-w-xs">
          {loadError}
        </div>
      )}

      {submitSuccess && isExploring && (
        <div className="absolute bottom-[44vh] right-4 z-[2] text-xs font-mono text-white/70 max-w-xs text-right">
          {submitSuccess}
        </div>
      )}

      {/* Skyline strip: fixed height, buildings aligned to a shared baseline above safe area */}
      <div
        className="absolute left-0 right-0 z-[2] w-full min-w-0"
        style={{
          bottom: "max(2rem, env(safe-area-inset-bottom, 0px))",
          height: "min(420px, 44vh)",
          minHeight: "300px",
          paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 0px))",
        }}
      >
        <InteractiveSkyline
          ref={skylineRef}
          memories={memories}
          newMemoryIndex={newMemoryIndex}
          initialScrollToEnd
          trailingGapPx={trailingGapPx}
          hideBuiltInArrows
          cellWidth={11}
          cellHeight={14}
          fontSize={12}
          onScrollStateChange={({ canScrollLeft, canScrollRight, hasOverflow }) => {
            setCanScrollLeft(canScrollLeft);
            setCanScrollRight(canScrollRight);
            setHasOverflow(hasOverflow);
          }}
          onVisibleRangeChange={setVisibleRange}
          className="w-full min-w-0 h-full"
        />
      </div>

      {showPromptModal && (
        <div className="fixed inset-0 z-[20] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={handleExploreFirst}
          />
          <div className="relative max-w-lg w-full mx-4 rounded-xl border border-white/20 bg-black/80 backdrop-blur-md p-6 sm:p-8 text-white">
            {isIntroStep ? (
              <div className="space-y-4">
                <h2 className="text-lg sm:text-xl font-mono font-semibold">
                  Welcome to the skyline
                </h2>
                <p className="text-sm sm:text-base text-white/80">
                  This city grows with each memory shared. Your words become a
                  building, rising alongside others to form a collective skyline
                  of experiences.
                </p>
                {memories.length > 0 && (
                  <p className="text-xs text-white/50">
                    {memories.length}{" "}
                    {memories.length === 1 ? "memory has" : "memories have"}{" "}
                    already shaped this city.
                  </p>
                )}
                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleExploreFirst}
                    className="text-xs sm:text-sm font-mono text-white/70 hover:text-white/90 underline underline-offset-4"
                  >
                    Explore first
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsIntroStep(false)}
                    className="px-4 sm:px-5 py-2 rounded-md border border-white/40 bg-white/10 hover:bg-white/20 text-xs sm:text-sm font-mono font-semibold tracking-wide transition"
                  >
                    Share a memory
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-lg sm:text-xl font-mono font-semibold mb-3">
                  Add a memory to the skyline
                </h2>
                <p className="text-sm sm:text-base text-white/80 mb-4">
                  {currentPrompt}
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="w-full min-h-[120px] rounded-md border border-white/25 bg-black/40 text-sm sm:text-base text-white placeholder-white/40 p-3 resize-none focus:outline-none focus:ring-2 focus:ring-white/40"
                    placeholder="Type your memory here..."
                    autoFocus
                  />

                  <p className="text-xs sm:text-[13px] text-white/70 min-h-[1.5rem]">
                    {combinedHelperText}
                  </p>

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleExploreFirst}
                      className="text-xs sm:text-sm font-mono text-white/70 hover:text-white/90 underline underline-offset-4"
                    >
                      Explore first
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 sm:px-5 py-2 rounded-md border border-white/40 bg-white/10 hover:bg-white/20 text-xs sm:text-sm font-mono font-semibold tracking-wide transition disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? "Adding..." : "Add to skyline"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
