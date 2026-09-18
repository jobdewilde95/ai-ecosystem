'use client';

import { useMemo, useState } from 'react';
import { DataTable } from '@/components/ui/DataTable';
import { shortDate, usdCompact } from '@/lib/format';
import type { CapitalData } from '@/lib/data';

export function FundingTable({ rows }: { rows: CapitalData['funding'] }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (row) =>
        row.companyName.toLowerCase().includes(needle) ||
        row.leadInvestors.some((investor) => investor.toLowerCase().includes(needle)),
    );
  }, [rows, query]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search company or investor"
          aria-label="Search funding rounds"
          className="min-w-[200px] flex-1 rounded-md border bg-[var(--surface-1)] px-2.5 py-1.5 text-[13px]"
          style={{ borderColor: 'var(--border)' }}
        />
        <span className="text-[12px] text-[var(--text-muted)]">
          {filtered.length} of {rows.length}
        </span>
      </div>

      <DataTable
        rows={filtered}
        rowKey={(row) => row.id}
        initialSort="date"
        maxHeight={480}
        columns={[
          {
            key: 'company',
            header: 'Company',
            render: (row) => <span className="font-medium">{row.companyName}</span>,
            sortValue: (row) => row.companyName,
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
            key: 'round',
            header: 'Round',
            render: (row) => <span className="text-[var(--text-secondary)]">{row.round}</span>,
            sortValue: (row) => row.round,
          },
          {
            key: 'amount',
            header: 'Raised',
            numeric: true,
            render: (row) =>
              row.amountUsd === null ? (
                <span className="text-[var(--text-muted)]">—</span>
              ) : (
                <span className="font-semibold">{usdCompact(row.amountUsd, 1)}</span>
              ),
            sortValue: (row) => row.amountUsd,
          },
          {
            key: 'post',
            header: 'Post-money',
            numeric: true,
            render: (row) =>
              row.postMoneyUsd === null ? (
                <span className="text-[var(--text-muted)]">undisclosed</span>
              ) : (
                usdCompact(row.postMoneyUsd, 0)
              ),
            sortValue: (row) => row.postMoneyUsd,
          },
          {
            key: 'investors',
            header: 'Lead investors',
            render: (row) => (
              <span className="text-[12px] text-[var(--text-secondary)]">
                {row.leadInvestors.join(', ')}
              </span>
            ),
            sortValue: (row) => row.leadInvestors[0] ?? '',
          },
          {
            key: 'source',
            header: 'Source',
            render: (row) =>
              row.sourceUrl ? (
                <a
                  href={row.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-dotted underline-offset-2"
                  style={{ color: 'var(--series-1)' }}
                  title={row.sourceUrl}
                >
                  link
                </a>
              ) : (
                <span className="text-[var(--text-muted)]" title="Added before per-record sourcing">
                  —
                </span>
              ),
            sortValue: (row) => (row.sourceUrl ? 1 : 0),
          },
          {
            key: 'note',
            header: 'Note',
            render: (row) => (
              <span className="text-[12px] text-[var(--text-muted)]">
                {row.note ?? ''}
                {row.confidence === 'medium' && (
                  <span title="Reported but terms partial or contested"> (reported)</span>
                )}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}
