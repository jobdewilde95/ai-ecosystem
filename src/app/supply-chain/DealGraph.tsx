'use client';

import { useMemo, useState } from 'react';
import { DataTable } from '@/components/ui/DataTable';
import { shortDate, usdCompact } from '@/lib/format';
import type { CapitalData } from '@/lib/data';

type Deal = CapitalData['deals'][number];

const TYPE_LABEL: Record<string, string> = {
  investment: 'Investment',
  'compute-commitment': 'Compute commitment',
  supply: 'Supply agreement',
  jv: 'Joint venture',
  warrant: 'Warrant',
  acquisition: 'Acquisition / stake',
};

/**
 * Capital and commitments as a bipartite flow: sources left, recipients right.
 *
 * A force-directed graph of these relationships is a hairball — the interesting
 * structure is not who is connected but which direction value flows and which
 * edges double back. A deterministic two-column layout makes both readable, and
 * companies appearing on both sides is exactly the circularity worth seeing.
 */
export function DealGraph({ deals }: { deals: Deal[] }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [onlyCircular, setOnlyCircular] = useState(false);

  const shown = onlyCircular ? deals.filter((deal) => deal.circular) : deals;

  const layout = useMemo(() => {
    const sized = shown.filter((deal) => deal.amountUsd !== null && deal.amountUsd > 0);
    const undisclosed = shown.filter((deal) => deal.amountUsd === null || deal.amountUsd === 0);

    const sourceTotals = new Map<string, number>();
    const targetTotals = new Map<string, number>();
    for (const deal of sized) {
      sourceTotals.set(deal.from, (sourceTotals.get(deal.from) ?? 0) + (deal.amountUsd as number));
      targetTotals.set(deal.to, (targetTotals.get(deal.to) ?? 0) + (deal.amountUsd as number));
    }

    const sources = [...sourceTotals.entries()].sort((a, b) => b[1] - a[1]);
    const targets = [...targetTotals.entries()].sort((a, b) => b[1] - a[1]);

    const rowHeight = 30;
    const height = Math.max(sources.length, targets.length) * rowHeight + 40;
    const width = 720;
    const leftX = 156;
    const rightX = width - 156;

    const yFor = (list: Array<[string, number]>, id: string) => {
      const index = list.findIndex(([entity]) => entity === id);
      if (index < 0) return height / 2;
      const span = list.length * rowHeight;
      return (height - span) / 2 + index * rowHeight + rowHeight / 2;
    };

    const maxAmount = Math.max(...sized.map((deal) => deal.amountUsd as number), 1);

    const edges = sized.map((deal) => {
      const y1 = yFor(sources, deal.from);
      const y2 = yFor(targets, deal.to);
      const midX = (leftX + rightX) / 2;
      return {
        deal,
        path: `M ${leftX} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${rightX} ${y2}`,
        // Square-root scaling so a $250B edge does not render 350× the width
        // of a $700M one and swamp everything else.
        width: 1 + Math.sqrt((deal.amountUsd as number) / maxAmount) * 9,
      };
    });

    return { sources, targets, edges, height, width, leftX, rightX, yFor, undisclosed };
  }, [shown]);

  const nameOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const deal of deals) {
      map.set(deal.from, deal.fromName);
      map.set(deal.to, deal.toName);
    }
    return map;
  }, [deals]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={onlyCircular}
            onChange={(event) => setOnlyCircular(event.target.checked)}
            className="size-3.5"
          />
          Circular edges only
        </label>
        <span className="flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)]">
          <svg width="18" height="8" aria-hidden="true">
            <line x1="0" y1="4" x2="18" y2="4" stroke="var(--series-1)" strokeWidth="2.5" />
          </svg>
          Ordinary flow
        </span>
        <span className="flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)]">
          <svg width="18" height="8" aria-hidden="true">
            <line
              x1="0"
              y1="4"
              x2="18"
              y2="4"
              stroke="var(--status-serious)"
              strokeWidth="2.5"
              strokeDasharray="4 2"
            />
          </svg>
          Circular — supplier capital funding its own demand
        </span>
        <span className="text-[12px] text-[var(--text-muted)]">
          Line width ∝ √(announced amount)
        </span>
      </div>

      <div className="scroll-x">
        <svg
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          width="100%"
          style={{ minWidth: 640, maxHeight: 520 }}
          role="img"
          aria-label={`Deal flow diagram: ${layout.edges.length} relationships between ${layout.sources.length} sources and ${layout.targets.length} recipients`}
        >
          <g>
            {layout.edges.map(({ deal, path, width }) => {
              const active = hovered === deal.id;
              const dimmed = hovered !== null && !active;
              return (
                <path
                  key={deal.id}
                  d={path}
                  fill="none"
                  stroke={deal.circular ? 'var(--status-serious)' : 'var(--series-1)'}
                  strokeWidth={active ? width + 2 : width}
                  strokeDasharray={deal.circular ? '6 3' : undefined}
                  strokeOpacity={dimmed ? 0.12 : active ? 0.95 : 0.45}
                  onMouseEnter={() => setHovered(deal.id)}
                  onMouseLeave={() => setHovered(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <title>
                    {`${deal.fromName} → ${deal.toName}\n${TYPE_LABEL[deal.type] ?? deal.type}` +
                      `${deal.amountUsd ? `\n${usdCompact(deal.amountUsd, 0)}` : ''}` +
                      `\n${shortDate(deal.date)}`}
                  </title>
                </path>
              );
            })}
          </g>

          {layout.sources.map(([id, total]) => (
            <g key={`s-${id}`}>
              <circle
                cx={layout.leftX}
                cy={layout.yFor(layout.sources, id)}
                r="4"
                fill="var(--series-1)"
                stroke="var(--surface-1)"
                strokeWidth="2"
              />
              <text
                x={layout.leftX - 10}
                y={layout.yFor(layout.sources, id)}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize="11"
                fill="var(--text-primary)"
              >
                {nameOf.get(id) ?? id}
              </text>
              <text
                x={layout.leftX - 10}
                y={layout.yFor(layout.sources, id) + 11}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize="9.5"
                fill="var(--text-muted)"
              >
                {usdCompact(total, 0)} out
              </text>
            </g>
          ))}

          {layout.targets.map(([id, total]) => (
            <g key={`t-${id}`}>
              <circle
                cx={layout.rightX}
                cy={layout.yFor(layout.targets, id)}
                r="4"
                fill="var(--series-3)"
                stroke="var(--surface-1)"
                strokeWidth="2"
              />
              <text
                x={layout.rightX + 10}
                y={layout.yFor(layout.targets, id)}
                textAnchor="start"
                dominantBaseline="middle"
                fontSize="11"
                fill="var(--text-primary)"
              >
                {nameOf.get(id) ?? id}
              </text>
              <text
                x={layout.rightX + 10}
                y={layout.yFor(layout.targets, id) + 11}
                textAnchor="start"
                dominantBaseline="middle"
                fontSize="9.5"
                fill="var(--text-muted)"
              >
                {usdCompact(total, 0)} in
              </text>
            </g>
          ))}
        </svg>
      </div>

      {layout.undisclosed.length > 0 && (
        <p className="mt-2 text-[12px] text-[var(--text-muted)]">
          {layout.undisclosed.length} further{' '}
          {layout.undisclosed.length === 1 ? 'deal is' : 'deals are'} tracked without a disclosed
          amount and cannot be drawn:{' '}
          {layout.undisclosed.map((deal) => `${deal.fromName} → ${deal.toName}`).join('; ')}.
        </p>
      )}

      <div className="mt-4">
        <p className="mb-2 text-[12px] font-medium text-[var(--text-secondary)]">
          All {deals.length} tracked relationships
        </p>
        <DataTable
          rows={deals}
          rowKey={(row) => row.id}
          initialSort="amount"
          maxHeight={400}
          columns={[
            {
              key: 'from',
              header: 'From',
              render: (row) => <span className="font-medium">{row.fromName}</span>,
              sortValue: (row) => row.fromName,
            },
            {
              key: 'to',
              header: 'To',
              render: (row) => <span className="font-medium">{row.toName}</span>,
              sortValue: (row) => row.toName,
            },
            {
              key: 'type',
              header: 'Type',
              render: (row) => (
                <span className="text-[var(--text-secondary)]">
                  {TYPE_LABEL[row.type] ?? row.type}
                </span>
              ),
              sortValue: (row) => row.type,
            },
            {
              key: 'amount',
              header: 'Announced',
              numeric: true,
              render: (row) =>
                row.amountUsd === null ? (
                  <span className="text-[var(--text-muted)]">undisclosed</span>
                ) : (
                  <span className="font-semibold">{usdCompact(row.amountUsd, 0)}</span>
                ),
              sortValue: (row) => row.amountUsd,
            },
            {
              key: 'circular',
              header: 'Circular',
              render: (row) =>
                row.circular ? (
                  <span
                    className="inline-flex items-center gap-1 text-[12px]"
                    style={{ color: 'var(--status-serious)' }}
                  >
                    <span aria-hidden="true">↺</span> yes
                  </span>
                ) : (
                  <span className="text-[var(--text-muted)]">—</span>
                ),
              sortValue: (row) => (row.circular ? 1 : 0),
            },
            {
              key: 'date',
              header: 'Date',
              render: (row) => (
                <span className="whitespace-nowrap text-[var(--text-secondary)]">
                  {shortDate(row.date)}
                </span>
              ),
              sortValue: (row) => row.date,
            },
            {
              key: 'description',
              header: 'What it is',
              render: (row) => (
                <span className="text-[12px] text-[var(--text-secondary)]">
                  {row.description}
                  {row.confidence === 'medium' && (
                    <span className="text-[var(--text-muted)]"> (reported)</span>
                  )}
                </span>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
