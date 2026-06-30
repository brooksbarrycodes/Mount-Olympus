import { db, nowIso } from "../../core/db.ts";

export function initTycheSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tyche_market_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venue TEXT NOT NULL,
      market_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      fetched_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tyche_market_matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kalshi_market_id TEXT NOT NULL,
      prophetx_market_id TEXT NOT NULL,
      confidence TEXT NOT NULL,
      reasons TEXT NOT NULL DEFAULT '[]',
      kalshi_event_name TEXT NOT NULL,
      prophetx_event_name TEXT NOT NULL,
      sport TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tyche_opportunities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_name TEXT NOT NULL,
      sport TEXT NOT NULL,
      strategy_tag TEXT NOT NULL,
      match_confidence TEXT NOT NULL,
      payload TEXT NOT NULL,
      should_execute INTEGER NOT NULL DEFAULT 0,
      rejection_reasons TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tyche_trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      status TEXT NOT NULL,
      strategy TEXT NOT NULL,
      event_name TEXT NOT NULL,
      sport TEXT NOT NULL,
      match_confidence TEXT NOT NULL,
      locked_profit_usd REAL NOT NULL,
      actual_pnl_usd REAL,
      failure_reason TEXT,
      created_at TEXT NOT NULL,
      settled_at TEXT
    );

    CREATE TABLE IF NOT EXISTS tyche_trade_legs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trade_id INTEGER NOT NULL,
      venue TEXT NOT NULL,
      market_id TEXT NOT NULL,
      side TEXT NOT NULL,
      price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      order_id TEXT,
      status TEXT NOT NULL,
      filled_qty INTEGER NOT NULL DEFAULT 0,
      fee_usd REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (trade_id) REFERENCES tyche_trades(id)
    );

    CREATE TABLE IF NOT EXISTS tyche_balances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venue TEXT NOT NULL,
      available_usd REAL NOT NULL,
      deployed_usd REAL NOT NULL,
      total_usd REAL NOT NULL,
      fetched_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tyche_risk_decisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      opportunity_id INTEGER,
      allowed INTEGER NOT NULL,
      reasons TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tyche_system_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL,
      detail TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tyche_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      status TEXT NOT NULL,
      mode TEXT NOT NULL,
      strategy TEXT NOT NULL,
      started_at TEXT,
      ends_at TEXT,
      stopped_at TEXT,
      stop_reason TEXT,
      orders_placed INTEGER NOT NULL DEFAULT 0,
      orders_failed INTEGER NOT NULL DEFAULT 0,
      notional_usd REAL NOT NULL DEFAULT 0,
      config_snapshot TEXT NOT NULL DEFAULT '{}'
    );

    CREATE INDEX IF NOT EXISTS idx_tyche_sessions_started ON tyche_sessions(started_at DESC);

    CREATE INDEX IF NOT EXISTS idx_tyche_trades_created ON tyche_trades(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_tyche_opportunities_created ON tyche_opportunities(created_at DESC);
  `);
}

export function seedTycheBusiness(): void {
  const exists = db.prepare("SELECT id FROM businesses WHERE id = ?").get("tyche-arb") as
    | { id: string }
    | undefined;
  if (exists) return;
  db.prepare(`
    INSERT INTO businesses
      (id, name, god_id, god, platform, niche, monthly_budget, base_revenue, base_expenses, base_orders, revenue_series, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    "tyche-arb",
    "Tyche Arbitrage Desk",
    "tyche",
    "Tyche",
    "Kalshi+ProphetX",
    "cross-venue hedge",
    100,
    0,
    0,
    0,
    "[]",
    nowIso(),
  );
}
