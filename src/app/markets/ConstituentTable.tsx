'use client';

import { useMemo, useState } from 'react';
import { DataTable } from '@/components/ui/DataTable';
import { percent, signedPercent } from '@/lib/format';

interface ConstituentRow {
  ticker: string;
  name: string;
  layers: string[];
  close: number;
  d1: number | null;
  m1: number | null;
  m3: number | null;
  ytd: number | null;
  y1: number | null;
  rangePosition: number | null;
  maxDrawdown: number | null;
}

function Signed({ value }: { value: number | null }) {
  if (value === null) return <span className="text-[var(--text-muted)]">—</span>;
  return (
    <span style={{ color: value >= 0 ? 'var(--delta-up)' : 'var(--delta-down)' }}>
      {signedPercent(value)}
    </span>
  );
}

/** Position within the 52-week range, drawn as a track so the number and the
 *  picture agree without needing colour to carry either. */
function RangeBar({ value }: { value: number | null }) {
  if (value === null) return <span className="text-[var(--text-muted)]">—</span>;
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <span className="inline-flex items-center gap-1.5" title={`${clamped.toFixed(0)}% of 52-week range`}>
      <span
        aria-hidden="true"
        className="relative inline-block h-1.5 w-12 rounded-full"
        style={{ background: 'var(--surface-sunken)' }}
      >
        <span
          className="absolute top-0 block h-1.5 w-1 rounded-full"
          style={{ left: `calc(${clamped}% - 2px)`, background: 'var(--series-1)' }}
        />
      </span>
      <span className="tnum text-[12px]">{clamped.toFixed(0)}%</span>
    </span>
  );
}

export function ConstituentTable({ rows }: { rows: ConstituentRow[] }) {
  const [query, setQuery] = useState('');
  const [layer, setLayer] = useState('all');

  const layers = useMemo(
    () => [...new Set(rows.flatMap((row) => row.layers))].sort((a, b) => a.localeCompare(b)),
    [rows],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (layer !== 'all' && !row.layers.includes(layer)) return false;
      if (!needle) return true;
      return (
        row.ticker.toLowerCase().includes(needle) || row.name.toLowerCase().includes(needle)
      );
    });
  }, [rows, query, layer]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search ticker or company"
          aria-label="Search constituents"
          className="min-w-[180px] flex-1 rounded-md border bg-[var(--surface-1)] px-2.5 py-1.5 text-[13px]"
          style={{ borderColor: 'var(--border)' }}
        />
        <select
          value={layer}
          onChange={(event) => setLayer(event.target.value)}
          aria-label="Filter by layer"
          className="rounded-md border bg-[var(--surface-1)] px-2.5 py-1.5 text-[13px]"
          style={{ borderColor: 'var(--border)' }}
        >
          <option value="all">All layers</option>
          {layers.map((entry) => (
            <option key={entry} value={entry}>
              {entry}
            </option>
          ))}
        </select>
        <span className="text-[12px] text-[var(--text-muted)]">
          {filtered.length} of {rows.length}
        </span>
      </div>

      <DataTable
        rows={filtered}
        rowKey={(row) => row.ticker}
        initialSort="ytd"
        maxHeight={560}
        columns={[
          {
            key: 'ticker',
            header: 'Ticker',
            render: (row) => (
              <span>
                <span className="font-semibold">{row.ticker}</span>
                <span className="ml-1.5 text-[var(--text-muted)]">{row.name}</span>
              </span>
            ),
            sortValue: (row) => row.ticker,
          },
          {
            key: 'layer',
            header: 'Layer',
            render: (row) => (
              <span className="text-[12px] text-[var(--text-secondary)]">
                {row.layers[0] ?? '—'}
                {row.layers.length > 1 && (
                  <span className="text-[var(--text-muted)]"> +{row.layers.length - 1}</span>
                )}
              </span>
            ),
            sortValue: (row) => row.layers[0] ?? '',
          },
          {
            key: 'close',
            header: 'Close',
            numeric: true,
            render: (row) => `$${row.close.toFixed(2)}`,
            sortValue: (row) => row.close,
          },
          { key: 'd1', header: '1D', numeric: true, render: (row) => <Signed value={row.d1} />, sortValue: (row) => row.d1 },
          { key: 'm1', header: '1M', numeric: true, render: (row) => <Signed value={row.m1} />, sortValue: (row) => row.m1 },
          { key: 'm3', header: '3M', numeric: true, render: (row) => <Signed value={row.m3} />, sortValue: (row) => row.m3 },
          { key: 'ytd', header: 'YTD', numeric: true, render: (row) => <Signed value={row.ytd} />, sortValue: (row) => row.ytd },
          { key: 'y1', header: '1Y', numeric: true, render: (row) => <Signed value={row.y1} />, sortValue: (row) => row.y1 },
          {
            key: 'range',
            header: '52w range',
            numeric: true,
            headerTitle: 'Where the last close sits between the 52-week low and high',
            render: (row) => <RangeBar value={row.rangePosition} />,
            sortValue: (row) => row.rangePosition,
          },
          {
            key: 'dd',
            header: 'Max DD',
            numeric: true,
            headerTitle: 'Deepest peak-to-trough decline over the tracked history',
            render: (row) =>
              row.maxDrawdown === null ? (
                <span className="text-[var(--text-muted)]">—</span>
              ) : (
                <span style={{ color: 'var(--text-secondary)' }}>{percent(row.maxDrawdown, 0)}</span>
              ),
            sortValue: (row) => row.maxDrawdown,
          },
        ]}
      />
    </div>
  );
}
