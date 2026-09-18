'use client';

import { useState } from 'react';
import { LineChart } from '@/components/charts/LineChart';
import { DataTable } from '@/components/ui/DataTable';
import { monthLabel, usdPerMtok } from '@/lib/format';
import type { FrontierPoint } from '@/lib/types';

/**
 * The cost-of-capability curve.
 *
 * Quality is a filter, not a second axis — a dual-scale chart of price against
 * index would be unreadable and is never the right answer. Changing the
 * threshold re-filters the same single price scale.
 */
export function FrontierChart({
  curves,
}: {
  curves: Array<{ threshold: number; points: FrontierPoint[] }>;
}) {
  const available = curves.filter((curve) => curve.points.length > 1);
  const [threshold, setThreshold] = useState<number>(
    available.find((curve) => curve.threshold === 40)?.threshold ?? available[0]?.threshold ?? 40,
  );
  const [logScale, setLogScale] = useState(true);

  const active = available.find((curve) => curve.threshold === threshold);
  const points = active?.points ?? [];

  if (points.length === 0) {
    return (
      <p className="py-8 text-center text-[13px] text-[var(--text-muted)]">
        Not enough dated, priced models to plot a frontier yet.
      </p>
    );
  }

  const data = points.map((point) => ({
    month: point.month,
    price: point.cheapestPerMtok,
    model: point.model,
  }));

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] text-[var(--text-secondary)]">Quality floor</span>
          <div
            className="flex overflow-hidden rounded-md border"
            style={{ borderColor: 'var(--border)' }}
          >
            {available.map((curve) => (
              <button
                key={curve.threshold}
                type="button"
                onClick={() => setThreshold(curve.threshold)}
                aria-pressed={curve.threshold === threshold}
                className="px-2.5 py-1 text-[12px] font-medium transition-colors"
                style={{
                  background:
                    curve.threshold === threshold ? 'var(--surface-sunken)' : 'transparent',
                  color:
                    curve.threshold === threshold
                      ? 'var(--text-primary)'
                      : 'var(--text-secondary)',
                }}
              >
                ≥ {curve.threshold}
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={logScale}
            onChange={(event) => setLogScale(event.target.checked)}
            className="size-3.5"
          />
          Log scale
        </label>
        <span className="text-[12px] text-[var(--text-muted)]">
          {points.length} months · currently {points.at(-1)?.model}
        </span>
      </div>

      <LineChart
        data={data}
        series={[{ key: 'price', label: 'Cheapest $/Mtok', colorIndex: 0 }]}
        xKey="month"
        xFormatter={monthLabel}
        yFormatter={(value) => usdPerMtok(value)}
        valueFormatter={(value) => `${usdPerMtok(value)} /Mtok`}
        logScale={logScale}
        height={300}
        yLabel="Blended $/Mtok"
      />

      <details className="mt-3">
        <summary className="cursor-pointer text-[12px] text-[var(--text-muted)] underline decoration-dotted underline-offset-2 hover:text-[var(--text-secondary)]">
          View as table
        </summary>
        <div className="mt-2">
          <DataTable
            rows={points}
            rowKey={(row) => row.month}
            initialSort="month"
            maxHeight={320}
            columns={[
              {
                key: 'month',
                header: 'Month',
                render: (row) => monthLabel(row.month),
                sortValue: (row) => row.month,
              },
              {
                key: 'price',
                header: '$/Mtok',
                numeric: true,
                render: (row) => usdPerMtok(row.cheapestPerMtok),
                sortValue: (row) => row.cheapestPerMtok,
              },
              {
                key: 'model',
                header: 'Cheapest model',
                render: (row) => row.model,
                sortValue: (row) => row.model,
              },
              {
                key: 'creator',
                header: 'Provider',
                render: (row) => row.creator,
                sortValue: (row) => row.creator,
              },
            ]}
          />
        </div>
      </details>
    </div>
  );
}
