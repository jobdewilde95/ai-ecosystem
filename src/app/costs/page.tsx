import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatTile } from '@/components/ui/StatTile';
import { StalenessBadge } from '@/components/ui/Provenance';
import { getCostDecline, getFrontier, getModels, getStaleness } from '@/lib/data';
import { monthLabel, percent, usdPerMtok } from '@/lib/format';
import { CostDeclineChart } from './CostDeclineChart';
import { FrontierChart } from './FrontierChart';
import { PricingTable } from './PricingTable';
import { WorkloadSimulator } from './WorkloadSimulator';

export const metadata = { title: 'Token economics · AI Ecosystem' };

export default function CostsPage() {
  const models = getModels();
  const frontier = getFrontier();
  const decline = getCostDecline();
  const staleness = getStaleness();

  const priced = models.filter((model) => model.blended3to1 !== null && model.blended3to1 > 0);

  // The long-run decline spans the seeded list prices and the tracked span; the
  // live-only frontier curve covers barely six months on its own.
  const declineFirst = decline.seeded[0] ?? decline.live[0];
  const declineLast = decline.live.at(-1) ?? decline.seeded.at(-1);
  const declinePct =
    declineFirst && declineLast && declineFirst.price > 0
      ? ((declineFirst.price - declineLast.price) / declineFirst.price) * 100
      : null;

  const withCache = models.filter(
    (model) => model.cacheReadPerMtok !== null && model.pricing.inputPerMtok,
  );
  const medianCacheDiscount = median(
    withCache.map(
      (model) =>
        (1 - (model.cacheReadPerMtok as number) / (model.pricing.inputPerMtok as number)) * 100,
    ),
  );

  return (
    <>
      <PageHeader
        title="Token economics"
        lede={
          <>
            What inference actually costs, and how fast that is changing. Headline price cuts
            flatter themselves by comparing models of different capability — the frontier curve
            below instead holds quality fixed and watches the price, which is the honest way to
            measure decline.
          </>
        }
        aside={
          <>
            <StalenessBadge health={staleness.sources['openrouter']} source="OpenRouter" />
            <StalenessBadge
              health={staleness.sources['artificialanalysis']}
              source="Artificial Analysis"
            />
          </>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Frontier price now"
          value={declineLast ? usdPerMtok(declineLast.price) : '—'}
          unit="/Mtok"
          note={declineLast ? `${declineLast.model} — cheapest frontier-tier` : undefined}
        />
        <StatTile
          label="Decline since Mar 2023"
          value={declinePct !== null ? `${declinePct.toFixed(1)}%` : '—'}
          note={
            declineFirst
              ? `From ${usdPerMtok(declineFirst.price)} in ${monthLabel(declineFirst.month)}`
              : undefined
          }
          tone={declinePct !== null && declinePct > 0 ? 'good' : 'neutral'}
        />
        <StatTile
          label="Models priced"
          value={priced.length}
          note={`of ${models.length} tracked, across ${new Set(priced.map((m) => m.creator)).size} providers`}
        />
        <StatTile
          label="Median cache discount"
          value={medianCacheDiscount !== null ? percent(medianCacheDiscount, 0) : '—'}
          note={`Cached input vs standard input, ${withCache.length} models`}
        />
      </div>

      <div className="mb-6">
        <Card
          title="Cost of frontier inference, 2023 to now"
          subtitle="Cheapest blended $/Mtok among frontier-tier models at each month. The step shape is literal: a price holds until something cheaper ships."
        >
          <CostDeclineChart seeded={decline.seeded} live={decline.live} />
        </Card>
      </div>

      <div className="mb-6">
        <Card
          title="Cost of a fixed capability level"
          subtitle="Cheapest blended $/Mtok available at each month, holding model quality at or above the selected intelligence index. The curve only steps down: once a price exists it stays available."
        >
          <FrontierChart curves={frontier.curves} />
        </Card>
      </div>

      <div className="mb-6">
        <Card
          title="Workload cost simulator"
          subtitle="Set a monthly token mix and compare what it would cost across models. Cache savings apply to the cached share of input tokens."
        >
          <WorkloadSimulator
            models={models
              .filter(
                (model) =>
                  model.pricing.inputPerMtok !== null && model.pricing.outputPerMtok !== null,
              )
              .map((model) => ({
                id: model.id,
                name: model.name,
                creator: model.creator,
                inputPerMtok: model.pricing.inputPerMtok as number,
                outputPerMtok: model.pricing.outputPerMtok as number,
                cacheReadPerMtok: model.cacheReadPerMtok,
                intelligenceIndex: model.intelligenceIndex,
              }))}
          />
        </Card>
      </div>

      <Card
        title="Model pricing"
        subtitle="Live per-million-token pricing, with cache rates and context where available. Blended is the 3:1 input:output convention."
      >
        <PricingTable
          rows={models.map((model) => ({
            id: model.id,
            name: model.name,
            creator: model.creator,
            input: model.pricing.inputPerMtok,
            output: model.pricing.outputPerMtok,
            blended: model.blended3to1,
            cacheRead: model.cacheReadPerMtok,
            context: model.contextLength,
            intelligence: model.intelligenceIndex,
            perDollar: model.intelligencePerDollar.value,
            releaseDate: model.releaseDate,
          }))}
        />
      </Card>

      <p className="mt-4 text-[12px] leading-relaxed text-[var(--text-muted)]">
        Context lengths and cache rates come from OpenRouter and exist only for models it lists
        ({models.filter((m) => m.contextLength).length} of {models.length}). Quality scores come
        from Artificial Analysis.
      </p>
    </>
  );
}

function median(values: number[]): number | null {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}
