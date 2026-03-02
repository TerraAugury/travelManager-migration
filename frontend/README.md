# Frontend — Cloudflare Pages (vanilla ESM)

Static frontend deployed to Cloudflare Pages. No bundler — plain ES modules
served directly by Pages. API calls go to the Cloudflare Worker via the
`/api/*` proxy defined in `_routes.json`.

## Structure

```
frontend/
├── index.html          App shell (single HTML file, no build step)
├── src/
│   ├── api.js          HTTP client for all Worker endpoints
│   ├── config.js       API_BASE and token storage key
│   ├── forms.js        Form read/fill helpers + bindFlightLookup
│   ├── insights.js     Controller for Days, Upcoming, Map, Stats screens
│   ├── legacyAdapter.js Adapts Worker API responses → legacy screen format
│   ├── main.js         Bootstrap, CRUD actions, app wiring
│   ├── render.js       Trip select + event tiles
│   ├── state.js        In-memory app state (token, user, trips, …)
│   └── ui.js           DOM sync helpers
├── _routes.json        Routes /api/* /auth/* /health to Worker
└── _headers            Security headers (CSP, HSTS, …)
```

## Development

```bash
cd frontend
npm install

npm run lint   # node --check on all source files
npm test       # node --test test/*.test.js
npm run build  # lint + test (run before every PR)
```

For end-to-end testing, start the Worker locally first:

```bash
cd backend && npm run dev   # starts Worker + local D1 on localhost:8787
```

Then open `frontend/index.html` directly in a browser, or serve it with any
static file server pointing at the `frontend/` directory.

## Deployment

Deployed automatically via Cloudflare Pages connected to this repository.

Manual deploy:

```bash
wrangler pages deploy frontend/
```

Ensure the Pages project has its Worker route configured so `/api/*`,
`/auth/*`, and `/health` proxy to the travel-manager-api Worker.

## Features

| Screen | Description |
|--------|-------------|
| Trips | Create / edit / delete trips; add flights and hotels per trip |
| Days by Country | Days spent per country per passenger, with month drilldown |
| Days — Calendar view | Year-at-a-glance calendar with per-day country flag emoji |
| Upcoming Flights | All future flights, filterable by passenger |
| Map | Flight routes on a Leaflet map, filterable by year / passenger |
| Stats | Aggregate trip statistics across all trips |

### Flight number lookup (AviationStack)

Typing a flight number (e.g. `BA234`) in the Add Flight form and clicking
**Lookup** calls `GET /api/flights/lookup?fn=BA234`. The Worker proxies
AviationStack server-side (API key never reaches the browser) and the form
auto-fills airline, airports, IATA codes, and scheduled times.

Requires `AVIATIONSTACK_API_KEY` set as a Cloudflare secret in the Worker.
The button is always shown; if the secret is unset the Worker returns 503 and
the form shows an inline error — the feature degrades gracefully.

## Security

All user-generated content rendered into HTML is escaped. The `_headers` file
sets `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`,
and `Referrer-Policy` at the Pages edge.
