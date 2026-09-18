'use client';

import { useMemo, useState } from 'react';
import { DataTable } from '@/components/ui/DataTable';
import { shortDate, tokenCount, usdPerMtok } from '@/lib/format';

interface PricingRow {
  id: string;
  name: string;
  creator: string;
  input: number | null;
  output: number | null;
  blended: number | null;
  cacheRead: number | null;
  context: number | null;
  intelligence: number | null;
  perDollar: number | null;
  releaseDate: string | null;
}

export function PricingTable({ rows }: { rows: PricingRow[] }) {
  const [query, setQuery] = useState('');
  const [creator, setCreator] = useState('all');
  // Free-hosted open weights and promotional endpoints are real, but they
  // occupy every row of a price-ascending sort with an answer of "free",
  // burying the commercial pricing this table exists to show.
  const [includeFree, setIncludeFree] = useState(false);

  const creators = useMemo(
    () =>
      [...new Set(rows.map((row) => row.creator))]
        .sort((a, b) => a.localeCompare(b))
        .slice(0, 60),
    [rows],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (!includeFree && (row.blended ?? 0) === 0) return false;
      if (creator !== 'all' && row.creator !== creator) return false;
      if (!needle) return true;
      return (
        row.name.toLowerCase().includes(needle) || row.creator.toLowerCase().includes(needle)
      );
    });
  }, [rows, query, creator, includeFree]);

  return (
    <div>
      {/* Filters sit in one row above the chart area, per the interaction spec. */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search model or provider"
          aria-label="Search models"
          className="min-w-[200px] flex-1 rounded-md border bg-[var(--surface-1)] px-2.5 py-1.5 text-[13px]"
          style={{ borderColor: 'var(--border)' }}
        />
        <select
          value={creator}
          onChange={(event) => setCreator(event.target.value)}
          aria-label="Filter by provider"
          className="rounded-md border bg-[var(--surface-1)] px-2.5 py-1.5 text-[13px]"
          style={{ borderColor: 'var(--border)' }}
        >
          <option value="all">All providers ({creators.length})</option>
          {creators.map((entry) => (
            <option key={entry} value={entry}>
              {entry}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={includeFree}
            onChange={(event) => setIncludeFree(event.target.checked)}
            className="size-3.5"
          />
          Include free tiers
        </label>
        <span className="text-[12px] text-[var(--text-muted)]">
          {filtered.length} of {rows.length}
        </span>
      </div>

      <DataTable
        rows={filtered}
        rowKey={(row) => row.id}
        initialSort="blended"
        initialDirection="asc"
        maxHeight={520}
        columns={[
          {
            key: 'name',
            header: 'Model',
            render: (row) => <span className="font-medium">{row.name}</span>,
            sortValue: (row) => row.name,
          },
          {
            key: 'creator',
            header: 'Provider',
            render: (row) => <span className="text-[var(--text-secondary)]">{row.creator}</span>,
            sortValue: (row) => row.creator,
          },
          {
            key: 'input',
            header: 'Input',
            numeric: true,
            headerTitle: 'USD per million input tokens',
            render: (row) => usdPerMtok(row.input),
            sortValue: (row) => row.input,
          },
          {
            key: 'output',
            header: 'Output',
            numeric: true,
            headerTitle: 'USD per million output tokens',
            render: (row) => usdPerMtok(row.output),
            sortValue: (row) => row.output,
          },
          {
            key: 'blended',
            header: 'Blended',
            numeric: true,
            headerTitle: '3:1 input:output blend, the standard comparison convention',
            render: (row) => <span className="font-semibold">{usdPerMtok(row.blended)}</span>,
            sortValue: (row) => row.blended,
          },
          {
            key: 'cache',
            header: 'Cache read',
            numeric: true,
            render: (row) =>
              row.cacheRead !== null ? (
                usdPerMtok(row.cacheRead)
              ) : (
                <span className="text-[var(--text-muted)]">—</span>
              ),
            sortValue: (row) => row.cacheRead,
          },
          {
            key: 'context',
            header: 'Context',
            numeric: true,
            render: (row) =>
              row.context ? (
                tokenCount(row.context)
              ) : (
                <span className="text-[var(--text-muted)]">—</span>
              ),
            sortValue: (row) => row.context,
          },
          {
            key: 'intelligence',
            header: 'Index',
            numeric: true,
            headerTitle: 'Artificial Analysis intelligence index',
            render: (row) => (row.intelligence !== null ? row.intelligence.toFixed(1) : '—'),
            sortValue: (row) => row.intelligence,
          },
          {
            key: 'perDollar',
            header: 'Index / $',
            numeric: true,
            headerTitle: 'Intelligence index per dollar per million blended tokens',
            render: (row) =>
              row.perDollar !== null ? (
                <span className="font-medium">{row.perDollar.toFixed(1)}</span>
              ) : (
                '—'
              ),
            sortValue: (row) => row.perDollar,
          },
          {
            key: 'released',
            header: 'Released',
            render: (row) => (
              <span className="text-[var(--text-secondary)]">{shortDate(row.releaseDate)}</span>
            ),
            sortValue: (row) => row.releaseDate,
          },
        ]}
      />
    </div>
  );
}
