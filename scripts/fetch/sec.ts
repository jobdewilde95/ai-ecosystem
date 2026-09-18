import { fetchJson } from '../lib/http.js';
import type { FetcherResult } from '../lib/snapshot.js';
import type { CompanyFinancials } from '../lib/schema.js';
import { loadCompanies } from '../lib/companies.js';
import { deriveQuarterly, durationDays, type DurationFact } from '../lib/quarterly.js';

/**
 * Pulls as-filed XBRL facts from SEC companyfacts.
 *
 * Each payload is ~2.7 MB, so this runs weekly, not daily — fundamentals only
 * move quarterly and hammering EDGAR daily for unchanged numbers would be both
 * pointless and a good way to get blocked.
 */

const COMPANYFACTS = (cik: string) => `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`;

/**
 * Companies deep-pulled for fundamentals. Deliberately narrower than the full
 * registry: these are the names where capex, debt and coverage actually drive
 * the AI thesis. Everything else is tracked on price alone.
 */
export const FINANCIALS_FOCUS = [
  'MSFT', 'GOOGL', 'AMZN', 'META', 'ORCL', 'NVDA', 'AMD', 'AVGO', 'MRVL',
  'CRWV', 'NBIS', 'APLD', 'IREN', 'CORZ', 'DELL', 'SMCI', 'VRT', 'ANET',
  'EQIX', 'DLR', 'CEG', 'VST', 'TLN', 'GEV', 'MU', 'INTC', 'PWR', 'ETN',
];

/**
 * Our metric names mapped to the US-GAAP tags companies actually use. Tags are
 * tried in order: filers are inconsistent (Alphabet reports `Revenues`, Meta
 * uses `RevenueFromContractWithCustomerExcludingAssessedTax`), so a single tag
 * per metric silently yields empty series for half the list.
 */
const METRIC_TAGS: Record<string, string[]> = {
  revenue: [
    'RevenueFromContractWithCustomerExcludingAssessedTax',
    'Revenues',
    'RevenueFromContractWithCustomerIncludingAssessedTax',
  ],
  capex: [
    'PaymentsToAcquirePropertyPlantAndEquipment',
    'PaymentsToAcquireProductiveAssets',
    'PaymentsToAcquireOtherPropertyPlantAndEquipment',
    // Data center REITs capitalise through real-estate development instead.
    'PaymentsToDevelopRealEstateAssets',
    'PaymentsToAcquireRealEstateHeldForInvestment',
    'PaymentsToAcquireRealEstate',
  ],
  operatingCashFlow: ['NetCashProvidedByUsedInOperatingActivities'],
  // Microsoft and Alphabet report plain `Depreciation`; REITs use
  // `DepreciationAndAmortization`. Candidate scoring picks whichever series
  // actually runs to the present.
  depreciationAmortization: [
    'DepreciationDepletionAndAmortization',
    'DepreciationAmortizationAndAccretionNet',
    'DepreciationAndAmortization',
    'Depreciation',
    'DepreciationNonproduction',
  ],
  propertyPlantEquipmentNet: ['PropertyPlantAndEquipmentNet'],
  operatingIncome: ['OperatingIncomeLoss'],
  netIncome: ['NetIncomeLoss'],
  researchDevelopment: ['ResearchAndDevelopmentExpense'],
  longTermDebt: [
    'LongTermDebtNoncurrent',
    'LongTermDebt',
    'LongTermNotesAndLoans',
    'LongTermNotesPayable',
    'LongTermDebtAndCapitalLeaseObligations',
    'DebtLongtermAndShorttermCombinedAmount',
    // REIT capital structures split across secured/unsecured rather than a
    // single long-term line.
    'UnsecuredDebt',
    'SecuredDebt',
    'DebtInstrumentCarryingAmount',
  ],
  // Filers split almost evenly between these: Meta and Oracle use
  // ProceedsFromIssuanceOfLongTermDebt, Alphabet only ever reports
  // ProceedsFromDebtNetOfIssuanceCosts. Missing the latter silently zeroed out
  // half the debt tracker.
  debtIssuanceProceeds: [
    'ProceedsFromIssuanceOfLongTermDebt',
    'ProceedsFromDebtNetOfIssuanceCosts',
    'ProceedsFromIssuanceOfSeniorLongTermDebt',
    'ProceedsFromIssuanceOfDebt',
    'ProceedsFromIssuanceOfUnsecuredDebt',
    'ProceedsFromNotesPayable',
    'ProceedsFromConvertibleDebt',
    'ProceedsFromDebtMaturingInMoreThanThreeMonths',
  ],
  debtRepayments: [
    'RepaymentsOfLongTermDebt',
    'RepaymentsOfDebt',
    'RepaymentsOfSeniorDebt',
    'RepaymentsOfUnsecuredDebt',
  ],
  // The maturity wall: how much principal comes due and when. The single most
  // useful disclosure for judging refinancing risk on a debt-funded buildout.
  debtDueNext12Months: ['LongTermDebtMaturitiesRepaymentsOfPrincipalInNextTwelveMonths'],
  debtDueYear2: ['LongTermDebtMaturitiesRepaymentsOfPrincipalInYearTwo'],
  debtDueYear3: ['LongTermDebtMaturitiesRepaymentsOfPrincipalInYearThree'],
  debtDueYear4: ['LongTermDebtMaturitiesRepaymentsOfPrincipalInYearFour'],
  debtDueYear5: ['LongTermDebtMaturitiesRepaymentsOfPrincipalInYearFive'],
  debtDueAfterYear5: ['LongTermDebtMaturitiesRepaymentsOfPrincipalAfterYearFive'],
  interestExpense: [
    'InterestExpense',
    'InterestExpenseNonoperating',
    'InterestExpenseDebt',
  ],
  cashAndEquivalents: ['CashAndCashEquivalentsAtCarryingValue'],
  financeLeaseLiability: ['FinanceLeaseLiabilityNoncurrent'],
};

