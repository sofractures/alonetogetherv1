export type AudioController = {
  element: HTMLAudioElement | null;
  isReady: boolean;
  readonly isPlaying: boolean;
  currentTime: number;
  volume: number;
  savedTime: number; // Store playback position when pausing
  play: () => Promise<void>;
  pause: () => void;
  fadeOutAndPause: (ms?: number) => Promise<void>;
  fadeOut: (ms?: number) => Promise<void>;
  fadeIn: (targetVolume?: number, ms?: number) => Promise<void>;
  resumeFromSaved: () => Promise<void>;
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

  let isReady = false;
  let volume = 0.5; // default 50%
  let savedTime = 0; // Store position for resume

  async function play() {
    if (!element) {
      console.log("AudioController: No element available for play");
      return;
    }
    try {
      console.log("AudioController: Attempting to play audio, current src:", element.src);
      await element.play();
      console.log("AudioController: Successfully started playing");
    } catch (error) {
      console.error("AudioController: Failed to play audio", error);
      // Autoplay may fail; ignoring per user preference (no fallback UI)
    }
  }

  function pause() {
    if (!element) return;
    console.log("AudioController: Pausing audio");
    element.pause();
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

  // Fade out and then pause - important for mobile where audio at volume 0 still uses resources
  async function fadeOutAndPause(ms = 600) {
    if (!element) return;
    // Save current position before pausing
    savedTime = element.currentTime;
    console.log("AudioController: Fading out and pausing, saving position:", savedTime);
    await fadeOut(ms);
    pause();
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

  // Resume from saved position with fade in
  async function resumeFromSaved() {
    if (!element) return;
    console.log("AudioController: Resuming from saved position:", savedTime);
    // Restore position if we have one saved
    if (savedTime > 0) {
      element.currentTime = savedTime;
    }
    element.volume = 0; // Start at 0 for fade in
    await play();
    await fadeIn(volume, 600);
  }

  // Create controller with getters for dynamic properties
  const ctrl: AudioController = {
    element,
    isReady,
    // Use getter to always return actual playing state from the element
    get isPlaying() {
      return element ? !element.paused : false;
    },
    currentTime: 0,
    volume,
    savedTime: 0,
    play,
    pause,
    fadeOut,
    fadeOutAndPause,
    fadeIn,
    resumeFromSaved,
    setVolume,
    setSrc,
  };

  controller = ctrl;

  if (element) {
    element.addEventListener("canplay", () => {
      if (controller) controller.isReady = true;
      isReady = true;
    });
    element.addEventListener("timeupdate", () => {
      if (controller && element) controller.currentTime = element.currentTime;
    });
    // Track play/pause events for debugging
    element.addEventListener("play", () => {
      console.log("AudioController: Element play event fired");
    });
    element.addEventListener("pause", () => {
      console.log("AudioController: Element pause event fired");
    });
  }

  return controller;
}

// Called when user starts recording - fade out and pause background music
export async function onRecordingStartFadeOutBackground() {
  const c = getAudioController();
  console.log("onRecordingStartFadeOutBackground: Starting fade out, isPlaying:", c.isPlaying);
  await c.fadeOutAndPause(800);
  console.log("onRecordingStartFadeOutBackground: Fade out complete, isPlaying:", c.isPlaying);
}

// Called when recording overlay closes - resume background music
export async function onRecordingStopResumeBackground() {
  const c = getAudioController();
  console.log("onRecordingStopResumeBackground: Resuming background music");
  await c.resumeFromSaved();
  console.log("onRecordingStopResumeBackground: Resume complete, isPlaying:", c.isPlaying);
}

// Called when user opens memory player - fade out and pause background music
export async function onMemoryPlaybackStartMuteBackground() {
  const c = getAudioController();
  console.log("onMemoryPlaybackStartMuteBackground: Starting fade out, isPlaying:", c.isPlaying);
  // IMPORTANT: Must pause on mobile, not just fade to 0
  await c.fadeOutAndPause(400);
  console.log("onMemoryPlaybackStartMuteBackground: Fade out complete, isPlaying:", c.isPlaying);
}

// Called when user closes memory player - resume background music
export async function onMemoryPlaybackStopUnmuteBackground() {
  const c = getAudioController();
  console.log("onMemoryPlaybackStopUnmuteBackground: Resuming background music");
  await c.resumeFromSaved();
  console.log("onMemoryPlaybackStopUnmuteBackground: Resume complete, isPlaying:", c.isPlaying);
}

