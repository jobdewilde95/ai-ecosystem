import type { Metadata } from 'next';
import './globals.css';
import { Nav } from '@/components/ui/Nav';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { getStaleness } from '@/lib/data';
import { shortDate } from '@/lib/format';

export const metadata: Metadata = {
  title: 'AI Ecosystem Tracker',
  description:
    'Investor-facing view of the AI ecosystem: supply chain, capex, capital structure, model performance and token economics.',
};

/**
 * Applied before paint so a dark-mode viewer never sees a light flash. Written
 * as a blocking inline script because there is no server to negotiate with on a
 * static export.
 */
const THEME_SCRIPT = `
try {
  var t = localStorage.getItem('theme');
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
} catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const staleness = getStaleness();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-screen antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-[var(--surface-1)] focus:px-3 focus:py-2"
        >
          Skip to content
        </a>

        <header
          className="sticky top-0 z-40 border-b backdrop-blur"
          style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--surface-page) 88%, transparent)' }}
        >
          <div className="mx-auto flex max-w-[1400px] flex-col gap-2 px-4 py-2.5 sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-baseline gap-2.5">
                <span className="text-[15px] font-semibold tracking-tight">AI Ecosystem</span>
                <span className="hidden text-[12px] text-[var(--text-muted)] sm:inline">
                  {staleness.generatedAt ? `Updated ${shortDate(staleness.generatedAt)}` : 'No data yet'}
                </span>
              </div>
              <ThemeToggle />
            </div>
            <Nav />
          </div>
        </header>

        <main id="main" className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>

        <footer
          className="mx-auto max-w-[1400px] border-t px-4 py-6 text-[12px] leading-relaxed text-[var(--text-muted)] sm:px-6"
          style={{ borderColor: 'var(--border)' }}
        >
          <p>
            Sources: SEC EDGAR (fundamentals, debt, filings), OpenRouter (token pricing),
            Artificial Analysis (benchmarks and measured throughput), Epoch AI (training compute),
            Yahoo Finance (prices), HuggingFace (open-weight downloads). Private funding,
            partnership and deal data is curated and reflects public disclosure only.
          </p>
          <p className="mt-2">
            Derived metrics show their formula and inputs. Nothing here is investment advice.
          </p>
        </footer>
      </body>
    </html>
  );
}
