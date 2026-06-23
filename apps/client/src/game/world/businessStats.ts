/**
 * Dummy business analytics powering the Pantheon command desk dashboard. Each
 * business is headed by an Olympian god (see agentStates `businessId`). The shape
 * is intentionally close to what a real integration (Etsy/Shopify APIs) would
 * return, so live data can drop in later with minimal UI changes.
 */

export type Platform =
  | "Etsy"
  | "Shopify"
  | "Printful"
  | "Amazon"
  | "YouTube"
  | "Patreon";

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

export const businesses: Business[] = [
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
  },
  {
    id: "imports",
    name: "Poseidon Trading Co.",
    godId: "poseidon",
    god: "Poseidon",
    platform: "Amazon",
    revenue: 21340,
    expenses: 16720,
    orders: 488,
    revenueSeries: [17800, 16450, 18900, 19200, 18760, 20100, 19850, 20640, 21010, 20770, 21180, 21340],
  },
  {
    id: "subscription",
    name: "Demeter's Harvest Box",
    godId: "demeter",
    god: "Demeter",
    platform: "Patreon",
    revenue: 9650,
    expenses: 5210,
    orders: 1042,
    revenueSeries: [4100, 4800, 5300, 6050, 6700, 7250, 7900, 8300, 8750, 9100, 9420, 9650],
  },
  {
    id: "media",
    name: "Apollo Media",
    godId: "apollo",
    god: "Apollo",
    platform: "YouTube",
    revenue: 7480,
    expenses: 2960,
    orders: 0,
    revenueSeries: [1200, 1850, 2400, 3100, 3950, 4600, 5200, 5800, 6300, 6850, 7180, 7480],
  },
];

export const etsyOrders: EtsyOrder[] = [
  { id: "ET-4821", item: "Bronze Laurel Pendant", buyer: "helena_k", total: 48, date: "Jun 19", status: "New" },
  { id: "ET-4820", item: "Hand-forged Olive Spoon", buyer: "marcus.t", total: 32, date: "Jun 19", status: "Processing" },
  { id: "ET-4819", item: "Meander Coaster Set (4)", buyer: "sofia_r", total: 56, date: "Jun 18", status: "Processing" },
  { id: "ET-4817", item: "Owl of Athena Charm", buyer: "dimitra", total: 29, date: "Jun 18", status: "Shipped" },
  { id: "ET-4814", item: "Aegean Wave Earrings", buyer: "j.delacroix", total: 41, date: "Jun 17", status: "Shipped" },
  { id: "ET-4811", item: "Gold Sun Wall Disc", buyer: "athenian_88", total: 120, date: "Jun 17", status: "Shipped" },
  { id: "ET-4808", item: "Engraved Drachma Coin", buyer: "leo.m", total: 22, date: "Jun 16", status: "Shipped" },
  { id: "ET-4805", item: "Marble Trinket Dish", buyer: " camille", total: 38, date: "Jun 16", status: "Shipped" },
];

/** Company-wide expense breakdown (this month, USD). */
export const expenseBreakdown: ExpenseLine[] = [
  { label: "Cost of goods", amount: 22840 },
  { label: "Advertising", amount: 11260 },
  { label: "Shipping & fulfillment", amount: 7430 },
  { label: "Platform & fees", amount: 4920 },
  { label: "Tools & software", amount: 1880 },
  { label: "Contractors", amount: 2800 },
];

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
