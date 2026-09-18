'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const SECTIONS = [
  { href: '/', label: 'Overview' },
  { href: '/models/', label: 'Models' },
  { href: '/costs/', label: 'Token costs' },
  { href: '/markets/', label: 'Markets' },
  { href: '/capex/', label: 'Capex' },
  { href: '/capital/', label: 'Capital' },
  { href: '/supply-chain/', label: 'Supply chain' },
];

export function Nav() {
  const pathname = usePathname();
  const normalised = pathname.endsWith('/') ? pathname : `${pathname}/`;

  return (
    <nav aria-label="Sections" className="-mx-1 min-w-0 max-w-full overflow-x-auto">
      <ul className="flex min-w-max items-center gap-0.5 px-1">
        {SECTIONS.map((section) => {
          const active = section.href === '/'
            ? normalised === '/'
            : normalised.startsWith(section.href);
          return (
            <li key={section.href}>
              <Link
                href={section.href}
                aria-current={active ? 'page' : undefined}
                className="block rounded-md px-3 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors"
                style={{
                  background: active ? 'var(--surface-sunken)' : 'transparent',
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                }}
              >
                {section.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
