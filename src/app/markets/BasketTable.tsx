'use client';

import { DataTable } from '@/components/ui/DataTable';
import { MetricNote } from '@/components/ui/MetricNote';
import { signedPercent } from '@/lib/format';
import type { DerivedMetric } from '@/lib/types';

interface BasketRow {
  layer: string;
  label: string;
  constituentCount: number;
  tickers: string[];
  m1: number | null;
  m3: number | null;
  ytd: number | null;
  y1: number | null;
  absoluteYtd: number | null;
  metric: DerivedMetric;
}

/** Relative performance is a signed quantity, so direction gets a glyph as
 *  well as a colour — never hue alone. */
function Relative({ value }: { value: number | null }) {
  if (value === null) return <span className="text-[var(--text-muted)]">—</span>;
  return (
    <span style={{ color: value >= 0 ? 'var(--delta-up)' : 'var(--delta-down)' }}>
      <span aria-hidden="true">{value >= 0 ? '▲' : '▼'}</span> {signedPercent(value)}
      <span className="sr-only">{value >= 0 ? ' outperformed' : ' underperformed'}</span>
    </span>
  );
}

export function BasketTable({ rows }: { rows: BasketRow[] }) {
  const sample = rows[0]?.metric;
  return (
    <div>
      <DataTable
        rows={rows}
        rowKey={(row) => row.layer}
        initialSort="ytd"
        columns={[
          {
            key: 'label',
            header: 'Layer',
            render: (row) => (
              <span>
                <span className="font-medium">{row.label}</span>
                <span className="ml-1.5 text-[var(--text-muted)]">
                  {row.constituentCount} names
                </span>
              </span>
            ),
            sortValue: (row) => row.label,
          },
          {
            key: 'absolute',
            header: 'YTD return',
            numeric: true,
            headerTitle: 'Equal-weighted average return of the layer, year to date',
            render: (row) => signedPercent(row.absoluteYtd),
            sortValue: (row) => row.absoluteYtd,
          },
          {
            key: 'm1',
            header: '1M vs S&P',
            numeric: true,
            render: (row) => <Relative value={row.m1} />,
            sortValue: (row) => row.m1,
          },
          {
            key: 'm3',
            header: '3M vs S&P',
            numeric: true,
            render: (row) => <Relative value={row.m3} />,
            sortValue: (row) => row.m3,
          },
          {
            key: 'ytd',
            header: 'YTD vs S&P',
            numeric: true,
            render: (row) => <Relative value={row.ytd} />,
            sortValue: (row) => row.ytd,
          },
          {
            key: 'y1',
            header: '1Y vs S&P',
            numeric: true,
            render: (row) => <Relative value={row.y1} />,
            sortValue: (row) => row.y1,
          },
          {
            key: 'tickers',
            header: 'Constituents',
            render: (row) => (
              <span className="text-[12px] text-[var(--text-muted)]">
                {row.tickers.slice(0, 6).join(' ')}
                {row.tickers.length > 6 ? ` +${row.tickers.length - 6}` : ''}
              </span>
            ),
          },
        ]}
      />
      {sample && <MetricNote metric={sample} label="How relative strength is calculated" />}
    </div>
  );
}
