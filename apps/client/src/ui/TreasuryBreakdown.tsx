import { useCallback, useEffect, useState } from "react";
import { agentApi, type TreasuryEntry, type TreasurySummary } from "@/net/agentApi";
import { GodHeadIcon } from "./components/GodHeadIcon";

interface Props {
  onClose: () => void;
}

function fmt(n: number): string {
  const sign = n < 0 ? "-" : "";
  return sign + "$" + Math.abs(n).toFixed(2);
}

export function TreasuryBreakdown({ onClose }: Props) {
  const [summary, setSummary] = useState<TreasurySummary | null>(null);
  const [entries, setEntries] = useState<TreasuryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [s, e] = await Promise.all([agentApi.treasurySummary(), agentApi.treasuryEntries()]);
      setSummary(s);
      setEntries(e.entries);
      setError(null);
    } catch {
      setError("Treasury offline — start the agent server.");
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 30000);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="dash-backdrop" onClick={onClose}>
      <div className="dash-panel treasury-panel" onClick={(e) => e.stopPropagation()}>
        <header className="treasury-header">
          <div>
            <h2>Project Treasury</h2>
            <p className="treasury-sub">Real costs and credits — subscriptions, API usage, tools</p>
          </div>
          <button type="button" className="tyche-btn tyche-btn--ghost" onClick={onClose}>
            Close
          </button>
        </header>

        {error && <p className="tyche-error">{error}</p>}

        {summary && (
          <div className="treasury-kpis">
            <div className={`treasury-kpi ${summary.negative ? "treasury-kpi--neg" : ""}`}>
              <span>Balance</span>
              <strong>{fmt(summary.balance)}</strong>
            </div>
            <div className="treasury-kpi">
              <span>Total profit</span>
              <strong>{fmt(summary.allTimeProfit)}</strong>
            </div>
            <div className="treasury-kpi">
              <span>This week</span>
              <strong>{fmt(summary.weekNet)}</strong>
            </div>
            <div className="treasury-kpi">
              <span>This month</span>
              <strong>{fmt(summary.monthNet)}</strong>
            </div>
            <div className="treasury-kpi">
              <span>Total costs</span>
              <strong className="neg">{fmt(-summary.totalCosts)}</strong>
            </div>
          </div>
        )}

        <div className="treasury-list">
          <h3>Line items</h3>
          {entries.map((e) => (
            <div key={e.id} className={`treasury-row treasury-row--${e.kind}`}>
              <GodHeadIcon godId={e.attributedGodId} />
              <div className="treasury-row-body">
                <div className="treasury-row-label">{e.label}</div>
                <div className="treasury-row-meta">
                  {new Date(e.createdAt).toLocaleDateString()} · {e.category} · {e.source}
                </div>
              </div>
              <div className={`treasury-row-amt ${e.kind === "cost" ? "neg" : "pos"}`}>
                {e.kind === "cost" ? "-" : "+"}${e.amountUsd.toFixed(2)}
              </div>
            </div>
          ))}
          {entries.length === 0 && <p className="tyche-muted">No entries yet.</p>}
        </div>
      </div>
    </div>
  );
}
