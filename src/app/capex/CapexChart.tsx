'use client';

import { useMemo, useState } from 'react';
import { LineChart } from '@/components/charts/LineChart';
import { DataTable } from '@/components/ui/DataTable';
import { usdCompact } from '@/lib/format';

interface CompanySeries {
  ticker: string;
  name: string;
  tags: string[];
  capex: Array<{ end: string; value: number }>;
  revenue: Array<{ end: string; value: number }>;
  depreciation: Array<{ end: string; value: number }>;
}

type Measure = 'capex' | 'revenue' | 'depreciation';

const MEASURE_LABEL: Record<Measure, string> = {
  capex: 'Capex',
  revenue: 'Revenue',
  depreciation: 'D&A',
};

/**
 * Quarterly series for a chosen set of companies.
 *
 * One measure at a time on a single axis. Capex and revenue differ by an order
 * of magnitude for some of these names, and plotting both against two y-scales
 * would let any pair of lines be made to cross wherever the scales are set.
 */
export function CapexChart({ companies }: { companies: CompanySeries[] }) {
  const defaults = companies
    .filter((company) => company.tags.includes('hyperscaler'))
    .map((company) => company.ticker)
    .slice(0, 5);

  const [selected, setSelected] = useState<string[]>(
    defaults.length > 0 ? defaults : companies.slice(0, 4).map((c) => c.ticker),
  );
  const [measure, setMeasure] = useState<Measure>('capex');

  // Colour follows the company's fixed position in the registry, so toggling
  // one off never repaints the others.
  const colorIndex = useMemo(
    () => new Map(companies.map((company, index) => [company.ticker, index])),
    [companies],
  );

  const active = companies.filter((company) => selected.includes(company.ticker));

  const data = useMemo(() => {
    const quarters = [
      ...new Set(active.flatMap((company) => company[measure].map((point) => point.end))),
    ].sort();
    return quarters.map((end) => {
      const row: Record<string, string | number | null> = { end };
      for (const company of active) {
        row[company.ticker] = company[measure].find((point) => point.end === end)?.value ?? null;
      }
      return row;
    });
  }, [active, measure]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-md border" style={{ borderColor: 'var(--border)' }}>
          {(Object.keys(MEASURE_LABEL) as Measure[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setMeasure(key)}
              aria-pressed={key === measure}
              className="px-2.5 py-1 text-[12px] font-medium"
              style={{
                background: key === measure ? 'var(--surface-sunken)' : 'transparent',
                color: key === measure ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
            >
              {MEASURE_LABEL[key]}
            </button>
          ))}
        </div>
        <select
          aria-label="Add a company"
          value=""
          onChange={(event) => {
            const ticker = event.target.value;
            if (ticker && !selected.includes(ticker)) setSelected([...selected, ticker].slice(0, 8));
          }}
          className="rounded-md border bg-[var(--surface-1)] px-2 py-1 text-[12px]"
          style={{ borderColor: 'var(--border)' }}
        >
          <option value="">Add company…</option>
          {companies
            .filter((company) => !selected.includes(company.ticker))
            .map((company) => (
              <option key={company.ticker} value={company.ticker}>
                {company.ticker} — {company.name}
              </option>
            ))}
        </select>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {selected.map((ticker) => (
          <button
            key={ticker}
            type="button"
            onClick={() => setSelected(selected.filter((t) => t !== ticker))}
            className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[12px]"
            style={{ borderColor: 'var(--border)' }}
            title={`Remove ${ticker}`}
          >
            <span
              aria-hidden="true"
              className="inline-block size-2 rounded-[1px]"
              style={{ background: `var(--series-${((colorIndex.get(ticker) ?? 0) % 8) + 1})` }}
            />
            {ticker}
            <span aria-hidden="true" className="text-[var(--text-muted)]">×</span>
            <span className="sr-only">Remove from chart</span>
          </button>
        ))}
        {selected.length === 0 && (
          <span className="text-[12px] text-[var(--text-muted)]">Add a company to plot.</span>
        )}
      </div>

      {data.length > 0 ? (
        <>
          <LineChart
            data={data}
            series={active.map((company) => ({
              key: company.ticker,
              label: company.ticker,
              colorIndex: colorIndex.get(company.ticker) ?? 0,
            }))}
            xKey="end"
            xFormatter={(value) => quarterLabel(value)}
            yFormatter={(value) => usdCompact(value, 0)}
            height={280}
            yLabel={`${MEASURE_LABEL[measure]} per quarter`}
          />
          <details className="mt-3">
            <summary className="cursor-pointer text-[12px] text-[var(--text-muted)] underline decoration-dotted underline-offset-2 hover:text-[var(--text-secondary)]">
              View as table
            </summary>
            <div className="mt-2">
              <DataTable
                rows={[...data].reverse()}
                rowKey={(row) => String(row.end)}
                maxHeight={280}
                columns={[
                  {
                    key: 'end',
                    header: 'Quarter',
                    render: (row) => quarterLabel(String(row.end)),
                    sortValue: (row) => String(row.end),
                  },
                  ...active.map((company) => ({
                    key: company.ticker,
                    header: company.ticker,
                    numeric: true,
                    render: (row: Record<string, string | number | null>) =>
                      usdCompact(row[company.ticker] as number | null),
                    sortValue: (row: Record<string, string | number | null>) =>
                      (row[company.ticker] as number | null) ?? null,
                  })),
                ]}
              />
            </div>
          </details>
        </>
      ) : (
        <p className="py-8 text-center text-[13px] text-[var(--text-muted)]">
          Select at least one company.
        </p>
      )}
    </div>
  );
}

function quarterLabel(end: string): string {
  const date = new Date(end);
  if (Number.isNaN(date.getTime())) return end;
  const quarter = Math.floor(date.getUTCMonth() / 3) + 1;
  return `Q${quarter} ${String(date.getUTCFullYear()).slice(2)}`;
}
