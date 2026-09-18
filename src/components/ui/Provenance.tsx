import { daysSince, shortDate } from '@/lib/format';
import type { SourceHealth } from '@/lib/types';

/**
 * Badge marking data that failed to refresh.
 *
 * The difference between a dashboard that quietly shows week-old numbers as
 * current and one that says so. Renders nothing when data is fresh, so a clean
 * page stays clean.
 */
export function StalenessBadge({ health, source }: { health?: SourceHealth; source: string }) {
  if (!health || !health.stale) return null;
  const age = daysSince(health.lastSuccessAt);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium"
      style={{ borderColor: 'var(--status-warning)', color: 'var(--text-secondary)' }}
      title={health.reason ?? undefined}
    >
      <span aria-hidden="true" style={{ color: 'var(--status-warning)' }}>⚠</span>
      {source} stale{age !== null ? ` · ${age}d old` : ''}
    </span>
  );
}

/** Marks a value that was seeded from prior knowledge rather than fetched. */
export function SeededTag({ children }: { children?: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded border border-dashed px-1.5 py-px text-[10px] uppercase tracking-wide text-[var(--text-muted)]"
      style={{ borderColor: 'var(--border-strong)' }}
      title="Seeded from prior knowledge, not fetched from a live source"
    >
      {children ?? 'seeded'}
    </span>
  );
}

export function AsOf({ date, prefix = 'As of' }: { date: string | null | undefined; prefix?: string }) {
  if (!date) return null;
  return (
    <span className="text-[12px] text-[var(--text-muted)]">
      {prefix} {shortDate(date)}
    </span>
  );
}
