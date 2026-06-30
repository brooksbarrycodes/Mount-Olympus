import { randomUUID } from "node:crypto";
import { prophetxEnsureToken, pxPost, pxGet } from "./client.ts";

export interface PxOrderResult {
  orderId: string | null;
  status: "filled" | "partial" | "pending" | "failed" | "cancelled";
  filledQty: number;
  fillPriceAmerican: number | null;
  error?: string;
}

export async function submitProphetxOrder(opts: {
  strikeId: string;
  americanOdds: number;
  quantity: number;
  fillOrKill?: boolean;
}): Promise<PxOrderResult> {
  const token = await prophetxEnsureToken();
  if (!token) return { orderId: null, status: "failed", filledQty: 0, fillPriceAmerican: null, error: "no token" };

  const externalId = `tyche-${randomUUID()}`;
  const body: Record<string, unknown> = {
    strike_id: opts.strikeId,
    price: Math.round(opts.americanOdds),
    quantity: opts.quantity,
    external_id: externalId,
  };
  if (opts.fillOrKill) body.order_strategy = "fillOrKill";

  const resp = await pxPost<{
    data?: { order_id?: string; id?: string; status?: string; matched_quantity?: number; price?: number };
  }>(token, "/mm/submit_order", body);

  if (!resp?.data) {
    return { orderId: null, status: "failed", filledQty: 0, fillPriceAmerican: null, error: "submit rejected" };
  }

  const orderId = String(resp.data.order_id ?? resp.data.id ?? externalId);
  return pollProphetxOrder(orderId, 8000);
}

export async function pollProphetxOrder(orderId: string, timeoutMs = 8000): Promise<PxOrderResult> {
  const token = await prophetxEnsureToken();
  if (!token) return { orderId, status: "failed", filledQty: 0, fillPriceAmerican: null, error: "no token" };

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const resp = await pxGet<{
      data?: {
        status?: string;
        matched_quantity?: number;
        unmatched_quantity?: number;
        price?: number;
        order_id?: string;
      };
    }>(token, "/mm/get_order_id", { order_id: orderId });

    const d = resp?.data;
    if (!d) {
      await sleep(400);
      continue;
    }

    const matched = d.matched_quantity ?? 0;
    const statusRaw = (d.status ?? "").toLowerCase();
    if (statusRaw.includes("matched") || statusRaw === "filled" || matched > 0) {
      return {
        orderId,
        status: matched > 0 ? "filled" : "pending",
        filledQty: matched,
        fillPriceAmerican: d.price ?? null,
      };
    }
    if (statusRaw.includes("cancel") || statusRaw.includes("reject") || statusRaw.includes("fail")) {
      return { orderId, status: "failed", filledQty: 0, fillPriceAmerican: null, error: statusRaw };
    }
    await sleep(400);
  }

  return { orderId, status: "pending", filledQty: 0, fillPriceAmerican: null, error: "poll timeout" };
}

export async function cancelProphetxOrder(orderId: string): Promise<boolean> {
  const token = await prophetxEnsureToken();
  if (!token) return false;
  const resp = await pxPost<{ data?: unknown }>(token, "/mm/cancel_order", { order_id: orderId });
  return resp != null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
