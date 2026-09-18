'use client';

import { useState } from 'react';
import { BarChart } from '@/components/charts/BarChart';
import { MetricNote } from '@/components/ui/MetricNote';
import { ratio, usdCompact } from '@/lib/format';
import type { DerivedMetric } from '@/lib/types';

interface MaturityCompany {
  ticker: string;
  name: string;
  buckets: Array<{ label: string; value: number | null }>;
  cash: number | null;
  refinancingRisk?: DerivedMetric;
  interestBurden?: DerivedMetric;
}

/** Principal coming due by year for one filer at a time. Comparing maturity
 *  schedules across companies of different size on one axis tells you about
 *  size, not about risk, so this shows one company at a time against its own
 *  cash position. */
export function MaturityWall({ companies }: { companies: MaturityCompany[] }) {
  const [ticker, setTicker] = useState(companies[0]?.ticker ?? '');
  const active = companies.find((company) => company.ticker === ticker) ?? companies[0];

  if (!active) {
    return (
      <p className="py-8 text-center text-[13px] text-[var(--text-muted)]">
        No maturity disclosures available.
      </p>
    );
  }

  const data = active.buckets
    .filter((bucket) => bucket.value !== null)
    .map((bucket) => ({ label: bucket.label, value: bucket.value as number }));

  const nextYear = active.buckets.find((bucket) => bucket.label === 'Next 12m')?.value ?? null;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select
          value={active.ticker}
          onChange={(event) => setTicker(event.target.value)}
          aria-label="Select company"
          className="rounded-md border bg-[var(--surface-1)] px-2.5 py-1.5 text-[13px]"
          style={{ borderColor: 'var(--border)' }}
        >
          {companies.map((company) => (
            <option key={company.ticker} value={company.ticker}>
              {company.ticker} — {company.name}
            </option>
          ))}
        </select>
        {active.cash !== null && (
          <span className="text-[12px] text-[var(--text-secondary)]">
            Cash on hand {usdCompact(active.cash, 1)}
            {nextYear !== null && (
              <>
                {' · '}
                <span
                  style={{
                    color: nextYear > active.cash ? 'var(--status-critical)' : 'var(--delta-up)',
                  }}
                >
                  {nextYear > active.cash ? '⚠ ' : ''}
                  {ratio(nextYear / active.cash)} of cash due within a year
                </span>
              </>
            )}
          </span>
        )}
      </div>

      {data.length > 0 ? (
        <BarChart
          data={data}
          series={[{ key: 'value', label: 'Principal due', colorIndex: 0 }]}
          xKey="label"
          height={240}
          yFormatter={(value) => usdCompact(value, 0)}
          yLabel="Principal due"
        />
      ) : (
        <p className="py-8 text-center text-[13px] text-[var(--text-muted)]">
          {active.ticker} does not disclose a maturity schedule in the tracked tags.
        </p>
      )}

      {active.refinancingRisk && (
        <MetricNote metric={active.refinancingRisk} label="Refinancing risk formula" />
      )}
      {active.interestBurden && (
        <MetricNote metric={active.interestBurden} label="Interest burden formula" />
      )}
    </div>
  );
}
