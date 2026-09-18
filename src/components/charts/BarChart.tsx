'use client';

import {
  Bar, BarChart as RBarChart, CartesianGrid, Cell, Legend,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { seriesColor, chartMargin } from './theme';
import { TooltipShell, TooltipRow } from './Tooltip';

export interface BarSeries { key: string; label: string; colorIndex: number }

export function BarChart<T extends Record<string, unknown>>({
  data, series, xKey, xFormatter, yFormatter, height = 280, stacked = false,
  layout = 'horizontal', colorFor, yLabel,
}: {
  data: T[];
  series: BarSeries[];
  xKey: string;
  xFormatter?: (value: string) => string;
  yFormatter?: (value: number) => string;
  height?: number;
  stacked?: boolean;
  layout?: 'horizontal' | 'vertical';
  /** Per-datum colour, for a single series encoding a category or status. */
  colorFor?: (row: T, index: number) => string;
  yLabel?: string;
}) {
  const format = yFormatter ?? ((v: number) => String(v));
  const vertical = layout === 'vertical';

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RBarChart
        data={data}
        layout={layout}
        margin={vertical ? { ...chartMargin, left: 8 } : chartMargin}
        barCategoryGap={vertical ? '18%' : '22%'}
      >
        <CartesianGrid stroke="var(--grid)" vertical={vertical} horizontal={!vertical} />
        {vertical ? (
          <>
            <XAxis
              type="number" tickFormatter={yFormatter} stroke="var(--axis)"
              tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false}
            />
            <YAxis
              type="category" dataKey={xKey} tickFormatter={xFormatter} stroke="var(--axis)"
              tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} width={72}
            />
          </>
        ) : (
          <>
            <XAxis
              dataKey={xKey} tickFormatter={xFormatter} stroke="var(--axis)"
              tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} minTickGap={16}
            />
            <YAxis
              tickFormatter={yFormatter} stroke="var(--axis)"
              tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false}
              width={56}
              label={yLabel ? {
                value: yLabel, angle: -90, position: 'insideLeft',
                style: { fontSize: 11, fill: 'var(--text-muted)', textAnchor: 'middle' },
              } : undefined}
            />
          </>
        )}
        <Tooltip
          cursor={{ fill: 'var(--surface-sunken)' }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            return (
              <TooltipShell title={xFormatter ? xFormatter(String(label)) : String(label)}>
                {payload.map((item) => (
                  <TooltipRow
                    key={String(item.dataKey)}
                    color={item.color}
                    label={series.find((s) => s.key === item.dataKey)?.label ?? String(item.dataKey)}
                    value={typeof item.value === 'number' ? format(item.value) : '—'}
                  />
                ))}
              </TooltipShell>
            );
          }}
        />
        {series.length > 1 && (
          <Legend
            verticalAlign="top" align="left" height={28} iconType="square"
            wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)', paddingBottom: 4 }}
          />
        )}
        {series.map((entry) => (
          <Bar
            key={entry.key}
            dataKey={entry.key}
            name={entry.label}
            stackId={stacked ? 'stack' : undefined}
            fill={seriesColor(entry.colorIndex)}
            // 4px rounded data-end anchored to the baseline; a 2px surface gap
            // keeps stacked segments and adjacent bars from fusing.
            radius={stacked ? 0 : vertical ? [0, 4, 4, 0] : [4, 4, 0, 0]}
            stroke={stacked ? 'var(--surface-1)' : undefined}
            strokeWidth={stacked ? 2 : 0}
            isAnimationActive={false}
          >
            {colorFor && data.map((row, index) => (
              <Cell key={index} fill={colorFor(row, index)} />
            ))}
          </Bar>
        ))}
      </RBarChart>
    </ResponsiveContainer>
  );
}
