import type { DerivedMetric } from '@/lib/types';
import { compactNumber } from '@/lib/format';

/**
 * Renders a derived metric's provenance inline.
 *
 * Every computed number on this site can show the formula and the inputs that
 * produced it. A derived figure you cannot audit is worse than no figure at
 * all — the reader should be able to check the arithmetic and disagree with it.
 * Implemented as a <details> so it works without JavaScript.
 */
export function MetricNote({ metric, label = 'How this is calculated' }: {
  metric: DerivedMetric; label?: string;
}) {
  const inputs = Object.entries(metric.inputs);
  return (
    <details className="group mt-2">
      <summary className="cursor-pointer list-none text-[12px] text-[var(--text-muted)] underline decoration-dotted underline-offset-2 hover:text-[var(--text-secondary)]">
        {label}
      </summary>
      <div
        className="scroll-x mt-2 min-w-0 rounded border bg-[var(--surface-sunken)] p-3 text-[12px] leading-relaxed"
        style={{ borderColor: 'var(--border)' }}
      >
        <p className="font-mono text-[var(--text-primary)]">{metric.formula}</p>
        {inputs.length > 0 && (
          <dl className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1">
            {inputs.map(([key, value]) => (
              <div key={key} className="contents">
                <dt className="min-w-0 truncate text-[var(--text-secondary)]">{humanise(key)}</dt>
                <dd className="tnum text-right text-[var(--text-primary)]">
                  {typeof value === 'number' ? compactNumber(value) : (value ?? '—')}
                </dd>
              </div>
            ))}
          </dl>
        )}
        {metric.caveat && (
          <p className="mt-2 flex gap-1.5 text-[var(--text-secondary)]">
            <span aria-hidden="true">⚠</span>
            <span>{metric.caveat}</span>
          </p>
        )}
      </div>
    </details>
  );
}

function humanise(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (char) => char.toUpperCase())
    .replace(/\bTtm\b/, 'TTM')
    .replace(/\bPct\b/, '%')
    .replace(/\bUsd\b/, 'USD');
}
