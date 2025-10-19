"use client";

import { useEffect } from "react";
import { getAudioController } from "@/lib/audio-context";

export default function BackgroundAudio() {
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
    
    console.log("BackgroundAudio: Attempting to play audio");
    c.play().catch((error) => {
      console.error("BackgroundAudio: Failed to play audio", error);
    });
    
    return () => {
      // keep state; do not pause on unmount to allow seamless navigation
    };
  }, []);

  return null;
}


