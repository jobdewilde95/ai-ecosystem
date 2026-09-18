/**
 * Derived metrics.
 *
 * Every function here is pure and every result carries the formula and the
 * inputs that produced it, so the UI can show its own derivation. On a tool
 * meant for investment decisions, a number you cannot audit is worse than no
 * number: these are opinions expressed as arithmetic, and the reader is
 * entitled to disagree with the arithmetic.
 */

export interface DerivedMetric {
  value: number | null;
  formula: string;
  inputs: Record<string, number | string | null>;
  unit: 'percent' | 'ratio' | 'usd' | 'index' | 'count';
  /** Set when the inputs are too sparse or stale to trust the output. */
  caveat?: string;
}

const metric = (
  value: number | null,
  formula: string,
  inputs: Record<string, number | string | null>,
  unit: DerivedMetric['unit'],
  caveat?: string,
): DerivedMetric => ({ value, formula, inputs, unit, caveat });

export interface Fact {
  end: string;
  start?: string | null;
  value: number;
}

/** Sum of the last four quarters, or null when fewer than four exist. */
export function ttm(facts: Fact[] | undefined): number | null {
  if (!facts || facts.length < 4) return null;
  return facts.slice(-4).reduce((sum, fact) => sum + fact.value, 0);
}

const latest = (facts: Fact[] | undefined): Fact | null =>
  facts && facts.length > 0 ? facts[facts.length - 1] : null;

/* ------------------------------------------------------------------ capex */

/**
 * Can operations pay for the buildout?
 *
 * Below 1.0 means capex exceeds the cash the business generates, so the
 * difference is coming from the balance sheet or from debt. It is the single
 * cleanest read on whether AI capex is self-funding.
 */
export function capexCoverage(
  operatingCashFlow: Fact[] | undefined,
  capex: Fact[] | undefined,
): DerivedMetric {
  const ocf = ttm(operatingCashFlow);
  const cap = ttm(capex);
  const value = ocf !== null && cap !== null && cap !== 0 ? ocf / cap : null;
  // A negative ratio means operations consumed cash, which is a different
  // condition from merely out-spending them and must not read as one.
  const caveat =
    ocf !== null && ocf < 0
      ? 'Operations consumed cash over the trailing year'
      : value !== null && value < 1
        ? 'Capex exceeds operating cash flow'
        : undefined;
  return metric(
    value,
    'TTM operating cash flow ÷ TTM capex',
    { ttmOperatingCashFlow: ocf, ttmCapex: cap },
    'ratio',
    caveat,
  );
}

/** Capex as a share of revenue — how much of the top line is being reinvested. */
export function capexIntensity(
  capex: Fact[] | undefined,
  revenue: Fact[] | undefined,
): DerivedMetric {
  const cap = ttm(capex);
  const rev = ttm(revenue);
  const value = cap !== null && rev !== null && rev !== 0 ? (cap / rev) * 100 : null;
  return metric(
    value,
    '(TTM capex ÷ TTM revenue) × 100',
    { ttmCapex: cap, ttmRevenue: rev },
    'percent',
  );
}

/**
 * Depreciation growth against revenue growth.
 *
 * Capex becomes depreciation on a lag. When D&A compounds faster than revenue,
 * yesterday's buildout is eating today's margin — the mechanism by which an
 * infrastructure cycle turns into an earnings problem.
 */
export function depreciationDrag(
  depreciation: Fact[] | undefined,
  revenue: Fact[] | undefined,
): DerivedMetric {
  const growth = (facts: Fact[] | undefined): number | null => {
    if (!facts || facts.length < 8) return null;
    const current = ttm(facts);
    const priorYear = facts.slice(-8, -4).reduce((sum, fact) => sum + fact.value, 0);
    if (current === null || priorYear === 0) return null;
    return ((current - priorYear) / priorYear) * 100;
  };
  const daGrowth = growth(depreciation);
  const revGrowth = growth(revenue);
  const value = daGrowth !== null && revGrowth !== null ? daGrowth - revGrowth : null;
  return metric(
    value,
    'TTM D&A growth % − TTM revenue growth %',
    { daGrowthPct: daGrowth, revenueGrowthPct: revGrowth },
    'percent',
    value !== null && value > 0 ? 'Depreciation compounding faster than revenue' : undefined,
  );
}

/* ------------------------------------------------------------------- debt */

/** Share of operating income consumed by interest. */
export function interestBurden(
  interestExpense: Fact[] | undefined,
  operatingIncome: Fact[] | undefined,
): DerivedMetric {
  const interest = ttm(interestExpense);
  const income = ttm(operatingIncome);
  const value = interest !== null && income !== null && income > 0 ? (interest / income) * 100 : null;
  return metric(
    value,
    '(TTM interest expense ÷ TTM operating income) × 100',
    { ttmInterestExpense: interest, ttmOperatingIncome: income },
    'percent',
    value !== null && value > 25 ? 'Interest consuming a quarter of operating income' : undefined,
  );
}

/** Principal coming due within a year against cash on hand. */
export function nearTermRefinancingRisk(
  debtDueNext12Months: Fact[] | undefined,
  cash: Fact[] | undefined,
): DerivedMetric {
  const due = latest(debtDueNext12Months)?.value ?? null;
  const onHand = latest(cash)?.value ?? null;
  const value = due !== null && onHand !== null && onHand !== 0 ? due / onHand : null;
  return metric(
    value,
    'Principal due within 12 months ÷ cash and equivalents',
    { debtDueNext12Months: due, cash: onHand },
    'ratio',
    value !== null && value > 1 ? 'Maturities exceed cash on hand' : undefined,
  );
}

