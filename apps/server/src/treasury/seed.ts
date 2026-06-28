import { config } from "../config.ts";
import { addRecurring } from "./recurring.ts";
import { db } from "../core/db.ts";

export function seedTreasuryRecurring(): void {
  const count = (db.prepare("SELECT COUNT(*) AS n FROM treasury_recurring").get() as { n: number }).n;
  if (count > 0) return;

  addRecurring({
    label: "Cursor subscription",
    amountUsd: config.treasury.cursorSubscriptionUsd,
    category: "subscription",
    attributedGodId: "archon",
  });

  addRecurring({
    label: "ElevenLabs Starter",
    amountUsd: config.treasury.elevenlabsSubscriptionUsd,
    category: "subscription",
    attributedGodId: "zeus",
  });
}
