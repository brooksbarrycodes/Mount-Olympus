import { useEffect, useMemo, useState } from "react";
import { bridge } from "@/game/EventBridge";
import {
  businesses,
  totals,
  profitOf,
  marginOf,
  formatUsd,
  formatPct,
} from "@/game/world/businessStats";
import { agentApi, type TreasurySummary, type TreasuryEntry, type Mission, type DocumentRecord } from "@/net/agentApi";
import { LinearBoard } from "./linear/LinearBoard";
import { MissionsOverlay } from "./MissionsOverlay";
import { DocumentWorkspace } from "./DocumentWorkspace";

type Tab = "overview" | "tasks" | "missions" | "documents" | "businesses" | "expenses";

/** Unified display row, populated from the live ledger or the mock fallback. */
interface BizRow {
  id: string;
  name: string;
  god: string;
  platform: string;
  revenue: number;
  expenses: number;
  profit: number;
  margin: number;
  orders: number;
  revenueSeries: number[];
}

interface TotalsRow {
  revenue: number;
  expenses: number;
  profit: number;
  margin: number;
  orders: number;
}

const mockRows: BizRow[] = businesses.map((b) => ({
  id: b.id,
  name: b.name,
  god: b.god,
  platform: b.platform,
  revenue: b.revenue,
  expenses: b.expenses,
  profit: profitOf(b),
  margin: marginOf(b),
  orders: b.orders,
  revenueSeries: b.revenueSeries,
}));

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "tasks", label: "Tasks" },
  { id: "missions", label: "Missions" },
  { id: "documents", label: "Documents" },
  { id: "businesses", label: "Businesses" },
  { id: "expenses", label: "Treasury" },
];

interface Props {
  onClose: () => void;
}

/**
 * The command-desk business dashboard. A marble-and-gold ledger of every venture
 * the Archon runs, with KPI cards, a per-business breakdown, an Etsy order feed,
 * an expense split, and lightweight inline SVG charts (no chart dependency).
 */
