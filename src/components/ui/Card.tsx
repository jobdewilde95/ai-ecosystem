import type { ReactNode } from 'react';

export function Card({
  title, subtitle, action, children, className = '',
}: {
  title?: ReactNode; subtitle?: ReactNode; action?: ReactNode;
  children: ReactNode; className?: string;
}) {
  return (
    <section
      className={`rounded-lg border bg-[var(--surface-1)] ${className}`}
      style={{ borderColor: 'var(--border)' }}
    >
      {(title || action) && (
        <header className="flex flex-wrap items-start justify-between gap-3 px-4 pt-4 pb-3 sm:px-5">
          <div className="min-w-0">
            {title && (
              <h2 className="text-[15px] font-semibold leading-tight text-[var(--text-primary)]">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-1 text-[13px] leading-snug text-[var(--text-secondary)]">{subtitle}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className="px-4 pb-4 sm:px-5 sm:pb-5">{children}</div>
    </section>
  );
}
