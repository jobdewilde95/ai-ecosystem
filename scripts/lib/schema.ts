import { z } from 'zod';

/**
 * Normalised shapes written to data/snapshots. Upstreams change without notice,
 * so every snapshot is validated before it is committed — a malformed response
 * is rejected loudly here rather than rendering as a blank chart later.
 */

export const provenanceSchema = z.object({
  /** Where the value came from: a live API, or seeded from prior knowledge. */
  origin: z.enum(['fetched', 'seeded', 'curated']),
  sourceUrl: z.string().optional(),
  asOf: z.string(),
  confidence: z.enum(['high', 'medium', 'low']).optional(),
});
export type Provenance = z.infer<typeof provenanceSchema>;

/** Per-million-token prices in USD. */
export const pricingSchema = z.object({
  inputPerMtok: z.number().nonnegative().nullable(),
  outputPerMtok: z.number().nonnegative().nullable(),
  cacheReadPerMtok: z.number().nonnegative().nullable().optional(),
  cacheWritePerMtok: z.number().nonnegative().nullable().optional(),
  /** Standard 3:1 input:output blend, the industry comparison convention. */
  blended3to1: z.number().nonnegative().nullable(),
});

export const openRouterModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  creator: z.string(),
  createdAt: z.string().nullable(),
  contextLength: z.number().nullable(),
  inputModalities: z.array(z.string()),
  outputModalities: z.array(z.string()),
  pricing: pricingSchema,
});
export const openRouterSnapshotSchema = z.array(openRouterModelSchema);
export type OpenRouterModel = z.infer<typeof openRouterModelSchema>;

export const evaluationsSchema = z.object({
  intelligenceIndex: z.number().nullable(),
  codingIndex: z.number().nullable(),
  mathIndex: z.number().nullable(),
  gpqa: z.number().nullable(),
  hle: z.number().nullable(),
  livecodebench: z.number().nullable(),
  scicode: z.number().nullable(),
  aime25: z.number().nullable(),
  terminalbench: z.number().nullable(),
  tau2: z.number().nullable(),
});

export const aaModelSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  creator: z.string(),
  releaseDate: z.string().nullable(),
  pricing: pricingSchema,
  evaluations: evaluationsSchema,
  medianOutputTokensPerSecond: z.number().nullable(),
  medianTimeToFirstTokenSeconds: z.number().nullable(),
});
export const aaSnapshotSchema = z.array(aaModelSchema);
export type AaModel = z.infer<typeof aaModelSchema>;

/** One OHLC bar. Volume is absent on some indices, hence nullable. */
export const priceBarSchema = z.object({
  date: z.string(),
  close: z.number(),
  volume: z.number().nullable(),
});

export const tickerSeriesSchema = z.object({
  ticker: z.string(),
  currency: z.string().nullable(),
  bars: z.array(priceBarSchema),
});
export type TickerSeries = z.infer<typeof tickerSeriesSchema>;

/**
 * Committed market state is a summary, not the raw bars.
 *
 * Rewriting five years of daily bars for ~67 tickers on every run would add
 * ~8.6 MB to the repo per day; the full series lives in the append-only history
 * instead, where a day costs ~67 lines. The returns here are also what the UI
 * actually renders, so precomputing them keeps the client trivial.
 */
export const tickerSummarySchema = z.object({
  ticker: z.string(),
  currency: z.string().nullable(),
  latestDate: z.string(),
  latestClose: z.number(),
  returns: z.object({
    d1: z.number().nullable(),
    w1: z.number().nullable(),
    m1: z.number().nullable(),
    m3: z.number().nullable(),
    m6: z.number().nullable(),
    y1: z.number().nullable(),
    ytd: z.number().nullable(),
  }),
  high52w: z.number().nullable(),
  low52w: z.number().nullable(),
  maxDrawdownPct: z.number().nullable(),
  barCount: z.number(),
});
export const marketSnapshotSchema = z.array(tickerSummarySchema);
export type TickerSummary = z.infer<typeof tickerSummarySchema>;

/** A single XBRL fact as filed: value plus the period and form it came from. */
export const factSchema = z.object({
  fiscalYear: z.number(),
  fiscalPeriod: z.string(),
  end: z.string(),
  start: z.string().nullable(),
  value: z.number(),
  form: z.string(),
  filed: z.string(),
  frame: z.string().nullable(),
});

export const companyFinancialsSchema = z.object({
  cik: z.string(),
  ticker: z.string(),
  entityName: z.string(),
  /** Keyed by our metric name, e.g. capex, revenue, interestExpense. */
  metrics: z.record(z.string(), z.array(factSchema)),
});
export const secSnapshotSchema = z.array(companyFinancialsSchema);
export type CompanyFinancials = z.infer<typeof companyFinancialsSchema>;

export const filingSchema = z.object({
  ticker: z.string(),
  form: z.string(),
  filed: z.string(),
  reportDate: z.string().nullable(),
  primaryDoc: z.string(),
  accession: z.string(),
  items: z.string().nullable(),
});
export const filingsSnapshotSchema = z.array(filingSchema);

export const epochModelSchema = z.object({
  model: z.string(),
  organization: z.string(),
  publicationDate: z.string().nullable(),
  domain: z.string().nullable(),
  parameters: z.number().nullable(),
  trainingComputeFlop: z.number().nullable(),
  trainingHardware: z.string().nullable(),
  hardwareQuantity: z.number().nullable(),
  country: z.string().nullable(),
});
export const epochSnapshotSchema = z.array(epochModelSchema);

export const hfModelSchema = z.object({
  id: z.string(),
  author: z.string().nullable(),
  downloads: z.number(),
  likes: z.number(),
  createdAt: z.string().nullable(),
  tags: z.array(z.string()),
});
export const hfSnapshotSchema = z.array(hfModelSchema);
