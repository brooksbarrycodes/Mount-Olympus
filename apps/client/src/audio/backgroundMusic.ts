/** Served by Vite from repo-root `audio/` (see vite.config.ts). */
export const BG_MUSIC_URL = "/audio/bg-music.wav";

const MUTE_KEY = "olympus-music-muted";
const VOLUME = 0.22;

let audio: HTMLAudioElement | null = null;

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

function tryPlay(): void {
  if (!audio || readMuted()) return;
  void audio.play().catch(() => {
    /* blocked until user gesture — retry handlers will run */
  });
}

/** Start looping ambient music. Returns cleanup for React unmount. */
export function startBackgroundMusic(): () => void {
  if (audio) {
    tryPlay();
    return stopBackgroundMusic;
  }

  audio = new Audio(BG_MUSIC_URL);
  audio.loop = true;
  audio.volume = readMuted() ? 0 : VOLUME;

  tryPlay();

  const onGesture = () => {
    tryPlay();
  };
  window.addEventListener("pointerdown", onGesture, { once: true });
  window.addEventListener("keydown", onGesture, { once: true });

  return stopBackgroundMusic;
}

export function stopBackgroundMusic(): void {
  if (audio) {
    audio.pause();
    audio.src = "";
    audio = null;
  }
}

export function isBackgroundMusicMuted(): boolean {
  return readMuted();
}

export function setBackgroundMusicMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    /* ignore */
  }
  if (!audio) return;
  audio.volume = muted ? 0 : VOLUME;
  if (muted) audio.pause();
  else tryPlay();
}
