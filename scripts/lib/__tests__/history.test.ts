import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

// The module resolves its directory at import time, so the temp location has to
// be in place before it loads.
let tempDir: string;

vi.mock('../paths.js', async () => {
  const os = await import('node:os');
  const path = await import('node:path');
  const fs = await import('node:fs');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'history-test-'));
  return { HISTORY_DIR: dir, DATA_DIR: dir, CURATED_DIR: dir, SNAPSHOT_DIR: dir, ROOT: dir, CHANGELOG_PATH: path.join(dir, 'c.json') };
});

const { appendChanges, readSeries } = await import('../history.js');
const { HISTORY_DIR } = await import('../paths.js');

const bar = (date: string, key: string, close: number) => ({ date, key, close });

describe('appendChanges', () => {
  beforeEach(async () => {
    tempDir = HISTORY_DIR as string;
    await fs.rm(path.join(tempDir, 'test.ndjson'), { force: true });
  });

  afterEach(async () => {
    await fs.rm(path.join(tempDir, 'test.ndjson'), { force: true });
  });

  it('separates first observations from genuine changes', async () => {
    const first = await appendChanges('test', [bar('2026-01-05', 'NVDA', 100)], {
      trackedFields: ['close'],
    });
    expect(first.firstSeen).toHaveLength(1);
    expect(first.changed).toHaveLength(0);

    const second = await appendChanges('test', [bar('2026-01-06', 'NVDA', 110)], {
      trackedFields: ['close'],
    });
    expect(second.firstSeen).toHaveLength(0);
    expect(second.changed).toHaveLength(1);
  });

  it('does not duplicate a (key, date) it already recorded', async () => {
    await appendChanges('test', [bar('2026-01-05', 'NVDA', 100)], { trackedFields: ['close'] });
    const repeat = await appendChanges('test', [bar('2026-01-05', 'NVDA', 100)], {
      trackedFields: ['close'],
    });
    expect(repeat.appended).toHaveLength(0);
    expect(await readSeries('test')).toHaveLength(1);
  });

  /*
   * The property the weekly schedule depends on. The market fetcher requests a
   * multi-year range every run, so a Monday run is handed the whole preceding
   * week. Every trading day it has not already recorded must be written, or a
   * weekly cadence would silently keep only one close in five.
   */
  it('backfills every missing day when runs are a week apart', async () => {
    await appendChanges('test', [bar('2026-01-05', 'NVDA', 100)], {
      trackedFields: ['close'],
      alwaysAppend: true,
    });

    // A week later the fetcher returns the full range, not just the new day.
    const week = [
      bar('2026-01-05', 'NVDA', 100), // already recorded
      bar('2026-01-06', 'NVDA', 101),
      bar('2026-01-07', 'NVDA', 102),
      bar('2026-01-08', 'NVDA', 103),
      bar('2026-01-09', 'NVDA', 104),
      bar('2026-01-12', 'NVDA', 105),
    ];
    const result = await appendChanges('test', week, {
      trackedFields: ['close'],
      alwaysAppend: true,
    });

    expect(result.appended).toHaveLength(5);
    const stored = await readSeries('test');
    expect(stored.map((row) => row.date)).toEqual([
      '2026-01-05', '2026-01-06', '2026-01-07', '2026-01-08', '2026-01-09', '2026-01-12',
    ]);
  });

  it('records an unchanged close on a new day only when alwaysAppend is set', async () => {
    await appendChanges('test', [bar('2026-01-05', 'NVDA', 100)], { trackedFields: ['close'] });

    // Without alwaysAppend (token pricing): an identical value is not a change.
    const quiet = await appendChanges('test', [bar('2026-01-06', 'NVDA', 100)], {
      trackedFields: ['close'],
    });
    expect(quiet.appended).toHaveLength(0);

    // With it (market closes): every session is recorded regardless.
    const market = await appendChanges('test', [bar('2026-01-07', 'NVDA', 100)], {
      trackedFields: ['close'],
      alwaysAppend: true,
    });
    expect(market.appended).toHaveLength(1);
  });
});
