/**
 * Business analytics powering the Pantheon command desk dashboard. Each
 * business is headed by an Olympian god (see agentStates `businessId`). Live
 * ledger data from the agent server replaces these baselines when available.
 */

export type Platform =
  | "Etsy"
  | "Shopify"
  | "Printful"
  | "Amazon"
  | "YouTube"
  | "Patreon"
  | "Kalshi+ProphetX";

export interface Business {
  id: string;
  name: string;
  /** Opp id of the god who heads this business. */
  godId: string;
  god: string;
  platform: Platform;
  /** This-month figures, in USD. */
  revenue: number;
  expenses: number;
  orders: number;
  /** Trailing 12-month revenue, oldest -> newest. */
  revenueSeries: number[];
}

export interface EtsyOrder {
  id: string;
  item: string;
  buyer: string;
  total: number;
  /** ISO-ish short date label. */
  date: string;
  status: "Shipped" | "Processing" | "New";
}

export interface ExpenseLine {
  label: string;
  amount: number;
}

const ZERO_SERIES = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

export const businesses: Business[] = [
  {
    id: "etsy",
    name: "Olympus Forge",
    godId: "hephaestus",
    god: "Hephaestus",
    platform: "Etsy",
    revenue: 0,
    expenses: 0,
    orders: 0,
    revenueSeries: ZERO_SERIES,
  },
  {
    id: "academy",
    name: "Athena's Academy",
    godId: "athena",
    god: "Athena",
    platform: "Shopify",
    revenue: 0,
    expenses: 0,
    orders: 0,
    revenueSeries: ZERO_SERIES,
  },
  {
    id: "dropship",
    name: "Hermes Express",
    godId: "hermes",
    god: "Hermes",
    platform: "Shopify",
    revenue: 0,
    expenses: 0,
    orders: 0,
    revenueSeries: ZERO_SERIES,
  },
  {
    id: "imports",
    name: "Poseidon Trading Co.",
    godId: "poseidon",
    god: "Poseidon",
    platform: "Amazon",
    revenue: 0,
    expenses: 0,
    orders: 0,
    revenueSeries: ZERO_SERIES,
  },
  {
    id: "subscription",
    name: "Demeter's Harvest Box",
    godId: "demeter",
    god: "Demeter",
    platform: "Patreon",
    revenue: 0,
    expenses: 0,
    orders: 0,
    revenueSeries: ZERO_SERIES,
  },
  {
    id: "media",
    name: "Apollo Media",
    godId: "apollo",
    god: "Apollo",
    platform: "YouTube",
    revenue: 0,
    expenses: 0,
    orders: 0,
    revenueSeries: ZERO_SERIES,
  },
  {
    id: "tyche-arb",
    name: "Tyche Arbitrage Desk",
    godId: "tyche",
    god: "Tyche",
    platform: "Kalshi+ProphetX",
    revenue: 0,
    expenses: 0,
    orders: 0,
    revenueSeries: ZERO_SERIES,
  },
];

/** No mock Etsy orders — connect Etsy API for live data. */
export const etsyOrders: EtsyOrder[] = [];

/** No mock expense breakdown — treasury entries drive the desk. */
export const expenseBreakdown: ExpenseLine[] = [];

export function profitOf(b: Business): number {
  return b.revenue - b.expenses;
}

export function marginOf(b: Business): number {
  return b.revenue > 0 ? profitOf(b) / b.revenue : 0;
}

export interface KpiTotals {
  revenue: number;
  expenses: number;
  profit: number;
  margin: number;
  orders: number;
}

export function totals(): KpiTotals {
  const revenue = businesses.reduce((s, b) => s + b.revenue, 0);
  const expenses = businesses.reduce((s, b) => s + b.expenses, 0);
  const orders = businesses.reduce((s, b) => s + b.orders, 0);
  const profit = revenue - expenses;
  return { revenue, expenses, profit, margin: revenue > 0 ? profit / revenue : 0, orders };
}

export function formatUsd(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

export function formatPct(frac: number): string {
  return (frac * 100).toFixed(1) + "%";
}
