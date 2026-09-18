import fs from 'node:fs/promises';
import path from 'node:path';
import type { ZodType } from 'zod';
import { SNAPSHOT_DIR } from './paths.js';

/**
 * Every snapshot carries its own provenance. The UI reads `stale` and
 * `fetchedAt` to badge data that failed to refresh, which is the difference
 * between a dashboard that quietly shows week-old numbers as current and one
 * that tells you it could not reach the source.
 */
export interface Snapshot<T> {
  source: string;
  fetchedAt: string;
  /** True when this run failed and the previous payload was retained. */
  stale: boolean;
  /** Why the refresh failed, when stale. */
  staleReason?: string;
  /** ISO timestamp of the last genuinely successful fetch. */
  lastSuccessAt: string;
  recordCount: number;
  data: T;
}

function snapshotPath(source: string): string {
  return path.join(SNAPSHOT_DIR, `${source}.json`);
}

export async function readSnapshot<T>(source: string): Promise<Snapshot<T> | null> {
  try {
    const raw = await fs.readFile(snapshotPath(source), 'utf8');
    return JSON.parse(raw) as Snapshot<T>;
  } catch {
    return null;
  }
}

export async function writeSnapshot<T>(snapshot: Snapshot<T>): Promise<void> {
  await fs.mkdir(SNAPSHOT_DIR, { recursive: true });
  const file = snapshotPath(snapshot.source);
  // Write-then-rename: a crash mid-write must not leave a truncated snapshot
  // that the next build would happily parse as truth.
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  await fs.rename(tmp, file);
}

export interface FetcherResult<T> {
  data: T;
  recordCount: number;
  /**
   * Time-series rows for data/history. Sources whose raw payload is large and
   * mostly unchanging (market bars) return a compact summary as `data` and hand
   * the full series here, so the committed snapshot stays small while the
   * history still accumulates.
   */
  history?: {
    series: string;
    rows: Array<Record<string, unknown> & { date: string; key: string }>;
    trackedFields: string[];
    alwaysAppend?: boolean;
  };
}

/**
 * Runs one fetcher in isolation. A failure never aborts the pipeline or
 * discards good data: the previous snapshot is re-written with `stale: true`,
 * so one rate-limited upstream cannot take the whole dashboard down.
 */
export async function runFetcher<T>(
  source: string,
  schema: ZodType<T>,
  fetcher: () => Promise<FetcherResult<T>>,
): Promise<{
  ok: boolean;
  snapshot: Snapshot<T> | null;
  error?: string;
  history?: FetcherResult<T>['history'];
}> {
  const now = new Date().toISOString();
  const previous = await readSnapshot<T>(source);

  try {
    const { data, recordCount, history } = await fetcher();
    const parsed = schema.parse(data);
    const snapshot: Snapshot<T> = {
      source,
      fetchedAt: now,
      stale: false,
      lastSuccessAt: now,
      recordCount,
      data: parsed,
    };
    await writeSnapshot(snapshot);
    return { ok: true, snapshot, history };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    if (!previous) {
      return { ok: false, snapshot: null, error: reason };
    }
    const kept: Snapshot<T> = {
      ...previous,
      fetchedAt: now,
      stale: true,
      staleReason: reason.slice(0, 300),
    };
    await writeSnapshot(kept);
    return { ok: false, snapshot: kept, error: reason };
  }
}
