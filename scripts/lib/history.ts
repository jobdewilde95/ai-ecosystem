import fs from 'node:fs/promises';
import path from 'node:path';
import { HISTORY_DIR } from './paths.js';

/**
 * Append-only time series, one NDJSON file per series.
 *
 * Rows are written on *observed change*, not on every run. Token prices move a
 * handful of times a year, so a daily-row design would add six figures of
 * identical lines annually, bloat every diff, and bury the signal. With change
 * events, `git log` on a series file reads as the actual history of that number.
 *
 * Series that genuinely move every day (market closes) opt out via `alwaysAppend`.
 */
export interface HistoryRow {
  /** ISO date (YYYY-MM-DD) the observation belongs to. */
  date: string;
  /** Series member, e.g. a model id or ticker. */
  key: string;
  [field: string]: unknown;
}

function seriesPath(series: string): string {
  return path.join(HISTORY_DIR, `${series}.ndjson`);
}

export async function readSeries(series: string): Promise<HistoryRow[]> {
  try {
    const raw = await fs.readFile(seriesPath(series), 'utf8');
    return raw
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line) as HistoryRow);
  } catch {
    return [];
  }
}

/** Latest row per key, so callers can compare today against the last known state. */
export function latestByKey(rows: HistoryRow[]): Map<string, HistoryRow> {
  const latest = new Map<string, HistoryRow>();
  for (const row of rows) {
    const current = latest.get(row.key);
    if (!current || row.date >= current.date) latest.set(row.key, row);
  }
  return latest;
}

function valuesEqual(a: HistoryRow, b: HistoryRow, fields: string[]): boolean {
  return fields.every((field) => {
    const left = a[field];
    const right = b[field];
    if (typeof left === 'number' && typeof right === 'number') {
      // Guard against float noise re-writing a row that did not really move.
      return Math.abs(left - right) < 1e-9;
    }
    return JSON.stringify(left) === JSON.stringify(right);
  });
}

export interface AppendOptions {
  /** Fields compared to decide whether something actually changed. */
  trackedFields: string[];
  /** Append every row regardless of change (use for daily market closes). */
  alwaysAppend?: boolean;
}

export interface AppendResult {
  /** Rows written to the series. */
  appended: HistoryRow[];
  /** Rows that genuinely moved against a prior observation. */
  changed: HistoryRow[];
  /** Rows recording a key for the first time. */
  firstSeen: HistoryRow[];
}

/**
 * Appends only rows that differ from the last observation for their key.
 *
 * A first observation is reported separately from a change. On the initial run
 * every key is new, and treating those as movement would fill the "what
 * changed" feed with hundreds of entries announcing that a price exists.
 */
export async function appendChanges(
  series: string,
  rows: HistoryRow[],
  options: AppendOptions,
): Promise<AppendResult> {
  const existing = await readSeries(series);
  const latest = latestByKey(existing);
  const seen = new Set(existing.map((row) => `${row.key}@${row.date}`));

  const changed: HistoryRow[] = [];
  const firstSeen: HistoryRow[] = [];
  for (const row of rows) {
    if (seen.has(`${row.key}@${row.date}`)) continue;
    const previous = latest.get(row.key);
    if (!previous) {
      firstSeen.push(row);
    } else if (options.alwaysAppend || !valuesEqual(row, previous, options.trackedFields)) {
      changed.push(row);
    }
  }
  const appended = [...firstSeen, ...changed];

  if (appended.length > 0) {
    await fs.mkdir(HISTORY_DIR, { recursive: true });
    const payload = appended.map((row) => JSON.stringify(row)).join('\n');
    await fs.appendFile(seriesPath(series), `${payload}\n`, 'utf8');
  }
  return { appended, changed, firstSeen };
}
