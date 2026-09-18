'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

/**
 * Theme switch. Dark mode is a selected set of steps validated against the dark
 * surface, not an automatic inversion of the light palette.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system');

  useEffect(() => {
    const stored = (localStorage.getItem('theme') as Theme | null) ?? 'system';
    setTheme(stored);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const cycle = () => setTheme((t) => (t === 'system' ? 'light' : t === 'light' ? 'dark' : 'system'));
  const icon = theme === 'light' ? '☀' : theme === 'dark' ? '☾' : '◐';

  return (
    <button
      type="button"
      onClick={cycle}
      className="rounded-md border px-2 py-1 text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      style={{ borderColor: 'var(--border)' }}
      title={`Theme: ${theme}. Click to change.`}
    >
      <span aria-hidden="true">{icon}</span>
      <span className="sr-only">Theme: {theme}. Click to change.</span>
    </button>
  );
}
