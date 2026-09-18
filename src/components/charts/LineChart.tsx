'use client';

import {
  CartesianGrid, Legend, Line, LineChart as RLineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';
import { seriesColor, chartMargin } from './theme';
import { TooltipShell, TooltipRow } from './Tooltip';

export interface LineSeries {
  key: string;
  label: string;
  /** Fixed palette slot, so filtering never repaints the remaining series. */
  colorIndex: number;
  dashed?: boolean;
}

/**
 * `step` is the honest interpolation for a running minimum: the value holds
 * until something cheaper appears. A smooth curve between two price points
 * would draw intermediate prices that never existed.
 */
export type Interpolation = 'monotone' | 'step' | 'linear';

export function LineChart<T extends Record<string, unknown>>({
  data, series, xKey, xFormatter, yFormatter, valueFormatter, height = 280,
  yLabel, logScale = false, showLegend, interpolation = 'monotone',
}: {
  data: T[];
  series: LineSeries[];
  xKey: string;
  xFormatter?: (value: string) => string;
  yFormatter?: (value: number) => string;
  valueFormatter?: (value: number) => string;
  height?: number;
  yLabel?: string;
  logScale?: boolean;
  showLegend?: boolean;
  interpolation?: Interpolation;
}) {
  // A legend is mandatory from two series up; a single series is named by the
  // card title instead, so the box would be noise.
  const withLegend = showLegend ?? series.length > 1;
  const format = valueFormatter ?? yFormatter ?? ((v: number) => String(v));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RLineChart data={data} margin={chartMargin}>
        <CartesianGrid stroke="var(--grid)" strokeDasharray="0" vertical={false} />
        <XAxis
          dataKey={xKey}
          tickFormatter={xFormatter}
          stroke="var(--axis)"
          tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
          tickLine={false}
          minTickGap={24}
        />
        <YAxis
          scale={logScale ? 'log' : 'auto'}
          domain={logScale ? ['auto', 'auto'] : undefined}
          tickFormatter={yFormatter}
          stroke="var(--axis)"
          tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
          tickLine={false}
          axisLine={false}
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
        {withLegend && (
          <Legend
            verticalAlign="top"
            align="left"
            height={28}
            iconType="plainline"
            wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)', paddingBottom: 4 }}
          />
        )}
        {series.map((entry) => (
          <Line
            key={entry.key}
            type={interpolation === 'step' ? 'stepAfter' : interpolation}
            dataKey={entry.key}
            name={entry.label}
            stroke={seriesColor(entry.colorIndex)}
            strokeWidth={2}
            strokeDasharray={entry.dashed ? '5 3' : undefined}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface-1)' }}
            connectNulls
            isAnimationActive={false}
          />
        ))}
      </RLineChart>
    </ResponsiveContainer>
  );
}