interface RawUnit {
  start?: string;
  end: string;
  val: number;
  fy?: number;
  fp?: string;
  form: string;
  filed: string;
  frame?: string;
}

interface RawFacts {
  entityName?: string;
  facts?: Record<string, Record<string, { units?: Record<string, RawUnit[]> }>>;
}

const EARLIEST = '2019-01-01';

/**
 * Picks one fact per period. EDGAR carries restatements and repeated
 * comparatives, so the same period appears many times; the most recently filed
 * value is the one a filer currently stands behind.
 */
function dedupeByPeriod(units: RawUnit[]): RawUnit[] {
  const best = new Map<string, RawUnit>();
  for (const unit of units) {
    if (unit.end < EARLIEST) continue;
    if (!unit.form.startsWith('10-') && !unit.form.startsWith('20-') && !unit.form.startsWith('40-')) {
      continue;
    }
    const key = `${unit.start ?? ''}..${unit.end}`;
    const current = best.get(key);
    if (!current || unit.filed > current.filed) best.set(key, unit);
  }
  return [...best.values()].sort((a, b) => a.end.localeCompare(b.end));
}

/** Balance-sheet and forward-looking facts, which are instants rather than
 *  periods and so must skip the quarterly-duration filter. */
const POINT_IN_TIME = new Set([
  'propertyPlantEquipmentNet',
  'longTermDebt',
  'cashAndEquivalents',
  'financeLeaseLiability',
  'debtDueNext12Months',
  'debtDueYear2',
  'debtDueYear3',
  'debtDueYear4',
  'debtDueYear5',
  'debtDueAfterYear5',
]);

