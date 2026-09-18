import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatTile } from '@/components/ui/StatTile';
import { StalenessBadge } from '@/components/ui/Provenance';
import { getComputeTrend, getModels, getStaleness } from '@/lib/data';
import { scientific, shortDate, tokenCount, usdPerMtok } from '@/lib/format';
import { QualityCostChart } from './QualityCostChart';
import { ComputeTrendChart } from './ComputeTrendChart';
import { ModelTable } from './ModelTable';
import { ReleaseCadence } from './ReleaseCadence';

export const metadata = { title: 'Models · AI Ecosystem' };

export default function ModelsPage() {
  const models = getModels();
  const compute = getComputeTrend();
  const staleness = getStaleness();

  const scored = models.filter((model) => model.intelligenceIndex !== null);
  const frontier = [...scored].sort(
    (a, b) => (b.intelligenceIndex as number) - (a.intelligenceIndex as number),
  );
  const best = frontier[0];

  const bestValue = [...models]
    .filter((model) => model.intelligencePerDollar.value !== null && (model.blended3to1 ?? 0) > 0)
    .sort(
      (a, b) =>
        (b.intelligencePerDollar.value as number) - (a.intelligencePerDollar.value as number),
    )[0];

  const fastest = [...models]
    .filter((model) => model.throughput.tokensPerSecond !== null)
    .sort(
      (a, b) =>
        (b.throughput.tokensPerSecond as number) - (a.throughput.tokensPerSecond as number),
    )[0];

  const largestRun = [...compute].sort((a, b) => b.flop - a.flop)[0];

  const hasApiKey = !staleness.sources['artificialanalysis']?.stale;

  return (
    <>
      <PageHeader
        title="Model performance"
        lede={
          <>
            Capability against price and speed across {models.length} models, plus the training
            compute behind them. Quality scores and measured throughput come from Artificial
            Analysis; context and cache rates are joined from OpenRouter where the same model
            appears in both.
          </>
        }
        aside={
          <>
            <StalenessBadge
              health={staleness.sources['artificialanalysis']}
              source="Artificial Analysis"
            />
            <StalenessBadge health={staleness.sources['epoch-models']} source="Epoch" />
          </>
        }
      />

      {!hasApiKey && (
        <div
          className="mb-6 rounded-lg border p-4 text-[13px]"
          style={{ borderColor: 'var(--status-warning)' }}
        >
          <p className="font-medium">
            <span aria-hidden="true">⚠</span> Benchmark data unavailable
          </p>
          <p className="mt-1 text-[var(--text-secondary)]">
            Artificial Analysis could not be refreshed. Quality scores, throughput and the
            quality-versus-cost frontier below fall back to the last successful fetch. Check that
            ARTIFICIALANALYSIS_API_KEY is set in the workflow secrets.
          </p>
        </div>
      )}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Highest index"
          value={best ? (best.intelligenceIndex as number).toFixed(1) : '—'}
          note={best ? `${best.name} — ${best.creator}` : undefined}
        />
        <StatTile
          label="Best value"
          value={bestValue ? (bestValue.intelligencePerDollar.value as number).toFixed(0) : '—'}
          unit="index / $"
          note={bestValue ? `${bestValue.name} at ${usdPerMtok(bestValue.blended3to1)}/Mtok` : undefined}
          metric={bestValue?.intelligencePerDollar}
        />
        <StatTile
          label="Fastest output"
          value={fastest ? Math.round(fastest.throughput.tokensPerSecond as number) : '—'}
          unit="tok/s"
          note={fastest ? `${fastest.name} — ${fastest.creator}` : undefined}
        />
        <StatTile
          label="Largest training run"
          value={largestRun ? scientific(largestRun.flop) : '—'}
          unit="FLOP"
          note={largestRun ? `${largestRun.model} — ${largestRun.organization}` : undefined}
        />
      </div>

      <div className="mb-6">
        <Card
          title="Quality against cost"
          subtitle="Intelligence index versus blended $/Mtok. The lower-right is where capability is cheap; the frontier line traces the best available quality at each price."
        >
          <QualityCostChart
            models={scored
              .filter((model) => model.blended3to1 !== null && model.blended3to1 > 0)
              .map((model) => ({
                id: model.id,
                name: model.name,
                creator: model.creator,
                price: model.blended3to1 as number,
                index: model.intelligenceIndex as number,
                tokensPerSecond: model.throughput.tokensPerSecond,
                releaseDate: model.releaseDate,
              }))}
          />
        </Card>
      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-2">
        <Card
          title="Training compute over time"
          subtitle="Compute used to train notable models, from Epoch AI. Log scale — the trend is exponential, so a straight line is steady growth."
        >
          <ComputeTrendChart points={compute} />
        </Card>

        <Card
          title="Release cadence"
          subtitle="Models released per quarter by the labs shipping most often, from Artificial Analysis release dates."
        >
          <ReleaseCadence
            models={models
              .filter((model) => model.releaseDate)
              .map((model) => ({
                creator: model.creator,
                releaseDate: model.releaseDate as string,
              }))}
          />
        </Card>
      </div>

      <Card
        title="All models"
        subtitle="Benchmark scores, pricing, throughput and context in one table. Sort any column."
      >
        <ModelTable
          rows={models.map((model) => ({
            id: model.id,
            name: model.name,
            creator: model.creator,
            releaseDate: model.releaseDate,
            index: model.intelligenceIndex,
            coding: model.evaluations.codingIndex ?? null,
            gpqa: model.evaluations.gpqa ?? null,
            hle: model.evaluations.hle ?? null,
            terminalbench: model.evaluations.terminalbench ?? null,
            blended: model.blended3to1,
            perDollar: model.intelligencePerDollar.value,
            tokensPerSecond: model.throughput.tokensPerSecond,
            ttft: model.throughput.timeToFirstTokenSeconds,
            context: model.contextLength,
          }))}
        />
      </Card>

      <p className="mt-4 text-[12px] leading-relaxed text-[var(--text-muted)]">
        Artificial Analysis lists reasoning-effort variants as separate models, so a family may
        appear several times at different price and quality points. Benchmark scores are
        normalised fractions except the intelligence and coding indices, which are 0–100 scales
        rebased as the frontier advances — a score is comparable across models at a point in
        time, not across years. Epoch AI's dataset covers{' '}
        {compute.length} models with published training compute, back to{' '}
        {shortDate(compute[0]?.date)}. Context shown for the{' '}
        {tokenCount(models.filter((m) => m.contextLength).length)} models matched to OpenRouter.
      </p>
    </>
  );
}
