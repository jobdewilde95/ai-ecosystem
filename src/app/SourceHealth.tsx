import { daysSince, shortDate } from '@/lib/format';
import type { SourceHealth as Health } from '@/lib/types';

const SOURCE_LABEL: Record<string, string> = {
  openrouter: 'OpenRouter pricing',
  artificialanalysis: 'Artificial Analysis',
  market: 'Market prices',
  'sec-financials': 'SEC fundamentals',
  'epoch-models': 'Epoch AI compute',
};

/** Freshness per source. State carries an icon and a worded status, never
 *  colour alone. */
export function SourceHealth({ sources }: { sources: Record<string, Health> }) {
  const entries = Object.entries(sources);
  if (entries.length === 0) {
    return <p className="text-[13px] text-[var(--text-muted)]">No sources recorded.</p>;
  }

  return (
    <ul className="space-y-1.5">
      {entries.map(([name, health]) => {
        const age = daysSince(health.lastSuccessAt);
        return (
          <li key={name} className="flex items-center justify-between gap-3 text-[12px]">
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                aria-hidden="true"
                style={{ color: health.stale ? 'var(--status-warning)' : 'var(--status-good)' }}
              >
                {health.stale ? '⚠' : '●'}
              </span>
              <span className="truncate">{SOURCE_LABEL[name] ?? name}</span>
            </span>
            <span className="shrink-0 text-right text-[var(--text-muted)]">
              {health.stale ? (
                <span title={health.reason ?? undefined}>
                  stale{age !== null ? ` · ${age}d` : ''}
                </span>
              ) : (
                <>
                  {health.records.toLocaleString()} records · {shortDate(health.lastSuccessAt)}
                </>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
