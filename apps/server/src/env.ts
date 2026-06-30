/** Read the first non-empty env var from a list (supports Vercel dashboard names). */
export function env(...keys: string[]): string {
  for (const key of keys) {
    const v = process.env[key];
    if (v !== undefined && v !== "") return v;
  }
  return "";
}

export function envNum(key: string, fallback: number): number {
  const v = process.env[key];
  if (v === undefined || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function envBool(key: string, fallback: boolean): boolean {
  const v = process.env[key];
  if (v === undefined || v === "") return fallback;
  return v === "true" || v === "1";
}

/** Kalshi / ProphetX keys pasted into Vercel (PascalCase dashboard names). */
export function vercelTycheKeysPresent(): boolean {
  return Boolean(
    env("KALSHI_API_KEY", "KalshiDemoKey") &&
      env("KALSHI_PRIVATE_KEY", "KalshiDemoPrivateKey", "KALSHI_PRIVATE_KEY_PATH") &&
      env("PROPHETX_ACCESS_KEY", "ProphetXSandboxAccessKey") &&
      env("PROPHETX_SECRET_KEY", "ProphetXSandboxSecretKey"),
  );
}

export function vercelClaudeKeyPresent(): boolean {
  return Boolean(env("ANTHROPIC_API_KEY", "ClaudeAPIKey"));
}

export function vercelElevenLabsKeyPresent(): boolean {
  return Boolean(env("ELEVENLABS_API_KEY", "ElevenLabsAPIKey"));
}

export function normalizePem(v: string): string {
  if (!v) return v;
  return v.replace(/\\n/g, "\n").trim();
}

export function isVercelRuntime(): boolean {
  return Boolean(process.env.VERCEL);
}
