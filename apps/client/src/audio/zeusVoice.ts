import { agentApi } from "@/net/agentApi";

const MUTE_KEY = "zeus-voice-muted";

let queue: string[] = [];
let playing = false;
let audioCtx: AudioContext | null = null;
let onError: ((msg: string) => void) | null = null;

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function isZeusVoiceMuted(): boolean {
  return readMuted();
}

export function setZeusVoiceMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    /* ignore */
  }
  if (muted) stopZeusVoice();
}

/** Optional UI hook for surfacing TTS failures (e.g. toast). */
export function setZeusVoiceErrorHandler(fn: ((msg: string) => void) | null): void {
  onError = fn;
}

function reportError(msg: string): void {
  console.error("[zeusVoice]", msg);
  onError?.(msg);
}

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioCtx;
}

/**
 * Call synchronously from a user gesture (open dialog, Send, unmute, test voice).
 * Unlocks Web Audio — required before async TTS playback.
 */
export function primeZeusAudio(): void {
  if (readMuted()) return;
  const ctx = getAudioContext();
  if (ctx.state === "suspended") void ctx.resume();
}

export function stopZeusVoice(): void {
  queue = [];
  playing = false;
}

async function playBlob(blob: Blob): Promise<void> {
  const bytes = await blob.arrayBuffer();
  if (!bytes.byteLength) throw new Error("Empty audio from server");

  const typed =
    blob.type && blob.type !== "application/octet-stream"
      ? blob
      : new Blob([bytes], { type: "audio/mpeg" });

  // Primary path: Web Audio (handles async TTS best after AudioContext.resume())
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") await ctx.resume();
    const buffer = await ctx.decodeAudioData(bytes.slice(0));
    await new Promise<void>((resolve, reject) => {
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(ctx.destination);
      src.onended = () => resolve();
      try {
        src.start(0);
      } catch (err) {
        reject(err);
      }
    });
    return;
  } catch (webAudioErr) {
    console.warn("[zeusVoice] Web Audio failed, trying HTMLAudio:", webAudioErr);
  }

  // Fallback: HTMLAudioElement with explicit load wait
  const url = URL.createObjectURL(typed);
  try {
    const audio = new Audio();
    audio.volume = 1.15;
    await new Promise<void>((resolve, reject) => {
      const onReady = () => {
        cleanup();
        resolve();
      };
      const onFail = () => {
        cleanup();
        reject(new Error("Audio load failed"));
      };
      const cleanup = () => {
        audio.removeEventListener("canplaythrough", onReady);
        audio.removeEventListener("error", onFail);
      };
      audio.addEventListener("canplaythrough", onReady, { once: true });
      audio.addEventListener("error", onFail, { once: true });
      audio.src = url;
      audio.load();
    });
    await audio.play();
    await new Promise<void>((resolve) => {
      audio.onended = () => resolve();
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function playNext(): Promise<void> {
  if (playing || queue.length === 0 || readMuted()) {
    playing = false;
    return;
  }

  playing = true;
  const text = queue.shift()!;

  try {
    const blob = await agentApi.zeusTts(text);
    await playBlob(blob);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    reportError(msg);
  } finally {
    playing = false;
    void playNext();
  }
}

/** Queue Zeus speech (ElevenLabs via server). No-op when muted. */
export function speakZeus(text: string): void {
  if (readMuted() || !text.trim()) return;
  queue.push(text);
  if (!playing) void playNext();
}

/** Play a short clip to verify voice works (call from a click handler). */
export async function testZeusVoice(): Promise<void> {
  primeZeusAudio();
  setZeusVoiceMuted(false);
  stopZeusVoice();
  queue.push("Zeus online.");
  if (!playing) await playNext();
}
