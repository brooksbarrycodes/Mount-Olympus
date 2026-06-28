# Tyche Formulas

```
bundle_cost = yes_ask_A + no_ask_B
net_edge = payout - bundle_cost - fees_A - fees_B - slippage_buffer
max_size = min(depth_A, depth_B, balance_A, balance_B, risk_caps)
priority = net_edge / max(hours_to_settlement, 0.25)
```

Only `EXACT_MATCH` pairs are eligible for auto-execution.
