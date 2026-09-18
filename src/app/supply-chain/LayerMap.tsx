'use client';

import { useState } from 'react';
import { signedPercent, usdCompact } from '@/lib/format';
import { layerColorIndex } from '@/lib/layers';
import type { SupplyChainLayer } from '@/lib/data';

interface LayerRow {
  layer: string;
  label: string;
  description: string;
  publicCount: number;
  privateCount: number;
  bottleneckCount: number;
  ttmCapex: number;
  returnYtd: number | null;
  relativeYtd: number | null;
  companies: SupplyChainLayer['companies'];
}

/**
 * The chain as stacked layers rather than a node graph.
 *
 * A force-directed layout of 113 companies across 13 layers collapses into a
 * hairball that shows connectivity and nothing else. A deterministic vertical
 * stack keeps the one property that matters — what depends on what — readable,
 * and lets each layer carry its own numbers.
 */
export function LayerMap({ layers }: { layers: LayerRow[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-1.5">
      {layers.map((layer, index) => {
        const open = expanded === layer.layer;
        const color = `var(--series-${(layerColorIndex(layer.layer) % 8) + 1})`;
        return (
          <div key={layer.layer}>
            <button
              type="button"
              onClick={() => setExpanded(open ? null : layer.layer)}
              aria-expanded={open}
              className="flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors hover:bg-[var(--surface-sunken)]"
              style={{ borderColor: 'var(--border)' }}
            >
              {/* A depth rail, so the upstream-to-downstream ordering is legible
                  without relying on reading every label. */}
              <span
                aria-hidden="true"
                className="w-6 shrink-0 text-right text-[11px] tabular-nums text-[var(--text-muted)]"
              >
                {index + 1}
              </span>
              <span
                aria-hidden="true"
                className="h-8 w-1 shrink-0 rounded-full"
                style={{ background: color }}
              />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-[14px] font-semibold">{layer.label}</span>
                  <span className="text-[12px] text-[var(--text-muted)]">
                    {layer.publicCount} listed
                    {layer.privateCount > 0 && ` · ${layer.privateCount} private`}
                  </span>
                  {layer.bottleneckCount > 0 && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full border px-1.5 py-px text-[10px] font-medium uppercase tracking-wide"
                      style={{ borderColor: 'var(--status-warning)', color: 'var(--text-secondary)' }}
                    >
                      <span aria-hidden="true" style={{ color: 'var(--status-warning)' }}>
                        ⚠
                      </span>
                      {layer.bottleneckCount} bottleneck{layer.bottleneckCount > 1 ? 's' : ''}
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block truncate text-[12px] text-[var(--text-secondary)]">
                  {layer.description}
                </span>
              </span>
              <span className="hidden shrink-0 text-right sm:block">
                <span className="tnum block text-[13px] font-medium">
                  {layer.returnYtd !== null ? signedPercent(layer.returnYtd) : '—'}
                </span>
                <span className="block text-[11px] text-[var(--text-muted)]">YTD avg</span>
              </span>
              <span className="hidden shrink-0 text-right lg:block">
                <span className="tnum block text-[13px] font-medium">
                  {layer.ttmCapex > 0 ? usdCompact(layer.ttmCapex, 0) : '—'}
                </span>
                <span className="block text-[11px] text-[var(--text-muted)]">TTM capex</span>
              </span>
              <span aria-hidden="true" className="shrink-0 text-[var(--text-muted)]">
                {open ? '−' : '+'}
              </span>
            </button>

            {open && (
              <div
                className="mt-1.5 ml-9 rounded-lg border p-3"
                style={{ borderColor: 'var(--border)', background: 'var(--surface-sunken)' }}
              >
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {layer.companies.map((company) => (
                    <div
                      key={company.id}
                      className="rounded-md border bg-[var(--surface-1)] p-2.5"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <p className="flex flex-wrap items-baseline gap-x-1.5">
                        <span className="text-[13px] font-medium">{company.name}</span>
                        {company.ticker && (
                          <span className="tnum text-[11px] text-[var(--text-muted)]">
                            {company.ticker}
                          </span>
                        )}
                        {company.tags.includes('bottleneck') && (
                          <span
                            className="text-[11px]"
                            style={{ color: 'var(--status-warning)' }}
                            title="Capacity, not capital, is the binding constraint here"
                          >
                            ⚠ bottleneck
                          </span>
                        )}
                      </p>
                      <p className="mt-1 text-[11px] leading-snug text-[var(--text-secondary)]">
                        {company.role}
                      </p>
                      <p className="mt-1.5 flex flex-wrap items-center gap-x-3 text-[11px]">
                        {company.marketReturnYtd !== null && (
                          <span
                            className="tnum"
                            style={{
                              color:
                                company.marketReturnYtd >= 0
                                  ? 'var(--delta-up)'
                                  : 'var(--delta-down)',
                            }}
                          >
                            {signedPercent(company.marketReturnYtd)} YTD
                          </span>
                        )}
                        {company.latestValuation !== null && (
                          <span className="tnum text-[var(--text-secondary)]">
                            {usdCompact(company.latestValuation, 0)} valuation
                          </span>
                        )}
                        {company.ttmCapex !== null && company.ttmCapex > 0 && (
                          <span className="tnum text-[var(--text-secondary)]">
                            {usdCompact(company.ttmCapex, 0)} capex
                          </span>
                        )}
                        <span className="text-[var(--text-muted)]">{company.country}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
