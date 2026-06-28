import { agentApi } from "@/net/agentApi";

const MUTE_KEY = "oracle-voice-muted";

let queue: string[] = [];
let playing = false;
let currentAudio: HTMLAudioElement | null = null;
let currentUrl: string | null = null;

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function isOracleVoiceMuted(): boolean {
  return readMuted();
}

export function setOracleVoiceMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    /* ignore */
  }
  if (muted) stopOracleVoice();
}

export function stopOracleVoice(): void {
  queue = [];
  playing = false;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = "";
    currentAudio = null;
  }
  if (currentUrl) {
    URL.revokeObjectURL(currentUrl);
    currentUrl = null;
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
    const blob = await agentApi.oracleTts(text);
    const url = URL.createObjectURL(blob);
    currentUrl = url;
    const audio = new Audio(url);
    audio.volume = 1.1;
    currentAudio = audio;
    await new Promise<void>((resolve, reject) => {
      audio.onended = () => resolve();
      audio.onerror = () => reject(new Error("Audio playback failed"));
      void audio.play().catch(reject);
    });
  } catch (err) {
    console.warn("[oracleVoice] TTS failed:", err);
  } finally {
    if (currentUrl) {
      URL.revokeObjectURL(currentUrl);
      currentUrl = null;
    }
    currentAudio = null;
    playing = false;
    void playNext();
  }
}

export function speakOracle(text: string): void {
  if (readMuted() || !text.trim()) return;
  queue.push(text);
  if (!playing) void playNext();
}
