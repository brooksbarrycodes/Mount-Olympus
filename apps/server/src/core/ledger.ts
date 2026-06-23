import { db, nowIso } from "./db.ts";

/**
 * The ledger is deterministic code, never AI judgment. Budgets, margins, and
 * profit are computed here so guardrails can trust the numbers absolutely.
 *
 * Each business carries a baseline snapshot (the dummy figures the dashboard
 * already shows). Agent-driven expense/revenue rows are layered on top.
 */

export interface BusinessRow {
  id: string;
  name: string;
  god_id: string;
  god: string;
  platform: string;
  niche: string | null;
  status: string;
  monthly_budget: number;
  base_revenue: number;
  base_expenses: number;
  base_orders: number;
  revenue_series: string;
}

export interface BusinessView {
  id: string;
  name: string;
  godId: string;
  god: string;
  platform: string;
  niche: string | null;
  status: string;
  monthlyBudget: number;
  revenue: number;
  expenses: number;
  orders: number;
  profit: number;
  margin: number;
  budgetRemaining: number;
  revenueSeries: number[];
}

function sumExpenses(businessId: string): number {
  const r = db
    .prepare("SELECT COALESCE(SUM(amount), 0) AS s FROM expenses WHERE business_id = ?")
    .get(businessId) as { s: number };
  return r.s;
}

function sumRevenue(businessId: string): { amount: number; orders: number } {
  const r = db
    .prepare("SELECT COALESCE(SUM(amount), 0) AS s, COUNT(*) AS n FROM revenue WHERE business_id = ?")
    .get(businessId) as { s: number; n: number };
  return { amount: r.s, orders: r.n };
}

function toView(row: BusinessRow): BusinessView {
  const addedExpenses = sumExpenses(row.id);
  const addedRevenue = sumRevenue(row.id);
  const revenue = row.base_revenue + addedRevenue.amount;
  const expenses = row.base_expenses + addedExpenses;
  const orders = row.base_orders + addedRevenue.orders;
  const profit = revenue - expenses;
  return {
    id: row.id,
    name: row.name,
    godId: row.god_id,
    god: row.god,
    platform: row.platform,
    niche: row.niche,
    status: row.status,
    monthlyBudget: row.monthly_budget,
    revenue,
    expenses,
    orders,
    profit,
    margin: revenue > 0 ? profit / revenue : 0,
    budgetRemaining: row.monthly_budget - addedExpenses,
    revenueSeries: JSON.parse(row.revenue_series) as number[],
  };
}

export function listBusinesses(): BusinessView[] {
  const rows = db.prepare("SELECT * FROM businesses ORDER BY rowid").all() as BusinessRow[];
  return rows.map(toView);
}

export function getBusiness(id: string): BusinessView | undefined {
  const row = db.prepare("SELECT * FROM businesses WHERE id = ?").get(id) as BusinessRow | undefined;
  return row ? toView(row) : undefined;
}

export function recordExpense(
  businessId: string | null,
  label: string,
  amount: number,
  agent: string,
): void {
  db.prepare(
    "INSERT INTO expenses (business_id, label, amount, agent, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run(businessId, label, amount, agent, nowIso());
}

export function recordRevenue(
  businessId: string | null,
  label: string,
  amount: number,
  orderRef: string | null,
): void {
  db.prepare(
    "INSERT INTO revenue (business_id, label, amount, order_ref, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run(businessId, label, amount, orderRef, nowIso());
}

export function setNiche(businessId: string, niche: string): void {
  db.prepare("UPDATE businesses SET niche = ? WHERE id = ?").run(niche, businessId);
}

export function setBudget(businessId: string, monthlyBudget: number): void {
  db.prepare("UPDATE businesses SET monthly_budget = ? WHERE id = ?").run(monthlyBudget, businessId);
}

export interface LedgerTotals {
  revenue: number;
  expenses: number;
  profit: number;
  margin: number;
  orders: number;
}

export function totals(): LedgerTotals {
  const all = listBusinesses();
  const revenue = all.reduce((s, b) => s + b.revenue, 0);
  const expenses = all.reduce((s, b) => s + b.expenses, 0);
  const orders = all.reduce((s, b) => s + b.orders, 0);
  const profit = revenue - expenses;
  return { revenue, expenses, profit, margin: revenue > 0 ? profit / revenue : 0, orders };
}

/** Total agent-incurred spend across all businesses since a given ISO time. */
export function spendSince(iso: string): number {
  const r = db
    .prepare("SELECT COALESCE(SUM(amount), 0) AS s FROM expenses WHERE created_at >= ?")
    .get(iso) as { s: number };
  return r.s;
}
