/**
 * Chart theme bridge.
 *
 * Recharts needs concrete colour values, but the palette lives in CSS custom
 * properties so light/dark swap in one place. These helpers read the tokens at
 * render time on the client and fall back to the light values during SSR, where
 * no computed style exists.
 */

export const SERIES_VARS = [
  '--series-1', '--series-2', '--series-3', '--series-4',
  '--series-5', '--series-6', '--series-7', '--series-8',
] as const;

const LIGHT_FALLBACK: Record<string, string> = {
  '--series-1': '#2a78d6', '--series-2': '#eb6834', '--series-3': '#1baf7a',
  '--series-4': '#eda100', '--series-5': '#e87ba4', '--series-6': '#008300',
  '--series-7': '#4a3aa7', '--series-8': '#e34948',
  '--seq-100': '#cde2fb', '--seq-250': '#86b6ef', '--seq-400': '#3987e5',
  '--seq-550': '#1c5cab', '--seq-700': '#0d366b',
  '--grid': '#e1e0d9', '--axis': '#c3c2b7', '--text-muted': '#898781',
  '--text-secondary': '#52514e', '--text-primary': '#0b0b0b',
  '--surface-1': '#fcfcfb', '--status-good': '#0ca30c', '--status-critical': '#d03b3b',
  '--status-warning': '#fab219', '--status-serious': '#ec835a',
};

export function token(name: string): string {
  if (typeof window === 'undefined') return LIGHT_FALLBACK[name] ?? '#000';
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || LIGHT_FALLBACK[name] || '#000';
}

/**
 * Categorical colour for a series.
 *
 * Indexed by the entity's fixed position, never by its rank in the current
 * view — filtering a chart must not repaint the survivors. Past eight slots
 * callers fold to "Other" rather than generating a ninth hue.
 */
export const seriesColor = (index: number): string => token(SERIES_VARS[index % SERIES_VARS.length]);

/** Scatter and bubble forms cap at three slots, which clear the all-pairs gate. */
export const SCATTER_SLOTS = 3;

export const axisStyle = {
  stroke: 'var(--axis)',
  fontSize: 11,
  fill: 'var(--text-muted)',
} as const;

export const chartMargin = { top: 8, right: 12, bottom: 4, left: 4 } as const;
