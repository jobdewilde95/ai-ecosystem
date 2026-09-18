'use client';

import { useMemo, useState } from 'react';
import { ScatterChart, type ScatterPoint } from '@/components/charts/ScatterChart';
import { DataTable } from '@/components/ui/DataTable';
import { shortDate, usdPerMtok } from '@/lib/format';

interface QualityCostModel {
  id: string;
  name: string;
  creator: string;
  price: number;
  index: number;
  tokensPerSecond: number | null;
  releaseDate: string | null;
}

/**
 * Quality against price.
 *
 * Scatter puts every pair of group colours on screen simultaneously, so it is
 * held to the all-pairs separation gate rather than the adjacent one. The
 * palette clears that at three slots, hence three named providers and an
 * explicit "Other" bucket instead of a colour per lab.
 */
export function QualityCostChart({ models }: { models: QualityCostModel[] }) {
  const [onlyFrontier, setOnlyFrontier] = useState(false);

  // The three providers with the most models on the chart get named colours;
  // the rest are deliberately muted rather than competing for identity.
  const topCreators = useMemo(() => {
    const counts = new Map<string, number>();
    for (const model of models) counts.set(model.creator, (counts.get(model.creator) ?? 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([creator]) => creator);
  }, [models]);

  /*
   * The Pareto frontier: models that nothing beats on both axes at once. This
   * is the set worth choosing from — everything above and to the left is
   * dominated by something cheaper and better.
   */
  const frontier = useMemo(() => {
    const byPrice = [...models].sort((a, b) => a.price - b.price);
    const kept: QualityCostModel[] = [];
    let bestIndex = -Infinity;
    for (const model of byPrice) {
      if (model.index > bestIndex) {
        kept.push(model);
        bestIndex = model.index;
      }
    }
    return kept;
  }, [models]);

  const frontierIds = new Set(frontier.map((model) => model.id));
  const shown = onlyFrontier ? frontier : models;

  const points: ScatterPoint[] = shown.map((model) => ({
    x: model.price,
    y: model.index,
    label: model.name,
    group: topCreators.includes(model.creator) ? model.creator : 'Other providers',
    meta: {
      Provider: model.creator,
      Released: shortDate(model.releaseDate),
      ...(model.tokensPerSecond
        ? { Throughput: `${Math.round(model.tokensPerSecond)} tok/s` }
        : {}),
    },
  }));

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={onlyFrontier}
            onChange={(event) => setOnlyFrontier(event.target.checked)}
            className="size-3.5"
          />
          Efficient frontier only
        </label>
        <span className="text-[12px] text-[var(--text-muted)]">
          {shown.length} models · {frontier.length} on the frontier
        </span>
      </div>

      <ScatterChart
        points={points}
        xLabel="Blended $/Mtok"
        yLabel="Intelligence index"
        xFormatter={(value) => usdPerMtok(value)}
        yFormatter={(value) => value.toFixed(0)}
        logX
        height={380}
      />

      <details className="mt-3">
        <summary className="cursor-pointer text-[12px] text-[var(--text-muted)] underline decoration-dotted underline-offset-2 hover:text-[var(--text-secondary)]">
          View the efficient frontier as a table
        </summary>
        <div className="mt-2">
          <DataTable
            rows={frontier}
            rowKey={(row) => row.id}
            initialSort="index"
            maxHeight={320}
            columns={[
              {
                key: 'name',
                header: 'Model',
                render: (row) => <span className="font-medium">{row.name}</span>,
                sortValue: (row) => row.name,
              },
              {
                key: 'creator',
                header: 'Provider',
                render: (row) => (
                  <span className="text-[var(--text-secondary)]">{row.creator}</span>
                ),
                sortValue: (row) => row.creator,
              },
              {
                key: 'index',
                header: 'Index',
                numeric: true,
                render: (row) => row.index.toFixed(1),
                sortValue: (row) => row.index,
              },
              {
                key: 'price',
                header: '$/Mtok',
                numeric: true,
                render: (row) => usdPerMtok(row.price),
                sortValue: (row) => row.price,
              },
              {
                key: 'speed',
                header: 'tok/s',
                numeric: true,
                render: (row) =>
                  row.tokensPerSecond ? Math.round(row.tokensPerSecond) : '—',
                sortValue: (row) => row.tokensPerSecond,
              },
              {
                key: 'released',
                header: 'Released',
                render: (row) => (
                  <span className="text-[var(--text-secondary)]">{shortDate(row.releaseDate)}</span>
                ),
                sortValue: (row) => row.releaseDate,
              },
            ]}
          />
        </div>
      </details>
      <p className="mt-2 text-[12px] text-[var(--text-muted)]">
        {frontierIds.size} models are Pareto-efficient: nothing available is both cheaper and
        better. Everything else is dominated by one of them.
      </p>
    </div>
  );
}
