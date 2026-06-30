import type { TycheStatus } from "@/net/agentApi";
import { fmtUsd, strategyLabel } from "./format";

const MODES = ["observe", "paper", "sandbox", "live"] as const;

interface Props {
  status: TycheStatus | null;
  busy: boolean;
  onPause: () => void;
  onStrategy: (s: string) => void;
  onMode: (m: string) => void;
  onScan: () => void;
}

export function TycheStatusRail({ status, busy, onPause, onStrategy, onMode, onScan }: Props) {
  const bal = status?.balances;
  const kHealth = status?.venueHealth?.kalshi;
  const pHealth = status?.venueHealth?.prophetx;
  const pnl = status?.todayPnlUsd ?? 0;

  return (
    <aside className="tyche-desk-rail">
      <section className="tyche-desk-rail-block">
        <h4>Capital summary</h4>
        <dl className="tyche-desk-dl">
          <dt>Kalshi avail.</dt>
          <dd>{bal ? fmtUsd(bal.kalshi.availableUsd) : "—"}</dd>
          <dt>ProphetX avail.</dt>
          <dd>{bal ? fmtUsd(bal.prophetx.availableUsd) : "—"}</dd>
          <dt>Deployed</dt>
          <dd>{bal ? fmtUsd(bal.deployedUsd) : "—"}</dd>
          <dt>Free (both)</dt>
          <dd>{bal ? fmtUsd(bal.freeUsd) : "—"}</dd>
        </dl>
      </section>

      <section className="tyche-desk-rail-block">
        <h4>Venue health</h4>
        <p>
          <span className={kHealth?.connected ? "tyche-dot tyche-dot--ok" : "tyche-dot"} /> Kalshi{" "}
          <span className="tyche-desk-muted">{kHealth?.message ?? "…"}</span>
        </p>
        <p>
          <span className={pHealth?.connected ? "tyche-dot tyche-dot--ok" : "tyche-dot tyche-dot--warn"} />{" "}
          ProphetX{" "}
          <span className="tyche-desk-muted">
            {pHealth?.status === "disabled" ? "Off (design)" : (pHealth?.message ?? "…")}
          </span>
        </p>
        <p className="tyche-desk-muted">Last scan: {status?.lastScanAt ?? "—"}</p>
        <p>
          Today P&amp;L:{" "}
          <span className={pnl >= 0 ? "tyche-desk-pos" : "tyche-desk-neg"}>{fmtUsd(pnl)}</span>
        </p>
      </section>

      <section className="tyche-desk-rail-block">
        <h4>Mode</h4>
        <div className="tyche-desk-btn-row">
          {MODES.map((m) => (
            <button
              key={m}
              type="button"
              className={`tyche-desk-btn ${status?.mode === m ? "tyche-desk-btn--active" : ""}`}
              disabled={busy}
              onClick={() => onMode(m)}
            >
              {m}
            </button>
          ))}
        </div>
      </section>

      <section className="tyche-desk-rail-block">
        <h4>Strategy</h4>
        <div className="tyche-desk-btn-row">
          {(["static_only", "live_only", "combined"] as const).map((s) => (
            <button
              key={s}
              type="button"
              className={`tyche-desk-btn ${status?.strategy === s ? "tyche-desk-btn--active" : ""}`}
              disabled={busy}
              onClick={() => onStrategy(s)}
            >
              {strategyLabel(s)}
            </button>
          ))}
        </div>
      </section>

      <section className="tyche-desk-rail-block tyche-desk-rail-actions">
        <button type="button" className="tyche-desk-btn" disabled={busy} onClick={onPause}>
          {status?.paused ? "Resume scanner" : "Pause scanner"}
        </button>
        <button type="button" className="tyche-desk-btn tyche-desk-btn--ghost" disabled={busy} onClick={onScan}>
          Scan now
        </button>
      </section>
    </aside>
  );
}
