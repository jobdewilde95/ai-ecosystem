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
 * Cheapest flagship list price over time, from the seeded record.
 *
 * This deliberately does NOT continue into the tracked data. The two measure
 * different things: this is the cheapest published list price among models
 * their makers positioned as flagships, while the tracked frontier curve is the
 * cheapest model clearing a fixed benchmark score. Joining them drew a step
 * from $0.478 to $10.00 — an apparent 2000% price rise that never happened,
 * produced entirely by the change of definition. The tracked equivalent is the
 * next chart down, on its own consistent basis.
 */
export function CostDeclineChart({ seeded }: { seeded: CurvePoint[] }) {
  const [logScale, setLogScale] = useState(true);

  if (seeded.length === 0) {
    return (
      <p className="py-8 text-center text-[13px] text-[var(--text-muted)]">
        No seeded pricing history available.
      </p>
    );
  }

  const data = seeded.map((point) => ({
    month: point.month,
    price: point.price,
    model: point.model,
  }));

  const first = seeded[0];
  const last = seeded[seeded.length - 1];
  const declinePct = first.price > 0 ? ((first.price - last.price) / first.price) * 100 : null;

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
        {declinePct !== null && (
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
          published list prices
        </span>
      </div>

      <LineChart
        data={data}
        series={[{ key: 'price', label: 'Cheapest flagship $/Mtok', colorIndex: 1, dashed: true }]}
        xKey="month"
        xFormatter={monthLabel}
        yFormatter={(value) => usdPerMtok(value)}
        valueFormatter={(value) => `${usdPerMtok(value)} /Mtok`}
        logScale={logScale}
        interpolation="step"
        height={280}
        yLabel="Cheapest flagship $/Mtok"
      />

      <p className="mt-2 text-[12px] leading-relaxed text-[var(--text-muted)]">
        This series ends at {monthLabel(last.month)} and is deliberately not continued into the
        tracked data below: that curve measures the cheapest model clearing a fixed benchmark
        score, which is a different question. Splicing the two would show a price jump that is an
        artefact of the changed definition, not something that happened.
      </p>

      <details className="mt-3">
        <summary className="cursor-pointer text-[12px] text-[var(--text-muted)] underline decoration-dotted underline-offset-2 hover:text-[var(--text-secondary)]">
          View as table
        </summary>
        <div className="mt-2">
          <DataTable
            rows={seeded}
            rowKey={(row, index) => `${row.month}-${index}`}
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
                header: 'Cheapest flagship',
                render: (row) => row.model,
                sortValue: (row) => row.model,
              },
              {
                key: 'provider',
                header: 'Provider',
                render: (row) => row.provider,
                sortValue: (row) => row.provider,
              },
            ]}
          />
        </div>
      </details>
    </div>
  );
}
