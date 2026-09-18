'use client';

import {
  Area, AreaChart as RAreaChart, CartesianGrid, Legend,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { seriesColor, chartMargin } from './theme';
import { TooltipShell, TooltipRow } from './Tooltip';

export interface AreaSeries { key: string; label: string; colorIndex: number }

export function AreaChart<T extends Record<string, unknown>>({
  data, series, xKey, xFormatter, yFormatter, height = 280, stacked = true, yLabel,
}: {
  data: T[];
  series: AreaSeries[];
  xKey: string;
  xFormatter?: (value: string) => string;
  yFormatter?: (value: number) => string;
  height?: number;
  stacked?: boolean;
  yLabel?: string;
}) {
  const format = yFormatter ?? ((v: number) => String(v));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RAreaChart data={data} margin={chartMargin}>
        <CartesianGrid stroke="var(--grid)" vertical={false} />
        <XAxis
          dataKey={xKey} tickFormatter={xFormatter} stroke="var(--axis)"
          tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} minTickGap={24}
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
        <Tooltip
          cursor={{ stroke: 'var(--axis)', strokeWidth: 1 }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            return (
              <TooltipShell title={xFormatter ? xFormatter(String(label)) : String(label)}>
                {payload.map((item) => (
                  <TooltipRow
                    key={String(item.dataKey)} color={item.color}
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
          <Area
            key={entry.key}
            type="monotone"
            dataKey={entry.key}
            name={entry.label}
            stackId={stacked ? 'stack' : undefined}
            stroke={seriesColor(entry.colorIndex)}
            strokeWidth={2}
            fill={seriesColor(entry.colorIndex)}
            fillOpacity={stacked ? 0.75 : 0.16}
            isAnimationActive={false}
          />
        ))}
      </RAreaChart>
    </ResponsiveContainer>
  );
}
