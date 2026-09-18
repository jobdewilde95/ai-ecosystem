'use client';

import { BarChart } from '@/components/charts/BarChart';
import { DataTable } from '@/components/ui/DataTable';
import { ratio, usdCompact } from '@/lib/format';

interface CoverageRow {
  ticker: string;
  name: string;
  coverage: number;
  capex: number | null;
  tags: string[];
}

/**
 * Capex coverage by company.
 *
 * A single measure across categories, so colour encodes state rather than
 * identity: below 1.0 the buildout is not funded by operations. Status colours
 * always ship with a label — here the axis threshold and the table's warning
 * glyph — so the reading never rests on hue.
 */
export function CoverageChart({ rows }: { rows: CoverageRow[] }) {
  // Extreme negatives (a company whose operations consumed cash) would compress
  // everything else into a hairline, so the axis is clamped and the true value
  // stays visible in the table.
  const clamped = rows
    .map((row) => ({ ...row, plotted: Math.max(-1, Math.min(row.coverage, 6)) }))
    .slice(0, 16);

  return (
    <div>
      <BarChart
        data={clamped}
        series={[{ key: 'plotted', label: 'Coverage', colorIndex: 0 }]}
        xKey="ticker"
        layout="vertical"
        height={Math.max(260, clamped.length * 22)}
        yFormatter={(value) => `${value.toFixed(1)}×`}
        colorFor={(row) =>
          row.coverage < 1 ? 'var(--status-critical)' : 'var(--status-good)'
        }
      />

      <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[var(--text-secondary)]">
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block size-2.5 rounded-[1px]"
            style={{ background: 'var(--status-critical)' }}
          />
          Below 1.0× — externally funded
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block size-2.5 rounded-[1px]"
            style={{ background: 'var(--status-good)' }}
          />
          At or above 1.0× — self-funded
        </span>
        <span className="text-[var(--text-muted)]">Axis clamped to −1× … 6×</span>
      </p>

      <details className="mt-3">
        <summary className="cursor-pointer text-[12px] text-[var(--text-muted)] underline decoration-dotted underline-offset-2 hover:text-[var(--text-secondary)]">
          View all {rows.length} as table
        </summary>
        <div className="mt-2">
          <DataTable
            rows={rows}
            rowKey={(row) => row.ticker}
            initialSort="coverage"
            initialDirection="asc"
            maxHeight={300}
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
                key: 'coverage',
                header: 'Coverage',
                numeric: true,
                render: (row) => (
                  <span
                    className="inline-flex items-center gap-1"
                    style={{
                      color: row.coverage < 1 ? 'var(--status-critical)' : 'var(--text-primary)',
                    }}
                  >
                    {row.coverage < 1 && <span aria-hidden="true">⚠</span>}
                    {ratio(row.coverage)}
                  </span>
                ),
                sortValue: (row) => row.coverage,
              },
              {
                key: 'capex',
                header: 'TTM capex',
                numeric: true,
                render: (row) => usdCompact(row.capex),
                sortValue: (row) => row.capex,
              },
              {
                key: 'type',
                header: 'Type',
                render: (row) => (
                  <span className="text-[var(--text-secondary)]">
                    {row.tags.includes('hyperscaler')
                      ? 'Hyperscaler'
                      : row.tags.includes('neocloud')
                        ? 'Neocloud'
                        : '—'}
                  </span>
                ),
                sortValue: (row) => row.tags.join(','),
              },
            ]}
          />
        </div>
      </details>
    </div>
  );
}
