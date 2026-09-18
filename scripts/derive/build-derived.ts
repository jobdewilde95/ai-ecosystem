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
  basketRelativeStrength, circularityExposure, ttm,
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

  /*
   * Two series on deliberately separate bases, never to be spliced into one
   * line. `seeded` is the cheapest published list price among models positioned
   * as flagships; `live` is the cheapest model clearing a fixed benchmark score.
   * Joined end to end they drew a step from $0.478 to $10.00 — an apparent
   * 2000% price rise that is purely an artefact of the changed definition.
   */
  await write('cost-decline', {
    note:
      'Two separate measures, not a continuous series. `seeded` is the cheapest published ' +
      'flagship list price (2023-2025). `live` is the cheapest model clearing a fixed ' +
      'Artificial Analysis intelligence score. They answer different questions and must not be ' +
      'joined into one line.',
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

  /* --- capital: funding, deals, debt ------------------------------------ */

  interface FundingRound { id: string; company: string; date: string; round: string; amountUsd: number | null; postMoneyUsd: number | null; leadInvestors: string[]; note?: string; confidence: string }
  interface Deal { id: string; date: string; from: string; to: string; type: string; amountUsd: number | null; circular: boolean; description: string; confidence: string }
  interface DebtItem { id: string; issuer: string; date: string; instrument: string; amountUsd: number; collateral?: string; counterparties?: string[]; description: string; confidence: string }

  const [funding, deals, debt] = await Promise.all([
    readCurated<FundingRound[]>('funding', []),
    readCurated<Deal[]>('deals', []),
    readCurated<DebtItem[]>('debt', []),
  ]);

  const nameOf = new Map(companies.map((company) => [company.id, company.name] as const));
  const label = (id: string) => nameOf.get(id) ?? id;

  // Latest disclosed valuation per private company, with the round behind it.
  const latestValuation = new Map<string, FundingRound>();
  for (const round of funding) {
    if (round.postMoneyUsd === null) continue;
    const current = latestValuation.get(round.company);
    if (!current || round.date > current.date) latestValuation.set(round.company, round);
  }

  const circularity = [...new Set(deals.flatMap((deal) => [deal.from, deal.to]))]
    .map((entityId) => ({
      id: entityId,
      name: label(entityId),
      exposure: circularityExposure(entityId, deals),
      inboundCount: deals.filter((deal) => deal.to === entityId).length,
      outboundCount: deals.filter((deal) => deal.from === entityId).length,
    }))
    .map((entry) => ({
      ...entry,
      circularUsd: Number(entry.exposure.inputs.circularUsd ?? 0),
      totalInboundUsd: Number(entry.exposure.inputs.totalInboundUsd ?? 0),
    }))
    .filter((entry) => entry.exposure.value !== null)
    /*
     * Ranked by absolute circular capital, not by share. A single $700M
     * supplier investment and $365B of interlocking commitments both compute
     * to 100%, and ranking on the percentage would put them side by side as
     * though they were the same finding.
     */
    .sort((a, b) => b.circularUsd - a.circularUsd);

  const byYear = (records: Array<{ date: string; amount: number | null }>) => {
    const years = new Map<string, number>();
    for (const record of records) {
      if (record.amount === null) continue;
      const year = record.date.slice(0, 4);
      years.set(year, (years.get(year) ?? 0) + record.amount);
    }
    return [...years.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([year, total]) => ({ year, total }));
  };

  await write('capital', {
    note:
      'Announced figures, not cash deployed. Multi-year commitments and staged investments are ' +
      'recorded at their headline amount. Coverage is limited to publicly disclosed terms.',
    funding: funding.map((round) => ({ ...round, companyName: label(round.company) })),
    deals: deals.map((deal) => ({ ...deal, fromName: label(deal.from), toName: label(deal.to) })),
    debt: debt.map((item) => ({ ...item, issuerName: label(item.issuer) })),
    valuations: [...latestValuation.values()]
      .map((round) => ({
        company: round.company,
        name: label(round.company),
        postMoneyUsd: round.postMoneyUsd,
        date: round.date,
        round: round.round,
      }))
      .sort((a, b) => (b.postMoneyUsd ?? 0) - (a.postMoneyUsd ?? 0)),
    circularity,
    fundingByYear: byYear(funding.map((r) => ({ date: r.date, amount: r.amountUsd }))),
    debtByYear: byYear(debt.map((d) => ({ date: d.date, amount: d.amountUsd }))),
    totals: {
      disclosedFunding: funding.reduce((sum, r) => sum + (r.amountUsd ?? 0), 0),
      disclosedDebt: debt.reduce((sum, d) => sum + d.amountUsd, 0),
      disclosedDealValue: deals.reduce((sum, d) => sum + (d.amountUsd ?? 0), 0),
      circularDealValue: deals
        .filter((deal) => deal.circular)
        .reduce((sum, d) => sum + (d.amountUsd ?? 0), 0),
    },
  });

  /* --- capital events observed in filings -------------------------------- */

  /*
   * The curated deal, funding and debt records are hand-maintained and
   * therefore end wherever the maintainer's knowledge ends — at the time of
   * writing, December 2025, while SEC filings showed $221.7B of debt raised
   * during 2026 that the curated view knew nothing about.
   *
   * This section is derived entirely from primary sources, so it cannot go
   * stale the same way: filed debt issuance from XBRL, and the 8-K item codes
   * that mark material agreements and new financial obligations. It will not
   * name a counterparty the way a curated record does — a filing index cannot —
   * but it is evidence that something happened, dated, with a link to the
   * document.
   */
  interface Filing {
    ticker: string; form: string; filed: string; reportDate: string | null;
    primaryDoc: string; accession: string; items: string | null;
  }
  const filingsSnapshot = await readSnapshot<Filing[]>('filings');
  const filings = filingsSnapshot?.data ?? [];

  /** The 8-K items that signal a deal or a new obligation. */
  const ITEM_MEANING: Record<string, string> = {
    '1.01': 'Entry into a material definitive agreement',
    '1.02': 'Termination of a material definitive agreement',
    '2.01': 'Completion of acquisition or disposition',
    '2.03': 'Creation of a direct financial obligation',
    '3.02': 'Unregistered sale of equity securities',
  };

  const classify = (filing: Filing): { kind: string; detail: string } | null => {
    if (filing.form.startsWith('S-3')) {
      return { kind: 'shelf', detail: 'Shelf registration — capacity to issue securities' };
    }
    if (filing.form.startsWith('424B')) {
      return { kind: 'pricing', detail: 'Pricing supplement — a specific issuance priced' };
    }
    if (filing.form === '8-K' && filing.items) {
      for (const raw of filing.items.split(',')) {
        const code = raw.trim().split(' ')[0];
        if (ITEM_MEANING[code]) return { kind: `item-${code}`, detail: ITEM_MEANING[code] };
      }
    }
    return null;
  };

  const tickerToCompany = new Map(
    companies.filter((c) => c.ticker).map((c) => [c.ticker as string, c] as const),
  );

  const filedEvents = filings
    .map((filing) => {
      const classified = classify(filing);
      if (!classified) return null;
      return {
        ticker: filing.ticker,
        name: tickerToCompany.get(filing.ticker)?.name ?? filing.ticker,
        filed: filing.filed,
        form: filing.form,
        kind: classified.kind,
        detail: classified.detail,
        href: filing.primaryDoc,
      };
    })
    .filter((event): event is NonNullable<typeof event> => event !== null)
    .sort((a, b) => b.filed.localeCompare(a.filed));

  // Filed debt issuance per company per quarter, from XBRL rather than the
  // filing index — actual dollars, not just the fact of a filing.
  const filedDebtByQuarter: Array<{ end: string; ticker: string; name: string; value: number }> = [];
  for (const entry of sec?.data ?? []) {
    for (const fact of entry.metrics.debtIssuanceProceeds ?? []) {
      if (fact.value > 0) {
        filedDebtByQuarter.push({
          end: fact.end,
          ticker: entry.ticker,
          name: tickerToCompany.get(entry.ticker)?.name ?? entry.ticker,
          value: fact.value,
        });
      }
    }
  }
  filedDebtByQuarter.sort((a, b) => b.end.localeCompare(a.end));

  const byPeriod = new Map<string, number>();
  for (const row of filedDebtByQuarter) {
    const quarter = `${row.end.slice(0, 4)}-Q${Math.floor(Number(row.end.slice(5, 7)) / 3.01) + 1}`;
    byPeriod.set(quarter, (byPeriod.get(quarter) ?? 0) + row.value);
  }

  const curatedThrough = [
    ...deals.map((d) => d.date),
    ...funding.map((f) => f.date),
    ...debt.map((d) => d.date),
  ].sort().at(-1) ?? null;

  await write('filed-events', {
    note:
      'Derived entirely from SEC filings, so it stays current without hand-maintenance. It ' +
      'evidences that a financing or agreement occurred and links the document; it does not ' +
      'name counterparties or terms, which only the filing text or reporting can supply.',
    curatedThrough,
    events: filedEvents.slice(0, 400),
    debtByQuarter: [...byPeriod.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([quarter, total]) => ({ quarter, total })),
    debtDetail: filedDebtByQuarter.slice(0, 120),
  });

  /* --- supply chain rollup ---------------------------------------------- */

  const fundamentalsByTicker = new Map(fundamentals.map((entry) => [entry.ticker, entry] as const));
  const supplyChain = layers.map((layer) => {
    const members = companies.filter((company) => company.layers.includes(layer));
    const listed = members.filter((company) => company.ticker);
    const layerFundamentals = listed
      .map((company) => fundamentalsByTicker.get(company.ticker as string))
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

    return {
      layer,
      companies: members.map((company) => ({
        id: company.id,
        name: company.name,
        type: company.type,
        ticker: company.ticker,
        country: company.country,
        role: company.role,
        tags: company.tags,
        latestValuation: latestValuation.get(company.id)?.postMoneyUsd ?? null,
        marketReturnYtd:
          company.ticker
            ? (summaryByTicker.get(company.ticker)?.returns.ytd ?? null)
            : null,
        ttmCapex: company.ticker
          ? (fundamentalsByTicker.get(company.ticker)?.ttm.capex ?? null)
          : null,
      })),
      publicCount: listed.length,
      privateCount: members.length - listed.length,
      bottleneckCount: members.filter((company) => company.tags.includes('bottleneck')).length,
      ttmCapex: layerFundamentals.reduce((sum, entry) => sum + (entry.ttm.capex ?? 0), 0),
      basket: baskets.find((basket) => basket.layer === layer) ?? null,
    };
  });
  await write('supply-chain', supplyChain);

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
    disclosedPrivateFunding: funding.reduce((sum, r) => sum + (r.amountUsd ?? 0), 0),
    disclosedAiDebt: debt.reduce((sum, d) => sum + d.amountUsd, 0),
    topValuation: [...latestValuation.values()].sort(
      (a, b) => (b.postMoneyUsd ?? 0) - (a.postMoneyUsd ?? 0),
    )[0] ?? null,
    mostCircular: circularity[0] ?? null,
  });

  console.log(
    `Derived: ${fundamentals.length} companies, ${models.length} models, ` +
    `${baskets.length} baskets, ${computeTrend.length} compute points, ` +
    `${deals.length} deals, ${funding.length} rounds, ${debt.length} debt items`,
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
