'use client';

import { useMemo, useState } from 'react';
import { DataTable } from '@/components/ui/DataTable';
import { usdCompact, usdPerMtok } from '@/lib/format';

interface SimModel {
  id: string;
  name: string;
  creator: string;
  inputPerMtok: number;
  outputPerMtok: number;
  cacheReadPerMtok: number | null;
  intelligenceIndex: number | null;
}

/**
 * Monthly cost of a stated token mix across models.
 *
 * Published per-token prices are hard to reason about because real workloads
 * are lopsided: an agent loop is mostly cached input, a summariser is mostly
 * fresh input, a reasoning model is mostly output. The same price list ranks
 * models differently under each, which is the point of letting the mix vary.
 */
export function WorkloadSimulator({ models }: { models: SimModel[] }) {
  const [inputM, setInputM] = useState(50);
  const [outputM, setOutputM] = useState(10);
  const [cachedPct, setCachedPct] = useState(0);
  const [minQuality, setMinQuality] = useState(0);
  /*
   * 242 of 652 tracked models list at $0 — free-hosted open weights and
   * promotional endpoints. Left in, they occupy every row of a "cheapest"
   * ranking with a $0.00 answer that tells you nothing about commercial cost,
   * so they are opt-in rather than default.
   */
  const [includeFree, setIncludeFree] = useState(false);

  const rows = useMemo(() => {
    const cachedShare = Math.min(Math.max(cachedPct, 0), 100) / 100;
    return models
      .filter((model) => (minQuality === 0 ? true : (model.intelligenceIndex ?? 0) >= minQuality))
      .filter((model) => includeFree || model.inputPerMtok > 0 || model.outputPerMtok > 0)
      .map((model) => {
        // Cached input bills at the cache-read rate where the model publishes
        // one; without a published rate the cached share bills as normal input
        // rather than silently assuming a discount the provider never offered.
        const cacheRate = model.cacheReadPerMtok ?? model.inputPerMtok;
        const inputCost =
          inputM * (1 - cachedShare) * model.inputPerMtok + inputM * cachedShare * cacheRate;
        const outputCost = outputM * model.outputPerMtok;
        return {
          ...model,
          monthlyCost: inputCost + outputCost,
          hasCacheRate: model.cacheReadPerMtok !== null,
        };
      })
      .sort((a, b) => a.monthlyCost - b.monthlyCost)
      .slice(0, 40);
  }, [models, inputM, outputM, cachedPct, minQuality, includeFree]);

  const cheapest = rows[0]?.monthlyCost ?? 0;

  return (
    <div>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <NumberField
          label="Input tokens"
          suffix="M / month"
          value={inputM}
          onChange={setInputM}
          min={0}
          step={10}
        />
        <NumberField
          label="Output tokens"
          suffix="M / month"
          value={outputM}
          onChange={setOutputM}
          min={0}
          step={5}
        />
        <NumberField
          label="Cached input"
          suffix="% of input"
          value={cachedPct}
          onChange={setCachedPct}
          min={0}
          max={100}
          step={10}
        />
        <NumberField
          label="Min quality"
          suffix="index"
          value={minQuality}
          onChange={setMinQuality}
          min={0}
          max={70}
          step={10}
        />
      </div>

      <label className="mb-3 flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)]">
        <input
          type="checkbox"
          checked={includeFree}
          onChange={(event) => setIncludeFree(event.target.checked)}
          className="size-3.5"
        />
        Include free tiers
        <span className="text-[var(--text-muted)]">
          (free-hosted open weights and promotional endpoints, excluded by default)
        </span>
      </label>

      <DataTable
        rows={rows}
        rowKey={(row) => row.id}
        initialSort="cost"
        initialDirection="asc"
        maxHeight={380}
        emptyMessage="No models match that quality floor."
        columns={[
          {
            key: 'model',
            header: 'Model',
            render: (row) => (
              <span>
                <span className="font-medium">{row.name}</span>
                <span className="ml-1.5 text-[var(--text-muted)]">{row.creator}</span>
              </span>
            ),
            sortValue: (row) => row.name,
          },
          {
            key: 'quality',
            header: 'Index',
            numeric: true,
            render: (row) =>
              row.intelligenceIndex !== null ? row.intelligenceIndex.toFixed(1) : '—',
            sortValue: (row) => row.intelligenceIndex,
          },
          {
            key: 'in',
            header: 'In $/Mtok',
            numeric: true,
            render: (row) => usdPerMtok(row.inputPerMtok),
            sortValue: (row) => row.inputPerMtok,
          },
          {
            key: 'out',
            header: 'Out $/Mtok',
            numeric: true,
            render: (row) => usdPerMtok(row.outputPerMtok),
            sortValue: (row) => row.outputPerMtok,
          },
          {
            key: 'cache',
            header: 'Cache',
            numeric: true,
            headerTitle: 'Cached-input rate, where the provider publishes one',
            render: (row) =>
              row.hasCacheRate ? (
                usdPerMtok(row.cacheReadPerMtok)
              ) : (
                <span className="text-[var(--text-muted)]">n/a</span>
              ),
            sortValue: (row) => row.cacheReadPerMtok,
          },
          {
            key: 'cost',
            header: 'Monthly cost',
            numeric: true,
            render: (row) => (
              <span className="font-semibold">{usdCompact(row.monthlyCost, 0)}</span>
            ),
            sortValue: (row) => row.monthlyCost,
          },
          {
            key: 'vs',
            header: 'vs cheapest',
            numeric: true,
            render: (row) =>
              cheapest > 0 ? (
                <span className="text-[var(--text-secondary)]">
                  {row.monthlyCost / cheapest < 1.005
                    ? '—'
                    : `${(row.monthlyCost / cheapest).toFixed(1)}×`}
                </span>
              ) : (
                '—'
              ),
            sortValue: (row) => row.monthlyCost,
          },
        ]}
      />
      <p className="mt-2 text-[12px] text-[var(--text-muted)]">
        Showing the 40 cheapest matches. Models without a published cache rate bill cached tokens
        at the standard input price.
      </p>
    </div>
  );
}

function NumberField({
  label,
  suffix,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  suffix: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label className="block">
      <span className="text-[12px] font-medium text-[var(--text-secondary)]">{label}</span>
      <span className="mt-1 flex items-center gap-2">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (Number.isFinite(next)) onChange(next);
          }}
          className="tnum w-full rounded-md border bg-[var(--surface-1)] px-2 py-1.5 text-[13px]"
          style={{ borderColor: 'var(--border)' }}
        />
        <span className="whitespace-nowrap text-[11px] text-[var(--text-muted)]">{suffix}</span>
      </span>
    </label>
  );
}
