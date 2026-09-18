# AI Ecosystem Tracker

An investor-facing dashboard for the AI ecosystem: the supply chain from lithography to
applications, hyperscaler capex and capital structure, model performance, and token
economics.

The point of building this rather than bookmarking five sites is the **time series**.
Everyone publishes today's token prices and this quarter's capex; nobody publishes the
history. A scheduled job commits a snapshot to git on every refresh, so this repo
accumulates history that does not otherwise exist — the cost of a fixed capability level
over time being the clearest example.

## How it works

```
GitHub Action (cron)  →  fetch → validate → snapshot  →  commit JSON  →  build → deploy
                              ↑ curated JSON (hand-maintained, in git)
```

There is no backend, no database and no runtime secret. The browser only ever loads
committed JSON, which means the site keeps serving correct (if dated) numbers when an
upstream API is down, and `npm run build` succeeds with the network disabled — a property
CI enforces rather than assumes.

## Sources

| Source | Access | Cadence | Feeds |
|---|---|---|---|
| OpenRouter | no key | daily | Per-token pricing, cache rates, context, modality |
| Artificial Analysis | API key | daily | Intelligence index, benchmarks, throughput, TTFT |
| Yahoo Finance | UA required | daily | Price history for the tracked tickers |
| SEC `companyfacts` | UA required | weekly | Capex, revenue, D&A, debt, interest expense |
| SEC `submissions` | UA required | weekly | Filings feed — shelf registrations, 8-Ks |
| Epoch AI | no key | monthly | Training compute, parameters, hardware |
| HuggingFace | no key | weekly | Open-weight download momentum |

Private funding, partnership and debt terms have no free API and are curated (see below).

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

Two environment values matter:

- **`SEC_USER_AGENT`** — SEC requires a User-Agent containing a real contact email and
  returns `403` without one. A repo URL is not accepted.
- **`ARTIFICIALANALYSIS_API_KEY`** — free from artificialanalysis.ai. Optional: without it
  the benchmark fetcher skips cleanly and `/models` renders from free sources, with a notice.

For CI, set `SEC_USER_AGENT` as a repository **variable** and `ARTIFICIALANALYSIS_API_KEY`
as a repository **secret**, then enable Pages under Settings → Pages → source: GitHub
Actions.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Static export to `out/` — reads only committed JSON |
| `npm run data:fetch` | Fetch all sources. `-- --tier daily`, `-- --only openrouter`, `-- --dry-run` |
| `npm run data:seed` | Rebuild curated JSON from the typed sources in `scripts/seed/` |
| `npm run data:derive` | Recompute every derived view from snapshots. Offline |
| `npm test` | Unit tests over the derived-metric formulas |
| `npm run typecheck` | `tsc --noEmit` |

## Layout

```
data/
  curated/      Hand-maintained: companies, funding, deals, debt, flagship pricing
  snapshots/    One JSON per source, current state, with provenance and staleness
  history/      Append-only NDJSON, one row per observed change
  derived/      Computed views the app reads
  changelog.json  Per-run deltas powering the overview feed
scripts/
  fetch/        One module per source, each isolated
  lib/          HTTP (UA, retry, throttle), zod schemas, history, quarterly derivation
  seed/         Typed curated data — edit here, not the generated JSON
  derive/       Pure metric functions plus the view builder
src/            Next.js App Router pages and components
```

## Editing the curated data

Curated records live as **TypeScript** in `scripts/seed/`, not raw JSON, so corrections are
type-checked and every company reference is validated against the registry before anything
is written. A typo in a company id fails the build loudly rather than silently dropping an
edge from the deal graph.

**The curated records go stale and the site now says so.** They end wherever the
maintainer's knowledge ends, so `/capital` carries a section computed from SEC filings and
XBRL instead — filed debt issuance by quarter, shelf registrations, pricing supplements and
8-K material-agreement items, each linking the document. That section keeps pace on its own
and shows a banner counting the financings filed since the curated cutoff. It cannot name
counterparties or terms, which is exactly what the curated records are for.

- **A company** → `data/curated/companies.json`. Needs `id`, `name`, `type`, `layers`, and
  `ticker` plus `cik` if listed. To pull its fundamentals too, add the ticker to
  `FINANCIALS_FOCUS` in `scripts/fetch/sec.ts`.
- **A funding round, deal or debt instrument** → `scripts/seed/capital.ts`.
- **A historical model price** → `scripts/seed/flagship-pricing.ts`.

Then `npm run data:seed && npm run data:derive`.

Every curated record carries `asOf`, a `confidence` level and provenance marking it as
curated or seeded rather than fetched, and the UI renders seeded values distinctly. On a
tool meant for investment decisions, where a number came from is part of the number.

## Reading the numbers

**Derived metrics show their own formula and inputs.** Every computed figure — capex
coverage, depreciation drag, circularity exposure, intelligence per dollar — expands to
reveal the arithmetic and the values that went into it. They are opinions expressed as
arithmetic, and you should be able to disagree with the arithmetic.

Things worth knowing before drawing conclusions:

- **Announced is not deployed.** A "$100B investment" or "$300B compute commitment" is a
  headline attached to a multi-year, often milestone-gated arrangement. Deal amounts are
  recorded at their announced figure.
- **Circularity exposure covers disclosed deals only.** It measures reported structure, not
  true economics, and is as incomplete as public disclosure.
- **Quarterly SEC figures are derived.** 10-Q cash-flow facts are cumulative year-to-date, so
  discrete quarters are recovered by differencing. Filers reporting under IFRS on Form 20-F
  expose different tags and show gaps.
- **Benchmark indices are rebased over time.** A score compares models at a point in time,
  not across years — which is why the long-run cost chart holds a *tier* fixed rather than an
  index value.
- **Seeded history is a reconstruction**, not a primary source. It is tagged in the data and
  drawn as a separate series.

Nothing here is investment advice.
