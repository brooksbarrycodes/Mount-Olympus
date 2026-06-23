# Olympus Agent Server

The "brains and ledger" behind the gods. Zeus, the Oracle, and Apollo are real
agents here: they reason (via an LLM), call tools, keep a ledger, and propose
actions that you approve. The game (the React/Phaser client) talks to this
server over HTTP at `http://localhost:8787`.

By default everything runs in **mock mode**: fully offline, zero API keys, zero
spend. You get the entire experience — agents that "think," a niche the Oracle
picks, drafts Apollo queues for approval, a moving ledger, a prediction
scoreboard, guardrails, and the kill switch — without paying for anything. Real
models and real external services are an opt-in **Day-2** switch.

## Run it

From the repo root:

```bash
npm run dev          # starts this server + the game client together
# or just the server:
npm run dev:server
```

You should see `brains: MOCK (offline, free)`. No `.env` is required for mock mode.

## How the agents cooperate

- **Zeus** (overseer) reads the ledger, watches the approval queue and
  guardrails, and can `delegate` to the Oracle or Apollo.
- **The Oracle** (research) scans trends, recommends a niche, **commits it** to
  the store, and logs a prediction so her accuracy is scored against real sales.
- **Apollo** (worker) turns the niche into poster art + an Etsy **draft**, then
  enqueues it for your approval. He never publishes on his own.
- Approving a draft records its cost and (in mock mode) a simulated first sale,
  so profit/margin move and the Oracle's earlier prediction grades favorably on
  the next daily report.

## Safety rails (deterministic code, never AI judgment)

- **Kill switch** — halts all agent actions instantly.
- **Margin floor / daily spend cap / publish rate limit** — checked before any
  action executes, even one you approved.
- **Autonomy ladder** — every action type starts at **Level 1 (you approve each
  one)**. You raise levels yourself from the in-game Control Center; higher
  levels only auto-act when guardrails pass and the track record is clean.
- **LLM monthly budget cap** — a hard ceiling on real model spend (see below).

You drive all of this in-game from the **Control Center** (the ledger button on
the hotbar): approvals, autonomy levels, kill switch, guardrails, and a
recent-activity feed.

## Day-2: going live (deliberate, one adapter at a time)

Nothing here spends money until you choose to. When you have accounts/keys:

1. Copy the env template and edit it (this file is gitignored — secrets never
   get committed):

   ```bash
   cp apps/server/.env.example apps/server/.env
   ```

2. Turn on real mode and add your hard-capped Anthropic key to give the gods
   real reasoning:

   ```ini
   ADAPTER_MODE=real
   ANTHROPIC_API_KEY=sk-ant-...      # set a usage cap in the Anthropic console too
   LLM_MONTHLY_BUDGET_USD=20         # server-side hard cap; calls refuse past it
   ```

   With just this, the agents reason for real but still use **mock** external
   tools — so you can validate live brains with zero external-service risk.

3. Enable external adapters **one at a time**, each behind its own key. Until a
   key is set, that adapter throws a clear "configure on Day 2" error instead of
   doing anything:

   - **Art** (`ART_PROVIDER`, `ART_API_KEY`) — Leonardo / Ideogram / Stability / local.
   - **Etsy + fulfillment** (`ETSY_API_KEY`, `ETSY_SHOP_ID`, `PRINTIFY_API_KEY`).
   - **Oracle paid intel** (`ERANK_API_KEY`) — optional; the free/mock tier works without it.

The real adapter stubs live in [`src/tools`](src/tools) and the real model
adapter in [`src/core/llm/anthropicLlm.ts`](src/core/llm/anthropicLlm.ts).
Implement/verify them individually; everything else (orchestration, ledger,
approvals, guardrails) is provider-agnostic and unchanged between mock and real.

## Reset

The SQLite database lives at `apps/server/data/olympus.db` (gitignored). Delete
the `data/*.db*` files to start from a clean, freshly seeded ledger.
