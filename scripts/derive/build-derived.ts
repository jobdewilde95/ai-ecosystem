/**
 * Computes every derived view from committed snapshots.
 *
 * Runs offline: it reads data/snapshots and data/curated and writes
 * data/derived. Keeping this separate from fetching means formulas can be
 * changed and re-run without touching an upstream, and the outputs are
 * committed so the derivation is versioned alongside the inputs.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { DATA_DIR, SNAPSHOT_DIR, CURATED_DIR } from '../lib/paths.js';
import type { Snapshot } from '../lib/snapshot.js';
import { loadCompanies, type Company } from '../lib/companies.js';
import { buildIndex, lookup } from '../lib/model-join.js';
import {
  capexCoverage, capexIntensity, depreciationDrag, interestBurden,
  nearTermRefinancingRisk, intelligencePerDollar, frontierCostCurve,
  basketRelativeStrength, ttm,
  type DerivedMetric, type Fact, type PricedModel, type Summary,
} from './analytics.js';

const DERIVED_DIR = path.join(DATA_DIR, 'derived');

async function readSnapshot<T>(name: string): Promise<Snapshot<T> | null> {
  try {
    return JSON.parse(await fs.readFile(path.join(SNAPSHOT_DIR, `${name}.json`), 'utf8')) as Snapshot<T>;
  } catch {
    return null;
  }
}

async function readCurated<T>(name: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(path.join(CURATED_DIR, `${name}.json`), 'utf8')) as T;
  } catch {
    return fallback;
  }
}

async function write(name: string, payload: unknown): Promise<void> {
  await fs.mkdir(DERIVED_DIR, { recursive: true });
  await fs.writeFile(path.join(DERIVED_DIR, `${name}.json`), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

/* ------------------------------------------------------------------ types */

interface SecCompany {
  ticker: string;
  entityName: string;
  metrics: Record<string, Fact[]>;
}

interface AaModel {
  slug: string; name: string; creator: string; releaseDate: string | null;
  pricing: { inputPerMtok: number | null; outputPerMtok: number | null; blended3to1: number | null };
  evaluations: Record<string, number | null>;
  medianOutputTokensPerSecond: number | null;
  medianTimeToFirstTokenSeconds: number | null;
}

interface OrModel {
  id: string; name: string; creator: string; createdAt: string | null;
  contextLength: number | null;
  inputModalities: string[]; outputModalities: string[];
  pricing: {
    inputPerMtok: number | null; outputPerMtok: number | null;
    cacheReadPerMtok?: number | null; cacheWritePerMtok?: number | null;
    blended3to1: number | null;
  };
}

/* --------------------------------------------------------------- pipeline */

