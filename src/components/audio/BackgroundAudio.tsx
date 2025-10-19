"use client";

import { useEffect } from "react";
import { getAudioController } from "@/lib/audio-context";

export default function BackgroundAudio() {
  useEffect(() => {
    const c = getAudioController();
    c.setSrc("/assets/fullsong.mp3");
    c.setVolume(0.5);
    c.play();
    return () => {
      // keep state; do not pause on unmount to allow seamless navigation
    };
  }, []);

  return null;
}


