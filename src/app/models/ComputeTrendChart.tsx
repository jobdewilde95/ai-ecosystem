'use client';

import { useMemo, useState } from 'react';
import { ScatterChart, type ScatterPoint } from '@/components/charts/ScatterChart';
import { scientific, shortDate } from '@/lib/format';

interface ComputePoint {
  model: string;
  organization: string;
  date: string;
  flop: number;
  parameters: number | null;
}

/**
 * Training compute over time, log-scaled on the vertical axis.
 *
 * Compute spans ten orders of magnitude here, so a linear axis would render
 * everything before the last two years as a flat line on zero.
 */
export function ComputeTrendChart({ points }: { points: ComputePoint[] }) {
  const [since, setSince] = useState('2020-01-01');

  const filtered = useMemo(
    () => points.filter((point) => point.date >= since && point.flop > 0),
    [points, since],
  );

  const topOrgs = useMemo(() => {
    const counts = new Map<string, number>();
    for (const point of filtered) {
      counts.set(point.organization, (counts.get(point.organization) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([org]) => org);
  }, [filtered]);

  const scatter: ScatterPoint[] = filtered.map((point) => ({
    // Date as a numeric axis: Recharts needs a number to scale a continuous
    // axis, and the formatter turns it back into a year label.
    x: Date.parse(point.date),
    y: point.flop,
    label: point.model,
    group: topOrgs.includes(point.organization) ? point.organization : 'Other labs',
    meta: {
      Organisation: point.organization,
      Published: shortDate(point.date),
      Compute: `${scientific(point.flop)} FLOP`,
    },
  }));

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-[12px] text-[var(--text-secondary)]">From</span>
        <div className="flex overflow-hidden rounded-md border" style={{ borderColor: 'var(--border)' }}>
          {[
            ['2015-01-01', '2015'],
            ['2020-01-01', '2020'],
            ['2023-01-01', '2023'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setSince(value)}
              aria-pressed={since === value}
              className="px-2.5 py-1 text-[12px] font-medium"
              style={{
                background: since === value ? 'var(--surface-sunken)' : 'transparent',
                color: since === value ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-[12px] text-[var(--text-muted)]">{filtered.length} models</span>
      </div>

      <ScatterChart
        points={scatter}
        xLabel="Publication date"
        yLabel="Training compute (FLOP)"
        xFormatter={(value) => String(new Date(value).getUTCFullYear())}
        yFormatter={(value) => scientific(value)}
        logY
        height={320}
      />
      <p className="mt-2 text-[12px] text-[var(--text-muted)]">
        Vertical axis is logarithmic. Source: Epoch AI notable models dataset.
      </p>
    </div>
  );
}
