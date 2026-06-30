import type { TycheOpportunity, TycheStatus } from "@/net/agentApi";
import { americanOdds, fmtCents, fmtDepth, fmtPct, fmtUsd, venueLabel } from "./format";

interface Props {
  opportunities: TycheOpportunity[];
  venueHealth?: TycheStatus["venueHealth"];
}

export function TycheOpportunityBlotter({ opportunities, venueHealth }: Props) {
  const kSrc = venueHealth?.kalshi?.dataSource ?? venueHealth?.kalshi?.mode ?? "—";
  const pSrc = venueHealth?.prophetx?.dataSource ?? venueHealth?.prophetx?.status ?? "—";

  return (
    <section className="tyche-desk-section tyche-desk-section--grow">
      <div className="tyche-desk-section-head">
        <h3>Live opportunities</h3>
        <span className="tyche-desk-count">
          {opportunities.length} scanned · Kalshi {kSrc} · PX {pSrc}
        </span>
      </div>      <div className="tyche-desk-scroll-x">
        <table className="tyche-desk-table">
          <thead>
            <tr>
              <th>Event</th>
              <th>Sport</th>
              <th>Kalshi leg (YES)</th>
              <th>ProphetX leg (NO)</th>
              <th className="num">Bundle</th>
              <th className="num">Gross</th>
              <th className="num">Net $</th>
              <th className="num">Size</th>
              <th className="num">ROI</th>
              <th>Match</th>
              <th>Exec</th>
            </tr>
          </thead>
          <tbody>
            {opportunities.map((o, i) => (
              <tr
                key={o.id ?? i}
                className={o.shouldExecute ? "tyche-desk-row-exec" : undefined}
                title={o.rejectionReasons?.length ? o.rejectionReasons.join("; ") : undefined}
              >
                <td className="tyche-desk-ellipsis" title={o.eventName}>
                  {o.eventName}
                </td>
                <td>{o.sport}</td>
                <td className="tyche-desk-mono">
                  {o.legA ? (
                    <>
                      <span className="tyche-desk-venue">{venueLabel(o.legA.venue)}</span>{" "}
                      {o.legA.marketId}{" "}
                      <strong>{o.legA.side.toUpperCase()}</strong> @ {fmtCents(o.legA.askPrice)}{" "}
                      <span className="tyche-desk-muted">({americanOdds(o.legA.askPrice)})</span>{" "}
                      × {fmtDepth(o.legA.depth)}
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="tyche-desk-mono">
                  {o.legB ? (
                    <>
                      <span className="tyche-desk-venue">{venueLabel(o.legB.venue)}</span>{" "}
                      {o.legB.marketId}{" "}
                      <strong>{o.legB.side.toUpperCase()}</strong> @ {fmtCents(o.legB.askPrice)}{" "}
                      <span className="tyche-desk-muted">({americanOdds(o.legB.askPrice)})</span>{" "}
                      × {fmtDepth(o.legB.depth)}
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="num">{fmtCents(o.bundleCost ?? 0)}</td>
                <td className="num">{fmtCents(o.grossEdge ?? 0)}</td>
                <td className="num">{fmtUsd(o.netEdge)}</td>
                <td className="num">{o.maxSize?.toLocaleString("en-US") ?? "—"}</td>
                <td className="num">{fmtPct(o.worstCaseRoi)}</td>
                <td>
                  <span className={`tyche-desk-badge tyche-desk-badge--${matchTone(o.matchConfidence)}`}>
                    {o.matchConfidence?.replace("_", " ") ?? "—"}
                  </span>
                </td>
                <td>{o.shouldExecute ? "YES" : "—"}</td>
              </tr>
            ))}
            {opportunities.length === 0 && (
              <tr>
                <td colSpan={11} className="tyche-desk-empty">
                  No opportunities — scanner running…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function matchTone(conf?: string): string {
  if (conf === "EXACT_MATCH") return "ok";
  if (conf === "PROBABLE_MATCH") return "warn";
  return "muted";
}
