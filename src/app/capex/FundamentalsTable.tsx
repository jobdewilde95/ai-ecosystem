'use client';

import { DataTable } from '@/components/ui/DataTable';
import { MetricNote } from '@/components/ui/MetricNote';
import { percent, ratio, shortDate, usdCompact } from '@/lib/format';
import type { Fundamentals } from '@/lib/types';

const LABELS: Record<string, string> = {
  capexCoverage: 'Capex coverage',
  capexIntensity: 'Capex intensity',
  depreciationDrag: 'Depreciation drag',
};

export function FundamentalsTable({ rows }: { rows: Fundamentals[] }) {
  return (
    <div>
      <DataTable
        rows={rows}
        rowKey={(row) => row.ticker}
        initialSort="capex"
        columns={[
          {
            key: 'ticker',
            header: 'Company',
            render: (row) => (
              <span>
                <span className="font-semibold">{row.ticker}</span>
                <span className="ml-1.5 text-[var(--text-muted)]">{row.name}</span>
              </span>
            ),
            sortValue: (row) => row.ticker,
          },
          {
            key: 'revenue',
            header: 'Revenue',
            numeric: true,
            headerTitle: 'Trailing twelve months',
            render: (row) => usdCompact(row.ttm.revenue),
            sortValue: (row) => row.ttm.revenue,
          },
          {
            key: 'capex',
            header: 'Capex',
            numeric: true,
            headerTitle: 'Trailing twelve months',
            render: (row) => <span className="font-semibold">{usdCompact(row.ttm.capex)}</span>,
            sortValue: (row) => row.ttm.capex,
          },
          {
            key: 'intensity',
            header: 'Capex / rev',
            numeric: true,
            headerTitle: 'TTM capex as a percentage of TTM revenue',
            render: (row) => percent(row.metrics.capexIntensity?.value, 0),
            sortValue: (row) => row.metrics.capexIntensity?.value ?? null,
          },
          {
            key: 'coverage',
            header: 'Coverage',
            numeric: true,
            headerTitle: 'TTM operating cash flow ÷ TTM capex. Below 1.0 means externally funded.',
            render: (row) => {
              const value = row.metrics.capexCoverage?.value;
              if (value === null || value === undefined) return '—';
              const short = value < 1;
              return (
                <span
                  className="inline-flex items-center gap-1"
                  style={{ color: short ? 'var(--status-critical)' : 'var(--text-primary)' }}
                >
                  {short && <span aria-hidden="true">⚠</span>}
                  {ratio(value)}
                  {short && <span className="sr-only">below one, externally funded</span>}
                </span>
              );
            },
            sortValue: (row) => row.metrics.capexCoverage?.value ?? null,
          },
          {
            key: 'ppe',
            header: 'Net PP&E',
            numeric: true,
            render: (row) => usdCompact(row.latest.ppe),
            sortValue: (row) => row.latest.ppe,
          },
          {
            key: 'da',
            header: 'D&A',
            numeric: true,
            headerTitle: 'Trailing twelve months depreciation and amortisation',
            render: (row) => usdCompact(row.ttm.depreciation),
            sortValue: (row) => row.ttm.depreciation,
          },
          {
            key: 'drag',
            header: 'D&A drag',
            numeric: true,
            headerTitle:
              'TTM D&A growth minus TTM revenue growth, in percentage points. Positive means depreciation is compounding faster than revenue.',
            render: (row) => {
              const value = row.metrics.depreciationDrag?.value;
              if (value === null || value === undefined) return '—';
              return (
                <span style={{ color: value > 0 ? 'var(--status-serious)' : 'var(--delta-up)' }}>
                  {value > 0 ? '+' : ''}
                  {value.toFixed(0)} pp
                </span>
              );
            },
            sortValue: (row) => row.metrics.depreciationDrag?.value ?? null,
          },
          {
            key: 'asOf',
            header: 'As of',
            render: (row) => (
              <span className="text-[var(--text-muted)]">{shortDate(row.latest.asOf)}</span>
            ),
            sortValue: (row) => row.latest.asOf,
          },
        ]}
      />

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {(['capexCoverage', 'capexIntensity', 'depreciationDrag'] as const).map((key) => {
          const sample = rows.find((row) => row.metrics[key]);
          if (!sample) return null;
          return (
            <div key={key}>
              <p className="text-[12px] font-medium text-[var(--text-secondary)]">{LABELS[key]}</p>
              <MetricNote metric={sample.metrics[key]} label="Formula" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
