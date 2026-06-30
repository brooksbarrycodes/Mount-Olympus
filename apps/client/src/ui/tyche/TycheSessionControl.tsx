import { useCallback, useEffect, useState } from "react";
import { agentApi, type TychePreflight, type TycheSessionStatus } from "@/net/agentApi";
import { fmtUsd } from "./format";

interface Props {
  session: TycheSessionStatus | null | undefined;
  busy: boolean;
  onRefresh: () => void;
}

function fmtCountdown(ms: number | null | undefined): string {
  if (ms == null) return "—";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}h ${m}m ${sec}s`;
}

export function TycheSessionControl({ session, busy, onRefresh }: Props) {
  const [preflight, setPreflight] = useState<TychePreflight | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmStop, setConfirmStop] = useState(false);

  const loadPreflight = useCallback(async () => {
    try {
      const p = await agentApi.tychePreflight();
      setPreflight(p);
      setError(null);
    } catch {
      setError("Preflight unavailable");
    }
  }, []);

  useEffect(() => {
    void loadPreflight();
    const t = setInterval(() => void loadPreflight(), 30_000);
    return () => clearInterval(t);
  }, [loadPreflight]);

  const active = session?.active ?? false;
  const ready = preflight?.ready ?? false;
  const sessionMode = preflight?.sessionMode ?? "sandbox";
  const isPaper = sessionMode === "paper";

  const start = async () => {
    setError(null);
    try {
      const r = await agentApi.tycheSessionStart();
      if (!r.ok) setError(String((r as { error?: string }).error ?? "Start failed"));
      await onRefresh();
    } catch (e) {
      setError(String(e));
    }
  };

  const stop = async () => {
    if (!confirmStop) {
      setConfirmStop(true);
      return;
    }
    setConfirmStop(false);
    try {
      await agentApi.tycheSessionStop();
      await onRefresh();
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <section className="tyche-desk-session">
      <div className="tyche-desk-session-head">
        <span className={`tyche-desk-pill ${isPaper ? "tyche-desk-pill--warn" : "tyche-desk-pill--sandbox"}`}>
          {isPaper ? "Paper — mock books" : "Sandbox — test funds"}
        </span>
        {active && (
          <span className="tyche-desk-session-countdown">
            {fmtCountdown(session?.remainingMs)} remaining
          </span>
        )}
      </div>

      <div className="tyche-desk-session-stats">
        <span>
          Orders {session?.ordersPlaced ?? 0}/{session?.ordersCap ?? "—"}
        </span>
        <span>
          Notional {fmtUsd(session?.notionalUsd ?? 0)} / {fmtUsd(session?.notionalCap ?? 0)}
        </span>
        <span className={ready ? "tyche-desk-pos" : "tyche-desk-neg"}>
          Preflight {ready ? "OK" : "NOT READY"}
        </span>
      </div>

      {preflight?.diagnostics && (
        <p className="tyche-desk-muted tyche-desk-session-diag">
          Kalshi: {preflight.diagnostics.kalshi.mappedCount ?? preflight.kalshiMarkets}/
          {preflight.diagnostics.kalshi.rawCount ?? "?"} mapped · ProphetX:{" "}
          {preflight.diagnostics.prophetx.mappedCount ?? preflight.prophetxMarkets}/
          {preflight.diagnostics.prophetx.rawCount ?? "?"} mapped
          {preflight.diagnostics.prophetx.eventsFound != null
            ? ` · ${preflight.diagnostics.prophetx.eventsFound} events`
            : null}
        </p>
      )}

      {!ready && preflight?.reasons?.length ? (
        <p className="tyche-desk-muted tyche-desk-session-reasons">{preflight.reasons.join(" · ")}</p>
      ) : null}

      {error && <p className="tyche-desk-error">{error}</p>}

      <div className="tyche-desk-session-actions">
        {!active ? (
          <button
            type="button"
            className="tyche-desk-btn tyche-desk-btn--start"
            disabled={busy || !ready}
            onClick={() => void start()}
          >
            START {isPaper ? "PAPER" : "SANDBOX"} SESSION
          </button>
        ) : (
          <button
            type="button"
            className="tyche-desk-btn tyche-desk-btn--stop"
            disabled={busy}
            onClick={() => void stop()}
          >
            {confirmStop ? "CONFIRM STOP" : "STOP SESSION"}
          </button>
        )}
      </div>
    </section>
  );
}
