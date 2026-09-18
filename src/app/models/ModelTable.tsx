'use client';

import { useMemo, useState } from 'react';
import { DataTable } from '@/components/ui/DataTable';
import { shortDate, tokenCount, usdPerMtok } from '@/lib/format';

interface ModelTableRow {
  id: string;
  name: string;
  creator: string;
  releaseDate: string | null;
  index: number | null;
  coding: number | null;
  gpqa: number | null;
  hle: number | null;
  terminalbench: number | null;
  blended: number | null;
  perDollar: number | null;
  tokensPerSecond: number | null;
  ttft: number | null;
  context: number | null;
}

/** Benchmark fractions render as percentages; the AA indices are already 0–100. */
const pct = (value: number | null) =>
  value === null ? <span className="text-[var(--text-muted)]">—</span> : `${(value * 100).toFixed(0)}%`;

export function ModelTable({ rows }: { rows: ModelTableRow[] }) {
  const [query, setQuery] = useState('');
  const [creator, setCreator] = useState('all');
  const [scoredOnly, setScoredOnly] = useState(true);

  const creators = useMemo(
    () => [...new Set(rows.map((row) => row.creator))].sort((a, b) => a.localeCompare(b)),
    [rows],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (scoredOnly && row.index === null) return false;
      if (creator !== 'all' && row.creator !== creator) return false;
      if (!needle) return true;
      return row.name.toLowerCase().includes(needle) || row.creator.toLowerCase().includes(needle);
    });
  }, [rows, query, creator, scoredOnly]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search model or provider"
          aria-label="Search models"
          className="min-w-[180px] flex-1 rounded-md border bg-[var(--surface-1)] px-2.5 py-1.5 text-[13px]"
          style={{ borderColor: 'var(--border)' }}
        />
        <select
          value={creator}
          onChange={(event) => setCreator(event.target.value)}
          aria-label="Filter by provider"
          className="rounded-md border bg-[var(--surface-1)] px-2.5 py-1.5 text-[13px]"
          style={{ borderColor: 'var(--border)' }}
        >
          <option value="all">All providers</option>
          {creators.map((entry) => (
            <option key={entry} value={entry}>
              {entry}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={scoredOnly}
            onChange={(event) => setScoredOnly(event.target.checked)}
            className="size-3.5"
          />
          Benchmarked only
        </label>
        <span className="text-[12px] text-[var(--text-muted)]">
          {filtered.length} of {rows.length}
        </span>
      </div>

      <DataTable
        rows={filtered}
        rowKey={(row) => row.id}
        initialSort="index"
        maxHeight={560}
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
            key: 'index',
            header: 'Index',
            numeric: true,
            headerTitle: 'Artificial Analysis intelligence index (0–100, rebased over time)',
            render: (row) =>
              row.index === null ? (
                <span className="text-[var(--text-muted)]">—</span>
              ) : (
                <span className="font-semibold">{row.index.toFixed(1)}</span>
              ),
            sortValue: (row) => row.index,
          },
          {
            key: 'coding',
            header: 'Coding',
            numeric: true,
            headerTitle: 'Artificial Analysis coding index',
            render: (row) => (row.coding === null ? <span className="text-[var(--text-muted)]">—</span> : row.coding.toFixed(1)),
            sortValue: (row) => row.coding,
          },
          {
            key: 'gpqa',
            header: 'GPQA',
            numeric: true,
            render: (row) => pct(row.gpqa),
            sortValue: (row) => row.gpqa,
          },
          {
            key: 'hle',
            header: 'HLE',
            numeric: true,
            headerTitle: "Humanity's Last Exam",
            render: (row) => pct(row.hle),
            sortValue: (row) => row.hle,
          },
          {
            key: 'tb',
            header: 'Terminal',
            numeric: true,
            headerTitle: 'Terminal-Bench',
            render: (row) => pct(row.terminalbench),
            sortValue: (row) => row.terminalbench,
          },
          {
            key: 'blended',
            header: '$/Mtok',
            numeric: true,
            render: (row) => usdPerMtok(row.blended),
            sortValue: (row) => row.blended,
          },
          {
            key: 'perDollar',
            header: 'Index / $',
            numeric: true,
            render: (row) =>
              row.perDollar === null ? (
                <span className="text-[var(--text-muted)]">—</span>
              ) : (
                row.perDollar.toFixed(1)
              ),
            sortValue: (row) => row.perDollar,
          },
          {
            key: 'speed',
            header: 'tok/s',
            numeric: true,
            render: (row) =>
              row.tokensPerSecond === null ? (
                <span className="text-[var(--text-muted)]">—</span>
              ) : (
                Math.round(row.tokensPerSecond)
              ),
            sortValue: (row) => row.tokensPerSecond,
          },
          {
            key: 'ttft',
            header: 'TTFT',
            numeric: true,
            headerTitle: 'Median time to first token, seconds',
            render: (row) =>
              row.ttft === null ? <span className="text-[var(--text-muted)]">—</span> : `${row.ttft.toFixed(1)}s`,
            sortValue: (row) => row.ttft,
          },
          {
            key: 'context',
            header: 'Context',
            numeric: true,
            render: (row) =>
              row.context ? tokenCount(row.context) : <span className="text-[var(--text-muted)]">—</span>,
            sortValue: (row) => row.context,
          },
          {
            key: 'released',
            header: 'Released',
            render: (row) => <span className="text-[var(--text-secondary)]">{shortDate(row.releaseDate)}</span>,
            sortValue: (row) => row.releaseDate,
          },
        ]}
      />
    </div>
  );
}
