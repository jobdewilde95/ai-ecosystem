import type { ReactNode } from 'react';
import type { DerivedMetric } from '@/lib/types';
import { MetricNote } from './MetricNote';

/**
 * A single headline figure.
 *
 * Per the form heuristic, one number with context is a stat tile, not a chart.
 * Direction is carried by an arrow glyph and a worded label as well as colour,
 * so the delta never depends on hue alone.
 */
export function StatTile({
  label, value, unit, delta, deltaLabel, note, metric, tone = 'neutral',
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  delta?: number | null;
  deltaLabel?: string;
  note?: ReactNode;
  metric?: DerivedMetric;
  tone?: 'neutral' | 'good' | 'warning' | 'critical';
}) {
  const toneColor =
    tone === 'good' ? 'var(--status-good)'
    : tone === 'warning' ? 'var(--status-warning)'
    : tone === 'critical' ? 'var(--status-critical)'
    : 'var(--text-primary)';

  return (
    <div
      className="rounded-lg border bg-[var(--surface-1)] p-4"
      style={{ borderColor: 'var(--border)' }}
    >
      <p className="text-[12px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-2 flex items-baseline gap-1.5">
        <span className="tnum text-[26px] font-semibold leading-none" style={{ color: toneColor }}>
          {value}
        </span>
        {unit && <span className="text-[13px] text-[var(--text-secondary)]">{unit}</span>}
      </p>
      {delta !== undefined && delta !== null && Number.isFinite(delta) && (
        <p
          className="tnum mt-1.5 flex items-center gap-1 text-[13px]"
          style={{ color: delta >= 0 ? 'var(--delta-up)' : 'var(--delta-down)' }}
        >
          <span aria-hidden="true">{delta >= 0 ? '▲' : '▼'}</span>
          <span>
            {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
            <span className="sr-only">{delta >= 0 ? ' increase' : ' decrease'}</span>
          </span>
          {deltaLabel && <span className="text-[var(--text-muted)]">{deltaLabel}</span>}
        </p>
      )}
      {note && <p className="mt-1.5 text-[12px] leading-snug text-[var(--text-secondary)]">{note}</p>}
      {metric && <MetricNote metric={metric} />}
    </div>
  );
}
