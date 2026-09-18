'use client';

import { BarChart } from '@/components/charts/BarChart';
import { DataTable } from '@/components/ui/DataTable';
import { MetricNote } from '@/components/ui/MetricNote';
import { percent, shortDate, usdCompact } from '@/lib/format';
import type { CapitalData } from '@/lib/data';

/**
 * Circular financing: who is funding the demand for their own product.
 *
 * Shown as absolute capital rather than share, because share alone flattens
 * the picture — a lone $700M supplier investment and $250B of interlocking
 * commitments both compute to 100% of disclosed inbound.
 */
export function CircularityPanel({
  entries,
  deals,
}: {
  entries: CapitalData['circularity'];
  deals: CapitalData['deals'];
}) {
  const plotted = entries.filter((entry) => entry.circularUsd > 0).slice(0, 10);

  return (
    <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <div>
        <p className="mb-2 text-[12px] font-medium text-[var(--text-secondary)]">
          Circular capital by entity
        </p>
        {plotted.length > 0 ? (
          <BarChart
            data={plotted.map((entry) => ({
              name: entry.name,
              circular: entry.circularUsd,
            }))}
            series={[{ key: 'circular', label: 'Circular capital', colorIndex: 1 }]}
            xKey="name"
            layout="vertical"
            height={Math.max(200, plotted.length * 26)}
            yFormatter={(value) => usdCompact(value, 0)}
          />
        ) : (
          <p className="py-8 text-center text-[13px] text-[var(--text-muted)]">
            No circular deals recorded.
          </p>
        )}
        {entries[0] && <MetricNote metric={entries[0].exposure} label="How this is calculated" />}
      </div>

      <div className="min-w-0">
        <p className="mb-2 text-[12px] font-medium text-[var(--text-secondary)]">
          The {deals.length} deals behind it
        </p>
        <DataTable
          rows={deals}
          rowKey={(row) => row.id}
          initialSort="amount"
          maxHeight={340}
          columns={[
            {
              key: 'flow',
              header: 'Flow',
              render: (row) => (
                <span className="whitespace-nowrap">
                  <span className="font-medium">{row.fromName}</span>
                  <span aria-hidden="true" className="mx-1 text-[var(--text-muted)]">
                    →
                  </span>
                  <span className="font-medium">{row.toName}</span>
                </span>
              ),
              sortValue: (row) => row.fromName,
            },
            {
              key: 'amount',
              header: 'Announced',
              numeric: true,
              render: (row) =>
                row.amountUsd === null ? (
                  <span
                    className="text-[var(--text-muted)]"
                    title="Terms not disclosed"
                  >
                    undisclosed
                  </span>
                ) : (
                  <span className="font-semibold">{usdCompact(row.amountUsd, 0)}</span>
                ),
              sortValue: (row) => row.amountUsd,
            },
            {
              key: 'type',
              header: 'Type',
              render: (row) => <span className="text-[var(--text-secondary)]">{row.type}</span>,
              sortValue: (row) => row.type,
            },
            {
              key: 'date',
              header: 'Date',
              render: (row) => (
                <span className="whitespace-nowrap text-[var(--text-muted)]">
                  {shortDate(row.date)}
                </span>
              ),
              sortValue: (row) => row.date,
            },
          ]}
        />
        <details className="mt-2">
          <summary className="cursor-pointer text-[12px] text-[var(--text-muted)] underline decoration-dotted underline-offset-2 hover:text-[var(--text-secondary)]">
            Read what each deal is
          </summary>
          <ul className="mt-2 space-y-2">
            {deals.map((deal) => (
              <li key={deal.id} className="text-[12px] leading-relaxed">
                <span className="font-medium">
                  {deal.fromName} → {deal.toName}
                </span>
                {deal.amountUsd !== null && (
                  <span className="tnum ml-1.5 text-[var(--text-secondary)]">
                    {usdCompact(deal.amountUsd, 0)}
                  </span>
                )}
                {deal.confidence === 'medium' && (
                  <span className="ml-1.5 text-[var(--text-muted)]">(reported)</span>
                )}
                <p className="text-[var(--text-secondary)]">{deal.description}</p>
              </li>
            ))}
          </ul>
        </details>
      </div>
    </div>
  );
}

/** Exported for the overview tile, which shows the same share. */
export function circularShare(entries: CapitalData['circularity']): string {
  const circular = entries.reduce((sum, entry) => sum + entry.circularUsd, 0);
  const total = entries.reduce((sum, entry) => sum + entry.totalInboundUsd, 0);
  return total > 0 ? percent((circular / total) * 100, 0) : '—';
}
