import { useCallback, useEffect, useState } from "react";
import { agentApi, type TycheSystemEvent } from "@/net/agentApi";
import { fmtTime } from "./format";

function iconFor(kind: string): string {
  if (kind.startsWith("scan")) return "◎";
  if (kind.includes("trade")) return "◆";
  if (kind.includes("session")) return "▶";
  if (kind.includes("watchdog") || kind.includes("preflight")) return "⚠";
  if (kind.includes("risk") || kind.includes("leg")) return "⊘";
  return "·";
}

export function TycheActivityFeed() {
  const [events, setEvents] = useState<TycheSystemEvent[]>([]);

  const refresh = useCallback(async () => {
    try {
      const r = await agentApi.tycheEvents();
      setEvents(r.events);
    } catch {
      /* desk shows main error */
    }
  }, []);

  useEffect(() => {
    void refresh();
    const es = agentApi.tycheStream({
      onTrade: () => void refresh(),
      onSystem: () => void refresh(),
    });
    const t = setInterval(() => void refresh(), 20_000);
    return () => {
      es.close();
      clearInterval(t);
    };
  }, [refresh]);

  return (
    <section className="tyche-desk-section">
      <div className="tyche-desk-section-head">
        <h3>Activity log</h3>
        <span className="tyche-desk-count">{events.length} events</span>
      </div>
      <div className="tyche-desk-scroll-y tyche-desk-activity">
        {events.length === 0 && <p className="tyche-desk-empty">No events yet.</p>}
        {events.map((e) => (
          <div key={e.id} className="tyche-desk-activity-row">
            <span className="tyche-desk-activity-icon">{iconFor(e.kind)}</span>
            <div>
              <strong>{e.kind}</strong>
              <span className="tyche-desk-muted"> {fmtTime(e.createdAt)}</span>
              {Object.keys(e.detail).length > 0 && (
                <pre className="tyche-desk-activity-detail">{JSON.stringify(e.detail, null, 0)}</pre>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
