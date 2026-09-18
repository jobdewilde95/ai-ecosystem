'use client';

import { useMemo, useState } from 'react';
import { BarChart } from '@/components/charts/BarChart';
import { DataTable } from '@/components/ui/DataTable';
import { shortDate, usdCompact } from '@/lib/format';

interface FiledEvent {
  ticker: string;
  name: string;
  filed: string;
  form: string;
  kind: string;
  detail: string;
  href: string;
}

const KIND_LABEL: Record<string, string> = {
  'item-1.01': 'Material agreement',
  'item-1.02': 'Agreement terminated',
  'item-2.01': 'Acquisition completed',
  'item-2.03': 'New financial obligation',
  'item-3.02': 'Unregistered equity sale',
  shelf: 'Shelf registration',
  pricing: 'Issuance priced',
};

/**
 * Capital activity evidenced by SEC filings.
 *
 * The curated deal and funding records are hand-maintained and stop wherever
 * their maintainer's knowledge stops. This view is computed from filings and
 * XBRL instead, so it keeps pace on its own. The trade is specificity: a filing
 * index proves a financing happened and links the document, but only the filing
 * text names the counterparty and the terms.
 */
export function FiledEvents({
  events,
  debtByQuarter,
  curatedThrough,
}: {
  events: FiledEvent[];
  debtByQuarter: Array<{ quarter: string; total: number }>;
  curatedThrough: string | null;
}) {
  const [kind, setKind] = useState('all');

  const kinds = useMemo(
    () => [...new Set(events.map((event) => event.kind))].sort(),
    [events],
  );

  const filtered = useMemo(
    () => (kind === 'all' ? events : events.filter((event) => event.kind === kind)),
    [events, kind],
  );

  const sinceCurated = curatedThrough
    ? events.filter((event) => event.filed > curatedThrough).length
    : 0;

  // The most recent quarter is still being reported: companies file on
  // different schedules, so its total is partial and would read as a collapse.
  const complete = debtByQuarter.slice(0, -1);
  const partial = debtByQuarter.at(-1);

  return (
    <div>
      {curatedThrough && sinceCurated > 0 && (
        <p
          className="mb-4 rounded-md border p-3 text-[13px] leading-relaxed"
          style={{ borderColor: 'var(--status-warning)' }}
        >
          <span aria-hidden="true">⚠</span> The curated deal, funding and debt records above end
          at <strong>{shortDate(curatedThrough)}</strong>. SEC filings show{' '}
          <strong>{sinceCurated} financing events</strong> since then that are not in those
          records. Everything in this section comes from filings directly, so it stays current
          without hand-maintenance.
        </p>
      )}

      <div className="mb-5">
        <p className="mb-2 text-[12px] font-medium text-[var(--text-secondary)]">
          Debt raised per calendar quarter, as filed
        </p>
        {complete.length > 0 ? (
          <BarChart
            data={complete}
            series={[{ key: 'total', label: 'Debt issuance proceeds', colorIndex: 1 }]}
            xKey="quarter"
            height={240}
            yFormatter={(value) => usdCompact(value, 0)}
            yLabel="Proceeds from debt issuance"
          />
        ) : (
          <p className="py-6 text-center text-[13px] text-[var(--text-muted)]">
            No filed debt issuance yet.
          </p>
        )}
        <p className="mt-2 text-[12px] leading-relaxed text-[var(--text-muted)]">
          Proceeds from debt issuance as reported in XBRL across the tracked filers, bucketed by
          calendar quarter — filers have different fiscal calendars, so a quarter mixes their
          period ends.
          {partial && (
            <>
              {' '}
              {partial.quarter} is omitted from the chart: only{' '}
              {usdCompact(partial.total, 1)} has been filed so far and the quarter is still being
              reported, so plotting it would read as a collapse.
            </>
          )}
        </p>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {['all', ...kinds].map((entry) => (
          <button
            key={entry}
            type="button"
            onClick={() => setKind(entry)}
            aria-pressed={entry === kind}
            className="rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors"
            style={{
              borderColor: entry === kind ? 'var(--border-strong)' : 'var(--border)',
              background: entry === kind ? 'var(--surface-sunken)' : 'transparent',
              color: entry === kind ? 'var(--text-primary)' : 'var(--text-secondary)',
            }}
          >
            {entry === 'all' ? `All (${events.length})` : (KIND_LABEL[entry] ?? entry)}
          </button>
        ))}
      </div>

      <DataTable
        rows={filtered}
        rowKey={(row, index) => `${row.ticker}-${row.filed}-${row.form}-${index}`}
        initialSort="filed"
        maxHeight={420}
        columns={[
          {
            key: 'filed',
            header: 'Filed',
            render: (row) => (
              <span className="whitespace-nowrap text-[var(--text-secondary)]">
                {shortDate(row.filed)}
              </span>
            ),
            sortValue: (row) => row.filed,
          },
          {
            key: 'company',
            header: 'Company',
            render: (row) => (
              <span>
                <span className="font-semibold">{row.ticker}</span>
                <span className="ml-1.5 text-[var(--text-muted)]">{row.name}</span>
              </span>
            ),
            sortValue: (row) => row.ticker,
          },
          {
            key: 'kind',
            header: 'Event',
            render: (row) => (
              <span className="text-[var(--text-secondary)]">
                {KIND_LABEL[row.kind] ?? row.kind}
              </span>
            ),
            sortValue: (row) => row.kind,
          },
          {
            key: 'detail',
            header: 'What the filing signals',
            render: (row) => (
              <span className="text-[12px] text-[var(--text-secondary)]">{row.detail}</span>
            ),
          },
          {
            key: 'form',
            header: 'Form',
            render: (row) =>
              row.href ? (
                <a
                  href={row.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-dotted underline-offset-2"
                  style={{ color: 'var(--series-1)' }}
                >
                  {row.form}
                </a>
              ) : (
                row.form
              ),
            sortValue: (row) => row.form,
          },
        ]}
      />
    </div>
  );
}
