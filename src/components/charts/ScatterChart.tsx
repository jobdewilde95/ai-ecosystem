'use client';

import {
  CartesianGrid, ResponsiveContainer, Scatter, ScatterChart as RScatterChart,
  Tooltip, XAxis, YAxis, ZAxis, Legend,
} from 'recharts';
import { seriesColor, chartMargin, SCATTER_SLOTS } from './theme';
import { TooltipShell, TooltipRow } from './Tooltip';

export interface ScatterPoint {
  x: number;
  y: number;
  label: string;
  group: string;
  meta?: Record<string, string>;
}

/**
 * Quality-versus-cost style scatter.
 *
 * Scatter puts every pair of colours on screen at once, so it is held to the
 * stricter all-pairs separation gate — which the palette clears at three slots.
 * Groups beyond that fold into "Other" rather than inventing a fourth hue.
 */
export function ScatterChart({
  points, xLabel, yLabel, xFormatter, yFormatter, height = 360, logX = false,
}: {
  points: ScatterPoint[];
  xLabel: string;
  yLabel: string;
  xFormatter?: (value: number) => string;
  yFormatter?: (value: number) => string;
  height?: number;
  logX?: boolean;
}) {
  const groups = [...new Set(points.map((point) => point.group))];
  const visible = groups.slice(0, SCATTER_SLOTS);
  const grouped = [
    ...visible.map((group) => ({
      group,
      colorIndex: visible.indexOf(group),
      data: points.filter((point) => point.group === group),
    })),
    ...(groups.length > SCATTER_SLOTS
      ? [{
          group: 'Other',
          colorIndex: -1,
          data: points.filter((point) => !visible.includes(point.group)),
        }]
      : []),
  ];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RScatterChart margin={{ ...chartMargin, bottom: 16 }}>
        <CartesianGrid stroke="var(--grid)" />
        <XAxis
          type="number" dataKey="x" name={xLabel}
          scale={logX ? 'log' : 'auto'} domain={logX ? ['auto', 'auto'] : ['auto', 'auto']}
          tickFormatter={xFormatter} stroke="var(--axis)"
          tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false}
          label={{
            value: xLabel, position: 'insideBottom', offset: -8,
            style: { fontSize: 11, fill: 'var(--text-muted)' },
          }}
        />
        <YAxis
          type="number" dataKey="y" name={yLabel}
          tickFormatter={yFormatter} stroke="var(--axis)"
          tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false}
          width={56}
          label={{
            value: yLabel, angle: -90, position: 'insideLeft',
            style: { fontSize: 11, fill: 'var(--text-muted)', textAnchor: 'middle' },
          }}
        />
        <ZAxis range={[60, 60]} />
        <Tooltip
          cursor={{ strokeDasharray: '3 3', stroke: 'var(--axis)' }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const point = payload[0].payload as ScatterPoint;
            return (
              <TooltipShell title={point.label}>
                <TooltipRow label={xLabel} value={xFormatter ? xFormatter(point.x) : point.x} />
                <TooltipRow label={yLabel} value={yFormatter ? yFormatter(point.y) : point.y} />
                {point.meta && Object.entries(point.meta).map(([key, value]) => (
                  <TooltipRow key={key} label={key} value={value} />
                ))}
              </TooltipShell>
            );
          }}
        />
        <Legend
          verticalAlign="top" align="left" height={28} iconType="circle"
          wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)', paddingBottom: 4 }}
        />
        {grouped.map((entry) => (
          <Scatter
            key={entry.group}
            name={entry.group}
            data={entry.data}
            // "Other" is deliberately muted: it is a residual bucket, not a
            // ninth identity competing with the named groups.
            fill={entry.colorIndex >= 0 ? seriesColor(entry.colorIndex) : 'var(--text-muted)'}
            fillOpacity={entry.colorIndex >= 0 ? 0.85 : 0.45}
            stroke="var(--surface-1)"
            strokeWidth={2}
            isAnimationActive={false}
          />
        ))}
      </RScatterChart>
    </ResponsiveContainer>
  );
}
