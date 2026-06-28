import { useCallback, useEffect, useState } from "react";
import { agentApi, type TycheStatus, type TycheTradeBundle } from "@/net/agentApi";

interface Props {
  onClose: () => void;
}

function fmtUsd(n: number): string {
  return "$" + n.toFixed(2);
}

function statusClass(status: string): string {
  if (status === "pending") return "tyche-row tyche-row--pending";
  if (status === "success") return "tyche-row tyche-row--success";
  return "tyche-row tyche-row--failed";
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
    const es = agentApi.tycheStream((trade) => {
      setTrades((prev) => {
        const rest = prev.filter((x) => x.id !== trade.id);
        return [trade, ...rest].slice(0, 50);
      });
      void refresh();
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

  const bal = status?.balances;
  const kHealth = status?.venueHealth?.kalshi;
  const pHealth = status?.venueHealth?.prophetx;

  return (
    <div className="dash-backdrop" onClick={onClose}>
      <div className="dash-panel tyche-panel" onClick={(e) => e.stopPropagation()}>
        <header className="tyche-header">
          <div>
            <h2>Tyche — Cross-Venue Arb</h2>
            <p className="tyche-sub">
              Hedge scanner · Kalshi ↔ ProphetX · math-only, no predictions
            </p>
          </div>
          <div className="tyche-controls">
            <span className="tyche-pill">{status?.mode ?? "…"}</span>
            <span className="tyche-pill">{status?.strategy ?? "…"}</span>
            <button
              type="button"
              className="tyche-btn"
              disabled={busy}
              onClick={() => act(() => agentApi.tychePause(!(status?.paused ?? false)))}
            >
              {status?.paused ? "Resume" : "Pause"}
            </button>
            <button type="button" className="tyche-btn tyche-btn--ghost" onClick={onClose}>
              Close
            </button>
          </div>
        </header>

        {error && <p className="tyche-error">{error}</p>}

        <div className="tyche-grid">
          <aside className="tyche-sidebar">
            <section>
              <h3>Balances</h3>
              <dl className="tyche-dl">
                <dt>Kalshi</dt>
                <dd>{bal ? fmtUsd(bal.kalshi.availableUsd) : "—"}</dd>
                <dt>ProphetX</dt>
                <dd className={pHealth?.status === "awaiting_credentials" ? "tyche-muted" : ""}>
                  {bal ? fmtUsd(bal.prophetx.availableUsd) : "—"}
                </dd>
                <dt>Deployed</dt>
                <dd>{bal ? fmtUsd(bal.deployedUsd) : "—"}</dd>
                <dt>Free</dt>
                <dd>{bal ? fmtUsd(bal.freeUsd) : "—"}</dd>
              </dl>
            </section>

            <section>
              <h3>Venue health</h3>
              <p>
                <span className={kHealth?.connected ? "tyche-dot tyche-dot--ok" : "tyche-dot"} /> Kalshi{" "}
                {kHealth?.message ?? "…"}
              </p>
              <p>
                <span
                  className={
                    pHealth?.connected ? "tyche-dot tyche-dot--ok" : "tyche-dot tyche-dot--warn"
                  }
                />{" "}
                ProphetX {pHealth?.message ?? "…"}
              </p>
              <p className="tyche-muted">Last scan: {status?.lastScanAt ?? "—"}</p>
              <p>Today P&amp;L: {fmtUsd(status?.todayPnlUsd ?? 0)}</p>
            </section>

            <section>
              <h3>Strategy</h3>
              <div className="tyche-strategy-btns">
                {(["static_only", "live_only", "combined"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`tyche-btn ${status?.strategy === s ? "tyche-btn--active" : ""}`}
                    disabled={busy}
                    onClick={() => act(() => agentApi.tycheStrategy(s))}
                  >
                    {s.replace("_", " ")}
                  </button>
                ))}
              </div>
            </section>
          </aside>

          <main className="tyche-main">
            <section>
              <h3>Live opportunities</h3>
              <div className="tyche-table-wrap">
                <table className="tyche-table">
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>Edge</th>
                      <th>ROI</th>
                      <th>Tag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(status?.opportunities ?? []).slice(0, 8).map((o, i) => (
                      <tr key={i}>
                        <td>{o.eventName}</td>
                        <td>{fmtUsd(o.netEdge)}</td>
                        <td>{(o.worstCaseRoi * 100).toFixed(1)}%</td>
                        <td>{o.strategyTag}</td>
                      </tr>
                    ))}
                    {(status?.opportunities?.length ?? 0) === 0 && (
                      <tr>
                        <td colSpan={4} className="tyche-muted">
                          No opportunities yet — scan running…
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h3>Trade bundles</h3>
              <div className="tyche-trades">
                {trades.map((t) => (
                  <div key={t.id} className={statusClass(t.status)}>
                    <div className="tyche-row-head">
                      <strong>{t.eventName}</strong>
                      <span className="tyche-status-pill">{t.status}</span>
                    </div>
                    <div className="tyche-legs">
                      {t.legs.map((l, i) => (
                        <span key={i}>
                          {l.venue} {l.side.toUpperCase()} @ {(l.price * 100).toFixed(0)}¢ × {l.quantity}
                        </span>
                      ))}
                    </div>
                    <div className="tyche-row-meta">
                      Locked: {fmtUsd(t.lockedProfitUsd)}
                      {t.actualPnlUsd != null && <> · Actual: {fmtUsd(t.actualPnlUsd)}</>}
                      {t.failureReason && <> · {t.failureReason}</>}
                    </div>
                  </div>
                ))}
                {trades.length === 0 && <p className="tyche-muted">No trades yet.</p>}
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
