export interface DerivedMetric {
  value: number | null;
  formula: string;
  inputs: Record<string, number | string | null>;
  unit: 'percent' | 'ratio' | 'usd' | 'index' | 'count';
  caveat?: string;
}

export interface Provenance {
  origin: 'fetched' | 'seeded' | 'curated';
  sourceUrl?: string | null;
  asOf: string;
  confidence?: 'high' | 'medium' | 'low';
}

export interface Company {
  id: string;
  name: string;
  type: 'public' | 'private';
  ticker: string | null;
  cik: string | null;
  layers: string[];
  country: string;
  role: string;
  tags: string[];
  provenance: Provenance;
}

export interface QuarterPoint { end: string; value: number }

export interface Fundamentals {
  ticker: string;
  name: string;
  layers: string[];
  tags: string[];
  ttm: {
    revenue: number | null; capex: number | null; operatingCashFlow: number | null;
    depreciation: number | null; interestExpense: number | null; debtIssuance: number | null;
  };
  latest: {
    longTermDebt: number | null; cash: number | null; ppe: number | null; asOf: string | null;
  };
  quarterly: {
    capex: QuarterPoint[]; revenue: QuarterPoint[];
    depreciation: QuarterPoint[]; debtIssuance: QuarterPoint[];
  };
  maturityWall: Array<{ label: string; value: number | null }>;
  metrics: Record<string, DerivedMetric>;
}

export interface ModelRow {
  id: string; name: string; creator: string; releaseDate: string | null;
  blended3to1: number | null;
  intelligenceIndex: number | null;
  pricing: { inputPerMtok: number | null; outputPerMtok: number | null; blended3to1: number | null };
  evaluations: Record<string, number | null>;
  throughput: { tokensPerSecond: number | null; timeToFirstTokenSeconds: number | null };
  contextLength: number | null;
  cacheReadPerMtok: number | null;
  cacheWritePerMtok: number | null;
  openRouterId: string | null;
  intelligencePerDollar: DerivedMetric;
}

export interface FrontierPoint {
  month: string; cheapestPerMtok: number; model: string; creator: string;
}

export interface Basket {
  layer: string;
  constituentCount: number;
  tickers: string[];
  relativeStrength: Record<'m1' | 'm3' | 'ytd' | 'y1', DerivedMetric>;
  averageReturns: Record<'m1' | 'm3' | 'ytd' | 'y1', number | null>;
}

export interface TickerSummary {
  ticker: string; currency: string | null; latestDate: string; latestClose: number;
  returns: { d1: number | null; w1: number | null; m1: number | null; m3: number | null;
             m6: number | null; y1: number | null; ytd: number | null };
  high52w: number | null; low52w: number | null; maxDrawdownPct: number | null; barCount: number;
}

export interface ChangeEntry {
  date: string;
  category: 'pricing' | 'models' | 'markets' | 'filings' | 'funding' | 'debt' | 'compute';
  severity: 'info' | 'notable' | 'major';
  title: string; detail?: string; changePct?: number; entity?: string; href?: string;
}

export interface SourceHealth {
  stale: boolean; fetchedAt: string | null; lastSuccessAt: string | null;
  records: number; reason: string | null;
}

export interface Staleness {
  generatedAt: string;
  sources: Record<string, SourceHealth>;
}

export interface Snapshot<T> {
  source: string; fetchedAt: string; stale: boolean; staleReason?: string;
  lastSuccessAt: string; recordCount: number; data: T;
}
