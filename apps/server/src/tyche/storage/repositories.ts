import { db, nowIso } from "../../core/db.ts";
import type { Opportunity } from "../models/opportunity.ts";
import type { TradeBundle, TradeLeg, TradeStatus } from "../models/tradeBundle.ts";
import type { VenueBalance } from "../models/venueBalances.ts";
import type { MarketMatch } from "../models/marketMatch.ts";

export function insertMatch(m: MarketMatch): number {
  const r = db
    .prepare(
      `INSERT INTO tyche_market_matches
        (kalshi_market_id, prophetx_market_id, confidence, reasons, kalshi_event_name, prophetx_event_name, sport, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      m.kalshiMarketId,
      m.prophetxMarketId,
      m.confidence,
      JSON.stringify(m.reasons),
      m.kalshiEventName,
      m.prophetxEventName,
      m.sport,
      nowIso(),
    );
  return Number(r.lastInsertRowid);
}

export function insertOpportunity(o: Opportunity): number {
  const r = db
    .prepare(
      `INSERT INTO tyche_opportunities
        (event_name, sport, strategy_tag, match_confidence, payload, should_execute, rejection_reasons, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      o.eventName,
      o.sport,
      o.strategyTag,
      o.matchConfidence,
      JSON.stringify(o),
      o.shouldExecute ? 1 : 0,
      JSON.stringify(o.rejectionReasons),
      nowIso(),
    );
  return Number(r.lastInsertRowid);
}

export function insertTrade(bundle: TradeBundle): number {
  const r = db
    .prepare(
      `INSERT INTO tyche_trades
        (status, strategy, event_name, sport, match_confidence, locked_profit_usd, actual_pnl_usd, failure_reason, created_at, settled_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      bundle.status,
      bundle.strategy,
      bundle.eventName,
      bundle.sport,
      bundle.matchConfidence,
      bundle.lockedProfitUsd,
      bundle.actualPnlUsd,
      bundle.failureReason,
      bundle.createdAt ?? nowIso(),
      bundle.settledAt ?? null,
    );
  const tradeId = Number(r.lastInsertRowid);
  const legStmt = db.prepare(
    `INSERT INTO tyche_trade_legs
      (trade_id, venue, market_id, side, price, quantity, order_id, status, filled_qty, fee_usd)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const leg of bundle.legs) {
    legStmt.run(
      tradeId,
      leg.venue,
      leg.marketId,
      leg.side,
      leg.price,
      leg.quantity,
      leg.orderId,
      leg.status,
      leg.filledQty,
      leg.feeUsd,
    );
  }
  return tradeId;
}

export function updateTradeStatus(
  tradeId: number,
  status: TradeStatus,
  actualPnlUsd: number | null,
  failureReason: string | null,
): void {
  db.prepare(
    `UPDATE tyche_trades SET status = ?, actual_pnl_usd = ?, failure_reason = ?, settled_at = ? WHERE id = ?`,
  ).run(status, actualPnlUsd, failureReason, status !== "pending" ? nowIso() : null, tradeId);
}

export function updateLegStatus(
  legId: number,
  status: string,
  filledQty: number,
  orderId?: string | null,
): void {
  db.prepare(`UPDATE tyche_trade_legs SET status = ?, filled_qty = ?, order_id = COALESCE(?, order_id) WHERE id = ?`).run(
    status,
    filledQty,
    orderId ?? null,
    legId,
  );
}

export function listTrades(limit = 50): TradeBundle[] {
  const rows = db
    .prepare(`SELECT * FROM tyche_trades ORDER BY created_at DESC LIMIT ?`)
    .all(limit) as Array<Record<string, unknown>>;
  return rows.map(rowToBundle);
}

export function getTrade(id: number): TradeBundle | undefined {
  const row = db.prepare(`SELECT * FROM tyche_trades WHERE id = ?`).get(id) as
    | Record<string, unknown>
    | undefined;
  return row ? rowToBundle(row) : undefined;
}

function rowToBundle(row: Record<string, unknown>): TradeBundle {
  const tradeId = Number(row.id);
  const legs = db
    .prepare(`SELECT * FROM tyche_trade_legs WHERE trade_id = ?`)
    .all(tradeId) as Array<Record<string, unknown>>;
  return {
    id: tradeId,
    status: row.status as TradeStatus,
    strategy: String(row.strategy),
    eventName: String(row.event_name),
    sport: String(row.sport),
    matchConfidence: String(row.match_confidence),
    lockedProfitUsd: Number(row.locked_profit_usd),
    actualPnlUsd: row.actual_pnl_usd == null ? null : Number(row.actual_pnl_usd),
    failureReason: row.failure_reason == null ? null : String(row.failure_reason),
    createdAt: String(row.created_at),
    settledAt: row.settled_at == null ? null : String(row.settled_at),
    legs: legs.map((l) => ({
      id: Number(l.id),
      tradeId,
      venue: l.venue as TradeLeg["venue"],
      marketId: String(l.market_id),
      side: l.side as TradeLeg["side"],
      price: Number(l.price),
      quantity: Number(l.quantity),
      orderId: l.order_id == null ? null : String(l.order_id),
      status: l.status as TradeLeg["status"],
      filledQty: Number(l.filled_qty),
      feeUsd: Number(l.fee_usd),
    })),
  };
}

export function listRecentOpportunities(limit = 20): Opportunity[] {
  const rows = db
    .prepare(`SELECT payload FROM tyche_opportunities ORDER BY created_at DESC LIMIT ?`)
    .all(limit) as Array<{ payload: string }>;
  return rows.map((r) => JSON.parse(r.payload) as Opportunity);
}

export function insertBalance(b: VenueBalance): void {
  db.prepare(
    `INSERT INTO tyche_balances (venue, available_usd, deployed_usd, total_usd, fetched_at) VALUES (?, ?, ?, ?, ?)`,
  ).run(b.venue, b.availableUsd, b.deployedUsd, b.totalUsd, b.fetchedAt);
}

export function latestBalances(): VenueBalance[] {
  const rows = db
    .prepare(
      `SELECT venue, available_usd, deployed_usd, total_usd, fetched_at
       FROM tyche_balances
       WHERE id IN (SELECT MAX(id) FROM tyche_balances GROUP BY venue)`,
    )
    .all() as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    venue: r.venue as VenueBalance["venue"],
    availableUsd: Number(r.available_usd),
    deployedUsd: Number(r.deployed_usd),
    totalUsd: Number(r.total_usd),
    fetchedAt: String(r.fetched_at),
  }));
}

