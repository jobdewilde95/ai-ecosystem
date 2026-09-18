'use client';

import { useMemo } from 'react';
import { BarChart } from '@/components/charts/BarChart';
import { DataTable } from '@/components/ui/DataTable';

/**
 * Models shipped per quarter, by lab.
 *
 * Stacked bars because the question is both "how much is shipping overall" and
 * "who is shipping it". Capped at the eight categorical slots, with everything
 * else folded into a single muted remainder rather than inventing a ninth hue.
 */
export function ReleaseCadence({
  models,
}: {
  models: Array<{ creator: string; releaseDate: string }>;
}) {
  const { data, series } = useMemo(() => {
    const counts = new Map<string, number>();
    for (const model of models) counts.set(model.creator, (counts.get(model.creator) ?? 0) + 1);
    const top = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([creator]) => creator);

    const byQuarter = new Map<string, Record<string, number>>();
    for (const model of models) {
      const date = new Date(model.releaseDate);
      if (Number.isNaN(date.getTime())) continue;
      const quarter = `${date.getUTCFullYear()}-Q${Math.floor(date.getUTCMonth() / 3) + 1}`;
      const bucket = byQuarter.get(quarter) ?? {};
      const key = top.includes(model.creator) ? model.creator : 'Other';
      bucket[key] = (bucket[key] ?? 0) + 1;
      byQuarter.set(quarter, bucket);
    }

    const quarters = [...byQuarter.keys()].sort().slice(-10);
    const rows = quarters.map((quarter) => ({
      quarter,
      ...Object.fromEntries([...top, 'Other'].map((key) => [key, byQuarter.get(quarter)?.[key] ?? 0])),
    }));

    return {
      data: rows,
      series: [
        ...top.map((creator, index) => ({ key: creator, label: creator, colorIndex: index })),
        { key: 'Other', label: 'Other labs', colorIndex: 7 },
      ],
    };
  }, [models]);

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-[13px] text-[var(--text-muted)]">
        No dated releases available.
      </p>
    );
  }

  return (
    <div>
      <BarChart
        data={data}
        series={series}
        xKey="quarter"
        stacked
        height={300}
        yFormatter={(value) => String(value)}
        yLabel="Models released"
      />
      <details className="mt-3">
        <summary className="cursor-pointer text-[12px] text-[var(--text-muted)] underline decoration-dotted underline-offset-2 hover:text-[var(--text-secondary)]">
          View as table
        </summary>
        <div className="mt-2">
          <DataTable
            rows={[...data].reverse()}
            rowKey={(row) => row.quarter}
            maxHeight={260}
            columns={[
              {
                key: 'quarter',
                header: 'Quarter',
                render: (row) => row.quarter,
                sortValue: (row) => row.quarter,
              },
              ...series.map((entry) => ({
                key: entry.key,
                header: entry.label,
                numeric: true,
                render: (row: Record<string, string | number>) => String(row[entry.key] ?? 0),
                sortValue: (row: Record<string, string | number>) => Number(row[entry.key] ?? 0),
              })),
              {
                key: 'total',
                header: 'Total',
                numeric: true,
                render: (row: Record<string, string | number>) => (
                  <span className="font-semibold">
                    {series.reduce((sum, entry) => sum + Number(row[entry.key] ?? 0), 0)}
                  </span>
                ),
                sortValue: (row: Record<string, string | number>) =>
                  series.reduce((sum, entry) => sum + Number(row[entry.key] ?? 0), 0),
              },
            ]}
          />
        </div>
      </details>
    </div>
  );
}
