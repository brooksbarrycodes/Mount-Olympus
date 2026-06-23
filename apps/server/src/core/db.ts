import Database from "better-sqlite3";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync } from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, "..", "..", "data");
mkdirSync(dataDir, { recursive: true });

export const db = new Database(join(dataDir, "olympus.db"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS businesses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    god_id TEXT NOT NULL,
    god TEXT NOT NULL,
    platform TEXT NOT NULL,
    niche TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    monthly_budget REAL NOT NULL DEFAULT 0,
    base_revenue REAL NOT NULL DEFAULT 0,
    base_expenses REAL NOT NULL DEFAULT 0,
    base_orders INTEGER NOT NULL DEFAULT 0,
    revenue_series TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id TEXT,
    label TEXT NOT NULL,
    amount REAL NOT NULL,
    agent TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS revenue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id TEXT,
    label TEXT NOT NULL,
    amount REAL NOT NULL,
    order_ref TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent TEXT NOT NULL,
    kind TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent TEXT NOT NULL,
    action TEXT NOT NULL,
    detail TEXT NOT NULL DEFAULT '{}',
    cost REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    approver TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS approvals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent TEXT NOT NULL,
    business_id TEXT,
    action_type TEXT NOT NULL,
    summary TEXT NOT NULL,
    payload TEXT NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    decided_at TEXT,
    decided_by TEXT
  );

  CREATE TABLE IF NOT EXISTS predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent TEXT NOT NULL,
    topic TEXT NOT NULL,
    prediction TEXT NOT NULL,
    confidence REAL NOT NULL DEFAULT 0.5,
    business_id TEXT,
    created_at TEXT NOT NULL,
    resolved INTEGER NOT NULL DEFAULT 0,
    outcome TEXT,
    score REAL
  );

  CREATE TABLE IF NOT EXISTS kv (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

export function nowIso(): string {
  return new Date().toISOString();
}

/** Simple key/value store for flags like the kill switch and autonomy levels. */
export function kvGet(key: string): string | undefined {
  const row = db.prepare("SELECT value FROM kv WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row?.value;
}

export function kvSet(key: string, value: string): void {
  db.prepare(
    "INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  ).run(key, value);
}

/**
 * Seed the ledger with the baseline businesses (mirrors the dummy shape the
 * client dashboard already uses). Runs once; agent-recorded expenses/revenue
 * are layered on top of these baselines.
 */
interface SeedBiz {
  id: string;
  name: string;
  godId: string;
  god: string;
  platform: string;
  revenue: number;
  expenses: number;
  orders: number;
  revenueSeries: number[];
  monthlyBudget: number;
  niche?: string;
}

const SEED: SeedBiz[] = [
  {
    id: "stickers",
    name: "Olympus Print Co.",
    godId: "apollo",
    god: "Apollo",
    platform: "Etsy",
    revenue: 0,
    expenses: 0,
    orders: 0,
    revenueSeries: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    monthlyBudget: 50,
    niche: undefined,
  },
  {
    id: "etsy",
    name: "Olympus Forge",
    godId: "hephaestus",
    god: "Hephaestus",
    platform: "Etsy",
    revenue: 18420,
    expenses: 9870,
    orders: 612,
    revenueSeries: [9200, 10100, 11800, 10950, 12400, 13980, 14210, 15600, 16040, 16880, 17510, 18420],
    monthlyBudget: 4000,
  },
  {
    id: "academy",
    name: "Athena's Academy",
    godId: "athena",
    god: "Athena",
    platform: "Shopify",
    revenue: 12260,
    expenses: 4130,
    orders: 318,
    revenueSeries: [3100, 4200, 5400, 6100, 7300, 8200, 8900, 9600, 10400, 11050, 11720, 12260],
    monthlyBudget: 3000,
  },
  {
    id: "dropship",
    name: "Hermes Express",
    godId: "hermes",
    god: "Hermes",
    platform: "Shopify",
    revenue: 15870,
    expenses: 11240,
    orders: 904,
    revenueSeries: [12100, 13050, 12780, 14010, 13560, 14890, 15230, 14780, 15400, 15110, 15620, 15870],
    monthlyBudget: 6000,
  },
];

export function seedIfEmpty(): void {
  const count = (db.prepare("SELECT COUNT(*) AS n FROM businesses").get() as { n: number }).n;
  if (count > 0) return;
  const insert = db.prepare(`
    INSERT INTO businesses
      (id, name, god_id, god, platform, niche, monthly_budget, base_revenue, base_expenses, base_orders, revenue_series, created_at)
    VALUES (@id, @name, @godId, @god, @platform, @niche, @monthlyBudget, @revenue, @expenses, @orders, @revenueSeries, @createdAt)
  `);
  const tx = db.transaction((rows: SeedBiz[]) => {
    for (const r of rows) {
      insert.run({
        ...r,
        niche: r.niche ?? null,
        revenueSeries: JSON.stringify(r.revenueSeries),
        createdAt: nowIso(),
      });
    }
  });
  tx(SEED);
}
