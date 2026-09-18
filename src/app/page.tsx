import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { StatTile } from '@/components/ui/StatTile';
import { StalenessBadge } from '@/components/ui/Provenance';
import {
  getBaskets, getCapital, getChangelog, getCostDecline, getFundamentals,
  getKpis, getMarket, getModels, getStaleness,
} from '@/lib/data';
import { LAYER_LABELS } from '@/lib/layers';
import { percent, ratio, shortDate, signedPercent, usdCompact, usdPerMtok } from '@/lib/format';
import { DeltaFeed } from './DeltaFeed';
import { SourceHealth } from './SourceHealth';

export default function OverviewPage() {
  const kpis = getKpis();
  const staleness = getStaleness();
  const changelog = getChangelog();
  const decline = getCostDecline();
  const capital = getCapital();
  const fundamentals = getFundamentals();
  const baskets = getBaskets();
  const market = getMarket();
  const models = getModels();

  // From the tracked frontier only — the seeded flagship series measures a
  // different thing and the two are never combined into one figure.
  const frontierNow = decline.live.at(-1);
  const hyperscalers = fundamentals.filter((entry) => entry.tags.includes('hyperscaler'));
  const hyperscalerCapex = hyperscalers.reduce((sum, entry) => sum + (entry.ttm.capex ?? 0), 0);
  const hyperscalerOcf = hyperscalers.reduce(
    (sum, entry) => sum + (entry.ttm.operatingCashFlow ?? 0),
    0,
  );
  const filedDebt = fundamentals.reduce((sum, entry) => sum + (entry.latest.longTermDebt ?? 0), 0);

  const spy = market.data.find((entry) => entry.ticker === 'SPY');
  const topBasket = [...baskets]
    .filter((basket) => basket.averageReturns.ytd !== null && basket.constituentCount >= 2)
    .sort((a, b) => (b.averageReturns.ytd as number) - (a.averageReturns.ytd as number))[0];

  const circularShare =
    capital.totals.disclosedDealValue > 0
      ? (capital.totals.circularDealValue / capital.totals.disclosedDealValue) * 100
      : null;

  const anyStale = Object.values(staleness.sources).some((source) => source.stale);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <h1 className="text-[22px] font-semibold tracking-tight sm:text-[26px]">
            What moved in the AI ecosystem
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-[var(--text-secondary)]">
            The weekly read across the whole stack: what inference costs, what the buildout costs,
            who is paying for it, and how the market is pricing all of it. Each section below
            drills into full history and detail.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {Object.entries(staleness.sources)
            .filter(([, health]) => health.stale)
            .map(([name, health]) => (
              <StalenessBadge key={name} health={health} source={name} />
            ))}
          {!anyStale && (
            <span className="text-[12px] text-[var(--text-muted)]">
              All sources fresh · {shortDate(staleness.generatedAt)}
            </span>
          )}
        </div>
      </div>

      {/* Summary on top: the five numbers worth checking each week. */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatTile
          label="Cheapest at index ≥ 40"
          value={frontierNow ? usdPerMtok(frontierNow.price) : '—'}
          unit="/Mtok"
          note={frontierNow ? frontierNow.model : undefined}
        />
        <StatTile
          label="Hyperscaler capex"
          value={usdCompact(hyperscalerCapex, 0)}
          unit="TTM"
          note={`Covered ${hyperscalerCapex > 0 ? ratio(hyperscalerOcf / hyperscalerCapex) : '—'} by operations`}
          tone={hyperscalerOcf / hyperscalerCapex < 1 ? 'warning' : 'neutral'}
        />
        <StatTile
          label="Tracked AI debt"
          value={usdCompact(filedDebt, 0)}
          note={`Filed long-term debt across ${fundamentals.length} companies`}
        />
        <StatTile
          label="Circular deal share"
          value={circularShare !== null ? percent(circularShare, 0) : '—'}
          tone={circularShare !== null && circularShare > 25 ? 'warning' : 'neutral'}
          note="Of announced deal value, supplier-funded demand"
        />
        <StatTile
          label={topBasket ? `${LAYER_LABELS[topBasket.layer] ?? topBasket.layer} YTD` : 'Best layer'}
          value={topBasket ? signedPercent(topBasket.averageReturns.ytd) : '—'}
          note={spy ? `S&P 500 ${signedPercent(spy.returns.ytd)} over the same window` : undefined}
          tone={
            topBasket && (topBasket.averageReturns.ytd ?? 0) > (spy?.returns.ytd ?? 0)
              ? 'good'
              : 'neutral'
          }
        />
      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card
          title="What changed"
          subtitle="Price moves, new filings and outsized market days since the last weekly refresh."
        >
          <DeltaFeed entries={changelog.entries.slice(0, 60)} />
        </Card>

        <div className="space-y-4">
          <Card title="Jump to" subtitle="Each section carries its own history and detail.">
            <ul className="space-y-2">
              {[
                {
                  href: '/costs/',
                  title: 'Token economics',
                  detail: `${models.length} models priced · flagship list prices down ${
                    decline.seeded[0] && decline.seeded.at(-1)
                      ? `${(((decline.seeded[0].price - (decline.seeded.at(-1) as { price: number }).price) / decline.seeded[0].price) * 100).toFixed(0)}%`
                      : '—'
                  } 2023–25`,
                },
                {
                  href: '/models/',
                  title: 'Model performance',
                  detail: kpis.bestValueModel
                    ? `Best value: ${kpis.bestValueModel.name}`
                    : 'Benchmarks, throughput and training compute',
                },
                {
                  href: '/capex/',
                  title: 'Capex & fundamentals',
                  detail: `${fundamentals.length} filers · quarterly capex, coverage and depreciation drag`,
                },
                {
                  href: '/capital/',
                  title: 'Capital',
                  detail: `${capital.funding.length} rounds · ${capital.debt.length} debt instruments · ${capital.deals.length} deals`,
                },
                {
                  href: '/supply-chain/',
                  title: 'Supply chain',
                  detail: 'Litho to applications, with the deal graph',
                },
                {
                  href: '/markets/',
                  title: 'Markets',
                  detail: `${market.data.length} tickers across ${baskets.length} layer baskets`,
                },
              ].map((section) => (
                <li key={section.href}>
                  <Link
                    href={section.href}
                    className="block rounded-md border px-3 py-2 transition-colors hover:bg-[var(--surface-sunken)]"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <span className="text-[13px] font-medium">{section.title}</span>
                    <span className="mt-0.5 block text-[12px] text-[var(--text-secondary)]">
                      {section.detail}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Data freshness" subtitle="When each source last refreshed successfully.">
            <SourceHealth sources={staleness.sources} />
          </Card>
        </div>
      </div>

      <p className="text-[12px] leading-relaxed text-[var(--text-muted)]">
        Every source refreshes weekly, on Monday mornings UTC. Daily market closes are still
        captured in full — each run backfills the week — so price history stays complete.
        Private funding, deal and debt records are curated and reflect public disclosure only.
      </p>
    </>
  );
}
