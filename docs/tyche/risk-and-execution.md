# Risk and Execution

## Leg risk

The main real-world danger is **one leg filling while the other does not**. Tyche submits both legs simultaneously when possible and monitors fills. On partial failure, cancel/unwind the filled leg and mark the bundle **failed** (red).

## Binary-only + EXACT_MATCH

Auto-execution requires:
- Binary two-outcome markets only
- `EXACT_MATCH` confidence from the deterministic matcher
- Semantic/LLM suggestions never trigger auto-exec alone

## Dual balance gate

Never submit leg 1 unless leg 2 is executable at the same size. `max_size = min(depth_A, depth_B, balance_A, balance_B, risk_caps)`.

## Auto-execution policy

- `TYCHE_AUTO_EXECUTION=true` with hard caps (no per-trade approval)
- Auto-pause after N leg failures, daily loss cap, or reconciliation failure
- Global kill switch from Control Center halts Tyche
- Limit orders only; market orders disabled

## Future note

If live strategy shows latency-bound failures, consider US-East colocation. Not in scope for initial delivery.
