"use client";

import { useEffect, useState } from "react";
import { getAudioController } from "@/lib/audio-context";

export default function BackgroundAudio() {
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  useEffect(() => {
    const c = getAudioController();
    console.log("BackgroundAudio: Initializing audio controller", c);
    
    c.setSrc("/assets/fullsong.mp3");
    c.setVolume(0.5);
    
    // Add event listeners for debugging
    if (c.element) {
      c.element.addEventListener("loadstart", () => console.log("Audio: loadstart"));
      c.element.addEventListener("canplay", () => console.log("Audio: canplay"));
      c.element.addEventListener("canplaythrough", () => console.log("Audio: canplaythrough"));
      c.element.addEventListener("play", () => console.log("Audio: play"));
      c.element.addEventListener("pause", () => console.log("Audio: pause"));
      c.element.addEventListener("error", (e) => console.error("Audio error:", e));
      c.element.addEventListener("abort", () => console.log("Audio: abort"));
    }
    
    // Try to play immediately (will fail due to autoplay policy)
    console.log("BackgroundAudio: Attempting to play audio");
    c.play().catch((error) => {
      console.log("BackgroundAudio: Autoplay blocked, waiting for user interaction");
    });

    // Set up user interaction handler
    const handleUserInteraction = async () => {
      if (!hasUserInteracted) {
        console.log("BackgroundAudio: User interaction detected, starting audio");
        setHasUserInteracted(true);
        try {
          await c.play();
          console.log("BackgroundAudio: Audio started successfully after user interaction");
        } catch (error) {
          console.error("BackgroundAudio: Still failed to play after interaction", error);
        }
        // Remove event listeners after first interaction
        document.removeEventListener("click", handleUserInteraction);
        document.removeEventListener("touchstart", handleUserInteraction);
        document.removeEventListener("keydown", handleUserInteraction);
      }
    };

    // Add event listeners for user interaction
    document.addEventListener("click", handleUserInteraction);
    document.addEventListener("touchstart", handleUserInteraction);
    document.addEventListener("keydown", handleUserInteraction);
    
    return () => {
      // Clean up event listeners
      document.removeEventListener("click", handleUserInteraction);
      document.removeEventListener("touchstart", handleUserInteraction);
      document.removeEventListener("keydown", handleUserInteraction);
    };
  }, [hasUserInteracted]);

  return null;
}


