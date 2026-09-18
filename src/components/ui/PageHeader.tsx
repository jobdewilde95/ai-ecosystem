import type { ReactNode } from 'react';

export function PageHeader({ title, lede, aside }: {
  title: string; lede: ReactNode; aside?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-3xl">
        <h1 className="text-[22px] font-semibold tracking-tight sm:text-[26px]">{title}</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-[var(--text-secondary)]">{lede}</p>
      </div>
      {aside && <div className="flex flex-wrap items-center gap-2">{aside}</div>}
    </div>
  );
}
