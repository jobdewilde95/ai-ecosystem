'use client';

import { BarChart } from '@/components/charts/BarChart';
import { DataTable } from '@/components/ui/DataTable';
import { usdCompact } from '@/lib/format';

/**
 * Private equity raises against corporate debt issuance, by year.
 *
 * Grouped rather than stacked: these are different kinds of claim on different
 * balance sheets, and stacking them would imply a total that means nothing.
 */
export function CapitalFlowChart({
  funding,
  debt,
}: {
  funding: Array<{ year: string; total: number }>;
  debt: Array<{ year: string; total: number }>;
}) {
  const years = [...new Set([...funding, ...debt].map((entry) => entry.year))].sort();
  const fundingBy = new Map(funding.map((entry) => [entry.year, entry.total]));
  const debtBy = new Map(debt.map((entry) => [entry.year, entry.total]));

  const data = years.map((year) => ({
    year,
    funding: fundingBy.get(year) ?? 0,
    debt: debtBy.get(year) ?? 0,
  }));

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-[13px] text-[var(--text-muted)]">
        No capital records yet.
      </p>
    );
  }

  return (
    <div>
      <BarChart
        data={data}
        series={[
          { key: 'funding', label: 'Private equity rounds', colorIndex: 0 },
          { key: 'debt', label: 'Corporate debt', colorIndex: 1 },
        ]}
        xKey="year"
        height={280}
        yFormatter={(value) => usdCompact(value, 0)}
        yLabel="Announced capital"
      />
      <details className="mt-3">
        <summary className="cursor-pointer text-[12px] text-[var(--text-muted)] underline decoration-dotted underline-offset-2 hover:text-[var(--text-secondary)]">
          View as table
        </summary>
        <div className="mt-2">
          <DataTable
            rows={data}
            rowKey={(row) => row.year}
            initialSort="year"
            columns={[
              { key: 'year', header: 'Year', render: (row) => row.year, sortValue: (row) => row.year },
              {
                key: 'funding',
                header: 'Equity rounds',
                numeric: true,
                render: (row) => usdCompact(row.funding, 1),
                sortValue: (row) => row.funding,
              },
              {
                key: 'debt',
                header: 'Debt',
                numeric: true,
                render: (row) => usdCompact(row.debt, 1),
                sortValue: (row) => row.debt,
              },
            ]}
          />
        </div>
      </details>
      <p className="mt-2 text-[12px] text-[var(--text-muted)]">
        Coverage grows with the dataset rather than with the market, so earlier years are
        under-represented. Read the shape, not the absolute totals.
      </p>
    </div>
  );
}
