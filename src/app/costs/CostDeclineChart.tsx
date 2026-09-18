'use client';

import { useState } from 'react';
import { LineChart } from '@/components/charts/LineChart';
import { DataTable } from '@/components/ui/DataTable';
import { SeededTag } from '@/components/ui/Provenance';
import { monthLabel, usdPerMtok } from '@/lib/format';

interface CurvePoint {
  month: string;
  price: number;
  model: string;
  provider: string;
}

/**
 * The long-run cost decline.
 *
 * Seeded and tracked spans are separate series rather than one merged line:
 * they come from different evidence — published list prices against live
 * pricing joined to quality scores — and merging them would present a
 * reconstruction as a measurement.
 */
export function CostDeclineChart({ seeded, live }: { seeded: CurvePoint[]; live: CurvePoint[] }) {
  const [logScale, setLogScale] = useState(true);

  const months = [...new Set([...seeded, ...live].map((point) => point.month))].sort();
  const seededBy = new Map(seeded.map((point) => [point.month, point]));
  const liveBy = new Map(live.map((point) => [point.month, point]));

  // Carry each series forward so a price holds until something replaces it,
  // rather than leaving gaps in months where nothing was released.
  let lastSeeded: CurvePoint | undefined;
  let lastLive: CurvePoint | undefined;
  const seededEnd = seeded.at(-1)?.month;
  const liveStart = live[0]?.month;

  const data = months.map((month) => {
    lastSeeded = seededBy.get(month) ?? lastSeeded;
    lastLive = liveBy.get(month) ?? lastLive;
    return {
      month,
      // The seeded line stops where it ends; the tracked line starts where it
      // starts. Neither is extended across the other's span.
      seeded: seededEnd && month <= seededEnd ? (lastSeeded?.price ?? null) : null,
      live: liveStart && month >= liveStart ? (lastLive?.price ?? null) : null,
      label: (liveBy.get(month) ?? seededBy.get(month) ?? lastLive ?? lastSeeded)?.model ?? '',
    };
  });

  const first = seeded[0] ?? live[0];
  const last = live.at(-1) ?? seeded.at(-1);
  const declinePct =
    first && last && first.price > 0 ? ((first.price - last.price) / first.price) * 100 : null;

  const rows = [
    ...seeded.map((point) => ({ ...point, origin: 'seeded' as const })),
    ...live.map((point) => ({ ...point, origin: 'tracked' as const })),
  ];

  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-[13px] text-[var(--text-muted)]">
        No pricing history available yet.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={logScale}
            onChange={(event) => setLogScale(event.target.checked)}
            className="size-3.5"
          />
          Log scale
        </label>
        {declinePct !== null && first && last && (
          <span className="text-[12px] text-[var(--text-secondary)]">
            <span className="tnum font-semibold" style={{ color: 'var(--delta-up)' }}>
              −{declinePct.toFixed(1)}%
            </span>{' '}
            from {usdPerMtok(first.price)} in {monthLabel(first.month)} to{' '}
            {usdPerMtok(last.price)} in {monthLabel(last.month)}
          </span>
        )}
        <span className="flex items-center gap-1.5 text-[12px] text-[var(--text-muted)]">
          <SeededTag />
          published list prices through {seededEnd ? monthLabel(seededEnd) : '—'}
        </span>
      </div>

      <LineChart
        data={data}
        series={[
          { key: 'seeded', label: 'Published list prices (seeded)', colorIndex: 1, dashed: true },
          { key: 'live', label: 'Tracked pricing', colorIndex: 0 },
        ]}
        xKey="month"
        xFormatter={monthLabel}
        yFormatter={(value) => usdPerMtok(value)}
        valueFormatter={(value) => `${usdPerMtok(value)} /Mtok`}
        logScale={logScale}
        interpolation="step"
        height={300}
        yLabel="Cheapest frontier $/Mtok"
      />

      <details className="mt-3">
        <summary className="cursor-pointer text-[12px] text-[var(--text-muted)] underline decoration-dotted underline-offset-2 hover:text-[var(--text-secondary)]">
          View as table
        </summary>
        <div className="mt-2">
          <DataTable
            rows={rows}
            rowKey={(row, index) => `${row.origin}-${row.month}-${index}`}
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
                render: (row) => usdPerMtok(row.price),
                sortValue: (row) => row.price,
              },
              {
                key: 'model',
                header: 'Cheapest frontier model',
                render: (row) => row.model,
                sortValue: (row) => row.model,
              },
              {
                key: 'provider',
                header: 'Provider',
                render: (row) => row.provider,
                sortValue: (row) => row.provider,
              },
              {
                key: 'origin',
                header: 'Source',
                render: (row) =>
                  row.origin === 'seeded' ? (
                    <SeededTag />
                  ) : (
                    <span className="text-[var(--text-secondary)]">tracked</span>
                  ),
                sortValue: (row) => row.origin,
              },
            ]}
          />
        </div>
      </details>
    </div>
  );
}