/* --------------------------------------------------------- token economics */

export interface PricedModel {
  id: string;
  name: string;
  creator: string;
  blended3to1: number | null;
  intelligenceIndex: number | null;
  releaseDate?: string | null;
}

/**
 * Index points per dollar per million blended tokens.
 *
 * The efficiency frontier: how much capability a dollar of inference buys.
 * Rising over time is the strongest evidence that model economics improve
 * faster than they inflate.
 */
export function intelligencePerDollar(model: PricedModel): DerivedMetric {
  const { intelligenceIndex, blended3to1 } = model;
  const value =
    intelligenceIndex !== null && blended3to1 !== null && blended3to1 > 0
      ? intelligenceIndex / blended3to1
      : null;
  return metric(
    value,
    'Intelligence index ÷ blended $/Mtok (3:1 input:output)',
    { intelligenceIndex, blendedPricePerMtok: blended3to1, model: model.name },
    'ratio',
  );
}

/**
 * Cheapest model clearing a fixed quality bar, per release month.
 *
 * Holding quality constant and watching price is the honest way to measure
 * cost decline. Headline price cuts flatter themselves by comparing models of
 * different capability; this does not.
 */
export function frontierCostCurve(
  models: PricedModel[],
  qualityThreshold: number,
): Array<{ month: string; cheapestPerMtok: number; model: string; creator: string }> {
  const qualified = models.filter(
    (model) =>
      model.intelligenceIndex !== null &&
      model.intelligenceIndex >= qualityThreshold &&
      model.blended3to1 !== null &&
      model.blended3to1 > 0 &&
      model.releaseDate,
  );

  const byMonth = new Map<string, PricedModel[]>();
  for (const model of qualified) {
    const month = (model.releaseDate as string).slice(0, 7);
    const bucket = byMonth.get(month) ?? [];
    bucket.push(model);
    byMonth.set(month, bucket);
  }

  const months = [...byMonth.keys()].sort();
  const curve: Array<{ month: string; cheapestPerMtok: number; model: string; creator: string }> = [];
  // The frontier is monotonic by construction: once a price clears the bar it
  // stays available, so the curve tracks the best price seen up to each month
  // rather than only models released in it.
  let best: PricedModel | null = null;
  for (const month of months) {
    for (const model of byMonth.get(month) ?? []) {
      if (!best || (model.blended3to1 as number) < (best.blended3to1 as number)) best = model;
    }
    if (best) {
      curve.push({
        month,
        cheapestPerMtok: best.blended3to1 as number,
        model: best.name,
        creator: best.creator,
      });
    }
  }
  return curve;
}

/* ------------------------------------------------------------ circularity */

export interface DealEdge {
  from: string;
  to: string;
  type: string;
  amountUsd: number | null;
  circular?: boolean;
}

/**
 * Share of an entity's disclosed inbound commitments that trace back to its own
 * capital — a supplier investing in a customer that buys its product.
 *
 * This is the central bear case on AI infrastructure demand, and it is only as
 * complete as what has been publicly disclosed. It measures reported structure,
 * never the true economics.
 */
export function circularityExposure(entityId: string, deals: DealEdge[]): DerivedMetric {
  const inbound = deals.filter((deal) => deal.to === entityId && deal.amountUsd !== null);
  const total = inbound.reduce((sum, deal) => sum + (deal.amountUsd as number), 0);
  const circular = inbound
    .filter((deal) => deal.circular)
    .reduce((sum, deal) => sum + (deal.amountUsd as number), 0);
  const value = total > 0 ? (circular / total) * 100 : null;
  return metric(
    value,
    '(Disclosed circular inbound $ ÷ total disclosed inbound $) × 100',
    { circularUsd: circular, totalInboundUsd: total, dealCount: inbound.length },
    'percent',
    'Reflects disclosed deals only; private terms are not captured',
  );
}

/* ---------------------------------------------------------------- markets */

export interface Summary {
  ticker: string;
  returns: { d1: number | null; m1: number | null; m3: number | null; y1: number | null; ytd: number | null };
  maxDrawdownPct: number | null;
}

/** Equal-weighted basket return against a benchmark over one window. */
export function basketRelativeStrength(
  basket: Summary[],
  benchmark: Summary | undefined,
  window: 'm1' | 'm3' | 'y1' | 'ytd',
): DerivedMetric {
  const returns = basket
    .map((entry) => entry.returns[window])
    .filter((value): value is number => value !== null);
  const basketReturn =
    returns.length > 0 ? returns.reduce((sum, value) => sum + value, 0) / returns.length : null;
  const benchmarkReturn = benchmark?.returns[window] ?? null;
  const value =
    basketReturn !== null && benchmarkReturn !== null ? basketReturn - benchmarkReturn : null;
  return metric(
    value,
    `Equal-weighted basket ${window} return − benchmark ${window} return`,
    {
      basketReturnPct: basketReturn,
      benchmarkReturnPct: benchmarkReturn,
      constituents: returns.length,
      benchmark: benchmark?.ticker ?? null,
    },
    'percent',
    returns.length < basket.length ? `${basket.length - returns.length} constituents lack data` : undefined,
  );
}