export function CommandDashboard({ onClose }: Props) {
  const [tab, setTab] = useState<Tab>("overview");
  const [rows, setRows] = useState<BizRow[]>(mockRows);
  const [t, setT] = useState<TotalsRow>(() => totals());
  const [treasury, setTreasury] = useState<TreasurySummary | null>(null);
  const [treasuryEntries, setTreasuryEntries] = useState<TreasuryEntry[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [missionsOpen, setMissionsOpen] = useState(false);
  const [documentsOpen, setDocumentsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      agentApi.ledger(),
      agentApi.treasurySummary(),
      agentApi.treasuryEntries(),
      agentApi.missions(),
      agentApi.documents(),
    ])
      .then(([data, ts, te, ms, docs]) => {
        if (cancelled) return;
        setRows(
          data.businesses.map((b) => ({
            id: b.id,
            name: b.name,
            god: b.god,
            platform: b.platform,
            revenue: b.revenue,
            expenses: b.expenses,
            profit: b.profit,
            margin: b.margin,
            orders: b.orders,
            revenueSeries: b.revenueSeries,
          })),
        );
        setT(data.totals);
        setTreasury(ts);
        setTreasuryEntries(te.entries);
        setMissions(ms.missions.filter((m) => !m.completedAt));
        setDocuments(docs.documents);
      })
      .catch(() => {
        /* server offline -> keep mock fallback */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // aggregate monthly revenue (sum across businesses), oldest -> newest
  const monthly = useMemo(() => {
    const len = rows[0]?.revenueSeries.length ?? 0;
    return Array.from({ length: len }, (_, i) =>
      rows.reduce((s, b) => s + (b.revenueSeries[i] ?? 0), 0),
    );
  }, [rows]);

  return (
    <div className="dash-backdrop" onClick={onClose}>
      <div className="dash-panel" onClick={(e) => e.stopPropagation()}>
        <header className="dash-head">
          <div>
            <div className="dash-eyebrow">Pantheon HQ</div>
            <h2 className="dash-title">Command Desk</h2>
          </div>
          <button className="dash-close" onClick={onClose} aria-label="Close">
            Esc ✕
          </button>
        </header>

        <nav className="dash-tabs">
          {TABS.map((tb) => (
            <button
              key={tb.id}
              className={`dash-tab${tab === tb.id ? " is-active" : ""}`}
              onClick={() => setTab(tb.id)}
            >
              {tb.label}
            </button>
          ))}
        </nav>

        <div className="dash-body">
          {tab === "overview" && (
            <>
              <div className="dash-kpis">
                {treasury ? (
                  <>
                    <KpiCard
                      label="Treasury balance"
                      value={formatUsd(treasury.balance)}
                      tone={treasury.negative ? "rust" : "green"}
                    />
                    <KpiCard label="Month net" value={formatUsd(treasury.monthNet)} tone="gold" />
                    <KpiCard label="Week net" value={formatUsd(treasury.weekNet)} tone="blue" />
                    <KpiCard label="All-time profit" value={formatUsd(treasury.allTimeProfit)} tone="plain" />
                    <KpiCard label="Active missions" value={String(missions.length)} tone="plain" />
                    <KpiCard
                      label="Docs in progress"
                      value={String(documents.filter((d) => d.status === "working").length)}
                      tone="plain"
                    />
                  </>
                ) : (
                  <>
                    <KpiCard label="Revenue (mo)" value={formatUsd(t.revenue)} tone="gold" />
                    <KpiCard label="Expenses (mo)" value={formatUsd(t.expenses)} tone="rust" />
                    <KpiCard label="Net profit" value={formatUsd(t.profit)} tone="green" />
                    <KpiCard label="Margin" value={formatPct(t.margin)} tone="blue" />
                    <KpiCard label="Orders" value={t.orders.toLocaleString("en-US")} tone="plain" />
                  </>
                )}
              </div>

              <div className="dash-grid2">
                <section className="dash-card">
                  <h3 className="dash-card-title">Revenue trend (12 mo)</h3>
                  <Sparkline data={monthly} />
                  <div className="dash-card-foot">
                    Latest month {formatUsd(monthly[monthly.length - 1] ?? 0)}
                  </div>
                </section>
                <section className="dash-card">
                  <h3 className="dash-card-title">Revenue vs expenses by venture</h3>
                  <RevExpBars data={rows} />
                </section>
              </div>
            </>
          )}

          {tab === "tasks" && (
            <section className="dash-card dash-card--full">
              <h3 className="dash-card-title">Linear tasks</h3>
              <LinearBoard />
            </section>
          )}

          {tab === "missions" && (
            <section className="dash-card dash-card--full">
              <div className="dash-card-head-row">
                <h3 className="dash-card-title">Countdown missions</h3>
                <button type="button" className="tyche-btn tyche-btn--ghost" onClick={() => setMissionsOpen(true)}>
                  Full overlay
                </button>
              </div>
              {missions.length === 0 ? (
                <p className="dash-empty">No active missions. Ask Zeus to add one.</p>
              ) : (
                <ul className="dash-feed">
                  {missions.map((m) => (
                    <li key={m.id} className="dash-feed-row">
                      <div className="dash-feed-main">
                        <div className="dash-feed-item">{m.title}</div>
                        <div className="dash-feed-sub">{m.dueAt ? `Due ${new Date(m.dueAt).toLocaleDateString()}` : "No due date"}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {tab === "documents" && (
            <section className="dash-card dash-card--full">
              <div className="dash-card-head-row">
                <h3 className="dash-card-title">Scriptorium documents</h3>
                <button type="button" className="tyche-btn tyche-btn--ghost" onClick={() => setDocumentsOpen(true)}>
                  Open workspace
                </button>
              </div>
              {documents.length === 0 ? (
                <p className="dash-empty">No research documents yet. Ask Zeus to start research.</p>
              ) : (
                <ul className="dash-feed">
                  {documents.slice(0, 12).map((d) => (
                    <li key={d.id} className="dash-feed-row">
                      <div className="dash-feed-main">
                        <div className="dash-feed-item">{d.title}</div>
                        <div className="dash-feed-sub">{d.status}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {tab === "businesses" && (
            <section className="dash-card">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Business</th>
                    <th>God</th>
                    <th>Platform</th>
                    <th className="num">Revenue</th>
                    <th className="num">Expenses</th>
                    <th className="num">Profit</th>
                    <th className="num">Margin</th>
                    <th className="num">Orders</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((b) => (
                    <tr key={b.id}>
                      <td>
                        {b.name}
                        {b.id === "tyche-arb" && (
                          <button
                            type="button"
                            className="tyche-desk-btn tyche-desk-btn--inline"
                            onClick={() => bridge.emit("game:open-tyche-trading", undefined)}
                          >
                            Open desk
                          </button>
                        )}
                      </td>
                      <td>{b.god}</td>
                      <td>
                        <span className="dash-pill">{b.platform}</span>
                      </td>
                      <td className="num">{formatUsd(b.revenue)}</td>
                      <td className="num">{formatUsd(b.expenses)}</td>
                      <td className={`num ${b.profit >= 0 ? "pos" : "neg"}`}>
                        {formatUsd(b.profit)}
                      </td>
                      <td className="num">{formatPct(b.margin)}</td>
                      <td className="num">{b.orders ? b.orders.toLocaleString("en-US") : "—"}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3}>Total</td>
                    <td className="num">{formatUsd(t.revenue)}</td>
                    <td className="num">{formatUsd(t.expenses)}</td>
                    <td className="num pos">{formatUsd(t.profit)}</td>
                    <td className="num">{formatPct(t.margin)}</td>
                    <td className="num">{t.orders.toLocaleString("en-US")}</td>
                  </tr>
                </tfoot>
              </table>
            </section>
          )}

          {tab === "expenses" && (
            <div className="dash-grid2">
              <section className="dash-card">
                <h3 className="dash-card-title">Treasury summary</h3>
                {treasury ? (
                  <div className="dash-kpis tight">
                    <KpiCard label="Balance" value={formatUsd(treasury.balance)} tone={treasury.negative ? "rust" : "green"} />
                    <KpiCard label="Total costs" value={formatUsd(treasury.totalCosts)} tone="rust" />
                    <KpiCard label="Total credits" value={formatUsd(treasury.totalCredits)} tone="gold" />
                    <KpiCard label="Month net" value={formatUsd(treasury.monthNet)} tone="blue" />
                  </div>
                ) : (
                  <p className="dash-empty">Treasury offline — start the agent server.</p>
                )}
              </section>
              <section className="dash-card">
                <h3 className="dash-card-title">Recent entries</h3>
                {treasuryEntries.length === 0 ? (
                  <p className="dash-empty">No treasury entries yet.</p>
                ) : (
                  <ul className="dash-feed">
                    {treasuryEntries.slice(0, 20).map((e) => (
                      <li key={e.id} className="dash-feed-row">
                        <div className="dash-feed-main">
                          <div className="dash-feed-item">{e.label}</div>
                          <div className="dash-feed-sub">
                            {e.category} · {e.attributedGodId} · {e.source}
                          </div>
                        </div>
                        <div className={`dash-feed-total ${e.kind === "credit" ? "pos" : "neg"}`}>
                          {e.kind === "credit" ? "+" : "-"}
                          {formatUsd(e.amountUsd)}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
      {missionsOpen && <MissionsOverlay onClose={() => setMissionsOpen(false)} />}
      {documentsOpen && <DocumentWorkspace onClose={() => setDocumentsOpen(false)} />}
    </div>
  );
}

function KpiCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "gold" | "rust" | "green" | "blue" | "plain";
}) {
  return (
    <div className={`dash-kpi tone-${tone}`}>
      <div className="dash-kpi-val">{value}</div>
      <div className="dash-kpi-label">{label}</div>
    </div>
  );
}

function Sparkline({ data }: { data: number[] }) {
  const w = 460;
  const h = 130;
  const pad = 8;
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / span) * (h - pad * 2);
    return [x, y] as const;
  });
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${h - pad} L${pts[0][0].toFixed(1)},${h - pad} Z`;
  return (
    <svg className="dash-chart" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <path d={area} fill="rgba(245,200,76,0.16)" />
      <path d={line} fill="none" stroke="#f5c84c" strokeWidth={2.5} />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={2.2} fill="#fff4cf" />
      ))}
    </svg>
  );
}

function RevExpBars({ data }: { data: BizRow[] }) {
  const w = 460;
  const h = 180;
  const pad = 22;
  const max = Math.max(...data.map((b) => Math.max(b.revenue, b.expenses)));
  const groupW = (w - pad * 2) / data.length;
  return (
    <svg className="dash-chart" viewBox={`0 0 ${w} ${h}`}>
      {data.map((b, i) => {
        const gx = pad + i * groupW;
        const bw = groupW * 0.3;
        const rh = (b.revenue / max) * (h - pad - 24);
        const eh = (b.expenses / max) * (h - pad - 24);
        return (
          <g key={b.id}>
            <rect x={gx + groupW * 0.18} y={h - 24 - rh} width={bw} height={rh} fill="#f5c84c" rx={2} />
            <rect x={gx + groupW * 0.52} y={h - 24 - eh} width={bw} height={eh} fill="#b5532b" rx={2} />
            <text x={gx + groupW * 0.5} y={h - 8} className="dash-chart-label" textAnchor="middle">
              {b.god.slice(0, 6)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
