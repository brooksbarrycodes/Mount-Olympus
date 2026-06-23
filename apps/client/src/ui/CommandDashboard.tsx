import { useEffect, useMemo, useState } from "react";
import {
  businesses,
  etsyOrders,
  expenseBreakdown,
  totals,
  profitOf,
  marginOf,
  formatUsd,
  formatPct,
} from "@/game/world/businessStats";
import { agentApi } from "@/net/agentApi";

type Tab = "overview" | "businesses" | "etsy" | "expenses";

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
  { id: "businesses", label: "Businesses" },
  { id: "etsy", label: "Etsy" },
  { id: "expenses", label: "Expenses" },
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
  // Live ledger when the agent server is up; falls back to the mock figures.
  const [rows, setRows] = useState<BizRow[]>(mockRows);
  const [t, setT] = useState<TotalsRow>(() => totals());

  useEffect(() => {
    let cancelled = false;
    agentApi
      .ledger()
      .then((data) => {
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
      })
      .catch(() => {
        /* server offline -> keep the mock fallback already in state */
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
            <div className="dash-eyebrow">Command Desk</div>
            <h2 className="dash-title">Empire Ledger</h2>
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
                <KpiCard label="Revenue (mo)" value={formatUsd(t.revenue)} tone="gold" />
                <KpiCard label="Expenses (mo)" value={formatUsd(t.expenses)} tone="rust" />
                <KpiCard label="Net profit" value={formatUsd(t.profit)} tone="green" />
                <KpiCard label="Margin" value={formatPct(t.margin)} tone="blue" />
                <KpiCard label="Orders" value={t.orders.toLocaleString("en-US")} tone="plain" />
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
                      <td>{b.name}</td>
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

          {tab === "etsy" && (
            <div className="dash-grid2">
              <section className="dash-card">
                <h3 className="dash-card-title">Olympus Forge — Etsy</h3>
                <div className="dash-kpis tight">
                  <KpiCard label="Revenue" value={formatUsd(18420)} tone="gold" />
                  <KpiCard label="Orders" value="612" tone="plain" />
                  <KpiCard label="Conv. rate" value="3.8%" tone="blue" />
                  <KpiCard label="Avg. order" value="$30" tone="green" />
                </div>
                <div className="dash-mini-rows">
                  <MiniStat label="Shop favorites" value="2,481" />
                  <MiniStat label="Listing views (mo)" value="16,120" />
                  <MiniStat label="Repeat buyers" value="27%" />
                  <MiniStat label="Avg. review" value="4.9 ★" />
                </div>
              </section>
              <section className="dash-card">
                <h3 className="dash-card-title">Recent orders</h3>
                <ul className="dash-feed">
                  {etsyOrders.map((o) => (
                    <li key={o.id} className="dash-feed-row">
                      <span className={`dash-dot ${o.status.toLowerCase()}`} />
                      <div className="dash-feed-main">
                        <div className="dash-feed-item">{o.item}</div>
                        <div className="dash-feed-sub">
                          {o.buyer.trim()} · {o.date} · {o.status}
                        </div>
                      </div>
                      <div className="dash-feed-total">{formatUsd(o.total)}</div>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          )}

          {tab === "expenses" && (
            <div className="dash-grid2">
              <section className="dash-card">
                <h3 className="dash-card-title">Expense breakdown (mo)</h3>
                <ExpenseBars data={expenseBreakdown} />
              </section>
              <section className="dash-card">
                <h3 className="dash-card-title">Where the drachmas go</h3>
                <ul className="dash-feed">
                  {expenseBreakdown.map((e) => {
                    const total = expenseBreakdown.reduce((s, x) => s + x.amount, 0);
                    return (
                      <li key={e.label} className="dash-feed-row">
                        <div className="dash-feed-main">
                          <div className="dash-feed-item">{e.label}</div>
                          <div className="dash-feed-sub">{formatPct(e.amount / total)} of spend</div>
                        </div>
                        <div className="dash-feed-total">{formatUsd(e.amount)}</div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            </div>
          )}
        </div>
      </div>
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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="dash-mini">
      <span className="dash-mini-label">{label}</span>
      <span className="dash-mini-value">{value}</span>
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

function ExpenseBars({ data }: { data: { label: string; amount: number }[] }) {
  const max = Math.max(...data.map((d) => d.amount));
  return (
    <div className="dash-hbars">
      {data.map((d) => (
        <div key={d.label} className="dash-hbar-row">
          <span className="dash-hbar-label">{d.label}</span>
          <div className="dash-hbar-track">
            <div className="dash-hbar-fill" style={{ width: `${(d.amount / max) * 100}%` }} />
          </div>
          <span className="dash-hbar-val">{formatUsd(d.amount)}</span>
        </div>
      ))}
    </div>
  );
}
