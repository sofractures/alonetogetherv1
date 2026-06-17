"use client";

import { useEffect, useMemo, useState } from "react";
import { InteractiveSkyline } from "@/components/ui/InteractiveSkyline";
import { ExploreMenu } from "@/components/ui/ExploreMenu";

interface SkylineMemory {
  id: string;
  text: string;
  prompt?: string | null;
  created_at: string;
}

const PROMPTS: string[] = [
  "Share a moment when music made you feel connected to others.",
  "Describe a time when a crowd felt like a single heartbeat.",
  "Share a memory that shaped you.",
  "Tell us about a moment when you felt the city listening with you.",
  "Share a memory of dancing where everyone moved as one.",
];

export default function SkylinePage() {
  const [memories, setMemories] = useState<string[]>([]);
  const [isLoadingMemories, setIsLoadingMemories] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [newMemoryIndex, setNewMemoryIndex] = useState<number | undefined>(undefined);
  // Optional event tag from the URL (?event=slug). When present, submissions made
  // here are labelled so they appear on that event's live display screen.
  const [eventId, setEventId] = useState<string | null>(null);

  const [showPromptModal, setShowPromptModal] = useState<boolean>(true);
  const [isIntroStep, setIsIntroStep] = useState<boolean>(true);
  const [currentPrompt, setCurrentPrompt] = useState<string>(PROMPTS[0]);
  const [inputValue, setInputValue] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  useEffect(() => {
    // Choose a random prompt on first mount
    if (PROMPTS.length > 0) {
      const idx = Math.floor(Math.random() * PROMPTS.length);
      setCurrentPrompt(PROMPTS[idx]);
    }

    // Read an optional event tag from the URL so on-the-day submissions (e.g. via a
    // QR code pointing at /skyline?event=summer-show-2026) can be tagged.
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

    void fetchSkylineMemories();
  }, []);

  const fetchSkylineMemories = async () => {
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

      setMemories(memoriesArray);
    } catch (err) {
      console.error(err);
      setLoadError(
        "Could not load skyline memories. The city awaits its first lights."
      );
      setMemories([]);
    } finally {
      setIsLoadingMemories(false);
    }
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
      const newText = data.memory?.text?.trim() ?? value;
      
      // Add the new memory and track its index for animation
      setMemories((prev) => {
        const newMemories = [...prev, newText];
        setNewMemoryIndex(newMemories.length - 1);
        return newMemories;
      });
      
      setInputValue("");
      setShowPromptModal(false);
      setIsIntroStep(false);
      setSubmitSuccess("Your memory has risen in the skyline.");
      
      // Clear the new memory highlight after animation
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

  // Clear success message after a short delay
  useEffect(() => {
    if (!submitSuccess) return;
    const timeout = setTimeout(() => setSubmitSuccess(null), 6000);
    return () => clearTimeout(timeout);
  }, [submitSuccess]);

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
      
      {/* Menu in top-right corner */}
      <div className="relative z-10">
        <ExploreMenu currentPage="skyline" />
      </div>

      {/* Memory count indicator */}
      <div className="absolute top-4 left-4 z-[2] text-xs font-mono text-white/50">
        {isLoadingMemories ? (
          "Loading memories..."
        ) : memories.length === 0 ? (
          "No memories yet"
        ) : (
          `${memories.length} ${memories.length === 1 ? 'memory' : 'memories'} in the skyline`
        )}
      </div>

      {/* Status messages */}
      {loadError && !isLoadingMemories && (
        <div className="absolute bottom-72 left-4 z-[2] text-xs font-mono text-white/50 max-w-xs">
          {loadError}
        </div>
      )}

      {submitSuccess && (
        <div className="absolute bottom-72 right-4 z-[2] text-xs font-mono text-white/70 max-w-xs text-right">
          {submitSuccess}
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

      {/* Add memory button (shown after modal is closed) */}
      {!showPromptModal && (
        <button
          onClick={() => {
            setShowPromptModal(true);
            setIsIntroStep(false); // Go straight to input
          }}
          className="absolute bottom-72 left-1/2 -translate-x-1/2 z-[3] px-4 py-2 rounded-md border border-white/30 bg-black/60 hover:bg-black/80 text-xs sm:text-sm font-mono text-white/80 hover:text-white transition-all"
        >
          + Add a memory
        </button>
      )}

      {/* Skyline modal flow: intro step → prompt + text step */}
      {showPromptModal && (
        <div className="fixed inset-0 z-[20] flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowPromptModal(false)}
          />
          <div className="relative max-w-lg w-full mx-4 rounded-xl border border-white/20 bg-black/80 backdrop-blur-md p-6 sm:p-8 text-white">
            {isIntroStep ? (
              <div className="space-y-4">
                <h2 className="text-lg sm:text-xl font-mono font-semibold">
                  Welcome to the skyline
                </h2>
                <p className="text-sm sm:text-base text-white/80">
                  This city grows with each memory shared. Your words become a building,
                  rising alongside others to form a collective skyline of experiences.
                </p>
                {memories.length > 0 && (
                  <p className="text-xs text-white/50">
                    {memories.length} {memories.length === 1 ? 'memory has' : 'memories have'} already shaped this city.
                  </p>
                )}
                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPromptModal(false)}
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
                      onClick={() => setShowPromptModal(false)}
                      className="text-xs sm:text-sm font-mono text-white/70 hover:text-white/90 underline underline-offset-4"
                    >
                      Cancel
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
