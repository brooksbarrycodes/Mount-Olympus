import type { Mission } from "@/net/agentApi";
import { agentApi } from "@/net/agentApi";
import { dueFromDays, dueFromHours } from "./missionTime";

const STORAGE_KEY = "olympus-missions-v1";

interface CachePayload {
  missions: Mission[];
  syncedAt: string | null;
}

function readCache(): CachePayload {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { missions: [], syncedAt: null };
    const data = JSON.parse(raw) as CachePayload;
    if (!Array.isArray(data.missions)) return { missions: [], syncedAt: null };
    return data;
  } catch {
    return { missions: [], syncedAt: null };
  }
}

function writeCache(missions: Mission[]): void {
  try {
    const payload: CachePayload = { missions, syncedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

/** Active missions from local cache (works with server offline). */
export function loadActiveMissions(): Mission[] {
  return readCache()
    .missions.filter((m) => !m.completedAt)
    .sort(compareMissions);
}

export function loadAllCachedMissions(): Mission[] {
  return readCache().missions.sort(compareMissions);
}

function compareMissions(a: Mission, b: Mission): number {
  if (a.dueAt && b.dueAt) return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
  if (a.dueAt) return -1;
  if (b.dueAt) return 1;
  return b.id - a.id;
}

export function upsertMission(mission: Mission): void {
  const cache = readCache();
  const idx = cache.missions.findIndex((m) => m.id === mission.id);
  if (idx >= 0) cache.missions[idx] = mission;
  else cache.missions.push(mission);
  writeCache(cache.missions);
}

export function addLocalMission(opts: {
  title: string;
  description?: string;
  dueInDays?: number;
  dueInHours?: number;
  dueAt?: string | null;
}): Mission {
  let dueAt: string | null = opts.dueAt ?? null;
  if (!dueAt && opts.dueInHours != null) dueAt = dueFromHours(opts.dueInHours);
  else if (!dueAt && opts.dueInDays != null) dueAt = dueFromDays(opts.dueInDays);

  const mission: Mission = {
    id: -Date.now(),
    title: opts.title.trim(),
    description: opts.description ?? "",
    dueAt,
    completedAt: null,
    createdBy: "user",
    linearIssueId: null,
    priority: 0,
    createdAt: new Date().toISOString(),
  };
  upsertMission(mission);
  return mission;
}

export function completeLocalMission(id: number): void {
  const cache = readCache();
  const m = cache.missions.find((x) => x.id === id);
  if (!m) return;
  m.completedAt = new Date().toISOString();
  writeCache(cache.missions);
}

/** Fetch from server when up; merge with offline-only missions; persist absolute dueAt. */
export async function syncMissionsFromServer(): Promise<Mission[]> {
  const { missions } = await agentApi.missions();
  const localOnly = readCache().missions.filter((m) => m.id < 0 && !m.completedAt);
  const merged = [...missions];
  for (const local of localOnly) {
    if (!merged.some((m) => m.id === local.id)) merged.push(local);
  }
  writeCache(merged);
  return merged.filter((m) => !m.completedAt).sort(compareMissions);
}

export async function createMissionWithCache(body: {
  title: string;
  description?: string;
  dueInDays?: number;
  dueInHours?: number;
}): Promise<Mission> {
  try {
    const { mission } = await agentApi.createMission(body);
    upsertMission(mission);
    return mission;
  } catch {
    return addLocalMission(body);
  }
}

export async function completeMissionWithCache(id: number): Promise<void> {
  try {
    const { mission } = await agentApi.completeMission(id);
    upsertMission(mission);
  } catch {
    completeLocalMission(id);
  }
}
