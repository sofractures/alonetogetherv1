export type AudioController = {
  element: HTMLAudioElement | null;
  isReady: boolean;
  isPlaying: boolean;
  currentTime: number;
  volume: number;
  play: () => Promise<void>;
  pause: () => void;
  fadeOut: (ms?: number) => Promise<void>;
  fadeIn: (targetVolume?: number, ms?: number) => Promise<void>;
  setVolume: (v: number) => void;
  setSrc: (src: string) => void;
};

let controller: AudioController | null = null;

export function getAudioController(): AudioController {
  if (controller) return controller;

  const element = typeof window !== "undefined" ? new Audio() : null;
  if (element) {
    element.preload = "auto";
    element.loop = true;
  }

  const isReady = false;
  let isPlaying = false;
  let volume = 0.5; // default 50%

  async function play() {
    if (!element) {
      console.log("AudioController: No element available for play");
      return;
    }
    try {
      console.log("AudioController: Attempting to play audio, current src:", element.src);
      await element.play();
      isPlaying = true;
      console.log("AudioController: Successfully started playing");
    } catch (error) {
      console.error("AudioController: Failed to play audio", error);
      // Autoplay may fail; ignoring per user preference (no fallback UI)
    }
  }

  function pause() {
    if (!element) return;
    element.pause();
    isPlaying = false;
  }

  function setVolume(v: number) {
    volume = Math.max(0, Math.min(1, v));
    if (element) element.volume = volume;
  }

  function setSrc(src: string) {
    if (!element) {
      console.log("AudioController: No element available for setSrc");
      return;
    }
    console.log("AudioController: Setting src to:", src);
    element.src = src;
  }

  async function fadeOut(ms = 600) {
    if (!element) return;
    const start = element.volume;
    const startTime = performance.now();
    return new Promise<void>((resolve) => {
      function step(now: number) {
        if (!element) {
          resolve();
          return;
        }
        const t = Math.min(1, (now - startTime) / ms);
        const v = start * (1 - t);
        element.volume = v;
        if (t < 1) requestAnimationFrame(step);
        else {
          element.volume = 0;
          resolve();
        }
      }
      requestAnimationFrame(step);
    });
  }

  async function fadeIn(targetVolume = volume, ms = 600) {
    if (!element) return;
    const end = Math.max(0, Math.min(1, targetVolume));
    const start = element.volume;
    const startTime = performance.now();
    return new Promise<void>((resolve) => {
      function step(now: number) {
        if (!element) {
          resolve();
          return;
        }
        const t = Math.min(1, (now - startTime) / ms);
        const v = start + (end - start) * t;
        element.volume = v;
        if (t < 1) requestAnimationFrame(step);
        else {
          element.volume = end;
          resolve();
        }
      }
      requestAnimationFrame(step);
    });
  }

  controller = {
    element,
    isReady,
    isPlaying,
    currentTime: 0,
    volume,
    play,
    pause,
    fadeOut,
    fadeIn,
    setVolume,
    setSrc,
  };

  if (element) {
    element.addEventListener("canplay", () => {
      if (controller) controller.isReady = true;
    });
    element.addEventListener("timeupdate", () => {
      if (controller && element) controller.currentTime = element.currentTime;
    });
  }

  return controller;
}

export async function onRecordingStartFadeOutBackground() {
  const c = getAudioController();
  await c.fadeOut(800);
  c.pause();
}

export async function onRecordingStopResumeBackground() {
  const c = getAudioController();
  await c.fadeIn(0.5, 800);
  c.play();
}

export async function onMemoryPlaybackStartMuteBackground() {
  const c = getAudioController();
  await c.fadeOut(400);
}

export async function onMemoryPlaybackStopUnmuteBackground() {
  const c = getAudioController();
  await c.fadeIn(0.5, 400);
}