export function insertRiskDecision(opportunityId: number | null, allowed: boolean, reasons: string[]): void {
  db.prepare(
    `INSERT INTO tyche_risk_decisions (opportunity_id, allowed, reasons, created_at) VALUES (?, ?, ?, ?)`,
  ).run(opportunityId, allowed ? 1 : 0, JSON.stringify(reasons), nowIso());
}

export function insertSystemEvent(kind: string, detail: Record<string, unknown>): void {
  db.prepare(`INSERT INTO tyche_system_events (kind, detail, created_at) VALUES (?, ?, ?)`).run(
    kind,
    JSON.stringify(detail),
    nowIso(),
  );
}

export function dailyNotionalUsd(): number {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const r = db
    .prepare(
      `SELECT COALESCE(SUM(
        (SELECT SUM(l.price * l.quantity) FROM tyche_trade_legs l WHERE l.trade_id = t.id)
      ), 0) AS s FROM tyche_trades t WHERE t.created_at >= ? AND t.status != 'failed'`,
    )
    .get(start.toISOString()) as { s: number };
  return r.s;
}

export function countLegFailuresToday(): number {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const r = db
    .prepare(`SELECT COUNT(*) AS n FROM tyche_trades WHERE status = 'failed' AND created_at >= ?`)
    .get(start.toISOString()) as { n: number };
  return r.n;
}

export function todayPnlUsd(): number {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const r = db
    .prepare(
      `SELECT COALESCE(SUM(actual_pnl_usd), 0) AS s FROM tyche_trades WHERE settled_at >= ? AND status = 'success'`,
    )
    .get(start.toISOString()) as { s: number };
  return r.s;
}
