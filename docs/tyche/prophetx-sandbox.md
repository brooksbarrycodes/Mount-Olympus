# ProphetX Sandbox Setup

1. Register: https://ss-sandbox.betprophet.co/register?currency=cash
2. Top-right menu → **API integration** → create token (access + secret keys)
3. Email anthony.fradella@prophetexchange.com when verified to enable API access
4. Auth: `POST https://api-ss-sandbox.betprophet.co/partner/auth/login`
5. Docs index: https://docs.prophetx.co/llms.txt

Env vars (both required for login):

| Variable | Paste this |
|----------|------------|
| `PROPHETX_ACCESS_KEY` | **access_key** from Generate New Token |
| `PROPHETX_SECRET_KEY` | **secret_key** from Generate New Token |

Optional: `PROPHETX_BASE_URL=https://api-ss-sandbox.betprophet.co/partner`
