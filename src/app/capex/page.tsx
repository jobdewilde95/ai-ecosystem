import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatTile } from '@/components/ui/StatTile';
import { StalenessBadge } from '@/components/ui/Provenance';
import { getFundamentals, getStaleness } from '@/lib/data';
import { percent, ratio, shortDate, usdCompact } from '@/lib/format';
import { CapexChart } from './CapexChart';
import { CoverageChart } from './CoverageChart';
import { FundamentalsTable } from './FundamentalsTable';

export const metadata = { title: 'Capex & fundamentals · AI Ecosystem' };

export default function CapexPage() {
  const fundamentals = getFundamentals();
  const staleness = getStaleness();

  const hyperscalers = fundamentals.filter((entry) => entry.tags.includes('hyperscaler'));
  const neoclouds = fundamentals.filter((entry) => entry.tags.includes('neocloud'));

  const totalCapex = sum(hyperscalers.map((entry) => entry.ttm.capex));
  const totalRevenue = sum(hyperscalers.map((entry) => entry.ttm.revenue));
  const totalOcf = sum(hyperscalers.map((entry) => entry.ttm.operatingCashFlow));
  const neocloudCapex = sum(neoclouds.map((entry) => entry.ttm.capex));

  // Ranked by how little of the buildout operations cover — the companies most
  // dependent on outside capital are the ones the cycle turns on.
  const byCoverage = [...fundamentals]
    .filter((entry) => entry.metrics.capexCoverage.value !== null && entry.ttm.capex !== null)
    .sort(
      (a, b) =>
        (a.metrics.capexCoverage.value as number) - (b.metrics.capexCoverage.value as number),
    );

  const latestAsOf = fundamentals
    .map((entry) => entry.latest.asOf)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);

  return (
    <>
      <PageHeader
        title="Capex & fundamentals"
        lede={
          <>
            Quarterly figures as filed with the SEC, differenced out of cumulative year-to-date
            disclosures. The question underneath all of it: is the buildout being paid for out of
            operations, and is revenue catching up to the spend?
          </>
        }
        aside={
          <>
            <StalenessBadge health={staleness.sources['sec-financials']} source="SEC" />
            <span className="text-[12px] text-[var(--text-muted)]">
              Latest filing {shortDate(latestAsOf)}
            </span>
          </>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Hyperscaler TTM capex"
          value={usdCompact(totalCapex, 0)}
          note={`${hyperscalers.map((h) => h.ticker).join(', ')}`}
        />
        <StatTile
          label="Capex ÷ revenue"
          value={
            totalCapex !== null && totalRevenue
              ? percent((totalCapex / totalRevenue) * 100, 1)
              : '—'
          }
          note="Share of the hyperscaler top line being reinvested"
        />
        <StatTile
          label="Covered by operations"
          value={totalCapex && totalOcf ? ratio(totalOcf / totalCapex) : '—'}
          tone={totalCapex && totalOcf && totalOcf / totalCapex < 1 ? 'warning' : 'good'}
          note="Combined TTM operating cash flow ÷ combined TTM capex"
        />
        <StatTile
          label="Neocloud TTM capex"
          value={usdCompact(neocloudCapex, 0)}
          note={`${neoclouds.length} tracked, almost entirely externally funded`}
        />
      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-2">
        <Card
          title="Quarterly capex"
          subtitle="As filed, by quarter. Select which companies to compare."
        >
          <CapexChart
            companies={fundamentals
              .filter((entry) => entry.quarterly.capex.length > 0)
              .map((entry) => ({
                ticker: entry.ticker,
                name: entry.name,
                tags: entry.tags,
                capex: entry.quarterly.capex,
                revenue: entry.quarterly.revenue,
                depreciation: entry.quarterly.depreciation,
              }))}
          />
        </Card>

        <Card
          title="Who funds their own buildout"
          subtitle="TTM operating cash flow against TTM capex. Below the 1.0 line, the shortfall is coming from the balance sheet or from debt."
        >
          <CoverageChart
            rows={byCoverage.map((entry) => ({
              ticker: entry.ticker,
              name: entry.name,
              coverage: entry.metrics.capexCoverage.value as number,
              capex: entry.ttm.capex,
              tags: entry.tags,
            }))}
          />
        </Card>
      </div>

      <Card
        title="Fundamentals detail"
        subtitle="Trailing twelve months unless noted. Every derived column shows its formula in the row below the table header."
      >
        <FundamentalsTable rows={fundamentals} />
      </Card>

      <p className="mt-4 text-[12px] leading-relaxed text-[var(--text-muted)]">
        Quarterly values are derived by differencing cumulative year-to-date XBRL facts, since
        10-Q cash-flow disclosures are cumulative rather than discrete. Companies filing under
        IFRS on Form 20-F (such as Nebius) expose different tags and may show gaps.
      </p>
    </>
  );
}

function sum(values: Array<number | null>): number | null {
  const present = values.filter((v): v is number => v !== null && Number.isFinite(v));
  return present.length > 0 ? present.reduce((a, b) => a + b, 0) : null;
}
