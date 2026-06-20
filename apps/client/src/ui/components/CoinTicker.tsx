import { useEffect, useRef, useState } from "react";

interface Props {
  drachmas: number;
  rate: number;
}

/**
 * Drachmas display with a spinning gold coin and a floating "+N" pop whenever
 * the balance increases. (Earnings are simulated for now; real Opp income will
 * drive `drachmas` later.)
 */
export function CoinTicker({ drachmas, rate }: Props) {
  const [pop, setPop] = useState<number | null>(null);
  const prev = useRef(drachmas);

  useEffect(() => {
    const delta = drachmas - prev.current;
    prev.current = drachmas;
    if (delta > 0) {
      setPop(delta);
      const t = setTimeout(() => setPop(null), 1100);
      return () => clearTimeout(t);
    }
  }, [drachmas]);

  return (
    <div className="coin-ticker">
      <div className="coin" aria-hidden="true">
        <div className="coin-face">𐅵</div>
      </div>
      <div className="coin-text">
        <div className="coin-amount">
          {drachmas.toLocaleString()} <span className="coin-unit">Drachmas</span>
          {pop !== null && <span className="coin-pop">+{pop}</span>}
        </div>
        <div className="coin-rate">+{rate} / hr</div>
      </div>
    </div>
  );
}