function extractMetric(raw: RawFacts, metric: string, tags: string[]) {
  type Fact = {
    fiscalYear: number;
    fiscalPeriod: string;
    end: string;
    start: string | null;
    value: number;
    form: string;
    filed: string;
    frame: string | null;
  };

  const candidates: Array<{ tag: string; facts: Fact[] }> = [];

  for (const taxonomy of ['us-gaap', 'ifrs-full']) {
    const namespace = raw.facts?.[taxonomy];
    if (!namespace) continue;
    for (const tag of tags) {
      const units = namespace[tag]?.units?.USD;
      if (!units || units.length === 0) continue;
      const deduped = dedupeByPeriod(units);
      if (deduped.length === 0) continue;

      const mapped: Fact[] = deduped.map((unit) => ({
        fiscalYear: unit.fy ?? Number(unit.end.slice(0, 4)),
        fiscalPeriod: unit.fp ?? 'NA',
        end: unit.end,
        start: unit.start ?? null,
        value: unit.val,
        form: unit.form,
        filed: unit.filed,
        frame: unit.frame ?? null,
      }));

      // Balance-sheet facts are instants and pass through untouched. Flow facts
      // arrive cumulative year-to-date and must be differenced into discrete
      // quarters before anything can chart or sum them.
      let facts: Fact[];
      if (POINT_IN_TIME.has(metric)) {
        facts = mapped.filter(
          (fact) =>
            fact.start === null || durationDays({ start: fact.start, end: fact.end }) <= 1,
        );
      } else {
        const durations = mapped.filter(
          (fact): fact is Fact & { start: string } => fact.start !== null,
        ) as DurationFact[];
        facts = deriveQuarterly(durations).map((fact) => ({
          ...fact,
          start: fact.start as string | null,
        }));
      }
      if (facts.length > 0) candidates.push({ tag, facts });
    }
  }

  if (candidates.length === 0) return null;

  /*
   * Taking the first tag that happens to carry data is wrong: Oracle files a
   * single stale `LongTermDebt` fact worth zero from 2022 alongside 80 points of
   * `LongTermNotesAndLoans` running to the present, and first-match reported
   * Oracle as debt-free while it carried $118B. Prefer the series that runs
   * closest to today, and among comparably current ones the longest history.
   */
  const latestEnd = (facts: Fact[]) => facts[facts.length - 1]?.end ?? '';
  const best = candidates.reduce((winner, candidate) => {
    const winnerEnd = Date.parse(latestEnd(winner.facts));
    const candidateEnd = Date.parse(latestEnd(candidate.facts));
    const withinSameEra = Math.abs(candidateEnd - winnerEnd) < 200 * 86_400_000;
    if (withinSameEra) {
      return candidate.facts.length > winner.facts.length ? candidate : winner;
    }
    return candidateEnd > winnerEnd ? candidate : winner;
  });

  return best.facts;
}

export async function fetchSecFinancials(): Promise<FetcherResult<CompanyFinancials[]>> {
  const companies = await loadCompanies();
  const targets = companies.filter(
    (company) => company.cik && company.ticker && FINANCIALS_FOCUS.includes(company.ticker),
  );

  const results: CompanyFinancials[] = [];
  const failures: string[] = [];

  for (const company of targets) {
    try {
      const raw = await fetchJson<RawFacts>(COMPANYFACTS(company.cik as string));
      const metrics: CompanyFinancials['metrics'] = {};
      for (const [metric, tags] of Object.entries(METRIC_TAGS)) {
        const facts = extractMetric(raw, metric, tags);
        if (facts) metrics[metric] = facts;
      }
      if (Object.keys(metrics).length === 0) continue;
      results.push({
        cik: company.cik as string,
        ticker: company.ticker as string,
        entityName: raw.entityName ?? company.name,
        metrics,
      });
    } catch (error) {
      failures.push(`${company.ticker}: ${error instanceof Error ? error.message : error}`);
    }
  }

  // Partial results are useful; a total wipeout means the API or our UA broke.
  if (results.length === 0) {
    throw new Error(`SEC returned nothing for ${targets.length} companies. ${failures[0] ?? ''}`);
  }
  if (failures.length > 0) {
    console.warn(`  sec: ${failures.length} companies failed: ${failures.slice(0, 3).join('; ')}`);
  }
  return { data: results, recordCount: results.length };
}
