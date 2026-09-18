import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatTile } from '@/components/ui/StatTile';
import { StalenessBadge } from '@/components/ui/Provenance';
import { getBaskets, getCompanies, getMarket, getStaleness } from '@/lib/data';
import { shortDate, signedPercent } from '@/lib/format';
import { LAYER_LABELS } from '@/lib/layers';
import { BasketTable } from './BasketTable';
import { ConstituentTable } from './ConstituentTable';

export const metadata = { title: 'Markets · AI Ecosystem' };

export default function MarketsPage() {
  const market = getMarket();
  const baskets = getBaskets();
  const companies = getCompanies();
  const staleness = getStaleness();

  const summaries = market.data;
  const byTicker = new Map(summaries.map((entry) => [entry.ticker, entry]));
  const spy = byTicker.get('SPY');
  const smh = byTicker.get('SMH');

  const companyByTicker = new Map(
    companies.filter((company) => company.ticker).map((company) => [company.ticker as string, company]),
  );

  const aiNames = summaries.filter((entry) => companyByTicker.has(entry.ticker));
  const advancing = aiNames.filter((entry) => (entry.returns.d1 ?? 0) > 0).length;

  const strongest = [...baskets]
    .filter((basket) => basket.relativeStrength.ytd.value !== null && basket.constituentCount >= 2)
    .sort(
      (a, b) =>
        (b.relativeStrength.ytd.value as number) - (a.relativeStrength.ytd.value as number),
    );

  const latestDate = summaries.map((entry) => entry.latestDate).sort().at(-1);

  return (
    <>
      <PageHeader
        title="Markets"
        lede={
          <>
            {aiNames.length} listed AI-exposed names grouped by where they sit in the supply chain,
            measured against the broad market. Equal-weighted so a single mega-cap does not
            determine what its whole layer appears to be doing.
          </>
        }
        aside={
          <>
            <StalenessBadge health={staleness.sources['market']} source="Prices" />
            <span className="text-[12px] text-[var(--text-muted)]">Close {shortDate(latestDate)}</span>
          </>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Advancing today"
          value={`${advancing}/${aiNames.length}`}
          note="AI-exposed names closing higher"
          tone={advancing > aiNames.length / 2 ? 'good' : 'neutral'}
        />
        <StatTile
          label="S&P 500 (SPY)"
          value={signedPercent(spy?.returns.ytd)}
          unit="YTD"
          delta={spy?.returns.d1 ?? null}
          deltaLabel="today"
        />
        <StatTile
          label="Semis (SMH)"
          value={signedPercent(smh?.returns.ytd)}
          unit="YTD"
          delta={smh?.returns.d1 ?? null}
          deltaLabel="today"
        />
        <StatTile
          label="Strongest layer YTD"
          value={strongest[0] ? (LAYER_LABELS[strongest[0].layer] ?? strongest[0].layer) : '—'}
          note={
            strongest[0]
              ? `${signedPercent(strongest[0].relativeStrength.ytd.value)} vs S&P 500`
              : undefined
          }
          metric={strongest[0]?.relativeStrength.ytd}
        />
      </div>

      <div className="mb-6">
        <Card
          title="Supply-chain layers vs the S&P 500"
          subtitle="Equal-weighted average return of each layer's listed constituents, minus the S&P 500 over the same window. Positive means the layer outperformed."
        >
          <BasketTable
            rows={baskets
              .filter((basket) => basket.constituentCount > 0)
              .map((basket) => ({
                layer: basket.layer,
                label: LAYER_LABELS[basket.layer] ?? basket.layer,
                constituentCount: basket.constituentCount,
                tickers: basket.tickers,
                m1: basket.relativeStrength.m1.value,
                m3: basket.relativeStrength.m3.value,
                ytd: basket.relativeStrength.ytd.value,
                y1: basket.relativeStrength.y1.value,
                absoluteYtd: basket.averageReturns.ytd,
                metric: basket.relativeStrength.ytd,
              }))}
          />
        </Card>
      </div>

      <Card
        title="Constituents"
        subtitle="Every tracked listed name with returns across windows, 52-week range position, and maximum drawdown over the tracked history."
      >
        <ConstituentTable
          rows={aiNames.map((entry) => {
            const company = companyByTicker.get(entry.ticker);
            const range =
              entry.high52w !== null && entry.low52w !== null && entry.high52w > entry.low52w
                ? ((entry.latestClose - entry.low52w) / (entry.high52w - entry.low52w)) * 100
                : null;
            return {
              ticker: entry.ticker,
              name: company?.name ?? entry.ticker,
              layers: (company?.layers ?? []).map((layer) => LAYER_LABELS[layer] ?? layer),
              close: entry.latestClose,
              d1: entry.returns.d1,
              m1: entry.returns.m1,
              m3: entry.returns.m3,
              ytd: entry.returns.ytd,
              y1: entry.returns.y1,
              rangePosition: range,
              maxDrawdown: entry.maxDrawdownPct,
            };
          })}
        />
      </Card>

      <p className="mt-4 text-[12px] leading-relaxed text-[var(--text-muted)]">
        Returns use adjusted closes, so splits and dividends do not appear as drawdowns. Maximum
        drawdown is measured over the tracked history (up to five years), not since inception —
        recently listed names such as CoreWeave therefore show a shorter window.
      </p>
    </>
  );
}
