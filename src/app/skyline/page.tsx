"use client";

import { useEffect, useMemo, useState } from "react";
import { MemorySkyline } from "@/components/ui/MemorySkyline";
import { ExploreMenu } from "@/components/ui/ExploreMenu";
import { memoriesText } from "@/data/memories";

interface SkylineMemory {
  id: string;
  text: string;
  prompt?: string | null;
  created_at: string;
}

const PROMPTS: string[] = [
  "Share a moment when music made you feel connected to others.",
  "Describe a time when a crowd felt like a single heartbeat.",
  "Recall a night when a song made you feel less alone.",
  "Tell us about a moment when you felt the city listening with you.",
  "Share a memory of dancing where everyone moved as one.",
];

export default function SkylinePage() {
  const [memoriesString, setMemoriesString] = useState<string>(memoriesText);
  const [isLoadingMemories, setIsLoadingMemories] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showPromptModal, setShowPromptModal] = useState<boolean>(true);
  const [currentPrompt, setCurrentPrompt] = useState<string>(PROMPTS[0]);
  const [inputValue, setInputValue] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    // Choose a random prompt on first mount
    if (PROMPTS.length > 0) {
      const idx = Math.floor(Math.random() * PROMPTS.length);
      setCurrentPrompt(PROMPTS[idx]);
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
      const dynamicText = (data.memories ?? [])
        .map((m) => (m.text || "").trim())
        .filter((t) => t.length > 0)
        .join("\n");

      if (dynamicText.length > 0) {
        setMemoriesString(`${memoriesText}\n${dynamicText}`);
      } else {
        setMemoriesString(memoriesText);
      }
    } catch (err) {
      console.error(err);
      setLoadError(
        "Could not load all skyline memories. The city may be missing some lights."
      );
      setMemoriesString(memoriesText);
    } finally {
      setIsLoadingMemories(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError(null);
    setValidationError(null);

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
      setMemoriesString((prev) =>
        prev && prev.length > 0 ? `${prev}\n${newText}` : newText
      );
      setInputValue("");
      setShowPromptModal(false);
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
    return "Your words will become part of the city's lights.";
  }, [validationError, submitError]);

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
      
      {/* Dark overlay for better contrast */}
      <div
        className="fixed inset-0 bg-black/30 z-[1]"
        style={{ pointerEvents: "none" }}
      />
      
      {/* Menu in top-right corner */}
      <div className="relative z-10">
        <ExploreMenu currentPage="skyline" />
      </div>

      {/* Optional subtle status text */}
      {isLoadingMemories && (
        <div className="absolute bottom-64 left-4 z-[2] text-xs font-mono text-white/60">
          Gathering memories for the skyline...
        </div>
      )}
      {loadError && !isLoadingMemories && (
        <div className="absolute bottom-64 left-4 z-[2] text-xs font-mono text-white/50 max-w-xs">
          {loadError}
        </div>
      )}

      {/* Skyline positioned at bottom (matching landing page style) */}
      <div className="absolute bottom-0 left-0 right-0 z-[2] h-64 flex items-end overflow-x-auto overflow-y-hidden touch-pan-x scroll-smooth pb-4">
        {/* Allow horizontal scrolling across the skyline, especially on mobile */}
        <div className="min-w-full">
          <MemorySkyline memories={memoriesString} className="w-full" />
        </div>
      </div>

      {/* Prompt modal */}
      {showPromptModal && (
        <div className="fixed inset-0 z-[20] flex items-center justify-center bg-black/70">
          <div className="max-w-lg w-full mx-4 rounded-xl border border-white/20 bg-black/80 backdrop-blur-md p-6 sm:p-8 text-white">
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
                  Skip for now
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 sm:px-5 py-2 rounded-md border border-white/40 bg-white/10 hover:bg-white/20 text-xs sm:text-sm font-mono font-semibold tracking-wide transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Sharing..." : "Share memory"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

