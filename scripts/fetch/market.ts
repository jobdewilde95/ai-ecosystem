import { fetchJson } from '../lib/http.js';
import type { FetcherResult } from '../lib/snapshot.js';
import type { TickerSeries, TickerSummary, priceBarSchema } from '../lib/schema.js';
import type { z } from 'zod';

type PriceBar = z.infer<typeof priceBarSchema>;
import { loadCompanies } from '../lib/companies.js';

/**
 * Daily closes from Yahoo's chart endpoint.
 *
 * This is an undocumented endpoint with no stability guarantee — it 429s a bare
 * client and its v7 batch-quote sibling now demands a session crumb. It is
 * isolated in this one file precisely so swapping in a different provider is a
 * single-file change.
 */

const CHART = (ticker: string, range: string) =>
  `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}` +
  `?range=${range}&interval=1d`;

/** Benchmarks carried alongside the AI names for relative-strength work. */
export const BENCHMARKS = ['SPY', 'QQQ', 'SMH'];

interface RawChart {
  chart?: {
    result?: Array<{
      meta?: { currency?: string };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{ close?: Array<number | null>; volume?: Array<number | null> }>;
        adjclose?: Array<{ adjclose?: Array<number | null> }>;
      };
    }>;
    error?: { description?: string } | null;
  };
}

function parseChart(ticker: string, raw: RawChart): TickerSeries | null {
  const result = raw.chart?.result?.[0];
  const timestamps = result?.timestamp;
  if (!result || !timestamps || timestamps.length === 0) return null;

  // Adjusted closes where available, so splits and dividends do not show up as
  // fake drawdowns in the relative-strength charts.
  const adjusted = result.indicators?.adjclose?.[0]?.adjclose;
  const closes = adjusted ?? result.indicators?.quote?.[0]?.close;
  const volumes = result.indicators?.quote?.[0]?.volume;
  if (!closes) return null;

  const bars = timestamps
    .map((timestamp, index) => {
      const close = closes[index];
      if (close === null || close === undefined || !Number.isFinite(close)) return null;
      const volume = volumes?.[index];
      return {
        date: new Date(timestamp * 1000).toISOString().slice(0, 10),
        close: Number(close.toFixed(4)),
        volume: typeof volume === 'number' && Number.isFinite(volume) ? volume : null,
      };
    })
    .filter((bar): bar is NonNullable<typeof bar> => bar !== null);

  if (bars.length === 0) return null;
  return { ticker, currency: result.meta?.currency ?? null, bars };
}

async function fetchSeries(
  range: string,
): Promise<{ series: TickerSeries[]; failures: string[]; attempted: number }> {
  const companies = await loadCompanies();
  const tickers = [
    ...BENCHMARKS,
    ...companies.map((company) => company.ticker).filter((t): t is string => Boolean(t)),
  ];

  const series: TickerSeries[] = [];
  const failures: string[] = [];

  for (const ticker of tickers) {
    try {
      const raw = await fetchJson<RawChart>(CHART(ticker, range));
      const parsed = parseChart(ticker, raw);
      if (parsed) series.push(parsed);
      else failures.push(`${ticker}: empty series`);
    } catch (error) {
      failures.push(`${ticker}: ${error instanceof Error ? error.message : error}`);
    }
  }
  return { series, failures, attempted: tickers.length };
}

/** Percent change from the close `daysBack` calendar days before the last bar. */
function returnOver(bars: PriceBar[], daysBack: number): number | null {
  const last = bars.at(-1);
  if (!last) return null;
  const target = new Date(Date.parse(last.date) - daysBack * 86_400_000)
    .toISOString()
    .slice(0, 10);
  // Walk back to the last bar at or before the target date, so holidays and
  // weekends resolve to the nearest prior session rather than returning null.
  let reference: PriceBar | null = null;
  for (const bar of bars) {
    if (bar.date <= target) reference = bar;
    else break;
  }
  if (!reference || reference.close === 0) return null;
  return ((last.close - reference.close) / reference.close) * 100;
}

function ytdReturn(bars: PriceBar[]): number | null {
  const last = bars.at(-1);
  if (!last) return null;
  const yearStart = `${last.date.slice(0, 4)}-01-01`;
  const first = bars.find((bar) => bar.date >= yearStart);
  if (!first || first.close === 0) return null;
  return ((last.close - first.close) / first.close) * 100;
}

/** Deepest peak-to-trough decline over the series, as a negative percentage. */
function maxDrawdown(bars: PriceBar[]): number | null {
  if (bars.length === 0) return null;
  let peak = bars[0].close;
  let worst = 0;
  for (const bar of bars) {
    if (bar.close > peak) peak = bar.close;
    if (peak > 0) {
      const drawdown = ((bar.close - peak) / peak) * 100;
      if (drawdown < worst) worst = drawdown;
    }
  }
  return worst;
}

function summarise(series: TickerSeries): TickerSummary | null {
  const bars = series.bars;
  const last = bars.at(-1);
  if (!last) return null;
  const yearAgo = new Date(Date.parse(last.date) - 365 * 86_400_000).toISOString().slice(0, 10);
  const trailingYear = bars.filter((bar) => bar.date >= yearAgo);
  const closes = trailingYear.map((bar) => bar.close);

  return {
    ticker: series.ticker,
    currency: series.currency,
    latestDate: last.date,
    latestClose: last.close,
    returns: {
      d1: returnOver(bars, 1),
      w1: returnOver(bars, 7),
      m1: returnOver(bars, 30),
      m3: returnOver(bars, 91),
      m6: returnOver(bars, 182),
      y1: returnOver(bars, 365),
      ytd: ytdReturn(bars),
    },
    high52w: closes.length > 0 ? Math.max(...closes) : null,
    low52w: closes.length > 0 ? Math.min(...closes) : null,
    maxDrawdownPct: maxDrawdown(bars),
    barCount: bars.length,
  };
}

export async function fetchMarket(range = '5y'): Promise<FetcherResult<TickerSummary[]>> {
  const { series, failures, attempted } = await fetchSeries(range);

  // A handful of delistings or bad symbols is normal; losing most of the list
  // means we are being rate-limited and should keep the previous snapshot.
  if (series.length < attempted * 0.5) {
    throw new Error(
      `Only ${series.length}/${attempted} tickers fetched. First failure: ${failures[0] ?? 'n/a'}`,
    );
  }
  if (failures.length > 0) {
    console.warn(`  market: ${failures.length} tickers failed: ${failures.slice(0, 3).join('; ')}`);
  }

  const summaries = series
    .map(summarise)
    .filter((summary): summary is TickerSummary => summary !== null);

  // Every bar is offered to the history writer; rows already recorded for a
  // (ticker, date) are skipped, so the first run backfills the full range and
  // later runs append only the new session.
  const rows = series.flatMap((entry) =>
    entry.bars.map((bar) => ({
      date: bar.date,
      key: entry.ticker,
      close: bar.close,
      volume: bar.volume,
    })),
  );

  return {
    data: summaries,
    recordCount: summaries.length,
    history: { series: 'market-close', rows, trackedFields: ['close'], alwaysAppend: true },
  };
}
