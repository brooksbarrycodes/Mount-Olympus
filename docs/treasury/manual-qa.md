# Treasury, Zeus Powers, Audio & HQ — Manual QA

Run `npm run dev` from the repo root (server + client). Confirm the agent server is on port 8787.

## Treasury / Drachma HUD

1. Coin ticker shows `$0.00 Treasury` on fresh start (or real balance after entries).
2. After server init, recurring subs (Cursor $20, ElevenLabs $5) accrue — balance turns **negative** and coin turns **red**.
3. Click coin → Treasury breakdown opens with line items, god head icons, crown on `archon` rows.
4. Expanded view shows total profit, week net, month net, total costs.
5. Ask Zeus to `record_cost` for an unknown expense — new row appears within ~30s HUD poll.

## Pantheon HQ desk

1. Enter Pantheon → sit at Command Desk → HQ opens with Overview / Tasks / Missions / Documents / Businesses / Treasury tabs.
2. **Tasks** tab loads Linear board (mock issues if no `LINEAR_API_KEY`).
3. **Treasury** tab lists real entries, not mock Etsy/expense data.
4. **Missions** and **Documents** tabs show live data or empty states.

## Missions

1. Hotbar **Missions** → full overlay with countdown timers.
2. Add a mission from overlay — appears in HUD mission panel.
3. Zeus `add_mission` with due date — shows countdown; completing clears it.

## Scriptorium

1. In Pantheon, walk to left council area (Scriptorium placard) → press E → Document workspace opens.
2. Ask Zeus to research a topic — document appears as `working`, then `complete`.
3. Select document — markdown content visible.

## Audio

1. Talk to Zeus — voice is louder/faster than before.
2. Background music is quieter (does not drown Zeus).
3. Talk to Oracle — distinct voice (ElevenLabs ID `HH3kybY6uEJ2ebSa9Vy3`) when key configured.

## Linear (optional, requires API key)

1. Set `LINEAR_API_KEY` and `LINEAR_DEFAULT_TEAM_ID` in `apps/server/.env`.
2. Create issue from HQ Tasks tab — appears on refresh.
3. Zeus `linear_create_issue` — issue visible on board.
