import type { TycheTradeBundle } from "@/net/agentApi";
import { bundleProfitUsd, bundleRowClass } from "./bundleColors";
import { fmtCents, fmtTime, fmtUsd, strategyLabel, venueLabel } from "./format";

interface Props {
  trades: TycheTradeBundle[];
}

export function TycheBundlePanel({ trades }: Props) {
  return (
    <section className="tyche-desk-section tyche-desk-section--grow">
      <div className="tyche-desk-section-head">
        <h3>Trade bundles</h3>
        <span className="tyche-desk-count">{trades.length} shown</span>
      </div>
      <div className="tyche-desk-scroll-y">
        {trades.length === 0 && <p className="tyche-desk-empty">No trades yet.</p>}
        {trades.map((t) => {
          const pnl = bundleProfitUsd(t);
          return (
            <article key={t.id ?? `${t.eventName}-${t.createdAt}`} className={bundleRowClass(t)}>
              <header className="tyche-desk-bundle-head">
                <div>
                  <span className="tyche-desk-bundle-id">#{t.id ?? "—"}</span>{" "}
                  <strong>{t.eventName}</strong>
                  <span className="tyche-desk-muted"> · {t.sport} · {strategyLabel(t.strategy)}</span>
                </div>
                <span className="tyche-desk-bundle-status">{t.status.toUpperCase()}</span>
              </header>
              <table className="tyche-desk-leg-table">
                <thead>
                  <tr>
                    <th>Venue</th>
                    <th>Side</th>
                    <th>Market</th>
                    <th className="num">Price</th>
                    <th className="num">Qty</th>
                    <th>Status</th>
                    <th>Order ID</th>
                    <th className="num">Fee</th>
                  </tr>
                </thead>
                <tbody>
                  {t.legs.map((l, i) => (
                    <tr key={i}>
                      <td>{venueLabel(l.venue)}</td>
                      <td>{l.side.toUpperCase()}</td>
                      <td className="tyche-desk-mono">{l.marketId}</td>
                      <td className="num">{fmtCents(l.price)}</td>
                      <td className="num">{l.quantity}</td>
                      <td>{l.status}</td>
                      <td className="tyche-desk-mono tyche-desk-ellipsis" title={l.orderId ?? undefined}>
                        {l.orderId ?? "—"}
                      </td>
                      <td className="num">{l.feeUsd != null ? fmtUsd(l.feeUsd) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <footer className="tyche-desk-bundle-foot">
                <span>Locked {fmtUsd(t.lockedProfitUsd)}</span>
                {t.actualPnlUsd != null && (
                  <span className={pnl >= 0 ? "tyche-desk-pos" : "tyche-desk-neg"}>
                    Actual {fmtUsd(t.actualPnlUsd)}
                  </span>
                )}
                <span className="tyche-desk-muted">{fmtTime(t.createdAt)}</span>
                {t.failureReason && <span className="tyche-desk-neg">{t.failureReason}</span>}
              </footer>
            </article>
          );
        })}
      </div>
    </section>
  );
}
