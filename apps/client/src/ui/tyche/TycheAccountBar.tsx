import type { TycheStatus } from "@/net/agentApi";
import { fmtUsd } from "./format";

interface Props {
  status: TycheStatus | null;
}

/** Prominent Kalshi + ProphetX account balances for the trading desk header. */
export function TycheAccountBar({ status }: Props) {
  const bal = status?.balances;
  const k = bal?.kalshi;
  const p = bal?.prophetx;
  const combined = bal ? bal.kalshi.availableUsd + bal.prophetx.availableUsd : null;

  return (
    <div className="tyche-desk-accounts">
      <article className="tyche-desk-account tyche-desk-account--kalshi">
        <div className="tyche-desk-account-head">
          <span className="tyche-desk-account-dot" aria-hidden />
          <span className="tyche-desk-account-venue">Kalshi</span>
          <span className="tyche-desk-account-env">Demo</span>
        </div>
        <p className="tyche-desk-account-amt">{k ? fmtUsd(k.availableUsd) : "—"}</p>
        <p className="tyche-desk-account-meta">
          Available
          {k && k.totalUsd !== k.availableUsd ? ` · Total ${fmtUsd(k.totalUsd)}` : null}
        </p>
      </article>

      <article className="tyche-desk-account tyche-desk-account--prophetx">
        <div className="tyche-desk-account-head">
          <span className="tyche-desk-account-dot" aria-hidden />
          <span className="tyche-desk-account-venue">ProphetX</span>
          <span className="tyche-desk-account-env">Sandbox</span>
        </div>
        <p className="tyche-desk-account-amt">{p ? fmtUsd(p.availableUsd) : "—"}</p>
        <p className="tyche-desk-account-meta">
          Available
          {p && p.totalUsd !== p.availableUsd ? ` · Total ${fmtUsd(p.totalUsd)}` : null}
        </p>
      </article>

      <article className="tyche-desk-account tyche-desk-account--combined">
        <div className="tyche-desk-account-head">
          <span className="tyche-desk-account-venue">Combined</span>
        </div>
        <p className="tyche-desk-account-amt">{combined != null ? fmtUsd(combined) : "—"}</p>
        <p className="tyche-desk-account-meta">
          Free capital
          {bal && bal.deployedUsd > 0 ? ` · ${fmtUsd(bal.deployedUsd)} deployed` : null}
        </p>
      </article>
    </div>
  );
}
