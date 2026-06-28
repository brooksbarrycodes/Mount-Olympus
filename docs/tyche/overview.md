# Tyche — Cross-Venue Arbitrage

Tyche scans **Kalshi** and **ProphetX** for **binary two-outcome** markets on the same event. When opposite sides can be bought for less than $1 payout minus fees and buffers, the system executes both legs automatically within configured risk limits.

## Non-goals

- Predicting winners (no directional sports betting model)
- Scraping sportsbooks or bypassing geolocation
- Guaranteed-profit marketing — worst-case math must pass before any trade

## Modes

| Mode | Behavior |
|------|----------|
| observe | Log opportunities only |
| paper | Simulate fills from live/mock books |
| sandbox | Demo/sandbox API orders, tiny size |
| live | Production credentials + same risk rails |

## Strategy filters

- `live_only` — in-play / started events
- `static_only` — pre-game (default)
- `combined` — rank all by priority score