async function main(): Promise<void> {
  const [sec, market, aa, or, epoch, companies] = await Promise.all([
    readSnapshot<SecCompany[]>('sec-financials'),
    readSnapshot<Summary[]>('market'),
    readSnapshot<AaModel[]>('artificialanalysis'),
    readSnapshot<OrModel[]>('openrouter'),
    readSnapshot<Array<{ model: string; organization: string; publicationDate: string | null; trainingComputeFlop: number | null; parameters: number | null }>>('epoch-models'),
    loadCompanies(),
  ]);

  const staleness = {
    generatedAt: new Date().toISOString(),
    sources: Object.fromEntries(
      ([['sec-financials', sec], ['market', market], ['artificialanalysis', aa],
        ['openrouter', or], ['epoch-models', epoch]] as const)
        .map(([name, snapshot]) => [name, snapshot
          ? { stale: snapshot.stale, fetchedAt: snapshot.fetchedAt, lastSuccessAt: snapshot.lastSuccessAt, records: snapshot.recordCount, reason: snapshot.staleReason ?? null }
          : { stale: true, fetchedAt: null, lastSuccessAt: null, records: 0, reason: 'snapshot missing' }]),
    ),
  };
  await write('staleness', staleness);

  /* --- company fundamentals ------------------------------------------- */

  const byTicker = new Map(companies.map((c) => [c.ticker, c] as const));
  const fundamentals = (sec?.data ?? []).map((entry) => {
    const m = entry.metrics;
    const company = byTicker.get(entry.ticker);
    const metrics: Record<string, DerivedMetric> = {
      capexCoverage: capexCoverage(m.operatingCashFlow, m.capex),
      capexIntensity: capexIntensity(m.capex, m.revenue),
      depreciationDrag: depreciationDrag(m.depreciationAmortization, m.revenue),
      interestBurden: interestBurden(m.interestExpense, m.operatingIncome),
      refinancingRisk: nearTermRefinancingRisk(m.debtDueNext12Months, m.cashAndEquivalents),
    };
    const maturityWall = [
      ['Next 12m', m.debtDueNext12Months], ['Year 2', m.debtDueYear2],
      ['Year 3', m.debtDueYear3], ['Year 4', m.debtDueYear4],
      ['Year 5', m.debtDueYear5], ['After 5y', m.debtDueAfterYear5],
    ].map(([label, facts]) => ({
      label: label as string,
      value: (facts as Fact[] | undefined)?.at(-1)?.value ?? null,
    }));

    return {
      ticker: entry.ticker,
      name: company?.name ?? entry.entityName,
      layers: company?.layers ?? [],
      tags: company?.tags ?? [],
      ttm: {
        revenue: ttm(m.revenue), capex: ttm(m.capex),
        operatingCashFlow: ttm(m.operatingCashFlow),
        depreciation: ttm(m.depreciationAmortization),
        interestExpense: ttm(m.interestExpense),
        debtIssuance: ttm(m.debtIssuanceProceeds),
      },
      latest: {
        longTermDebt: m.longTermDebt?.at(-1)?.value ?? null,
        cash: m.cashAndEquivalents?.at(-1)?.value ?? null,
        ppe: m.propertyPlantEquipmentNet?.at(-1)?.value ?? null,
        asOf: m.revenue?.at(-1)?.end ?? m.longTermDebt?.at(-1)?.end ?? null,
      },
      quarterly: {
        capex: (m.capex ?? []).slice(-16).map((f) => ({ end: f.end, value: f.value })),
        revenue: (m.revenue ?? []).slice(-16).map((f) => ({ end: f.end, value: f.value })),
        depreciation: (m.depreciationAmortization ?? []).slice(-16).map((f) => ({ end: f.end, value: f.value })),
        debtIssuance: (m.debtIssuanceProceeds ?? []).slice(-16).map((f) => ({ end: f.end, value: f.value })),
      },
      maturityWall,
      metrics,
    };
  });
  await write('fundamentals', fundamentals);

  /* --- unified model catalogue ---------------------------------------- */

  const orIndex = buildIndex(or?.data ?? [], (m) => m.id);
  const models = (aa?.data ?? []).map((model) => {
    const match = lookup(orIndex, model.slug);
    const priced: PricedModel = {
      id: model.slug, name: model.name, creator: model.creator,
      blended3to1: model.pricing.blended3to1,
      intelligenceIndex: model.evaluations.intelligenceIndex ?? null,
      releaseDate: model.releaseDate,
    };
    return {
      ...priced,
      pricing: model.pricing,
      evaluations: model.evaluations,
      throughput: {
        tokensPerSecond: model.medianOutputTokensPerSecond,
        timeToFirstTokenSeconds: model.medianTimeToFirstTokenSeconds,
      },
      contextLength: match?.contextLength ?? null,
      cacheReadPerMtok: match?.pricing.cacheReadPerMtok ?? null,
      cacheWritePerMtok: match?.pricing.cacheWritePerMtok ?? null,
      openRouterId: match?.id ?? null,
      intelligencePerDollar: intelligencePerDollar(priced),
    };
  });
  await write('models', models);

  const priced: PricedModel[] = models.map((m) => ({
    id: m.id, name: m.name, creator: m.creator,
    blended3to1: m.blended3to1, intelligenceIndex: m.intelligenceIndex,
    releaseDate: m.releaseDate,
  }));

  /* --- long-run cost decline ------------------------------------------ */

  /*
   * Artificial Analysis rebases its index as the frontier moves, so a 2023
   * flagship scores near zero today and the live frontier curve cannot reach
   * back beyond about six months. The seeded list prices supply the earlier
   * span; the two are kept as separate series so the seeded portion is never
   * mistaken for tracked data.
   */
  interface FlagshipPrice {
    id: string; provider: string; model: string; date: string;
    inputPerMtok: number; outputPerMtok: number; tier: string;
    blended3to1: number; note?: string;
  }
  const flagship = await readCurated<FlagshipPrice[]>('flagship-pricing', []);
  const frontierTier = flagship
    .filter((entry) => entry.tier === 'frontier')
    .sort((a, b) => a.date.localeCompare(b.date));

  const seededCurve: Array<{ month: string; price: number; model: string; provider: string }> = [];
  let cheapestSeeded: FlagshipPrice | null = null;
  for (const entry of frontierTier) {
    if (!cheapestSeeded || entry.blended3to1 < cheapestSeeded.blended3to1) cheapestSeeded = entry;
    const month = entry.date.slice(0, 7);
    const existing = seededCurve.at(-1);
    const point = {
      month,
      price: cheapestSeeded.blended3to1,
      model: cheapestSeeded.model,
      provider: cheapestSeeded.provider,
    };
    // One point per month: a repricing mid-month replaces that month's value.
    if (existing?.month === month) seededCurve[seededCurve.length - 1] = point;
    else seededCurve.push(point);
  }

  const liveCurve = frontierCostCurve(priced, 40).map((point) => ({
    month: point.month,
    price: point.cheapestPerMtok,
    model: point.model,
    provider: point.creator,
  }));

  await write('cost-decline', {
    note:
      'Cheapest frontier-tier blended $/Mtok over time. The seeded span comes from published ' +
      'list prices and is marked as such; the tracked span is computed from live pricing and ' +
      'Artificial Analysis quality scores.',
    seeded: seededCurve,
    live: liveCurve,
  });

  /* --- frontier cost curves ------------------------------------------- */

  // Several bars, because "the frontier got cheaper" depends entirely on which
  // capability level you hold fixed.
  const thresholds = [20, 30, 40, 50];
  await write('frontier', {
    note: 'Cheapest blended $/Mtok available at or below each month, holding quality at or above the threshold.',
    curves: thresholds.map((threshold) => ({
      threshold,
      points: frontierCostCurve(priced, threshold),
    })),
  });

  /* --- layer baskets --------------------------------------------------- */

  const summaries = market?.data ?? [];
  const summaryByTicker = new Map(summaries.map((s) => [s.ticker, s] as const));
  const spy = summaryByTicker.get('SPY');
  const layers = [...new Set(companies.flatMap((c) => c.layers))].sort();

  const baskets = layers.map((layer) => {
    const constituents = companies
      .filter((c) => c.layers.includes(layer) && c.ticker)
      .map((c) => summaryByTicker.get(c.ticker as string))
      .filter((s): s is Summary => Boolean(s));
    return {
      layer,
      constituentCount: constituents.length,
      tickers: constituents.map((c) => c.ticker),
      relativeStrength: {
        m1: basketRelativeStrength(constituents, spy, 'm1'),
        m3: basketRelativeStrength(constituents, spy, 'm3'),
        ytd: basketRelativeStrength(constituents, spy, 'ytd'),
        y1: basketRelativeStrength(constituents, spy, 'y1'),
      },
      averageReturns: {
        m1: average(constituents.map((c) => c.returns.m1)),
        m3: average(constituents.map((c) => c.returns.m3)),
        ytd: average(constituents.map((c) => c.returns.ytd)),
        y1: average(constituents.map((c) => c.returns.y1)),
      },
    };
  });
  await write('baskets', baskets);

  /* --- epoch compute trend --------------------------------------------- */

  const computeTrend = (epoch?.data ?? [])
    .filter((m) => m.trainingComputeFlop && m.publicationDate && m.publicationDate >= '2015-01-01')
    .map((m) => ({
      model: m.model, organization: m.organization,
      date: m.publicationDate as string,
      flop: m.trainingComputeFlop as number,
      parameters: m.parameters,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
  await write('compute-trend', computeTrend);

  /* --- headline KPIs ---------------------------------------------------- */

  const hyperscalers = fundamentals.filter((f) => f.tags.includes('hyperscaler'));
  const cheapestFrontier = frontierCostCurve(priced, 40).at(-1) ?? null;
  const bestValue = [...models]
    .filter((m) => m.intelligencePerDollar.value !== null)
    .sort((a, b) => (b.intelligencePerDollar.value as number) - (a.intelligencePerDollar.value as number))[0] ?? null;

  await write('kpis', {
    generatedAt: new Date().toISOString(),
    hyperscalerTtmCapex: sum(hyperscalers.map((f) => f.ttm.capex)),
    hyperscalerCapexCoverage: average(hyperscalers.map((f) => f.metrics.capexCoverage.value)),
    trackedLongTermDebt: sum(fundamentals.map((f) => f.latest.longTermDebt)),
    trackedTtmDebtIssuance: sum(fundamentals.map((f) => f.ttm.debtIssuance)),
    modelsTracked: models.length,
    cheapestFrontier,
    bestValueModel: bestValue
      ? { name: bestValue.name, creator: bestValue.creator, ratio: bestValue.intelligencePerDollar.value }
      : null,
    aiBasketVsSpy: baskets.find((b) => b.layer === 'silicon')?.relativeStrength.ytd ?? null,
  });

  console.log(
    `Derived: ${fundamentals.length} companies, ${models.length} models, ` +
    `${baskets.length} baskets, ${computeTrend.length} compute points`,
  );
}

function average(values: Array<number | null>): number | null {
  const present = values.filter((v): v is number => v !== null && Number.isFinite(v));
  return present.length > 0 ? present.reduce((a, b) => a + b, 0) / present.length : null;
}

function sum(values: Array<number | null>): number | null {
  const present = values.filter((v): v is number => v !== null && Number.isFinite(v));
  return present.length > 0 ? present.reduce((a, b) => a + b, 0) : null;
}

main().catch((error) => {
  console.error('Derive failed:', error);
  process.exit(1);
});
