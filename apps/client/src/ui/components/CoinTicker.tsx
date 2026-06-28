import { useEffect, useRef } from "react";

interface Props {
  drachmas: number;
  monthNet: number;
  weekNet: number;
  negative: boolean;
  onClick?: () => void;
}

function fmtUsd(n: number): string {
  const sign = n < 0 ? "-" : "";
  return sign + "$" + Math.abs(n).toFixed(2);
}

/**
 * Real project treasury balance (USD = Drachmas). Click to expand breakdown.
 */
export function CoinTicker({ drachmas, monthNet, weekNet, negative, onClick }: Props) {
  const prev = useRef(drachmas);

  useEffect(() => {
    prev.current = drachmas;
  }, [drachmas]);

  return (
    <button
      type="button"
      className={`coin-ticker ${negative ? "coin-ticker--negative" : ""}`}
      onClick={onClick}
      title="Open treasury breakdown"
    >
      <div className="coin" aria-hidden="true">
        <div className="coin-face">𐅵</div>
      </div>
      <div className="coin-text">
        <div className="coin-amount">
          {fmtUsd(drachmas)} <span className="coin-unit">Treasury</span>
        </div>
        <div className="coin-rate">
          Month {fmtUsd(monthNet)} · Week {fmtUsd(weekNet)}
        </div>
      </div>
    </button>
  );
}
