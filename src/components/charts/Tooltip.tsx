'use client';

import type { ReactNode } from 'react';

/** Shared tooltip shell so every chart's hover layer reads identically. */
export function TooltipShell({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div
      className="pointer-events-none rounded-md border px-2.5 py-2 text-[12px] shadow-lg"
      style={{
        background: 'var(--surface-1)',
        borderColor: 'var(--border-strong)',
        color: 'var(--text-primary)',
      }}
    >
      <p className="mb-1 font-semibold">{title}</p>
      {children}
    </div>
  );
}

export function TooltipRow({ color, label, value }: {
  color?: string; label: ReactNode; value: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
        {color && (
          <span
            aria-hidden="true"
            className="inline-block size-2 shrink-0 rounded-[1px]"
            style={{ background: color }}
          />
        )}
        {label}
      </span>
      <span className="tnum font-medium">{value}</span>
    </div>
  );
}
