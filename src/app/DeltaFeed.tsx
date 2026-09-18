'use client';

import { useMemo, useState } from 'react';
import { shortDate } from '@/lib/format';
import type { ChangeEntry } from '@/lib/types';

const CATEGORY_LABEL: Record<string, string> = {
  pricing: 'Pricing',
  models: 'Models',
  markets: 'Markets',
  filings: 'Filings',
  funding: 'Funding',
  debt: 'Debt',
  compute: 'Compute',
};

/**
 * The "what moved" feed.
 *
 * Severity gets an icon and a worded category as well as a colour, so the
 * distinction between a routine entry and a major one survives greyscale,
 * colour-vision differences and forced-colors mode.
 */
export function DeltaFeed({ entries }: { entries: ChangeEntry[] }) {
  const [category, setCategory] = useState('all');

  const categories = useMemo(
    () => [...new Set(entries.map((entry) => entry.category))].sort(),
    [entries],
  );

  const filtered = useMemo(
    () => (category === 'all' ? entries : entries.filter((entry) => entry.category === category)),
    [entries, category],
  );

  if (entries.length === 0) {
    return (
      <p className="py-8 text-center text-[13px] text-[var(--text-muted)]">
        No changes recorded yet. The feed fills as the pipeline observes movement between runs.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {['all', ...categories].map((entry) => (
          <button
            key={entry}
            type="button"
            onClick={() => setCategory(entry)}
            aria-pressed={entry === category}
            className="rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors"
            style={{
              borderColor: entry === category ? 'var(--border-strong)' : 'var(--border)',
              background: entry === category ? 'var(--surface-sunken)' : 'transparent',
              color: entry === category ? 'var(--text-primary)' : 'var(--text-secondary)',
            }}
          >
            {entry === 'all' ? `All (${entries.length})` : (CATEGORY_LABEL[entry] ?? entry)}
          </button>
        ))}
      </div>

      <ul className="max-h-[520px] space-y-0 overflow-y-auto">
        {filtered.map((entry, index) => (
          <li
            key={`${entry.date}-${entry.title}-${index}`}
            className="flex gap-3 py-2.5"
            style={{ borderTop: index === 0 ? 'none' : '1px solid var(--border)' }}
          >
            <span
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-[13px]"
              style={{
                color:
                  entry.severity === 'major'
                    ? 'var(--status-critical)'
                    : entry.severity === 'notable'
                      ? 'var(--status-warning)'
                      : 'var(--text-muted)',
              }}
            >
              {entry.severity === 'major' ? '●' : entry.severity === 'notable' ? '◐' : '○'}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-[13px] font-medium">{entry.title}</span>
                <span className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                  {CATEGORY_LABEL[entry.category] ?? entry.category}
                </span>
                {entry.severity === 'major' && <span className="sr-only">Major change</span>}
              </span>
              {entry.detail && (
                <span className="mt-0.5 block text-[12px] text-[var(--text-secondary)]">
                  {entry.detail}
                </span>
              )}
            </span>
            <span className="shrink-0 whitespace-nowrap text-[11px] text-[var(--text-muted)]">
              {shortDate(entry.date)}
            </span>
          </li>
        ))}
      </ul>
      {filtered.length === 0 && (
        <p className="py-6 text-center text-[13px] text-[var(--text-muted)]">
          Nothing in that category.
        </p>
      )}
    </div>
  );
}
