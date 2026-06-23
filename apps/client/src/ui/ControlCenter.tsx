import { useCallback, useEffect, useState } from "react";
import { agentApi, type Approval, type AuditEntry, type ServerState } from "@/net/agentApi";

interface Props {
  onClose: () => void;
}

const LEVEL_LABELS: Record<number, string> = {
  0: "Disabled",
  1: "Approve each",
  2: "Auto if trusted",
  3: "Full auto",
};

function fmtUsd(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

/**
 * The oversight Control Center - "Zeus's command, when you're away." Shows the
 * live approval queue, the autonomy trust ladder, the kill switch, guardrail
 * status, and a recent-activity feed. Backed entirely by the agent server; if
 * the server is offline it degrades to a clear message instead of crashing.
 */
export function ControlCenter({ onClose }: Props) {
  const [state, setState] = useState<ServerState | null>(null);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [s, a, au] = await Promise.all([
        agentApi.state(),
        agentApi.approvals(),
        agentApi.audit(),
      ]);
      setState(s);
      setApprovals(a.approvals);
      setAudit(au.entries);
      setError(null);
    } catch {
      setError("Agent server offline. Start it with:  npm run dev:server");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const act = useCallback(
    async (fn: () => Promise<unknown>) => {
      setBusy(true);
      try {
        await fn();
      } catch {
        /* error surfaces on the refresh below */
      }
      await refresh();
      setBusy(false);
    },
    [refresh],
  );

  const g = state?.guardrails;

  return (
    <div className="dash-backdrop" onClick={onClose}>
      <div
        className="dash-panel cc-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Oversight Control Center"
      >
        <header className="dash-head">
          <div>
            <div className="dash-eyebrow">Oversight</div>
            <h2 className="dash-title">Zeus's Command</h2>
          </div>
          <button className="dash-close" onClick={onClose} aria-label="Close">
            Esc
          </button>
        </header>

        {error && <div className="cc-error">{error}</div>}

        {state && (
          <div className="dash-body cc-body">
            <section className={`cc-kill ${g?.killSwitch ? "on" : ""}`}>
              <div>
                <div className="cc-kill-title">Kill switch</div>
                <div className="cc-kill-sub">
                  {g?.killSwitch
                    ? "All agent actions are halted."
                    : `Brains: ${state.llmLive ? "LIVE (Anthropic)" : "MOCK (offline, free)"} - agents may act within the rails.`}
                </div>
              </div>
              <button
                className={`cc-kill-btn ${g?.killSwitch ? "on" : ""}`}
                disabled={busy}
                onClick={() => act(() => agentApi.kill(!g?.killSwitch))}
              >
                {g?.killSwitch ? "Resume" : "Halt all"}
              </button>
            </section>

            <section className="cc-kpis">
              <Kpi label="Profit" value={fmtUsd(state.totals.profit)} />
              <Kpi label="Revenue" value={fmtUsd(state.totals.revenue)} />
              <Kpi label="Margin" value={`${(state.totals.margin * 100).toFixed(0)}%`} />
              <Kpi
                label="Spend today"
                value={fmtUsd(g?.spendToday ?? 0)}
                sub={`cap ${fmtUsd(g?.dailyBudgetCapUsd ?? 0)}`}
              />
              <Kpi
                label="LLM this month"
                value={fmtUsd(state.llm.spendThisMonth)}
                sub={`cap ${fmtUsd(state.llm.monthlyBudgetUsd)}`}
              />
            </section>

            <section className="cc-section">
              <h3 className="cc-h3">Guardrails (hard limits)</h3>
              <ul className="cc-guards">
                <li>
                  Margin floor <b>{((g?.marginFloor ?? 0) * 100).toFixed(0)}%</b>
                </li>
                <li>
                  Daily spend cap <b>{fmtUsd(g?.dailyBudgetCapUsd ?? 0)}</b>
                </li>
                <li>
                  Publish rate <b>{g?.publishRateLimitPerDay}/day</b>
                </li>
              </ul>
            </section>

            <section className="cc-section">
              <h3 className="cc-h3">Autonomy ladder</h3>
              {Object.entries(state.autonomy).map(([type, level]) => (
                <div className="cc-auto" key={type}>
                  <span className="cc-auto-type">{type.replace(/_/g, " ")}</span>
                  <div className="cc-auto-levels">
                    {[0, 1, 2, 3].map((l) => (
                      <button
                        key={l}
                        className={`cc-level ${level === l ? "active" : ""}`}
                        disabled={busy}
                        onClick={() => act(() => agentApi.setAutonomy(type, l))}
                        title={LEVEL_LABELS[l]}
                      >
                        L{l}
                      </button>
                    ))}
                  </div>
                  <span className="cc-auto-label">{LEVEL_LABELS[level] ?? ""}</span>
                </div>
              ))}
              <p className="cc-note">
                Cautious mode keeps everything at L1 (you approve each) until you raise it.
              </p>
            </section>

            <section className="cc-section">
              <h3 className="cc-h3">
                Pending approvals <span className="cc-count">{approvals.length}</span>
              </h3>
              {approvals.length === 0 ? (
                <p className="cc-empty">Nothing awaits your seal.</p>
              ) : (
                <ul className="cc-approvals">
                  {approvals.map((a) => (
                    <li key={a.id} className="cc-approval">
                      <div className="cc-approval-main">
                        <span className="cc-agent">{a.agent}</span>
                        <span className="cc-summary">{a.summary}</span>
                      </div>
                      <div className="cc-approval-actions">
                        <button
                          className="cc-approve"
                          disabled={busy}
                          onClick={() => act(() => agentApi.approve(a.id))}
                        >
                          Approve
                        </button>
                        <button
                          className="cc-reject"
                          disabled={busy}
                          onClick={() => act(() => agentApi.reject(a.id))}
                        >
                          Reject
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="cc-section">
              <h3 className="cc-h3">Recent activity</h3>
              {audit.length === 0 ? (
                <p className="cc-empty">No activity logged yet.</p>
              ) : (
                <ul className="cc-audit">
                  {audit.slice(0, 12).map((e) => (
                    <li key={e.id} className={`cc-audit-row cc-status-${e.status}`}>
                      <span className="cc-audit-agent">{e.agent}</span>
                      <span className="cc-audit-action">{e.action}</span>
                      <span className="cc-audit-status">{e.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="cc-kpi">
      <div className="cc-kpi-value">{value}</div>
      <div className="cc-kpi-label">{label}</div>
      {sub && <div className="cc-kpi-sub">{sub}</div>}
    </div>
  );
}
