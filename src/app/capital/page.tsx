import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatTile } from '@/components/ui/StatTile';
import { SeededTag } from '@/components/ui/Provenance';
import { getCapital, getFundamentals } from '@/lib/data';
import { percent, shortDate, usdCompact } from '@/lib/format';
import { FundingTable } from './FundingTable';
import { DebtTable } from './DebtTable';
import { CircularityPanel } from './CircularityPanel';
import { MaturityWall } from './MaturityWall';
import { CapitalFlowChart } from './CapitalFlowChart';

export const metadata = { title: 'Capital · AI Ecosystem' };

export default function CapitalPage() {
  const capital = getCapital();
  const fundamentals = getFundamentals();

  const { totals } = capital;
  const circularShare =
    totals.disclosedDealValue > 0
      ? (totals.circularDealValue / totals.disclosedDealValue) * 100
      : null;

  const filedDebt = fundamentals.reduce((sum, entry) => sum + (entry.latest.longTermDebt ?? 0), 0);
  const filedIssuance = fundamentals.reduce((sum, entry) => sum + (entry.ttm.debtIssuance ?? 0), 0);

  const topValuation = capital.valuations[0];

  return (
    <>
      <PageHeader
        title="Capital"
        lede={
          <>
            Where the money funding this buildout comes from: private rounds, corporate debt, and
            the partnership structures that route capital between the companies buying and selling
            compute. Filed figures come from SEC disclosures; private terms are curated from public
            reporting and carry the limits of what has actually been disclosed.
          </>
        }
        aside={<SeededTag>curated</SeededTag>}
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Filed long-term debt"
          value={usdCompact(filedDebt, 0)}
          note={`Across ${fundamentals.filter((f) => f.latest.longTermDebt).length} tracked filers, from SEC filings`}
        />
        <StatTile
          label="Debt raised, TTM"
          value={usdCompact(filedIssuance, 0)}
          note="Proceeds from debt issuance, as filed"
        />
        <StatTile
          label="Disclosed private funding"
          value={usdCompact(totals.disclosedFunding, 0)}
          note={`${capital.funding.length} rounds tracked`}
        />
        <StatTile
          label="Circular share of deals"
          value={circularShare !== null ? percent(circularShare, 0) : '—'}
          tone={circularShare !== null && circularShare > 25 ? 'warning' : 'neutral'}
          note={`${usdCompact(totals.circularDealValue, 0)} of ${usdCompact(totals.disclosedDealValue, 0)} announced`}
        />
      </div>

      <div className="mb-6">
        <Card
          title="Circular financing"
          subtitle="Deals where a supplier's capital funds the demand for its own product. This is the central structural question about AI infrastructure demand, and it is measurable only to the extent terms were disclosed."
        >
          <CircularityPanel
            entries={capital.circularity}
            deals={capital.deals.filter((deal) => deal.circular)}
          />
        </Card>
      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-2">
        <Card
          title="Capital raised by year"
          subtitle="Disclosed private rounds against corporate debt issuance. Both are announced amounts."
        >
          <CapitalFlowChart
            funding={capital.fundingByYear}
            debt={capital.debtByYear}
          />
        </Card>

        <Card
          title="Debt maturity wall"
          subtitle="Principal coming due by year, as disclosed in filings. Concentrated maturities are where a financing cycle turns into a refinancing problem."
        >
          <MaturityWall
            companies={fundamentals
              .filter((entry) => entry.maturityWall.some((bucket) => bucket.value !== null))
              .map((entry) => ({
                ticker: entry.ticker,
                name: entry.name,
                buckets: entry.maturityWall,
                cash: entry.latest.cash,
                refinancingRisk: entry.metrics.refinancingRisk,
                interestBurden: entry.metrics.interestBurden,
              }))}
          />
        </Card>
      </div>

      <div className="mb-6">
        <Card
          title="Private rounds and valuations"
          subtitle={`${capital.funding.length} rounds across ${new Set(capital.funding.map((r) => r.company)).size} companies. Post-money where disclosed.`}
          action={
            topValuation ? (
              <span className="text-[12px] text-[var(--text-muted)]">
                Highest: {topValuation.name} at {usdCompact(topValuation.postMoneyUsd, 0)}{' '}
                ({shortDate(topValuation.date)})
              </span>
            ) : undefined
          }
        >
          <FundingTable rows={capital.funding} />
        </Card>
      </div>

      <Card
        title="Debt and structured financing"
        subtitle="Bonds, GPU-backed term loans, convertibles and off-balance-sheet vehicles funding the buildout."
      >
        <DebtTable rows={capital.debt} />
      </Card>

      <p className="mt-4 text-[12px] leading-relaxed text-[var(--text-muted)]">
        {capital.note}
      </p>
    </>
  );
}
