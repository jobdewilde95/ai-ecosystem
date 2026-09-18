'use client';

import { useMemo, useState, type ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  /** Right-align and use tabular figures. */
  numeric?: boolean;
  render: (row: T) => ReactNode;
  /** Sort key; omit to make the column unsortable. */
  sortValue?: (row: T) => number | string | null;
  headerTitle?: string;
  className?: string;
}

/**
 * Sortable table.
 *
 * Present on every chart page, not as a fallback but as a first-class view:
 * the validated light-mode palette leaves three series below 3:1 against the
 * surface, and the relief rule for that is direct labels or a table. It also
 * happens to be what anyone doing real work with these numbers wants.
 */
export function DataTable<T>({
  columns, rows, initialSort, initialDirection = 'desc', maxHeight, emptyMessage = 'No data available.',
  rowKey,
}: {
  columns: Column<T>[];
  rows: T[];
  initialSort?: string;
  initialDirection?: 'asc' | 'desc';
  maxHeight?: number;
  emptyMessage?: string;
  rowKey: (row: T, index: number) => string;
}) {
  const [sortKey, setSortKey] = useState<string | undefined>(initialSort);
  const [direction, setDirection] = useState<'asc' | 'desc'>(initialDirection);

  const sorted = useMemo(() => {
    const column = columns.find((c) => c.key === sortKey);
    if (!column?.sortValue) return rows;
    const factor = direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const left = column.sortValue!(a);
      const right = column.sortValue!(b);
      // Missing values sort last in both directions rather than masquerading
      // as zero, which would put unreported companies at the top of a ranking.
      if (left === null && right === null) return 0;
      if (left === null) return 1;
      if (right === null) return -1;
      if (typeof left === 'number' && typeof right === 'number') return (left - right) * factor;
      return String(left).localeCompare(String(right)) * factor;
    });
  }, [rows, columns, sortKey, direction]);

  const toggle = (key: string) => {
    if (sortKey === key) setDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setDirection('desc'); }
  };

  if (rows.length === 0) {
    return <p className="py-6 text-center text-[13px] text-[var(--text-muted)]">{emptyMessage}</p>;
  }

  return (
    <div className="scroll-x w-full min-w-0" style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}>
      <table className="w-full min-w-full text-[13px]">
        <thead className="sticky top-0 z-10 bg-[var(--surface-1)]">
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            {columns.map((column) => {
              const active = sortKey === column.key;
              return (
                <th
                  key={column.key}
                  scope="col"
                  title={column.headerTitle}
                  aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : undefined}
                  className={`whitespace-nowrap px-2.5 py-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] ${
                    column.numeric ? 'text-right' : 'text-left'
                  }`}
                >
                  {column.sortValue ? (
                    <button
                      type="button"
                      onClick={() => toggle(column.key)}
                      className="inline-flex items-center gap-1 hover:text-[var(--text-primary)]"
                    >
                      {column.header}
                      <span aria-hidden="true" className={active ? '' : 'opacity-30'}>
                        {active && direction === 'asc' ? '↑' : '↓'}
                      </span>
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, index) => (
            <tr
              key={rowKey(row, index)}
              className="hover:bg-[var(--surface-sunken)]"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`px-2.5 py-2 ${column.numeric ? 'tnum text-right' : 'text-left'} ${column.className ?? ''}`}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
