import { useCallback, useEffect, useState } from "react";
import { agentApi, type TycheStatus, type TycheTradeBundle } from "@/net/agentApi";
import { TycheAccountBar } from "./tyche/TycheAccountBar";
import { TycheActivityFeed } from "./tyche/TycheActivityFeed";
import { TycheBundlePanel } from "./tyche/TycheBundlePanel";
import { TycheOpportunityBlotter } from "./tyche/TycheOpportunityBlotter";
import { TycheSessionControl } from "./tyche/TycheSessionControl";
import { TycheStatusRail } from "./tyche/TycheStatusRail";

interface Props {
  onClose: () => void;
}

export function TycheTradingFloor({ onClose }: Props) {
  const [status, setStatus] = useState<TycheStatus | null>(null);
  const [trades, setTrades] = useState<TycheTradeBundle[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [s, t] = await Promise.all([agentApi.tycheStatus(), agentApi.tycheTrades()]);
      setStatus(s);
      setTrades(t.trades);
      setError(null);
    } catch {
      setError("Agent server offline. Start it with: npm run dev:server");
    }
  }, []);

  useEffect(() => {
    void refresh();
    const es = agentApi.tycheStream({
      onTrade: (trade) => {
        setTrades((prev) => {
          const rest = prev.filter((x) => x.id !== trade.id);
          return [trade, ...rest].slice(0, 50);
        });
        void refresh();
      },
      onStatus: (s) => setStatus(s),
    });
    return () => es.close();
  }, [refresh]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } catch {
      /* refresh surfaces errors */
    }
    await refresh();
    setBusy(false);
  };

  return (
    <div className="tyche-desk-backdrop" onClick={onClose}>
      <div className="tyche-desk-shell" onClick={(e) => e.stopPropagation()}>
        <header className="tyche-desk-header">
          <div>
            <p className="tyche-desk-eyebrow">Temple of Fortune · Cross-Venue Arb</p>
            <h2>Tyche Trading Desk</h2>
            <p className="tyche-desk-sub">Kalshi YES + ProphetX NO · math-only hedges · fake money only</p>
          </div>
          <div className="tyche-desk-header-actions">
            <span className="tyche-desk-pill">{status?.mode ?? "…"}</span>
            <span className="tyche-desk-pill">{status?.strategy?.replace(/_/g, " ") ?? "…"}</span>
            {status?.paused && <span className="tyche-desk-pill tyche-desk-pill--warn">PAUSED</span>}
            <button type="button" className="tyche-desk-btn tyche-desk-btn--ghost" onClick={onClose}>
              Close (Esc)
            </button>
          </div>
        </header>

        {error && <p className="tyche-desk-error">{error}</p>}

        <TycheSessionControl session={status?.session} busy={busy} onRefresh={refresh} />
        <TycheAccountBar status={status} />

        <div className="tyche-desk-body">
          <TycheStatusRail
            status={status}
            busy={busy}
            onPause={() => act(() => agentApi.tychePause(!(status?.paused ?? false)))}
            onStrategy={(s) => act(() => agentApi.tycheStrategy(s))}
            onMode={(m) => act(() => agentApi.tycheMode(m))}
            onScan={() => act(() => agentApi.tycheScan())}
          />
          <div className="tyche-desk-main">
            <TycheOpportunityBlotter opportunities={status?.opportunities ?? []} venueHealth={status?.venueHealth} />
            <TycheBundlePanel trades={trades} />
            <TycheActivityFeed />
          </div>
        </div>
      </div>
    </div>
  );
}
