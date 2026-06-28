# Tyche Manual QA Checklist

1. Start server: `npm run dev:server`
2. Walk east from agora to Temple of Tyche (~2900, 1180)
3. Enter temple, press **E** at trading desk → trading floor opens
4. Verify balances, venue health, opportunities table populate
5. Set `TYCHE_MODE=paper` in `apps/server/.env`, restart — bundles should appear yellow then green
6. Toggle strategy live/static/combined in UI
7. Enable global kill switch in Control Center — Tyche should pause new executions
8. Confirm yellow / green / red row styling on trade bundles
