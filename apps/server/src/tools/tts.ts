import { config, ttsIsLive } from "../config.ts";
import { recordCost } from "../treasury/ledger.ts";

const MAX_SPEECH_CHARS = 8000;

/** Strip markdown and normalize text for natural TTS. */
export function prepareTextForSpeech(text: string): string {
  let out = text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]+`/g, (m) => m.slice(1, -1))
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^\s*[-|]\s*$/gm, " ")
    .replace(/\|/g, " ")
    .replace(/#+\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (out.length <= MAX_SPEECH_CHARS) return out;

  const slice = out.slice(0, MAX_SPEECH_CHARS);
  const lastStop = Math.max(slice.lastIndexOf("."), slice.lastIndexOf("!"), slice.lastIndexOf("?"));
  return (lastStop > 200 ? slice.slice(0, lastStop + 1) : slice).trim();
}

function voiceIdFor(oppId: string): string {
  if (oppId === "oracle") return config.elevenlabs.oracleVoiceId;
  return config.elevenlabs.zeusVoiceId;
}

function estimateTtsCostUsd(charCount: number): number {
  return (charCount / 1000) * 0.3;
}

/** Convert text to mp3 bytes via ElevenLabs for any Opp voice. */
export async function speakOpp(oppId: string, text: string): Promise<Buffer> {
  if (!ttsIsLive()) {
    throw new Error("ElevenLabs not configured. Set ELEVENLABS_API_KEY in apps/server/.env");
  }

  const prepared = prepareTextForSpeech(text);
  if (!prepared) throw new Error("No speakable text");

  const voiceId = voiceIdFor(oppId);
  const url = new URL(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`);
  url.searchParams.set("output_format", "mp3_44100_128");

  async function request(withSpeed: boolean): Promise<Response> {
    return fetch(url.toString(), {
      method: "POST",
      headers: {
        "xi-api-key": config.elevenlabs.apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: prepared,
        model_id: config.elevenlabs.model,
        voice_settings: withSpeed
          ? { speed: config.elevenlabs.speed, stability: 0.5, similarity_boost: 0.75 }
          : { stability: 0.5, similarity_boost: 0.75 },
      }),
    });
  }

  let res = await request(true);
  if (!res.ok && config.elevenlabs.speed !== 1) {
    res = await request(false);
  }

  if (!res.ok) {
    let detail = `ElevenLabs TTS failed (${res.status})`;
    try {
      const err = (await res.json()) as { detail?: { message?: string } | string };
      if (typeof err.detail === "string") detail = err.detail;
      else if (err.detail?.message) detail = err.detail.message;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }

  const arrayBuffer = await res.arrayBuffer();
  const godId = oppId === "oracle" ? "oracle" : "zeus";
  try {
    recordCost({
      label: `ElevenLabs TTS (${oppId})`,
      amountUsd: estimateTtsCostUsd(prepared.length),
      category: "api",
      attributedGodId: godId,
      source: "auto",
      reference: `tts:${oppId}`,
    });
  } catch (err) {
    console.warn("[tts] treasury record failed:", err);
  }

  return Buffer.from(arrayBuffer);
}

export async function speakZeus(text: string): Promise<Buffer> {
  return speakOpp("zeus", text);
}

export async function speakOracle(text: string): Promise<Buffer> {
  return speakOpp("oracle", text);
}
