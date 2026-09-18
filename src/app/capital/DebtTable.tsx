'use client';

import { DataTable } from '@/components/ui/DataTable';
import { shortDate, usdCompact } from '@/lib/format';
import type { CapitalData } from '@/lib/data';

const INSTRUMENT_LABEL: Record<string, string> = {
  bond: 'Bond',
  'term-loan': 'Term loan',
  convertible: 'Convertible',
  'credit-facility': 'Credit facility',
  spv: 'SPV / JV',
  abs: 'Asset-backed',
};

export function DebtTable({ rows }: { rows: CapitalData['debt'] }) {
  return (
    <div>
      <DataTable
        rows={rows}
        rowKey={(row) => row.id}
        initialSort="amount"
        maxHeight={460}
        columns={[
          {
            key: 'issuer',
            header: 'Issuer',
            render: (row) => <span className="font-medium">{row.issuerName}</span>,
            sortValue: (row) => row.issuerName,
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
            key: 'instrument',
            header: 'Instrument',
            render: (row) => (
              <span className="text-[var(--text-secondary)]">
                {INSTRUMENT_LABEL[row.instrument] ?? row.instrument}
              </span>
            ),
            sortValue: (row) => row.instrument,
          },
          {
            key: 'amount',
            header: 'Amount',
            numeric: true,
            render: (row) => <span className="font-semibold">{usdCompact(row.amountUsd, 1)}</span>,
            sortValue: (row) => row.amountUsd,
          },
          {
            key: 'collateral',
            header: 'Collateral',
            render: (row) => (
              <span className="text-[12px] text-[var(--text-secondary)]">
                {row.collateral ?? <span className="text-[var(--text-muted)]">unsecured</span>}
              </span>
            ),
            sortValue: (row) => row.collateral ?? '',
          },
          {
            key: 'counterparties',
            header: 'Counterparties',
            render: (row) => (
              <span className="text-[12px] text-[var(--text-secondary)]">
                {row.counterparties?.join(', ') ?? '—'}
              </span>
            ),
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
  );
}
