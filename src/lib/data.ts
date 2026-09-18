import fs from 'node:fs';
import path from 'node:path';
import type {
  Basket, ChangeEntry, Company, FrontierPoint, Fundamentals, ModelRow,
  Snapshot, Staleness, TickerSummary,
} from './types';

/**
 * Build-time data access.
 *
 * Everything is read synchronously from committed JSON during the static
 * export — there is no runtime fetch anywhere in the app. That is what lets the
 * site keep serving correct (if dated) numbers when an upstream is down, and it
 * means `next build` works with the network disabled.
 */

const DATA_DIR = path.join(process.cwd(), 'data');

function readJson<T>(relativePath: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, relativePath), 'utf8')) as T;
  } catch {
    // A missing file is a real condition (a source that has never succeeded),
    // not a crash: pages degrade to an empty state with a staleness badge.
    return fallback;
  }
}

function readSnapshot<T>(name: string, fallback: T): Snapshot<T> {
  return readJson<Snapshot<T>>(`snapshots/latest/${name}.json`, {
    source: name, fetchedAt: '', stale: true, lastSuccessAt: '',
    recordCount: 0, data: fallback, staleReason: 'snapshot not found',
  });
}

export const getCompanies = (): Company[] => readJson<Company[]>('curated/companies.json', []);
export const getFundamentals = (): Fundamentals[] => readJson<Fundamentals[]>('derived/fundamentals.json', []);
export const getModels = (): ModelRow[] => readJson<ModelRow[]>('derived/models.json', []);
export const getBaskets = (): Basket[] => readJson<Basket[]>('derived/baskets.json', []);
export const getStaleness = (): Staleness =>
  readJson<Staleness>('derived/staleness.json', { generatedAt: '', sources: {} });

export const getFrontier = (): { note: string; curves: Array<{ threshold: number; points: FrontierPoint[] }> } =>
  readJson('derived/frontier.json', { note: '', curves: [] });

export const getCostDecline = (): {
  note: string;
  seeded: Array<{ month: string; price: number; model: string; provider: string }>;
  live: Array<{ month: string; price: number; model: string; provider: string }>;
} => readJson('derived/cost-decline.json', { note: '', seeded: [], live: [] });

export interface CapitalData {
  note: string;
  funding: Array<{
    id: string; company: string; companyName: string; date: string; round: string;
    amountUsd: number | null; postMoneyUsd: number | null; leadInvestors: string[];
    note?: string; confidence: string;
  }>;
  deals: Array<{
    id: string; date: string; from: string; to: string; fromName: string; toName: string;
    type: string; amountUsd: number | null; circular: boolean; description: string; confidence: string;
  }>;
  debt: Array<{
    id: string; issuer: string; issuerName: string; date: string; instrument: string;
    amountUsd: number; collateral?: string; counterparties?: string[];
    description: string; confidence: string;
  }>;
  valuations: Array<{ company: string; name: string; postMoneyUsd: number | null; date: string; round: string }>;
  circularity: Array<{
    id: string; name: string; exposure: import('./types').DerivedMetric;
    inboundCount: number; outboundCount: number; circularUsd: number; totalInboundUsd: number;
  }>;
  fundingByYear: Array<{ year: string; total: number }>;
  debtByYear: Array<{ year: string; total: number }>;
  totals: {
    disclosedFunding: number; disclosedDebt: number;
    disclosedDealValue: number; circularDealValue: number;
  };
}

export const getCapital = (): CapitalData =>
  readJson<CapitalData>('derived/capital.json', {
    note: '', funding: [], deals: [], debt: [], valuations: [], circularity: [],
    fundingByYear: [], debtByYear: [],
    totals: { disclosedFunding: 0, disclosedDebt: 0, disclosedDealValue: 0, circularDealValue: 0 },
  });

export interface SupplyChainLayer {
  layer: string;
  companies: Array<{
    id: string; name: string; type: 'public' | 'private'; ticker: string | null;
    country: string; role: string; tags: string[];
    latestValuation: number | null; marketReturnYtd: number | null; ttmCapex: number | null;
  }>;
  publicCount: number;
  privateCount: number;
  bottleneckCount: number;
  ttmCapex: number;
  basket: import('./types').Basket | null;
}

export const getSupplyChain = (): SupplyChainLayer[] =>
  readJson<SupplyChainLayer[]>('derived/supply-chain.json', []);

export const getComputeTrend = (): Array<{ model: string; organization: string; date: string; flop: number; parameters: number | null }> =>
  readJson('derived/compute-trend.json', []);

export const getKpis = () =>
  readJson<{
    generatedAt: string;
    hyperscalerTtmCapex: number | null;
    hyperscalerCapexCoverage: number | null;
    trackedLongTermDebt: number | null;
    trackedTtmDebtIssuance: number | null;
    modelsTracked: number;
    cheapestFrontier: FrontierPoint | null;
    bestValueModel: { name: string; creator: string; ratio: number | null } | null;
    aiBasketVsSpy: import('./types').DerivedMetric | null;
  }>('derived/kpis.json', {
    generatedAt: '', hyperscalerTtmCapex: null, hyperscalerCapexCoverage: null,
    trackedLongTermDebt: null, trackedTtmDebtIssuance: null, modelsTracked: 0,
    cheapestFrontier: null, bestValueModel: null, aiBasketVsSpy: null,
  });

export const getMarket = (): Snapshot<TickerSummary[]> => readSnapshot<TickerSummary[]>('market', []);

export const getChangelog = (): { generatedAt: string; entries: ChangeEntry[] } =>
  readJson('changelog.json', { generatedAt: '', entries: [] });

export const getFilings = () =>
  readSnapshot<Array<{ ticker: string; form: string; filed: string; primaryDoc: string; items: string | null }>>('filings', []);

/** Curated datasets are optional: the app renders without them. */
export const getCurated = <T,>(name: string): T[] => readJson<T[]>(`curated/${name}.json`, []);

/** Reads the last N lines of an NDJSON history series. */
export function getHistory(series: string, limit?: number): Array<Record<string, unknown>> {
  try {
    const raw = fs.readFileSync(path.join(DATA_DIR, 'history', `${series}.ndjson`), 'utf8');
    const lines = raw.split('\n').filter((line) => line.trim().length > 0);
    const slice = limit ? lines.slice(-limit) : lines;
    return slice.map((line) => JSON.parse(line) as Record<string, unknown>);
  } catch {
    return [];
  }
}
