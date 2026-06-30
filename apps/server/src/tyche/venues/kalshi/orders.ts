import { randomUUID } from "node:crypto";
import { kalshiAuthHeaders, kalshiApiPath } from "./auth.ts";

export interface KalshiOrderResult {
  orderId: string | null;
  status: "filled" | "partial" | "pending" | "failed" | "cancelled";
  filledQty: number;
  fillPriceProb: number | null;
  error?: string;
}

export async function submitKalshiOrder(opts: {
  ticker: string;
  side: "yes" | "no";
  quantity: number;
  priceProb: number;
}): Promise<KalshiOrderResult> {
  const path = "/portfolio/orders";
  const url = kalshiApiPath(path);
  const priceCents = Math.round(opts.priceProb * 100);
  const body = {
    ticker: opts.ticker,
    action: "buy",
    side: opts.side,
    count: opts.quantity,
    type: "limit",
    client_order_id: randomUUID(),
    ...(opts.side === "yes" ? { yes_price: priceCents } : { no_price: priceCents }),
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: kalshiAuthHeaders("POST", path),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        orderId: null,
        status: "failed",
        filledQty: 0,
        fillPriceProb: null,
        error: `Kalshi order ${res.status}: ${text.slice(0, 120)}`,
      };
    }
    const data = (await res.json()) as { order?: { order_id?: string; status?: string; fill_count?: number } };
    const orderId = data.order?.order_id ?? null;
    if (!orderId) {
      return { orderId: null, status: "failed", filledQty: 0, fillPriceProb: null, error: "no order_id" };
    }
    return pollKalshiOrder(orderId, opts.ticker, 8000);
  } catch (err) {
    return {
      orderId: null,
      status: "failed",
      filledQty: 0,
      fillPriceProb: null,
      error: String(err),
    };
  }
}

export async function pollKalshiOrder(
  orderId: string,
  _ticker: string,
  timeoutMs = 8000,
): Promise<KalshiOrderResult> {
  const path = `/portfolio/orders/${orderId}`;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const url = kalshiApiPath(path);
      const res = await fetch(url, { headers: kalshiAuthHeaders("GET", path) });
      if (!res.ok) {
        await sleep(400);
        continue;
      }
      const data = (await res.json()) as {
        order?: { status?: string; fill_count?: number; initial_count?: number; yes_price?: number; no_price?: number };
      };
      const o = data.order;
      if (!o) {
        await sleep(400);
        continue;
      }
      const filled = o.fill_count ?? 0;
      const status = (o.status ?? "").toLowerCase();
      if (status === "executed" || filled >= (o.initial_count ?? 1)) {
        const cents = o.yes_price ?? o.no_price ?? 0;
        return {
          orderId,
          status: "filled",
          filledQty: filled,
          fillPriceProb: cents / 100,
        };
      }
      if (status === "canceled" || status === "cancelled" || status === "rejected") {
        return { orderId, status: "failed", filledQty: filled, fillPriceProb: null, error: status };
      }
    } catch {
      /* retry */
    }
    await sleep(400);
  }

  return { orderId, status: "pending", filledQty: 0, fillPriceProb: null, error: "poll timeout" };
}

export async function cancelKalshiOrder(orderId: string, ticker: string): Promise<boolean> {
  const path = `/portfolio/orders/${orderId}/cancel`;
  try {
    const url = kalshiApiPath(path);
    const res = await fetch(url, {
      method: "POST",
      headers: kalshiAuthHeaders("POST", path),
      body: JSON.stringify({ ticker }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
