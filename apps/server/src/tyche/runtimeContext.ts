import { config, type TycheMode, type TycheStrategy } from "../config.ts";

let runtimeMode: TycheMode = config.tyche.mode;
let runtimeStrategy: TycheStrategy = config.tyche.strategy;
let sessionScanEnabled = false;

export function getRuntimeMode(): TycheMode {
  return runtimeMode;
}

export function setRuntimeMode(mode: TycheMode): void {
  runtimeMode = mode;
}

export function getRuntimeStrategy(): TycheStrategy {
  return runtimeStrategy;
}

export function setRuntimeStrategy(strategy: TycheStrategy): void {
  runtimeStrategy = strategy;
}

export function isSessionScanEnabled(): boolean {
  return sessionScanEnabled;
}

export function setSessionScanEnabled(on: boolean): void {
  sessionScanEnabled = on;
}

export function requiresLiveBooks(): boolean {
  return runtimeMode === "sandbox" || runtimeMode === "live";
}
